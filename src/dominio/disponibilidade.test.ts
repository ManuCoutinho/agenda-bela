import { describe, expect, it } from 'vitest';
import { blocosNecessarios, emMinutos, hhmm } from './disponibilidade';

describe('auxiliares', () => {
  it('arredonda duração + intervalo para blocos de 30 min', () => {
    expect(blocosNecessarios(120, 15)).toBe(150);
    expect(blocosNecessarios(45, 15)).toBe(60);
  });

  it('formata minutos como HHmm', () => {
    expect(hhmm(9 * 60)).toBe('0900');
    expect(hhmm(14 * 60 + 30)).toBe('1430');
    expect(emMinutos('14:30')).toBe(870);
  });
});
