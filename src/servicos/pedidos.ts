import { FirebaseError } from 'firebase/app';
import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type WriteBatch,
} from 'firebase/firestore';
import { HorarioOcupado, inicioEm, travaLivre } from '../dominio/agenda';
import { idPedidoDaSerie } from '../dominio/series';
import {
  HorarioJaPedido,
  pedidoExpirado,
  type Aviso,
  type AvisoPendente,
  type DadosPedido,
  type OutroHorario,
  type Pedido,
  type StatusPedido,
  type TipoAviso,
} from '../dominio/pedidos';
import type { Servico } from '../dominio/servicos';
import { db, gravarEmSegundoPlano } from './firebase';

const pedidos = collection(db, 'pedidos');
const travas = collection(db, 'travas');

/** Sem resposta do servidor nesse tempo, a cliente vê o aviso de internet. */
const ESPERA_MS = 20_000;

export class SemInternet extends Error {
  constructor() {
    super('Sem internet');
    this.name = 'SemInternet';
  }
}

/**
 * RF09/I08: a cliente marca o horário, já confirmado. Num só lote grava o pedido
 * `confirmado` e as travas definitivas dele. Se alguma trava já estiver ocupada,
 * as regras recusam o lote inteiro e nada é gravado: lança `HorarioJaPedido`.
 */
type DadosReserva = Pick<DadosPedido, 'nome' | 'whatsapp'> & {
  servicoId: string;
  inicio: Date;
  travas: string[];
};

export async function reservar(dados: DadosReserva): Promise<void> {
  if (!navigator.onLine) throw new SemInternet();
  const lote = writeBatch(db);
  incluirReserva(lote, doc(pedidos), dados);
  await gravarReserva(lote);
}

/** Pedido confirmado e as travas definitivas dele, no lote. */
function incluirReserva(
  lote: WriteBatch,
  ref: DocumentReference,
  dados: DadosReserva,
  extra: Record<string, unknown> = {},
) {
  for (const id of dados.travas) {
    const [data, hora] = id.split('_');
    lote.set(doc(travas, id), { data, hora, expiraEm: null, pedidoId: ref.id });
  }
  lote.set(ref, {
    nome: dados.nome,
    whatsapp: dados.whatsapp,
    servicoId: dados.servicoId,
    inicio: Timestamp.fromDate(dados.inicio),
    consentimento: true,
    status: 'confirmado',
    criadoEm: serverTimestamp(),
    travas: dados.travas,
    ...extra,
  });
}

/** Grava esperando o servidor; horário tomado vira `HorarioJaPedido`. */
async function gravarReserva(lote: WriteBatch) {
  let espera: ReturnType<typeof setTimeout> | undefined;
  const tempoEsgotado = new Promise<never>((_, rejeitar) => {
    espera = setTimeout(() => rejeitar(new SemInternet()), ESPERA_MS);
  });
  try {
    await Promise.race([lote.commit(), tempoEsgotado]);
  } catch (erro) {
    if (erro instanceof FirebaseError && erro.code === 'permission-denied') {
      throw new HorarioJaPedido();
    }
    throw erro;
  } finally {
    clearTimeout(espera);
  }
}

const agendamentos = collection(db, 'agendamentos');
const clientes = collection(db, 'clientes');

const paraData = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);
const STATUS: readonly StatusPedido[] = [
  'pendente',
  'confirmado',
  'aprovado',
  'recusado',
  'expirado',
];

const paraPedido = (id: string, d: DocumentData): Pedido => ({
  id,
  nome: String(d.nome ?? ''),
  whatsapp: String(d.whatsapp ?? ''),
  servicoId: String(d.servicoId ?? ''),
  inicio: paraData(d.inicio) ?? new Date(0),
  travas: Array.isArray(d.travas) ? d.travas.map(String) : [],
  status: STATUS.includes(d.status) ? d.status : 'pendente',
  // logo após o envio, o horário do servidor ainda não chegou
  criadoEm: paraData(d.criadoEm) ?? new Date(),
  serieId: typeof d.serieId === 'string' ? d.serieId : undefined,
  semAviso: d.semAviso === true ? true : undefined,
});

function observarPorStatus(
  status: StatusPedido,
  aoMudar: (pedidos: Pedido[]) => void,
  aoFalhar: (erro: Error) => void,
) {
  return onSnapshot(
    query(pedidos, where('status', '==', status)),
    (snap) =>
      aoMudar(
        snap.docs
          .map((d) => paraPedido(d.id, d.data()))
          .sort((a, b) => a.inicio.getTime() - b.inicio.getTime()),
      ),
    aoFalhar,
  );
}

/** Pedidos esperando resposta, do mais próximo ao mais distante (RF10). */
export const observarPedidosPendentes = (
  aoMudar: (pedidos: Pedido[]) => void,
  aoFalhar: (erro: Error) => void,
) => observarPorStatus('pendente', aoMudar, aoFalhar);

/** I08: horários que as clientes já confirmaram e ainda não viraram atendimento. */
export const observarPedidosConfirmados = (
  aoMudar: (pedidos: Pedido[]) => void,
  aoFalhar: (erro: Error) => void,
) => observarPorStatus('confirmado', aoMudar, aoFalhar);

const TIPOS_AVISO: readonly TipoAviso[] = ['confirmacao', 'troca', 'recusa'];

const paraAviso = (pedidoId: string, d: DocumentData): AvisoPendente[] => {
  const aviso: unknown = d.aviso;
  if (typeof aviso !== 'object' || aviso === null) return [];
  const { tipo, texto } = aviso as Record<string, unknown>;
  if (!TIPOS_AVISO.includes(tipo as TipoAviso) || typeof texto !== 'string') return [];
  return [
    {
      pedidoId,
      nome: String(d.nome ?? ''),
      whatsapp: String(d.whatsapp ?? ''),
      inicio: paraData(d.inicio) ?? new Date(0),
      tipo: tipo as TipoAviso,
      texto,
      agendamentoId: typeof d.agendamentoId === 'string' ? d.agendamentoId : undefined,
    },
  ];
};

/** Respostas já dadas cuja mensagem ainda não foi mandada à cliente (RF10). */
export function observarAvisosPendentes(
  aoMudar: (avisos: AvisoPendente[]) => void,
  aoFalhar: (erro: Error) => void,
) {
  return onSnapshot(
    query(pedidos, where('avisadoEm', '==', null)),
    (snap) =>
      aoMudar(
        snap.docs
          .flatMap((d) => paraAviso(d.id, d.data()))
          .sort((a, b) => a.inicio.getTime() - b.inicio.getTime()),
      ),
    aoFalhar,
  );
}

/**
 * A manicure abriu (ou dispensou) a mensagem: o aviso sai da fila e, se era
 * confirmação, o atendimento fica como "confirmação enviada" (I10). Funciona offline.
 */
export function marcarAvisado(aviso: Pick<AvisoPendente, 'pedidoId' | 'tipo' | 'agendamentoId'>) {
  const lote = writeBatch(db);
  lote.update(doc(pedidos, aviso.pedidoId), { avisadoEm: serverTimestamp() });
  if (aviso.tipo !== 'recusa' && aviso.agendamentoId) {
    lote.update(doc(agendamentos, aviso.agendamentoId), { confirmacaoEm: serverTimestamp() });
  }
  gravarEmSegundoPlano(lote.commit());
}

/**
 * RF10: aprova numa transação – confirma as travas (`expiraEm: null`), cria o
 * atendimento (e a cliente, se ainda não existe), marca o pedido como aprovado
 * e guarda nele a mensagem a mandar.
 * Se o pedido expirou (RN02) e outra pessoa pegou o horário, lança `HorarioOcupado`.
 */
export async function aprovarPedido(
  pedido: Pedido,
  servico: Pick<Servico, 'id' | 'nome' | 'duracaoMin'> & { precoCentavos?: number },
  {
    aviso,
    clienteId,
    substitui,
    sinalCentavos,
  }: {
    /** Mensagem para a fila de avisos; sem ela, nada entra na fila. */
    aviso?: Aviso;
    clienteId?: string;
    /** Troca de horário: o atendimento ou pedido antigo da cliente. */
    substitui?: OutroHorario;
    /** Sinal pedido na confirmação (não se aplica à troca). */
    sinalCentavos?: number;
  },
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const agora = new Date();
    const atual = await tx.get(doc(pedidos, pedido.id));
    const status = atual.data()?.status;
    // já virou atendimento (outra aba ou outra abertura do app): nada a fazer
    if (status !== 'pendente' && status !== 'confirmado') return;
    const expirado = status === 'pendente' && pedidoExpirado(pedido, agora);
    const antigas = travasQueSaem(substitui, agora);
    for (const id of pedido.travas) {
      if (antigas.includes(id)) continue;
      const snap = await tx.get(doc(travas, id));
      const expiraEm = snap.exists() ? paraData(snap.data().expiraEm) : undefined;
      // pedido confirmado (I08): a trava definitiva é dele; pendente: só dentro das 24 h
      const nossa =
        snap.data()?.pedidoId === pedido.id ||
        (!expirado && expiraEm !== null && expiraEm !== undefined);
      if (!nossa && !travaLivre(expiraEm, agora)) throw new HorarioOcupado();
    }

    for (const id of pedido.travas) {
      const [data, hora] = id.split('_');
      tx.set(doc(travas, id), { data, hora, expiraEm: null });
    }
    for (const id of antigas.filter((t) => !pedido.travas.includes(t))) {
      tx.delete(doc(travas, id));
    }
    const atendimento =
      substitui?.tipo === 'agendamento'
        ? doc(agendamentos, substitui.agendamento.id)
        : doc(agendamentos);
    tx.update(doc(pedidos, pedido.id), {
      status: 'aprovado',
      respondidoEm: serverTimestamp(),
      ...(aviso ? { aviso, avisadoEm: null } : { avisadoEm: serverTimestamp() }),
      agendamentoId: atendimento.id,
    });

    const dadosDoServico = {
      servicoId: servico.id,
      servicoNome: servico.nome,
      duracaoMin: servico.duracaoMin,
      ...(servico.precoCentavos === undefined ? {} : { precoCentavos: servico.precoCentavos }),
      inicio: Timestamp.fromDate(pedido.inicio),
      travas: pedido.travas,
      pedidoId: pedido.id,
      ...(pedido.serieId ? { serieId: pedido.serieId } : {}),
      atualizadoEm: serverTimestamp(),
    };
    if (substitui?.tipo === 'agendamento') {
      // o atendimento muda de horário: o lembrete do dia antigo não vale mais
      tx.update(atendimento, {
        ...dadosDoServico,
        lembreteEm: deleteField(),
        confirmacaoEm: deleteField(),
      });
      return;
    }
    if (substitui?.tipo === 'pedido') {
      tx.update(doc(pedidos, substitui.pedido.id), {
        status: 'recusado',
        respondidoEm: serverTimestamp(),
      });
    }

    const cliente = clienteId ? doc(clientes, clienteId) : doc(clientes);
    if (!clienteId) {
      tx.set(cliente, {
        nome: pedido.nome,
        whatsapp: pedido.whatsapp,
        observacao: '',
        consentimento: true,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
    }
    tx.set(atendimento, {
      clienteId: cliente.id,
      clienteNome: pedido.nome,
      clienteWhatsapp: pedido.whatsapp,
      ...dadosDoServico,
      ...(sinalCentavos === undefined ? {} : { sinalCentavos }),
      status: 'marcado',
      observacao: '',
      criadoEm: serverTimestamp(),
    });
  });
}

/**
 * Travas do horário substituído que podem ser apagadas: as do atendimento, e
 * as do pedido antigo só dentro das 24 h (depois podem ser de outra pessoa).
 */
function travasQueSaem(substitui: OutroHorario | undefined, agora: Date): string[] {
  if (substitui?.tipo === 'agendamento') return substitui.agendamento.travas;
  if (substitui?.tipo === 'pedido' && !pedidoExpirado(substitui.pedido, agora)) {
    return substitui.pedido.travas;
  }
  return [];
}

/**
 * Recusa e solta as travas. Depois de 24 h as travas já soltaram sozinhas e
 * podem ser de outra pessoa: aí só o pedido muda. Funciona offline.
 */
export function recusarPedido(pedido: Pedido, texto: string) {
  const lote = writeBatch(db);
  if (!pedidoExpirado(pedido, new Date())) {
    for (const id of pedido.travas) lote.delete(doc(travas, id));
  }
  const aviso: Aviso = { tipo: 'recusa', texto };
  lote.update(doc(pedidos, pedido.id), {
    status: 'recusado',
    respondidoEm: serverTimestamp(),
    aviso,
    avisadoEm: null,
  });
  gravarEmSegundoPlano(lote.commit());
}

/** Tira da lista um pedido que expirou sem resposta (as travas já soltaram). */
export function descartarPedido(pedido: Pedido) {
  gravarEmSegundoPlano(
    updateDoc(doc(pedidos, pedido.id), { status: 'expirado', respondidoEm: serverTimestamp() }),
  );
}

export type FalhaSerie = { data: string; motivo: 'ocupado' | 'sem-internet' | 'erro' };

/**
 * I11: horário fixo pedido pela cliente. Cada data é um lote (pedido + travas)
 * e falha sozinha se o horário estiver tomado; a série vai junto com a
 * primeira data que der certo. Devolve as datas reservadas e as que falharam.
 */
export async function reservarSerie(
  dados: Pick<DadosPedido, 'nome' | 'whatsapp'> & {
    servicoId: string;
    hora: string;
    frequenciaDias: number;
    datas: readonly string[];
    travasDe: (data: string) => string[];
  },
): Promise<{ reservadas: string[]; falhas: FalhaSerie[] }> {
  if (!navigator.onLine) throw new SemInternet();
  const serie = doc(collection(db, 'series'));
  const reservadas: string[] = [];
  const falhas: FalhaSerie[] = [];
  for (const data of dados.datas) {
    const lote = writeBatch(db);
    if (reservadas.length === 0) {
      lote.set(serie, {
        nome: dados.nome,
        whatsapp: dados.whatsapp,
        servicoId: dados.servicoId,
        hora: dados.hora,
        frequenciaDias: dados.frequenciaDias,
        primeiraData: dados.datas[0],
        ativa: true,
        criadoEm: serverTimestamp(),
      });
    }
    incluirReserva(
      lote,
      doc(pedidos, idPedidoDaSerie(serie.id, data)),
      {
        nome: dados.nome,
        whatsapp: dados.whatsapp,
        servicoId: dados.servicoId,
        inicio: inicioEm(data, dados.hora),
        travas: dados.travasDe(data),
      },
      { serieId: serie.id },
    );
    try {
      await gravarReserva(lote);
      reservadas.push(data);
    } catch (erro) {
      if (!(erro instanceof HorarioJaPedido) && !(erro instanceof SemInternet)) {
        console.error(erro);
      }
      falhas.push({
        data,
        motivo:
          erro instanceof HorarioJaPedido
            ? 'ocupado'
            : erro instanceof SemInternet
              ? 'sem-internet'
              : 'erro',
      });
    }
  }
  return { reservadas, falhas };
}
