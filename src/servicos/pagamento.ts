import { doc, onSnapshot, setDoc, type DocumentData } from 'firebase/firestore';
import { PAGAMENTO_PADRAO, type Pagamento } from '../dominio/pagamento';
import { db, gravarEmSegundoPlano } from './firebase';

/** Fora de `config/publico`: as regras só deixam a manicure ler os outros docs de `config`. */
const configPagamento = doc(db, 'config', 'pagamento');

const paraPagamento = (d: DocumentData | undefined): Pagamento => ({
  chavePix: typeof d?.chavePix === 'string' ? d.chavePix : PAGAMENTO_PADRAO.chavePix,
  sinalPercentual:
    typeof d?.sinalPercentual === 'number' ? d.sinalPercentual : PAGAMENTO_PADRAO.sinalPercentual,
});

export function observarPagamento(
  aoMudar: (pagamento: Pagamento) => void,
  aoFalhar: (erro: Error) => void,
) {
  return onSnapshot(configPagamento, (snap) => aoMudar(paraPagamento(snap.data())), aoFalhar);
}

export function salvarPagamento(pagamento: Pagamento) {
  gravarEmSegundoPlano(setDoc(configPagamento, pagamento, { merge: true }));
}
