import { doc, onSnapshot, setDoc, type DocumentData } from 'firebase/firestore';
import { CONFIGURACOES_PADRAO, type Configuracoes } from '../dominio/configuracoes';
import type { Recorrente } from '../dominio/disponibilidade';
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

const paraRecorrentes = (d: DocumentData | undefined): Recorrente[] =>
  Array.isArray(d?.recorrentes)
    ? d.recorrentes.map((r: DocumentData) => ({
        dia: Number(r.dia),
        ini: String(r.ini),
        fim: String(r.fim),
      }))
    : [];

/** RF14: com a página pausada, a cliente vê o aviso e não consegue pedir horário. */
export type Pausa = { ativa: boolean; aviso: string };

const paraPausa = (d: DocumentData | undefined): Pausa => ({
  ativa: d?.pausa?.ativa === true,
  aviso: typeof d?.pausa?.aviso === 'string' ? d.pausa.aviso : '',
});

export function observarPausa(aoMudar: (pausa: Pausa) => void, aoFalhar: (erro: Error) => void) {
  return onSnapshot(configPublica, (snap) => aoMudar(paraPausa(snap.data())), aoFalhar);
}

/** Pausa ou reabre a página pública; funciona offline. */
export function salvarPausa(pausa: Pausa) {
  gravarEmSegundoPlano(setDoc(configPublica, { pausa }, { merge: true }));
}

/** Tudo o que a página pública lê; `null` se a manicure ainda não configurou nada. */
export type PaginaPublica = {
  config: Configuracoes;
  servicos: Servico[];
  recorrentes: Recorrente[];
  pausa: Pausa;
};

export function observarPaginaPublica(
  aoMudar: (pagina: PaginaPublica | null) => void,
  aoFalhar: (erro: Error) => void,
) {
  return onSnapshot(
    configPublica,
    (snap) =>
      aoMudar(
        snap.exists()
          ? {
              config: paraConfiguracoes(snap.data()),
              servicos: paraServicos(snap.data()),
              recorrentes: paraRecorrentes(snap.data()),
              pausa: paraPausa(snap.data()),
            }
          : null,
      ),
    aoFalhar,
  );
}
