import { doc, onSnapshot, setDoc, type DocumentData } from 'firebase/firestore';
import { CONFIGURACOES_PADRAO, type Configuracoes } from '../dominio/configuracoes';
import type { Servico } from '../dominio/servicos';
import { db, gravarEmSegundoPlano } from './firebase';

/** `config/publico`: o que a página pública pode ler (serviços, expediente, contato). */
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

/** Campos ausentes (ainda não salvos) ficam com o padrão. */
const paraConfiguracoes = (d: DocumentData | undefined): Configuracoes => {
  const p = CONFIGURACOES_PADRAO;
  const texto = (v: unknown, padrao: string) => (typeof v === 'string' ? v : padrao);
  const numero = (v: unknown, padrao: number) => (typeof v === 'number' ? v : padrao);
  return {
    nome: texto(d?.nome, p.nome),
    slug: texto(d?.slug, p.slug),
    whatsapp: texto(d?.whatsapp, p.whatsapp),
    endereco: texto(d?.endereco, p.endereco),
    expediente: Array.isArray(d?.expediente)
      ? d.expediente.map((f: DocumentData) => ({
          dia: Number(f.dia),
          ini: String(f.ini),
          fim: String(f.fim),
        }))
      : p.expediente,
    intervaloMin: numero(d?.intervaloMin, p.intervaloMin),
    antecedenciaMin: numero(d?.antecedenciaMin, p.antecedenciaMin),
    janelaDias: numero(d?.janelaDias, p.janelaDias),
  };
};

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

export function observarConfiguracoes(
  aoMudar: (config: Configuracoes) => void,
  aoFalhar: (erro: Error) => void,
) {
  return onSnapshot(configPublica, (snap) => aoMudar(paraConfiguracoes(snap.data())), aoFalhar);
}

/** Mescla com os serviços que já estão no documento. */
export function salvarConfiguracoes(config: Configuracoes) {
  gravarEmSegundoPlano(setDoc(configPublica, config, { merge: true }));
}
