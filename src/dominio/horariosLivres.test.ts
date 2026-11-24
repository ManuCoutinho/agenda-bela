import { describe, expect, it } from 'vitest';
import { diasAbertos, diasComHorario, horariosLivres, type RegrasHorario } from './horariosLivres';

// terça, 09h–12h; a máquina dos testes pode estar em qualquer fuso
const regras: RegrasHorario = {
  expediente: [{ dia: 2, ini: '09:00', fim: '12:00' }],
  intervaloMin: 0,
  antecedenciaMin: 0,
  recorrentes: [],
  mesesAbertos: [202611, 202612],
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
    expect(livres()).toEqual(['0900', '1000', '1100']);
  });

  it('só horas cheias: expediente que começa às 09:30 oferece a partir das 10:00', () => {
    const r = livres({
      regras: { ...regras, expediente: [{ dia: 2, ini: '09:30', fim: '12:00' }] },
    });
    expect(r).toEqual(['1000', '1100']);
  });

  it('dia sem expediente não tem horário', () => {
    expect(livres({ data: '2026-11-30' })).toEqual([]); // segunda
  });

  it('RN02: trava ativa ocupa o horário e quem invade ele', () => {
    expect(livres({ ocupados: new Set(['1000']) })).toEqual(['0900', '1100']);
    expect(livres({ duracaoMin: 90, ocupados: new Set(['1100']) })).toEqual(['0900']);
  });

  it('trava antiga de meia hora ocupa a hora inteira', () => {
    expect(livres({ ocupados: new Set(['1030']) })).toEqual(['0900', '1100']);
  });

  it('RN04: o intervalo depois do serviço também precisa estar livre', () => {
    const r = livres({ regras: { ...regras, intervaloMin: 60 }, ocupados: new Set(['1100']) });
    expect(r).toEqual(['0900']); // 10:00 + 1 h + 1 h de intervalo chega às 11h
  });

  it('bloqueio fixo da semana conta como ocupado', () => {
    const r = livres({
      regras: { ...regras, recorrentes: [{ dia: 2, ini: '10:00', fim: '11:00' }] },
    });
    expect(r).toEqual(['0900', '1100']);
    const meia = livres({
      regras: { ...regras, recorrentes: [{ dia: 2, ini: '10:30', fim: '11:00' }] },
    });
    expect(meia).toEqual(['0900', '1100']);
  });

  it('RN03: respeita a antecedência no fuso de São Paulo', () => {
    // 09:00 em São Paulo = 12:00 UTC; com 1 h de antecedência, o primeiro é 10:00
    const r = livres({
      regras: { ...regras, antecedenciaMin: 60 },
      agora: new Date('2026-12-01T12:00:00Z'),
    });
    expect(r).toEqual(['1000', '1100']);
  });

  it('RN03: sem antecedência, horário que já passou não aparece', () => {
    expect(livres({ agora: new Date('2026-12-01T13:10:00Z') })).toEqual(['1100']);
  });

  it('RN03: nada fora dos meses abertos (I06)', () => {
    expect(livres({ regras: { ...regras, mesesAbertos: [202611, 202701] } })).toEqual([]);
    expect(livres({ agora: new Date('2026-12-02T12:00:00Z') })).toEqual([]); // já passou
  });
});

describe('dias para pedir', () => {
  it('só os dias com expediente', () => {
    expect(diasAbertos({ ...regras, mesesAbertos: [202611] }, ANTES)).toEqual(['2026-11-24']);
    expect(diasAbertos(regras, ANTES).slice(0, 2)).toEqual(['2026-11-24', TERCA]);
  });
});

describe('diasComHorario (I07)', () => {
  it('some o dia cheio, o bloqueado e o que não cabe o serviço', () => {
    const tercas = ['2026-11-24', '2026-12-01', '2026-12-08'];
    const ocupadosPorDia = new Map([
      ['2026-11-24', new Set(['0900', '1000', '1100'])], // cheio
      ['2026-12-08', new Set(['1000'])], // sobra 09h e 11h: cabe 1 h, não cabe 2 h
    ]);
    const base = { dias: tercas, regras, ocupadosPorDia, agora: ANTES };
    expect(diasComHorario({ ...base, duracaoMin: 60 })).toEqual(['2026-12-01', '2026-12-08']);
    expect(diasComHorario({ ...base, duracaoMin: 120 })).toEqual(['2026-12-01']);
  });
});
