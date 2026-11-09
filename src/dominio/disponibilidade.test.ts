import { describe, expect, it } from 'vitest';
import { blocosNecessarios, hhmm, horariosLivres } from './disponibilidade';

const base = {
  data: new Date(2026, 9, 13), // terça-feira
  intervaloMin: 15,
  expediente: [{ ini: '09:00', fim: '12:00' }],
  agora: new Date(2026, 9, 1),
  antecedenciaMin: 720,
};

describe('horariosLivres', () => {
  it('não oferece horário que invade a terapia de terça', () => {
    const r = horariosLivres({
      ...base,
      duracaoMin: 60,
      ocupados: new Set(),
      recorrentes: [{ dia: 2, ini: '10:00', fim: '11:00' }],
    });
    expect(r).toEqual(['1100']);
  });

  it('respeita travas existentes e o fim do expediente', () => {
    const r = horariosLivres({
      ...base,
      duracaoMin: 45,
      recorrentes: [],
      ocupados: new Set(['1000']),
    });
    expect(r).toEqual(['0900', '1030', '1100']);
  });

  it('descarta horários antes da antecedência mínima (RN03)', () => {
    const r = horariosLivres({
      ...base,
      duracaoMin: 30,
      recorrentes: [],
      ocupados: new Set(),
      agora: new Date(2026, 9, 12, 22, 0), // 12 h antes das 10h
    });
    expect(r).toEqual(['1000', '1030', '1100', '1130']);
  });
});

describe('auxiliares', () => {
  it('arredonda duração + intervalo para blocos de 30 min', () => {
    expect(blocosNecessarios(120, 15)).toBe(150);
    expect(blocosNecessarios(45, 15)).toBe(60);
  });

  it('formata minutos como HHmm', () => {
    expect(hhmm(9 * 60)).toBe('0900');
    expect(hhmm(14 * 60 + 30)).toBe('1430');
  });
});
