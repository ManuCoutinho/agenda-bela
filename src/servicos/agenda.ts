import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import {
  HorarioOcupado,
  travaLivre,
  type Agendamento,
  type NovoAgendamento,
} from '../dominio/agenda';
import { db, gravarEmSegundoPlano } from './firebase';

const agendamentos = collection(db, 'agendamentos');
const travas = collection(db, 'travas');

const paraData = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

const paraAgendamento = (id: string, d: DocumentData): Agendamento => ({
  id,
  clienteId: String(d.clienteId ?? ''),
  clienteNome: String(d.clienteNome ?? ''),
  clienteWhatsapp: String(d.clienteWhatsapp ?? ''),
  servicoId: String(d.servicoId ?? ''),
  servicoNome: String(d.servicoNome ?? ''),
  duracaoMin: Number(d.duracaoMin ?? 30),
  inicio: paraData(d.inicio) ?? new Date(0),
  travas: Array.isArray(d.travas) ? d.travas.map(String) : [],
  status: d.status === 'cancelado' ? 'cancelado' : 'marcado',
  observacao: String(d.observacao ?? ''),
});

/** Atendimentos com início em [de, ate), em ordem de horário. */
export function observarAgendamentos(
  de: Date,
  ate: Date,
  aoMudar: (agendamentos: Agendamento[]) => void,
  aoFalhar: (erro: Error) => void,
) {
  const consulta = query(
    agendamentos,
    where('inicio', '>=', Timestamp.fromDate(de)),
    where('inicio', '<', Timestamp.fromDate(ate)),
    orderBy('inicio'),
  );
  return onSnapshot(
    consulta,
    (snap) => aoMudar(snap.docs.map((d) => paraAgendamento(d.id, d.data()))),
    aoFalhar,
  );
}

export function observarAgendamento(
  id: string,
  aoMudar: (agendamento: Agendamento | null) => void,
  aoFalhar: (erro: Error) => void,
) {
  return onSnapshot(
    doc(agendamentos, id),
    (snap) => aoMudar(snap.exists() ? paraAgendamento(snap.id, snap.data()) : null),
    aoFalhar,
  );
}

/** Horas (HHmm) com trava ativa no dia (AAAA-MM-DD): atendimentos e pedidos pendentes. */
export function observarOcupados(
  data: string,
  aoMudar: (ocupados: Set<string>) => void,
  aoFalhar: (erro: Error) => void,
) {
  return onSnapshot(
    query(travas, where('data', '==', data)),
    (snap) => {
      const agora = new Date();
      const ocupados = snap.docs
        .filter((d) => !travaLivre(paraData(d.data().expiraEm), agora))
        .map((d) => String(d.data().hora));
      aoMudar(new Set(ocupados));
    },
    aoFalhar,
  );
}

/**
 * Marca (sem `id`) ou altera um atendimento numa transação: confere as travas
 * novas, confirma-as (`expiraEm: null`) e libera as que deixaram de ser usadas.
 * Lança `HorarioOcupado` se outra trava ativa estiver no caminho. Precisa de
 * internet: a transação confere o estado no servidor.
 */
export async function marcarAtendimento(
  dados: NovoAgendamento,
  id?: string,
  travasAntigas: readonly string[] = [],
): Promise<string> {
  const ref = id ? doc(agendamentos, id) : doc(agendamentos);
  const novas = dados.travas.filter((t) => !travasAntigas.includes(t));
  const liberar = travasAntigas.filter((t) => !dados.travas.includes(t));

  await runTransaction(db, async (tx) => {
    const agora = new Date();
    for (const travaId of novas) {
      const snap = await tx.get(doc(travas, travaId));
      const expiraEm = snap.exists() ? paraData(snap.data().expiraEm) : undefined;
      if (!travaLivre(expiraEm, agora)) throw new HorarioOcupado();
    }
    for (const travaId of novas) {
      const [data, hora] = travaId.split('_');
      tx.set(doc(travas, travaId), { data, hora, expiraEm: null });
    }
    for (const travaId of liberar) tx.delete(doc(travas, travaId));

    const registro = {
      ...dados,
      inicio: Timestamp.fromDate(dados.inicio),
      atualizadoEm: serverTimestamp(),
    };
    if (id) tx.update(ref, registro);
    else tx.set(ref, { ...registro, criadoEm: serverTimestamp() });
  });
  return ref.id;
}

/** Cancela e libera as travas; funciona offline (sincroniza depois). */
export function cancelarAtendimento(agendamento: Pick<Agendamento, 'id' | 'travas'>) {
  const lote = writeBatch(db);
  lote.update(doc(agendamentos, agendamento.id), {
    status: 'cancelado',
    atualizadoEm: serverTimestamp(),
  });
  for (const travaId of agendamento.travas) lote.delete(doc(travas, travaId));
  gravarEmSegundoPlano(lote.commit());
}
