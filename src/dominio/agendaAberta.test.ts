import { describe, expect, it } from 'vitest';
import {
  diasDosMesesAbertos,
  mesDoDia,
  mesesPadrao,
  mesesValidos,
  mesParaAbrir,
  proximosMeses,
  rotuloMes,
} from './agendaAberta';

// 24/11/2026, 12h em São Paulo
const AGORA = new Date('2026-11-24T15:00:00Z');

describe('agenda aberta por mês (I06)', () => {
  it('mês como AAAAMM, no fuso de São Paulo', () => {
    expect(mesDoDia('2026-12-31')).toBe(202612);
    // 30/11 às 22h em SP já é 1/12 em UTC: continua novembro
    expect(proximosMeses(new Date('2026-12-01T01:00:00Z'), 1)).toEqual([202611]);
  });

  it('próximos meses atravessam a virada do ano', () => {
    expect(proximosMeses(AGORA, 3)).toEqual([202611, 202612, 202701]);
    expect(mesesPadrao(AGORA)).toEqual([202611, 202612]);
  });

  it('descarta meses que já passaram', () => {
    expect(mesesValidos([202701, 202610, 202611, 202701], AGORA)).toEqual([202611, 202701]);
  });

  it('dias para pedir: de hoje ao fim do último mês aberto, pulando os fechados', () => {
    const dias = diasDosMesesAbertos(AGORA, [202611, 202701]);
    expect(dias[0]).toBe('2026-11-24');
    expect(dias).toContain('2026-11-30');
    expect(dias.some((d) => d.startsWith('2026-12'))).toBe(false);
    expect(dias.at(-1)).toBe('2027-01-31');
    expect(diasDosMesesAbertos(AGORA, [])).toEqual([]);
  });

  it('rótulo do mês', () => {
    expect(rotuloMes(202701)).toBe('janeiro de 2027');
  });

  it('lembra de abrir o mês seguinte a partir do dia 20', () => {
    expect(mesParaAbrir(AGORA, [202611])).toBe(202612);
    expect(mesParaAbrir(AGORA, [202611, 202612])).toBeNull();
    expect(mesParaAbrir(new Date('2026-11-19T15:00:00Z'), [202611])).toBeNull();
  });
});
