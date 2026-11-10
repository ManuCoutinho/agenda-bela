import { z } from 'zod';

/** Blocos de 30 min, como as travas (até 10 blocos = 5 h). */
export const DURACOES_MIN = Array.from({ length: 10 }, (_, i) => (i + 1) * 30);

export type Servico = {
  id: string;
  nome: string;
  duracaoMin: number;
  precoCentavos: number;
  /** Aparece na página pública de agendamento. */
  publico: boolean;
};

/** "45", "45,5", "45,50", "R$ 1.200,00" → centavos; `null` se não for um valor. */
export function lerPreco(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '');
  if (!/^\d{1,5}(,\d{1,2})?$/.test(limpo)) return null;
  const [reais = '0', centavos = ''] = limpo.split(',');
  return Number(reais) * 100 + Number(centavos.padEnd(2, '0'));
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 4500 → "R$ 45,00" */
export const formatarPreco = (centavos: number) => moeda.format(centavos / 100);

/** 4500 → "45,00" (para preencher o campo) */
export const precoParaCampo = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

/** 30 → "30 min", 60 → "1 h", 90 → "1 h 30 min" */
export function formatarDuracao(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const esquemaServico = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Escreva o nome do serviço.')
    .max(60, 'Use até 60 letras no nome.'),
  duracaoMin: z.coerce
    .number()
    .refine((n) => DURACOES_MIN.includes(n), 'Escolha uma duração da lista.'),
  preco: z.string().transform((texto, ctx) => {
    const centavos = lerPreco(texto);
    if (centavos === null) {
      ctx.addIssue({ code: 'custom', message: 'Escreva o preço em reais, por exemplo 45,00.' });
      return z.NEVER;
    }
    return centavos;
  }),
  publico: z.boolean(),
});

export type CamposServico = z.input<typeof esquemaServico>;
export type DadosServico = z.output<typeof esquemaServico>;

export const paraServico = (id: string, d: DadosServico): Servico => ({
  id,
  nome: d.nome,
  duracaoMin: d.duracaoMin,
  precoCentavos: d.preco,
  publico: d.publico,
});

/** Inclui ou substitui o serviço pelo `id`, mantendo a ordem alfabética. */
export function gravarNaLista(lista: readonly Servico[], servico: Servico): Servico[] {
  const outros = lista.filter((s) => s.id !== servico.id);
  return [...outros, servico].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
  );
}

export const servicosPublicos = (lista: readonly Servico[]) => lista.filter((s) => s.publico);
