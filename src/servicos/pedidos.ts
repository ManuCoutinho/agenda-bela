import { FirebaseError } from 'firebase/app';
import { collection, doc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { expiracaoDoPedido, HorarioJaPedido, type DadosPedido } from '../dominio/pedidos';
import { db } from './firebase';

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
