import { describe, expect, it } from 'vitest';
import { diasAbertos, diasDaJanela, horariosLivres, type RegrasHorario } from './horariosLivres';

// terça, 09h–12h; a máquina dos testes pode estar em qualquer fuso
const regras: RegrasHorario = {
  expediente: [{ dia: 2, ini: '09:00', fim: '12:00' }],
  intervaloMin: 0,
  antecedenciaMin: 0,
  janelaDias: 30,
  recorrentes: [],
};
const TERCA = '2026-12-01';
const ANTES = new Date('2026-11-20T12:00:00Z');

const livres = (o: Partial<Parameters<typeof horariosLivres>[0]> = {}) =>
  horariosLivres({
    data: TERCA,
    duracaoMin: 60,
    regras,
    ocupados: new Set(),
    agora: ANTES,
    ...o,
  });

describe('horariosLivres (RN01–RN04)', () => {
  it('RN01: só dentro do expediente e com o serviço terminando até o fim', () => {
    expect(livres()).toEqual(['0900', '0930', '1000', '1030', '1100']);
  });

  it('dia sem expediente não tem horário', () => {
    expect(livres({ data: '2026-11-30' })).toEqual([]); // segunda
  });

  it('RN02: trava ativa ocupa o horário e quem invade ele', () => {
    expect(livres({ ocupados: new Set(['1000']) })).toEqual(['0900', '1030', '1100']);
  });

  it('RN04: o intervalo depois do serviço também precisa estar livre', () => {
    const r = livres({ regras: { ...regras, intervaloMin: 30 }, ocupados: new Set(['1100']) });
    expect(r).toEqual(['0900', '0930']); // 10:00 + 1 h + 30 min chega às 11h
  });

  it('bloqueio fixo da semana conta como ocupado', () => {
    const r = livres({
      regras: { ...regras, recorrentes: [{ dia: 2, ini: '10:00', fim: '11:00' }] },
    });
    expect(r).toEqual(['0900', '1100']);
  });

  it('RN03: respeita a antecedência no fuso de São Paulo', () => {
    // 09:00 em São Paulo = 12:00 UTC; com 1 h de antecedência, o primeiro é 10:00
    const r = livres({
      regras: { ...regras, antecedenciaMin: 60 },
      agora: new Date('2026-12-01T12:00:00Z'),
    });
    expect(r).toEqual(['1000', '1030', '1100']);
  });

  it('RN03: sem antecedência, horário que já passou não aparece', () => {
    expect(livres({ agora: new Date('2026-12-01T13:10:00Z') })).toEqual(['1030', '1100']);
  });

  it('RN03: nada além da janela de dias', () => {
    expect(livres({ regras: { ...regras, janelaDias: 7 } })).toEqual([]); // 11 dias à frente
    expect(livres({ agora: new Date('2026-12-02T12:00:00Z') })).toEqual([]); // já passou
  });
});

describe('dias para pedir', () => {
  it('a janela começa hoje, no fuso de São Paulo', () => {
    // 01:00 UTC de 1/12 ainda é 30/11 em São Paulo
    expect(diasDaJanela(new Date('2026-12-01T01:00:00Z'), 2)).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
    ]);
  });

  it('só os dias com expediente', () => {
    expect(diasAbertos({ ...regras, janelaDias: 13 }, ANTES)).toEqual(['2026-11-24', TERCA]);
  });
});
