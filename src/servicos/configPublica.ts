import { doc, onSnapshot, setDoc, type DocumentData } from 'firebase/firestore';
import type { Servico } from '../dominio/servicos';
import { db, gravarEmSegundoPlano } from './firebase';

/** `config/publico`: o que a página pública pode ler (serviços, e depois expediente etc.). */
const configPublica = doc(db, 'config', 'publico');

const paraServicos = (d: DocumentData | undefined): Servico[] =>
  Array.isArray(d?.servicos)
    ? d.servicos.map((s: DocumentData) => ({
        id: String(s.id),
        nome: String(s.nome ?? ''),
        duracaoMin: Number(s.duracaoMin ?? 30),
        precoCentavos: Number(s.precoCentavos ?? 0),
        publico: s.publico !== false,
      }))
    : [];

export function observarServicos(
  aoMudar: (servicos: Servico[]) => void,
  aoFalhar: (erro: Error) => void,
) {
  return onSnapshot(configPublica, (snap) => aoMudar(paraServicos(snap.data())), aoFalhar);
}

/** Grava a lista inteira de serviços (o documento é pequeno e só a manicure edita). */
export function salvarServicos(servicos: Servico[]) {
  gravarEmSegundoPlano(setDoc(configPublica, { servicos }, { merge: true }));
}

export const novoIdServico = () => crypto.randomUUID().slice(0, 8);
