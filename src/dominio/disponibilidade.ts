export type Faixa = { ini: string; fim: string }; // 'HH:mm'
export type Recorrente = { dia: number; ini: string; fim: string }; // 0 = domingo

export const PASSO = 30;

/** '09:30' → 570 */
export const emMinutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));

export const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}`;

export const blocosNecessarios = (duracaoMin: number, intervaloMin: number) =>
  Math.ceil((duracaoMin + intervaloMin) / PASSO) * PASSO;
