import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  agruparPorDia,
  diaDaSemana,
  diasAPartirDe,
  inicioEm,
  somarDias,
  type Agendamento,
} from './agenda';
import { bloqueiosDoDia, type Bloqueio } from './bloqueios';

export const dataValida = (texto: string | null): texto is string =>
  !!texto && /^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(Date.parse(texto));

/** Domingo da semana do dia: a semana começa no domingo, como no Brasil. */
export const inicioDaSemana = (dia: string) => somarDias(dia, -diaDaSemana(dia));

export const primeiroDoMes = (dia: string) => `${dia.slice(0, 8)}01`;

/** Primeiro dia do mês `passo` meses depois (ou antes) do mês do dia. */
export function somarMeses(dia: string, passo: number) {
  const [ano, mes] = dia.split('-').map(Number) as [number, number];
  const total = ano * 12 + (mes - 1) + passo;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`;
}

/** Semanas inteiras (domingo a sábado) que cobrem o mês do dia: 5 ou 6, como na grade. */
export function intervaloDoMes(dia: string): { inicio: string; dias: number } {
  const inicio = inicioDaSemana(primeiroDoMes(dia));
  const ultimo = somarDias(somarMeses(dia, 1), -1);
  const fim = somarDias(inicioDaSemana(ultimo), 7);
  const dias = Math.round((Date.parse(fim) - Date.parse(inicio)) / 86_400_000);
  return { inicio, dias };
}

/**
 * Dia escolhido ao trocar de mês: o mesmo dia do mês, ou o último se o mês
 * novo for mais curto (31/01 → 28/02).
 */
export function passarMes(dia: string, passo: number) {
  const primeiro = somarMeses(dia, passo);
  const ultimo = Number(somarDias(somarMeses(primeiro, 1), -1).slice(8));
  const d = Math.min(Number(dia.slice(8)), ultimo);
  return `${primeiro.slice(0, 8)}${String(d).padStart(2, '0')}`;
}

/** 'Novembro' e '2026'. */
export const tituloDoMes = (dia: string) => ({
  mes: format(inicioEm(primeiroDoMes(dia), '1200'), 'LLLL', { locale: ptBR }).replace(/^./, (l) =>
    l.toUpperCase(),
  ),
  ano: dia.slice(0, 4),
});

/**
 * O seletor de datas trabalha com `Date` no fuso do aparelho. Ao meio-dia
 * local, o dia do calendário é o mesmo da string AAAA-MM-DD em qualquer fuso.
 */
export function paraDataLocal(dia: string) {
  const [ano, mes, d] = dia.split('-').map(Number) as [number, number, number];
  return new Date(ano, mes - 1, d, 12);
}

export const deDataLocal = (d: Date) => format(d, 'yyyy-MM-dd');

/** O que o dia tem, para os marcadores embaixo do número. */
export type MarcasDoDia = { atendimentos: number; bloqueios: number };

/** Marcas dos `dias` dias a partir de `inicio`; dias sem nada ficam de fora. */
export function marcasPorDia(
  agendamentos: readonly Agendamento[],
  bloqueios: readonly Bloqueio[],
  inicio: string,
  dias: number,
): Map<string, MarcasDoDia> {
  const porDia = agruparPorDia(agendamentos);
  const marcas = new Map<string, MarcasDoDia>();
  for (const dia of diasAPartirDe(inicio, dias)) {
    const atendimentos = porDia.get(dia)?.length ?? 0;
    const qtdBloqueios = bloqueiosDoDia(bloqueios, dia).length;
    if (atendimentos || qtdBloqueios) marcas.set(dia, { atendimentos, bloqueios: qtdBloqueios });
  }
  return marcas;
}
