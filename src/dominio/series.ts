import { dataDoDia, somarDias } from './agenda';
import { mesDoDia, mesesValidos, type Mes } from './agendaAberta';

/** I11: de quantos em quantos dias o horário fixo se repete (0 = não repete). */
export type Repeticao = 0 | 7 | 14 | 28;

export const REPETICOES: readonly { dias: Repeticao; rotulo: string }[] = [
  { dias: 0, rotulo: 'Não repetir' },
  { dias: 7, rotulo: 'Toda semana' },
  { dias: 14, rotulo: 'Quinzenal' },
  { dias: 28, rotulo: 'Mensal' },
];

/** Horário fixo de uma cliente (`series/{id}`); a dona encerra quando ela parar de vir. */
export type Serie = {
  id: string;
  nome: string;
  whatsapp: string;
  servicoId: string;
  /** Hora de início, HH00. */
  hora: string;
  frequenciaDias: Exclude<Repeticao, 0>;
  /** Primeira data (AAAA-MM-DD); as outras andam `frequenciaDias` a partir dela. */
  primeiraData: string;
  ativa: boolean;
};

/** O pedido de cada data tem id fixo: reservar de novo a mesma data não duplica. */
export const idPedidoDaSerie = (serieId: string, data: string) => `${serieId}_${data}`;

/**
 * Datas da série nos meses abertos, a partir da primeira (inclusive), sem as
 * que já passaram. Para no último mês aberto.
 */
export function datasDaSerie(
  primeira: string,
  frequenciaDias: number,
  meses: readonly Mes[],
  agora: Date,
): string[] {
  const abertos = mesesValidos(meses, agora);
  const ultimo = abertos.at(-1);
  if (ultimo === undefined || frequenciaDias <= 0) return [];
  const hoje = dataDoDia(agora);
  const datas: string[] = [];
  for (let d = primeira; mesDoDia(d) <= ultimo; d = somarDias(d, frequenciaDias)) {
    if (d >= hoje && abertos.includes(mesDoDia(d))) datas.push(d);
  }
  return datas;
}

/** Datas da série dentro de um mês (para reservar quando a dona abre o mês). */
export function datasNoMes(serie: Pick<Serie, 'primeiraData' | 'frequenciaDias'>, mes: Mes) {
  const datas: string[] = [];
  for (let d = serie.primeiraData; mesDoDia(d) <= mes; d = somarDias(d, serie.frequenciaDias)) {
    if (mesDoDia(d) === mes) datas.push(d);
  }
  return datas;
}
