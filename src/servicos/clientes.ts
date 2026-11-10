import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import type { Cliente, DadosCliente } from '../dominio/clientes';
import { db, gravarEmSegundoPlano } from './firebase';

const colecao = collection(db, 'clientes');

const paraCliente = (id: string, d: DocumentData): Cliente => ({
  id,
  nome: String(d.nome ?? ''),
  whatsapp: String(d.whatsapp ?? ''),
  observacao: String(d.observacao ?? ''),
  consentimento: true,
});

/** Acompanha a lista de clientes; devolve a função que para de acompanhar. */
export function observarClientes(
  aoMudar: (clientes: Cliente[]) => void,
  aoFalhar: (erro: Error) => void,
) {
  return onSnapshot(
    colecao,
    (snap) => aoMudar(snap.docs.map((d) => paraCliente(d.id, d.data()))),
    aoFalhar,
  );
}

/** Cria (sem `id`) ou atualiza a cliente e devolve o `id`, sem esperar o servidor. */
export function salvarCliente(dados: DadosCliente, id?: string): string {
  if (id) {
    gravarEmSegundoPlano(
      updateDoc(doc(colecao, id), { ...dados, atualizadoEm: serverTimestamp() }),
    );
    return id;
  }
  const ref = doc(colecao);
  gravarEmSegundoPlano(
    setDoc(ref, { ...dados, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() }),
  );
  return ref.id;
}
