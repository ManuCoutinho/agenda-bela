import { FirebaseError } from 'firebase/app';
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { idsTravas, inicioEm, travaLivre } from '../dominio/agenda';
import type { Mes } from '../dominio/agendaAberta';
import { datasNoMes, idPedidoDaSerie, type Serie } from '../dominio/series';
import type { Servico } from '../dominio/servicos';
import { db, gravarEmSegundoPlano } from './firebase';

const series = collection(db, 'series');
const pedidos = collection(db, 'pedidos');
const travas = collection(db, 'travas');
const agendamentos = collection(db, 'agendamentos');

const paraData = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

const paraSerie = (id: string, d: DocumentData): Serie => ({
  id,
  nome: String(d.nome ?? ''),
  whatsapp: String(d.whatsapp ?? ''),
  servicoId: String(d.servicoId ?? ''),
  hora: String(d.hora ?? '0000'),
  frequenciaDias: d.frequenciaDias === 14 || d.frequenciaDias === 28 ? d.frequenciaDias : 7,
  primeiraData: String(d.primeiraData ?? ''),
  ativa: d.ativa === true,
});

/** O servidor recusou a leitura: as regras desta versão ainda não foram publicadas. */
export class SemPermissao extends Error {
  constructor() {
    super('Sem permissão no servidor');
    this.name = 'SemPermissao';
  }
}

/** Data de um horário fixo que não coube no mês aberto (bloqueio ou outro horário). */
export type DataSemHorario = { serie: Serie; data: string };

/**
 * I11: ao abrir um mês, reserva nele as datas de todos os horários fixos
 * ativos antes de a página mostrar o mês. Cada data vira um pedido
 * confirmado (sem aviso na fila), que o app transforma em atendimento.
 * Devolve as datas que já estavam ocupadas. Precisa de internet.
 */
export async function reservarSeriesNoMes(
  mes: Mes,
  servicos: readonly Servico[],
  intervaloMin: number,
): Promise<DataSemHorario[]> {
  const ativas = await getDocs(query(series, where('ativa', '==', true))).catch((erro: unknown) => {
    if (erro instanceof FirebaseError && erro.code === 'permission-denied') {
      throw new SemPermissao();
    }
    throw erro;
  });
  const semHorario: DataSemHorario[] = [];
  for (const d of ativas.docs) {
    const serie = paraSerie(d.id, d.data());
    const servico = servicos.find((s) => s.id === serie.servicoId);
    if (!servico) continue;
    for (const data of datasNoMes(serie, mes)) {
      const inicio = inicioEm(data, serie.hora);
      const ids = idsTravas(inicio, servico.duracaoMin, intervaloMin);
      const ref = doc(pedidos, idPedidoDaSerie(serie.id, data));
      const ocupado = await runTransaction(db, async (tx) => {
        if ((await tx.get(ref)).exists()) return false; // já reservada antes
        const agora = new Date();
        for (const id of ids) {
          const t = await tx.get(doc(travas, id));
          if (!travaLivre(t.exists() ? paraData(t.data().expiraEm) : undefined, agora)) {
            return true;
          }
        }
        for (const id of ids) {
          const [dia, hora] = id.split('_');
          tx.set(doc(travas, id), { data: dia, hora, expiraEm: null, pedidoId: ref.id });
        }
        tx.set(ref, {
          nome: serie.nome,
          whatsapp: serie.whatsapp,
          servicoId: serie.servicoId,
          inicio: Timestamp.fromDate(inicio),
          consentimento: true,
          status: 'confirmado',
          criadoEm: serverTimestamp(),
          travas: ids,
          serieId: serie.id,
          semAviso: true,
        });
        return false;
      });
      if (ocupado) semHorario.push({ serie, data });
    }
  }
  return semHorario;
}

/**
 * I11: a cliente parou de vir. A série deixa de ser reservada nos meses
 * novos e os próximos atendimentos dela são cancelados (horários livres).
 * Precisa de internet para achar os atendimentos.
 */
export async function encerrarSerie(serieId: string): Promise<number> {
  const agora = new Date();
  const [ags, peds] = await Promise.all([
    getDocs(query(agendamentos, where('serieId', '==', serieId))),
    getDocs(query(pedidos, where('serieId', '==', serieId))),
  ]);
  const lote = writeBatch(db);
  lote.update(doc(series, serieId), { ativa: false, encerradaEm: serverTimestamp() });
  let cancelados = 0;
  for (const a of ags.docs) {
    const inicio = paraData(a.data().inicio);
    if (a.data().status !== 'marcado' || !inicio || inicio <= agora) continue;
    lote.update(a.ref, { status: 'cancelado', atualizadoEm: serverTimestamp() });
    for (const id of (a.data().travas ?? []) as string[]) lote.delete(doc(travas, id));
    cancelados += 1;
  }
  // datas que ainda não viraram atendimento (app não abriu desde então)
  for (const p of peds.docs) {
    const inicio = paraData(p.data().inicio);
    if (p.data().status !== 'confirmado' || !inicio || inicio <= agora) continue;
    lote.update(p.ref, { status: 'recusado', respondidoEm: serverTimestamp() });
    for (const id of (p.data().travas ?? []) as string[]) lote.delete(doc(travas, id));
    cancelados += 1;
  }
  gravarEmSegundoPlano(lote.commit());
  return cancelados;
}
