import { z } from 'zod';
import { formatarWhatsApp, normalizarWhatsApp } from './clientes';
import type { Faixa, Recorrente } from './disponibilidade';

/** Índice = `getDay()` (0 = domingo). */
export const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

/** Faixa de trabalho num dia da semana; mesmo formato do bloqueio recorrente. */
export type FaixaExpediente = Recorrente;

/** RF04. Fica em `config/publico`: a página pública precisa de tudo isto. */
export type Configuracoes = {
  /** Nome do espaço, mostrado na página pública. */
  nome: string;
  /** Final do link público: `/agendar/<slug>`. */
  slug: string;
  /** WhatsApp da manicure (55 + DDD + número) ou '' se ainda não informado. */
  whatsapp: string;
  endereco: string;
  expediente: FaixaExpediente[];
  /** Folga depois de cada atendimento (RN04). */
  intervaloMin: number;
  /** Quanto antes a cliente precisa pedir o horário (RN03). */
  antecedenciaMin: number;
  /** Até quantos dias à frente a cliente pode pedir. */
  janelaDias: number;
};

/** Os horários andam em blocos de 30 min, então o intervalo também. */
export const INTERVALOS_MIN = [0, 30, 60];
export const ANTECEDENCIAS_MIN = [0, 60, 120, 240, 720, 1440, 2880];
export const JANELAS_DIAS = [7, 14, 30, 60, 90];

/** Horas oferecidas para início e fim do expediente: 05:00 a 23:00, de 30 em 30 min. */
export const HORAS_EXPEDIENTE = Array.from({ length: 37 }, (_, i) => {
  const m = 5 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});

const DIA_PADRAO = { ini: '09:00', fim: '18:00' };

/** Usado enquanto a manicure não salva as configurações: segunda a sábado, 9h às 18h. */
export const CONFIGURACOES_PADRAO: Configuracoes = {
  nome: '',
  slug: '',
  whatsapp: '',
  endereco: '',
  expediente: [1, 2, 3, 4, 5, 6].map((dia) => ({ dia, ...DIA_PADRAO })),
  intervaloMin: 0,
  antecedenciaMin: 120,
  janelaDias: 30,
};

export const expedienteDoDia = (expediente: readonly FaixaExpediente[], dia: number): Faixa[] =>
  expediente.filter((f) => f.dia === dia).map(({ ini, fim }) => ({ ini, fim }));

/** "Espaço Juju!" → "espaco-juju" */
export const gerarSlug = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');

/** 0 → "Sem antecedência", 90 → "1 h 30 min", 1440 → "1 dia" */
export function formatarAntecedencia(minutos: number) {
  if (minutos === 0) return 'Sem antecedência';
  if (minutos % 1440 === 0) return minutos === 1440 ? '1 dia' : `${minutos / 1440} dias`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const escolhaDaLista = (opcoes: readonly number[]) =>
  z.coerce.number().refine((n) => opcoes.includes(n), 'Escolha uma opção da lista.');

const esquemaDia = z.object({ aberto: z.boolean(), ini: z.string(), fim: z.string() });

export const esquemaConfiguracoes = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Escreva o nome do seu espaço.')
    .max(60, 'Use até 60 letras no nome.'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Use só letras sem acento, números e hífen, por exemplo espaco-juju.',
    )
    .min(3, 'Use pelo menos 3 letras no link.')
    .max(40, 'Use até 40 letras no link.'),
  whatsapp: z.string().transform((texto, ctx) => {
    const numero = normalizarWhatsApp(texto);
    if (!numero) {
      ctx.addIssue({
        code: 'custom',
        message: 'Escreva o WhatsApp com DDD, por exemplo (41) 98860-6636.',
      });
      return z.NEVER;
    }
    return numero;
  }),
  endereco: z.string().trim().max(200, 'Use até 200 letras no endereço.'),
  dias: z
    .array(esquemaDia)
    .length(7)
    .superRefine((dias, ctx) => {
      dias.forEach((d, i) => {
        if (d.aberto && d.fim <= d.ini) {
          ctx.addIssue({
            code: 'custom',
            path: [i, 'fim'],
            message: 'O fim precisa ser depois do início.',
          });
        }
      });
    }),
  intervaloMin: escolhaDaLista(INTERVALOS_MIN),
  antecedenciaMin: escolhaDaLista(ANTECEDENCIAS_MIN),
  janelaDias: escolhaDaLista(JANELAS_DIAS),
});

export type CamposConfiguracoes = z.input<typeof esquemaConfiguracoes>;
export type DadosConfiguracoes = z.output<typeof esquemaConfiguracoes>;

export const paraConfiguracoes = (d: DadosConfiguracoes): Configuracoes => ({
  nome: d.nome,
  slug: d.slug,
  whatsapp: d.whatsapp,
  endereco: d.endereco,
  expediente: d.dias.flatMap((dia, i) =>
    dia.aberto ? [{ dia: i, ini: dia.ini, fim: dia.fim }] : [],
  ),
  intervaloMin: d.intervaloMin,
  antecedenciaMin: d.antecedenciaMin,
  janelaDias: d.janelaDias,
});

/** Preenche o formulário; dia fechado mostra o horário padrão se for aberto. */
export const paraCampos = (c: Configuracoes): CamposConfiguracoes => ({
  nome: c.nome,
  slug: c.slug,
  whatsapp: c.whatsapp && formatarWhatsApp(c.whatsapp),
  endereco: c.endereco,
  dias: DIAS_SEMANA.map((_, i) => {
    const faixa = c.expediente.find((f) => f.dia === i);
    return faixa
      ? { aberto: true, ini: faixa.ini, fim: faixa.fim }
      : { aberto: false, ...DIA_PADRAO };
  }),
  intervaloMin: String(c.intervaloMin),
  antecedenciaMin: String(c.antecedenciaMin),
  janelaDias: String(c.janelaDias),
});
