import { describe, expect, it } from 'vitest';
import {
  arredondarHora,
  blocosNecessarios,
  emMinutos,
  hhmm,
  horaCheia,
  porHora,
} from './disponibilidade';

describe('auxiliares', () => {
  it('arredonda duração + intervalo para horas inteiras', () => {
    expect(blocosNecessarios(120, 0)).toBe(120);
    expect(blocosNecessarios(90, 0)).toBe(120);
    expect(blocosNecessarios(60, 60)).toBe(120);
    expect(blocosNecessarios(30, 0)).toBe(60);
  });

  it('hora cheia para baixo ou para cima', () => {
    expect(arredondarHora(570)).toBe(540);
    expect(arredondarHora(570, true)).toBe(600);
    expect(arredondarHora(600, true)).toBe(600);
  });

  it('trava antiga de meia hora conta como a hora inteira', () => {
    expect(horaCheia('1030')).toBe('1000');
    expect([...porHora(['0900', '1030', '1000'])]).toEqual(['0900', '1000']);
  });

  it('formata minutos como HHmm', () => {
    expect(hhmm(9 * 60)).toBe('0900');
    expect(hhmm(14 * 60 + 30)).toBe('1430');
    expect(emMinutos('14:30')).toBe(870);
  });
});
