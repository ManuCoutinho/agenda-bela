import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { dataDoDia, horaDe, rotuloDia, rotuloHora } from '../dominio/agenda';
import {
  planejarTravasPorHora,
  type ConflitoDeHora,
  type Reserva,
} from '../dominio/migracaoTravas';
import { pedidoExpirado } from '../dominio/pedidos';
import { db, gravarEmSegundoPlano } from './firebase';

/** `config/migracoes`: só da dona; marca o que já foi convertido. */
const migracoes = doc(db, 'config', 'migracoes');

const paraData = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);
const quando = (inicio: Date) => `${rotuloDia(dataDoDia(inicio))}, ${rotuloHora(horaDe(inicio))}`;
const listaDeTravas = (d: DocumentData) => (Array.isArray(d.travas) ? d.travas.map(String) : []);

/** Lotes do Firestore aceitam até 500 gravações. */
const POR_LOTE = 450;

async function reservasFuturas(agora: Date): Promise<Reserva[]> {
  const hoje = dataDoDia(agora);
  const [ags, bls, peds] = await Promise.all([
    getDocsFromServer(
      query(collection(db, 'agendamentos'), where('inicio', '>=', Timestamp.fromDate(agora))),
    ),
    getDocsFromServer(query(collection(db, 'bloqueios'), where('data', '>=', hoje))),
    getDocsFromServer(query(collection(db, 'pedidos'), where('status', '==', 'pendente'))),
  ]);
  const reservas: Reserva[] = [];
  for (const d of ags.docs) {
    const a = d.data();
    const inicio = paraData(a.inicio);
    if (a.status !== 'marcado' && a.status !== undefined) continue;
    reservas.push({
      colecao: 'agendamentos',
      id: d.id,
      travas: listaDeTravas(a),
      expiraEm: null,
      rotulo: `${String(a.clienteNome ?? 'Atendimento')}, ${inicio ? quando(inicio) : ''}`,
    });
  }
  for (const d of bls.docs) {
    const b = d.data();
    if (b.tipo === 'recorrente') continue;
    reservas.push({
      colecao: 'bloqueios',
      id: d.id,
      travas: listaDeTravas(b),
      expiraEm: null,
      rotulo: `Bloqueio, ${rotuloDia(String(b.data))}, ${String(b.ini)}`,
    });
  }
  for (const d of peds.docs) {
    const p = d.data();
    const criadoEm = paraData(p.criadoEm) ?? agora;
    const inicio = paraData(p.inicio);
    if (pedidoExpirado({ criadoEm }, agora) || !inicio || inicio < agora) continue;
    const expiraEm = new Date(criadoEm.getTime() + 24 * 3_600_000);
    reservas.push({
      colecao: 'pedidos',
      id: d.id,
      travas: listaDeTravas(p),
      expiraEm,
      rotulo: `Pedido de ${String(p.nome ?? '')}, ${quando(inicio)}`,
    });
  }
  return reservas;
}

/**
 * I05: converte uma vez as travas futuras de 30 min para 1 h. Roda quando a
 * dona abre o app; se faltar internet, tenta de novo na próxima vez.
 */
export async function migrarTravasPorHora(agora = new Date()): Promise<void> {
  const estado = await getDocFromServer(migracoes);
  if (estado.data()?.travasPorHora === true) return;

  const plano = planejarTravasPorHora(await reservasFuturas(agora));
  const operacoes: ((lote: ReturnType<typeof writeBatch>) => void)[] = [
    ...plano.mudancas.map(
      ({ reserva, travas }) =>
        (lote: ReturnType<typeof writeBatch>) =>
          lote.update(doc(db, reserva.colecao, reserva.id), { travas }),
    ),
    ...plano.gravar.map(({ id, expiraEm }) => (lote: ReturnType<typeof writeBatch>) => {
      const [data, hora] = id.split('_');
      lote.set(doc(db, 'travas', id), {
        data,
        hora,
        expiraEm: expiraEm ? Timestamp.fromDate(expiraEm) : null,
      });
    }),
    ...plano.apagar.map(
      (id) => (lote: ReturnType<typeof writeBatch>) => lote.delete(doc(db, 'travas', id)),
    ),
  ];
  for (let i = 0; i < operacoes.length; i += POR_LOTE) {
    const lote = writeBatch(db);
    for (const operacao of operacoes.slice(i, i + POR_LOTE)) operacao(lote);
    await lote.commit();
  }
  await setDoc(
    migracoes,
    { travasPorHora: true, conflitosHora: plano.conflitos, travasPorHoraEm: serverTimestamp() },
    { merge: true },
  );
}

const paraConflitos = (d: DocumentData | undefined): ConflitoDeHora[] =>
  Array.isArray(d?.conflitosHora)
    ? d.conflitosHora.map((c: DocumentData) => ({
        trava: String(c.trava),
        rotulos: Array.isArray(c.rotulos) ? c.rotulos.map(String) : [],
      }))
    : [];

/** Horas que ficaram com mais de uma reserva depois da conversão. */
export function observarConflitosDeHora(
  aoMudar: (conflitos: ConflitoDeHora[]) => void,
  aoFalhar: (erro: Error) => void,
) {
  return onSnapshot(migracoes, (snap) => aoMudar(paraConflitos(snap.data())), aoFalhar);
}

export function dispensarConflitosDeHora() {
  gravarEmSegundoPlano(setDoc(migracoes, { conflitosHora: [] }, { merge: true }));
}
