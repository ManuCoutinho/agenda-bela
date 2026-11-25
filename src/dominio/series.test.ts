import { describe, expect, it } from 'vitest';
import { datasDaSerie, datasNoMes, idPedidoDaSerie } from './series';

const AGORA = new Date('2026-11-24T15:00:00Z'); // terça, 24/11

describe('horário fixo (I11)', () => {
  it('toda semana nos meses abertos, a partir da primeira data', () => {
    expect(datasDaSerie('2026-11-28', 7, [202611, 202612], AGORA)).toEqual([
      '2026-11-28',
      '2026-12-05',
      '2026-12-12',
      '2026-12-19',
      '2026-12-26',
    ]);
  });

  it('pula meses fechados e para no último aberto', () => {
    expect(datasDaSerie('2026-11-28', 14, [202611, 202701], AGORA)).toEqual([
      '2026-11-28',
      '2027-01-09',
      '2027-01-23',
    ]);
  });

  it('sem repetição ou sem mês aberto, nada', () => {
    expect(datasDaSerie('2026-11-28', 0, [202611], AGORA)).toEqual([]);
    expect(datasDaSerie('2026-11-28', 7, [], AGORA)).toEqual([]);
  });

  it('datas de um mês para reservar quando a dona o abre', () => {
    const serie = { primeiraData: '2026-11-28', frequenciaDias: 28 as const };
    expect(datasNoMes(serie, 202612)).toEqual(['2026-12-26']);
    expect(datasNoMes(serie, 202701)).toEqual(['2027-01-23']);
    expect(datasNoMes(serie, 202610)).toEqual([]);
  });

  it('id do pedido de cada data é fixo', () => {
    expect(idPedidoDaSerie('s1', '2026-12-05')).toBe('s1_2026-12-05');
  });
});
