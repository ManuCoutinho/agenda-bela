import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { HorarioOcupado, travaLivre } from '../dominio/agenda';
import type { Bloqueio, BloqueioPontual, BloqueioRecorrente } from '../dominio/bloqueios';
import type { Recorrente } from '../dominio/disponibilidade';
import { db, gravarEmSegundoPlano } from './firebase';

const bloqueios = collection(db, 'bloqueios');
const travas = collection(db, 'travas');
const configPublica = doc(db, 'config', 'publico');

const paraData = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

const paraBloqueio = (id: string, d: DocumentData): Bloqueio => {
  const comum = {
    id,
    ini: String(d.ini ?? '00:00'),
    fim: String(d.fim ?? '00:00'),
    descricao: String(d.descricao ?? ''),
  };
  return d.tipo === 'recorrente'
    ? { ...comum, tipo: 'recorrente', dia: Number(d.dia ?? 0) }
    : {
        ...comum,
        tipo: 'pontual',
        data: String(d.data ?? ''),
        travas: Array.isArray(d.travas) ? d.travas.map(String) : [],
      };
};

export function observarBloqueios(
  aoMudar: (bloqueios: Bloqueio[]) => void,
  aoFalhar: (erro: Error) => void,
) {
  return onSnapshot(
    bloqueios,
    (snap) => aoMudar(snap.docs.map((d) => paraBloqueio(d.id, d.data()))),
    aoFalhar,
  );
}

/**
 * Bloqueio de um dia numa transação: confirma as travas (`expiraEm: null`)
 * como um atendimento. Se uma trava já estiver tomada, lança `HorarioOcupado`
 * – ou, com `pularOcupados` ("resto do dia"), deixa aquele horário como está.
 * Devolve quantos horários foram bloqueados (0 = nada gravado). Precisa de
 * internet.
 */
export async function bloquearHorario(
  dados: Omit<BloqueioPontual, 'id' | 'tipo'>,
  pularOcupados = false,
): Promise<number> {
  const ref = doc(bloqueios);
  return runTransaction(db, async (tx) => {
    const agora = new Date();
    const livres: string[] = [];
    for (const travaId of dados.travas) {
      const snap = await tx.get(doc(travas, travaId));
      const expiraEm = snap.exists() ? paraData(snap.data().expiraEm) : undefined;
      if (travaLivre(expiraEm, agora)) livres.push(travaId);
      else if (!pularOcupados) throw new HorarioOcupado();
    }
    if (livres.length === 0) return 0;
    for (const travaId of livres) {
      const [data, hora] = travaId.split('_');
      tx.set(doc(travas, travaId), { data, hora, expiraEm: null });
    }
    tx.set(ref, { ...dados, tipo: 'pontual', travas: livres, criadoEm: serverTimestamp() });
    return livres.length;
  });
}

/**
 * Bloqueio de toda semana + lista pública de recorrentes (já com ele), no
 * mesmo lote. Funciona offline.
 */
export function salvarBloqueioRecorrente(
  dados: Omit<BloqueioRecorrente, 'id' | 'tipo'>,
  recorrentesPublicos: Recorrente[],
) {
  const lote = writeBatch(db);
  lote.set(doc(bloqueios), { ...dados, tipo: 'recorrente', criadoEm: serverTimestamp() });
  lote.set(configPublica, { recorrentes: recorrentesPublicos }, { merge: true });
  gravarEmSegundoPlano(lote.commit());
}

/**
 * Exclui o bloqueio e libera o que ele ocupava: as travas (pontual) ou a
 * entrada na lista pública (recorrente, já sem ele). Funciona offline.
 */
export function excluirBloqueio(bloqueio: Bloqueio, recorrentesPublicos: Recorrente[]) {
  const lote = writeBatch(db);
  lote.delete(doc(bloqueios, bloqueio.id));
  if (bloqueio.tipo === 'pontual') {
    for (const travaId of bloqueio.travas) lote.delete(doc(travas, travaId));
  } else {
    lote.set(configPublica, { recorrentes: recorrentesPublicos }, { merge: true });
  }
  gravarEmSegundoPlano(lote.commit());
}
