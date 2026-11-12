import { z } from 'zod';
import { dataDoDia, diaDaSemana, FAIXA_MARCACAO, horaDe, rotuloDia } from './agenda';
import { DIAS_SEMANA } from './configuracoes';
import { PASSO, type Faixa, type Recorrente } from './disponibilidade';

/**
 * RF05/RF06. Horário em que a manicure não atende.
 * - pontual: um dia (dentista, folga); ocupa travas confirmadas, como um
 *   atendimento, para a página pública enxergar o horário como ocupado.
 * - recorrente: toda semana (terapia); só dia/início/fim vão para
 *   `config/publico.recorrentes` – a descrição fica privada.
 */
export type BloqueioPontual = {
  id: string;
  tipo: 'pontual';
  data: string; // AAAA-MM-DD
  ini: string; // HH:mm
  fim: string; // HH:mm
  descricao: string;
  /** Travas que o bloqueio de fato ocupou ("resto do dia" pula as ocupadas). */
  travas: string[];
};

export type BloqueioRecorrente = {
  id: string;
  tipo: 'recorrente';
  dia: number; // 0 = domingo
  ini: string;
  fim: string;
  descricao: string;
};

export type Bloqueio = BloqueioPontual | BloqueioRecorrente;

/** Bloqueio que vale num dia, para listas e calendário. */
export type BloqueioNoDia = {
  id: string;
  ini: string;
  fim: string;
  descricao: string;
  recorrente: boolean;
};

const emMinutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));
const paraHora = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const semDoisPontos = (hora: string) => hora.replace(':', '');

/** IDs de trava (`AAAA-MM-DD_HHmm`) dos blocos de 30 min entre `ini` e `fim`. */
export function travasDoIntervalo(data: string, ini: string, fim: string): string[] {
  const ids: string[] = [];
  for (let t = emMinutos(ini); t < emMinutos(fim); t += PASSO) {
    ids.push(`${data}_${semDoisPontos(paraHora(t))}`);
  }
  return ids;
}

/** Bloqueios que valem no dia (pontuais da data + recorrentes do dia da semana), por horário. */
export function bloqueiosDoDia(bloqueios: readonly Bloqueio[], data: string): BloqueioNoDia[] {
  const dia = diaDaSemana(data);
  return bloqueios
    .filter((b) => (b.tipo === 'pontual' ? b.data === data : b.dia === dia))
    .map((b) => ({
      id: b.id,
      ini: b.ini,
      fim: b.fim,
      descricao: b.descricao,
      recorrente: b.tipo === 'recorrente',
    }))
    .sort((a, b) => a.ini.localeCompare(b.ini));
}

/**
 * Horas (HHmm) tomadas por bloqueios recorrentes no dia. Os pontuais já estão
 * nas travas; os recorrentes não têm trava (valem para sempre).
 */
export function horasRecorrentesNoDia(bloqueios: readonly Bloqueio[], data: string) {
  const horas = new Set<string>();
  for (const b of bloqueiosDoDia(bloqueios, data)) {
    if (!b.recorrente) continue;
    for (const id of travasDoIntervalo(data, b.ini, b.fim)) horas.add(id.slice(11));
  }
  return horas;
}

/** O que vai para `config/publico.recorrentes` (sem descrição). */
export const paraRecorrentesPublicos = (bloqueios: readonly Bloqueio[]): Recorrente[] =>
  bloqueios
    .filter((b): b is BloqueioRecorrente => b.tipo === 'recorrente')
    .map(({ dia, ini, fim }) => ({ dia, ini, fim }))
    .sort((a, b) => a.dia - b.dia || a.ini.localeCompare(b.ini));

/** Recorrentes (por dia da semana) e pontuais de hoje em diante (por data). */
export function separarBloqueios(bloqueios: readonly Bloqueio[], hoje: string) {
  const recorrentes = bloqueios
    .filter((b): b is BloqueioRecorrente => b.tipo === 'recorrente')
    .sort((a, b) => a.dia - b.dia || a.ini.localeCompare(b.ini));
  const proximos = bloqueios
    .filter((b): b is BloqueioPontual => b.tipo === 'pontual' && b.data >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data) || a.ini.localeCompare(b.ini));
  return { recorrentes, proximos };
}

export const rotuloHorario = (b: { ini: string; fim: string }) => `${b.ini}–${b.fim}`;

/** 'Toda terça-feira' / 'sexta-feira, 13 de novembro' */
export const rotuloQuando = (b: Bloqueio) =>
  b.tipo === 'recorrente'
    ? `${b.dia === 0 || b.dia === 6 ? 'Todo' : 'Toda'} ${(DIAS_SEMANA[b.dia] ?? '').toLowerCase()}`
    : rotuloDia(b.data);

/**
 * "Bloquear o resto do dia": do próximo horário cheio ou meia hora até o fim
 * do dia (o maior entre 22h e o fim do expediente). `null` se o dia acabou.
 */
export function restoDoDia(
  agora: Date,
  expedienteDoDia: readonly Faixa[],
): { data: string; ini: string; fim: string } | null {
  const hora = horaDe(agora);
  const minutos = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(2));
  const ini = Math.ceil(minutos / PASSO) * PASSO;
  const fim = Math.max(FAIXA_MARCACAO.fim, ...expedienteDoDia.map((f) => emMinutos(f.fim)));
  if (ini >= fim) return null;
  return { data: dataDoDia(agora), ini: paraHora(ini), fim: paraHora(fim) };
}

/** Horas de início/fim do formulário: 05:00 a 23:00, de 30 em 30 min. */
export const HORAS_BLOQUEIO = Array.from({ length: 37 }, (_, i) => paraHora(5 * 60 + i * PASSO));

export const esquemaBloqueio = z
  .object({
    tipo: z.enum(['pontual', 'recorrente']),
    data: z.string(),
    dia: z.coerce.number().int().min(0).max(6),
    ini: z.string().regex(/^\d{2}:\d{2}$/, 'Escolha o início.'),
    fim: z.string().regex(/^\d{2}:\d{2}$/, 'Escolha o fim.'),
    descricao: z.string().trim().max(60, 'Use até 60 letras.'),
  })
  .superRefine((d, ctx) => {
    if (d.tipo === 'pontual' && !/^\d{4}-\d{2}-\d{2}$/.test(d.data)) {
      ctx.addIssue({ code: 'custom', path: ['data'], message: 'Escolha o dia.' });
    }
    if (emMinutos(d.fim) <= emMinutos(d.ini)) {
      ctx.addIssue({
        code: 'custom',
        path: ['fim'],
        message: 'O fim precisa ser depois do início.',
      });
    }
  });

export type CamposBloqueio = z.input<typeof esquemaBloqueio>;
export type DadosBloqueio = z.output<typeof esquemaBloqueio>;
