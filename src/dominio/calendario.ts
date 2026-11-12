import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TZDate } from '@date-fns/tz';
import {
  diaDaSemana,
  diasAPartirDe,
  fimDe,
  FUSO,
  inicioEm,
  somarDias,
  type Agendamento,
} from './agenda';
import { bloqueiosDoDia, type Bloqueio } from './bloqueios';

/** Visões do calendário da manicure. A semana começa no domingo, como no Brasil. */
export type Visao = 'semana' | 'mes';

export const lerVisao = (texto: string | null): Visao => (texto === 'mes' ? 'mes' : 'semana');

export const dataValida = (texto: string | null): texto is string =>
  !!texto && /^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(Date.parse(texto));

/** Domingo da semana do dia. */
export const inicioDaSemana = (dia: string) => somarDias(dia, -diaDaSemana(dia));

const primeiroDoMes = (dia: string) => `${dia.slice(0, 8)}01`;

/** Primeiro dia do mês `passo` meses depois (ou antes) do mês do dia. */
function somarMeses(dia: string, passo: number) {
  const [ano, mes] = dia.split('-').map(Number) as [number, number];
  const total = ano * 12 + (mes - 1) + passo;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`;
}

/**
 * Dias que a visão mostra: a semana (domingo a sábado) ou as semanas inteiras
 * que cobrem o mês (5 ou 6, como na grade do mês).
 */
export function intervaloDaVisao(visao: Visao, dia: string): { inicio: string; dias: number } {
  if (visao === 'semana') return { inicio: inicioDaSemana(dia), dias: 7 };
  const inicio = inicioDaSemana(primeiroDoMes(dia));
  const ultimo = somarDias(somarMeses(dia, 1), -1);
  const fim = somarDias(inicioDaSemana(ultimo), 7);
  const dias = Math.round((Date.parse(fim) - Date.parse(inicio)) / 86_400_000);
  return { inicio, dias };
}

/** Dia escolhido depois de tocar em "anterior"/"próximo". */
export const passarPeriodo = (visao: Visao, dia: string, passo: 1 | -1) =>
  visao === 'semana' ? somarDias(dia, 7 * passo) : somarMeses(dia, passo);

const noMeioDoDia = (dia: string) => inicioEm(dia, '1200');

/** 'novembro de 2026' ou '8 – 14 de novembro' / '29 de novembro – 5 de dezembro'. */
export function tituloDaVisao(visao: Visao, dia: string) {
  if (visao === 'mes') return format(noMeioDoDia(dia), "MMMM 'de' yyyy", { locale: ptBR });
  const ini = inicioDaSemana(dia);
  const fim = somarDias(ini, 6);
  const mesmoMes = ini.slice(0, 7) === fim.slice(0, 7);
  const de = format(noMeioDoDia(ini), mesmoMes ? 'd' : "d 'de' MMMM", { locale: ptBR });
  const ate = format(noMeioDoDia(fim), "d 'de' MMMM", { locale: ptBR });
  return `${de} – ${ate}`;
}

/**
 * O FullCalendar roda em UTC e recebe a hora de parede de São Paulo como se
 * fosse UTC: assim o calendário mostra a hora de lá em qualquer celular, sem
 * plugin de fuso. Ex.: 12:30 em São Paulo → '2026-11-12T12:30:00'.
 */
export const paraHoraDeParede = (d: Date) => format(new TZDate(d, FUSO), "yyyy-MM-dd'T'HH:mm:ss");

/** Toque no calendário: '2026-11-12' (dia) ou '2026-11-12T14:30:00Z' (horário). */
export function lerToque(texto: string): { data: string; hora: string | null } {
  const data = texto.slice(0, 10);
  const hora = texto.length > 10 ? `${texto.slice(11, 13)}${texto.slice(14, 16)}` : null;
  return { data, hora };
}

export type TipoEvento = 'atendimento' | 'bloqueio';

export type EventoCalendario = {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  inicio: string;
  fim: string;
};

/** Atendimentos (os cancelados saem) no formato do calendário. */
export const paraEventos = (agendamentos: readonly Agendamento[]): EventoCalendario[] =>
  agendamentos
    .filter((a) => a.status !== 'cancelado')
    .map((a) => ({
      id: a.id,
      tipo: 'atendimento' as const,
      titulo: `${a.status === 'falta' ? 'Faltou: ' : ''}${a.clienteNome} · ${a.servicoNome}`,
      inicio: paraHoraDeParede(a.inicio),
      fim: paraHoraDeParede(fimDe(a)),
    }));

/**
 * Bloqueios dos `dias` dias a partir de `inicio`: os recorrentes viram um
 * evento por semana. Vários eventos podem ter o mesmo `id` (o do bloqueio).
 */
export const paraEventosDeBloqueio = (
  bloqueios: readonly Bloqueio[],
  inicio: string,
  dias: number,
): EventoCalendario[] =>
  diasAPartirDe(inicio, dias).flatMap((data) =>
    bloqueiosDoDia(bloqueios, data).map((b) => ({
      id: b.id,
      tipo: 'bloqueio' as const,
      titulo: b.descricao ? `Bloqueado · ${b.descricao}` : 'Bloqueado',
      inicio: `${data}T${b.ini}:00`,
      fim: `${data}T${b.fim}:00`,
    })),
  );
