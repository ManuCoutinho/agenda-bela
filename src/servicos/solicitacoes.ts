import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import type { Agendamento } from '../dominio/agenda';
import type { Solicitacao } from '../dominio/pedidos';
import { db, gravarEmSegundoPlano } from './firebase';

const solicitacoes = collection(db, 'solicitacoes');

const paraData = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

const paraSolicitacao = (id: string, d: DocumentData): Solicitacao => ({
  id,
  horario: String(d.horario ?? ''),
  motivo: typeof d.motivo === 'string' ? d.motivo : '',
  criadoEm: paraData(d.criadoEm) ?? new Date(),
  status: d.status === 'aprovada' || d.status === 'recusada' ? d.status : 'pendente',
  ...(typeof d.aviso === 'string' ? { aviso: d.aviso } : {}),
  avisada: d.avisadoEm instanceof Timestamp,
});

/** Dias para trás em que um pedido de cancelamento ainda importa (o horário era ≥ 24 h depois). */
const JANELA_MS = 120 * 86_400_000;

/** I14: pedidos ainda sem resposta e respostas cujo aviso não foi mandado. */
export function observarSolicitacoes(
  aoMudar: (lista: Solicitacao[]) => void,
  aoFalhar: (erro: Error) => void,
) {
  const desde = Timestamp.fromMillis(Date.now() - JANELA_MS);
  return onSnapshot(
    query(solicitacoes, where('criadoEm', '>=', desde)),
    (snap) =>
      aoMudar(
        snap.docs
          .map((d) => paraSolicitacao(d.id, d.data()))
          .filter((s) => s.status === 'pendente' || (s.aviso !== undefined && !s.avisada))
          .sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime()),
      ),
    aoFalhar,
  );
}

/**
 * Aprova (cancela o atendimento e libera o horário) ou recusa, guardando a
 * mensagem para a cliente. Funciona offline.
 */
export function responderCancelamento(
  solicitacao: Pick<Solicitacao, 'id'>,
  atendimento: Pick<Agendamento, 'id' | 'travas'> | null,
  aprovar: boolean,
  aviso: string,
) {
  const lote = writeBatch(db);
  lote.update(doc(solicitacoes, solicitacao.id), {
    status: aprovar ? 'aprovada' : 'recusada',
    respondidaEm: serverTimestamp(),
    ...(aviso ? { aviso } : { avisadoEm: serverTimestamp() }),
  });
  if (aprovar && atendimento) {
    lote.update(doc(db, 'agendamentos', atendimento.id), {
      status: 'cancelado',
      atualizadoEm: serverTimestamp(),
    });
    for (const id of atendimento.travas) lote.delete(doc(db, 'travas', id));
  }
  gravarEmSegundoPlano(lote.commit());
}

export function marcarSolicitacaoAvisada(id: string) {
  gravarEmSegundoPlano(updateDoc(doc(solicitacoes, id), { avisadoEm: serverTimestamp() }));
}
