export type Faixa = { ini: string; fim: string }; // 'HH:mm'
export type Recorrente = { dia: number; ini: string; fim: string }; // 0 = domingo

/** Horários e travas andam de hora em hora (a trava `AAAA-MM-DD_HH00` vale a hora inteira). */
export const PASSO = 60;

/** '09:30' → 570 */
export const emMinutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));

export const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}`;

/** Trava antiga de meia hora ('1030') ocupa a hora toda ('1000'). */
export const horaCheia = (hora: string) => `${hora.slice(0, 2)}00`;

export const porHora = (horas: Iterable<string>): ReadonlySet<string> =>
  new Set([...horas].map(horaCheia));

/** Hora cheia em minutos, para baixo (`acima` = para cima). */
export const arredondarHora = (minutos: number, acima = false) =>
  (acima ? Math.ceil(minutos / PASSO) : Math.floor(minutos / PASSO)) * PASSO;

/** Minutos reservados para serviço + intervalo: 1 h 30 ocupa 2 h. */
export const blocosNecessarios = (duracaoMin: number, intervaloMin: number) =>
  arredondarHora(duracaoMin + intervaloMin, true);
