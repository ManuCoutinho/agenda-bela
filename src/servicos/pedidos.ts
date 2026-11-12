import { FirebaseError } from 'firebase/app';
import {
  collection,
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
} from 'firebase/firestore';
import { HorarioOcupado, travaLivre } from '../dominio/agenda';
import {
  expiracaoDoPedido,
  HorarioJaPedido,
  pedidoExpirado,
  type DadosPedido,
  type Pedido,
  type StatusPedido,
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
 * RF09: a cliente pede o horário. Num só lote grava as travas (pendentes por
 * até 24 h) e o pedido. Se alguma trava já estiver ativa, as regras recusam o
 * lote inteiro e nada é gravado: lança `HorarioJaPedido`.
 */
export async function reservar(
  dados: DadosPedido & { servicoId: string; inicio: Date; travas: string[] },
): Promise<void> {
  if (!navigator.onLine) throw new SemInternet();
  const expiraEm = Timestamp.fromDate(expiracaoDoPedido(new Date()));
  const lote = writeBatch(db);
  for (const id of dados.travas) {
    const [data, hora] = id.split('_');
    lote.set(doc(travas, id), { data, hora, expiraEm });
  }
  lote.set(doc(pedidos), {
    nome: dados.nome,
    whatsapp: dados.whatsapp,
    servicoId: dados.servicoId,
    inicio: Timestamp.fromDate(dados.inicio),
    consentimento: true,
    status: 'pendente',
    criadoEm: serverTimestamp(),
    travas: dados.travas,
  });

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
const STATUS: readonly StatusPedido[] = ['pendente', 'aprovado', 'recusado', 'expirado'];

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
});

/** Pedidos esperando resposta, do mais próximo ao mais distante (RF10). */
export function observarPedidosPendentes(
  aoMudar: (pedidos: Pedido[]) => void,
  aoFalhar: (erro: Error) => void,
) {
  return onSnapshot(
    query(pedidos, where('status', '==', 'pendente')),
    (snap) =>
      aoMudar(
        snap.docs
          .map((d) => paraPedido(d.id, d.data()))
          .sort((a, b) => a.inicio.getTime() - b.inicio.getTime()),
      ),
    aoFalhar,
  );
}

/**
 * RF10: aprova numa transação – confirma as travas (`expiraEm: null`), cria o
 * atendimento (e a cliente, se ainda não existe) e marca o pedido como aprovado.
 * Se o pedido expirou (RN02) e outra pessoa pegou o horário, lança `HorarioOcupado`.
 */
export async function aprovarPedido(
  pedido: Pedido,
  servico: Pick<Servico, 'id' | 'nome' | 'duracaoMin'>,
  clienteId?: string,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const agora = new Date();
    const expirado = pedidoExpirado(pedido, agora);
    for (const id of pedido.travas) {
      const snap = await tx.get(doc(travas, id));
      const expiraEm = snap.exists() ? paraData(snap.data().expiraEm) : undefined;
      // dentro das 24 h a trava pendente é deste pedido; depois, só se ficou livre
      const nossa = !expirado && expiraEm !== null && expiraEm !== undefined;
      if (!nossa && !travaLivre(expiraEm, agora)) throw new HorarioOcupado();
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
    for (const id of pedido.travas) {
      const [data, hora] = id.split('_');
      tx.set(doc(travas, id), { data, hora, expiraEm: null });
    }
    tx.set(doc(agendamentos), {
      clienteId: cliente.id,
      clienteNome: pedido.nome,
      clienteWhatsapp: pedido.whatsapp,
      servicoId: servico.id,
      servicoNome: servico.nome,
      duracaoMin: servico.duracaoMin,
      inicio: Timestamp.fromDate(pedido.inicio),
      travas: pedido.travas,
      status: 'marcado',
      observacao: '',
      pedidoId: pedido.id,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
    tx.update(doc(pedidos, pedido.id), { status: 'aprovado', respondidoEm: serverTimestamp() });
  });
}

/**
 * Recusa e solta as travas. Depois de 24 h as travas já soltaram sozinhas e
 * podem ser de outra pessoa: aí só o pedido muda. Funciona offline.
 */
export function recusarPedido(pedido: Pedido) {
  const lote = writeBatch(db);
  if (!pedidoExpirado(pedido, new Date())) {
    for (const id of pedido.travas) lote.delete(doc(travas, id));
  }
  lote.update(doc(pedidos, pedido.id), { status: 'recusado', respondidoEm: serverTimestamp() });
  gravarEmSegundoPlano(lote.commit());
}

/** Tira da lista um pedido que expirou sem resposta (as travas já soltaram). */
export function descartarPedido(pedido: Pedido) {
  gravarEmSegundoPlano(
    updateDoc(doc(pedidos, pedido.id), { status: 'expirado', respondidoEm: serverTimestamp() }),
  );
}
