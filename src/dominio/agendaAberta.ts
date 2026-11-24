import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { dataDoDia, inicioEm, somarDias } from './agenda';
import { somarMeses } from './calendario';

/**
 * I06: a manicure abre a agenda mês a mês. Cada mês é um número AAAAMM
 * (202612), o mesmo formato que as regras do Firestore calculam.
 */
export type Mes = number;

/** '2026-12-05' → 202612 */
export const mesDoDia = (dia: string): Mes =>
  Number(dia.slice(0, 4)) * 100 + Number(dia.slice(5, 7));

/** 202612 → '2026-12-01' */
export const primeiroDia = (mes: Mes) =>
  `${Math.floor(mes / 100)}-${String(mes % 100).padStart(2, '0')}-01`;

/** O mês atual e os seguintes, em São Paulo. */
export function proximosMeses(agora: Date, quantos = 12): Mes[] {
  const hoje = dataDoDia(agora);
  return Array.from({ length: quantos }, (_, i) => mesDoDia(somarMeses(hoje, i)));
}

/** Antes de a manicure escolher: o mês atual e o seguinte (como a janela antiga). */
export const mesesPadrao = (agora: Date) => proximosMeses(agora, 2);

/** Sem os meses que já passaram, em ordem e sem repetição. */
export const mesesValidos = (meses: readonly Mes[], agora: Date): Mes[] => {
  const atual = mesDoDia(dataDoDia(agora));
  return [...new Set(meses)].filter((m) => m >= atual).sort((a, b) => a - b);
};

/** 202612 → 'dezembro de 2026' */
export const rotuloMes = (mes: Mes) =>
  format(inicioEm(primeiroDia(mes), '1200'), "LLLL 'de' yyyy", { locale: ptBR });

/** Dias (AAAA-MM-DD) de hoje até o fim do último mês aberto, só dos meses abertos. */
export function diasDosMesesAbertos(agora: Date, meses: readonly Mes[]): string[] {
  const abertos = mesesValidos(meses, agora);
  const ultimo = abertos.at(-1);
  if (ultimo === undefined) return [];
  const dias: string[] = [];
  for (let dia = dataDoDia(agora); mesDoDia(dia) <= ultimo; dia = somarDias(dia, 1)) {
    if (abertos.includes(mesDoDia(dia))) dias.push(dia);
  }
  return dias;
}

/** A partir do dia 20, lembra de abrir o mês seguinte se ele ainda estiver fechado. */
export function mesParaAbrir(agora: Date, meses: readonly Mes[]): Mes | null {
  const hoje = dataDoDia(agora);
  if (Number(hoje.slice(8)) < 20) return null;
  const seguinte = mesDoDia(somarMeses(hoje, 1));
  return meses.includes(seguinte) ? null : seguinte;
}
