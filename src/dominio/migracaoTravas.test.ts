import { describe, expect, it } from 'vitest';
import { planejarTravasPorHora, travaDaHora, type Reserva } from './migracaoTravas';

const reserva = (o: Partial<Reserva> & Pick<Reserva, 'id' | 'travas'>): Reserva => ({
  colecao: 'agendamentos',
  expiraEm: null,
  rotulo: o.id,
  ...o,
});

describe('migração das travas para 1 hora (I05)', () => {
  it('trava de meia hora vira a da hora cheia', () => {
    expect(travaDaHora('2026-12-01_1030')).toBe('2026-12-01_1000');
    expect(travaDaHora('2026-12-01_1000')).toBe('2026-12-01_1000');
  });

  it('cada reserva passa a ocupar as horas que tocava; as de meia hora são apagadas', () => {
    const plano = planejarTravasPorHora([
      reserva({ id: 'a', travas: ['2026-12-01_0900', '2026-12-01_0930'] }),
      reserva({ id: 'b', travas: ['2026-12-01_1400'] }),
    ]);
    expect(plano.mudancas).toEqual([
      { reserva: expect.objectContaining({ id: 'a' }), travas: ['2026-12-01_0900'] },
    ]);
    expect(plano.apagar).toEqual(['2026-12-01_0930']);
    expect(plano.gravar).toEqual([
      { id: '2026-12-01_0900', expiraEm: null },
      { id: '2026-12-01_1400', expiraEm: null },
    ]);
    expect(plano.conflitos).toEqual([]);
  });

  it('atendimento das 10:30 às 11:30 fica com as 10h e as 11h', () => {
    const plano = planejarTravasPorHora([
      reserva({ id: 'a', travas: ['2026-12-01_1030', '2026-12-01_1100'] }),
    ]);
    expect(plano.mudancas[0]?.travas).toEqual(['2026-12-01_1000', '2026-12-01_1100']);
  });

  it('duas reservas na mesma hora viram conflito; a definitiva prevalece sobre o pedido', () => {
    const expira = new Date('2026-11-25T12:00:00Z');
    const plano = planejarTravasPorHora([
      reserva({ id: 'a', rotulo: 'Ana, 09:00', travas: ['2026-12-01_0900', '2026-12-01_0930'] }),
      reserva({
        id: 'p',
        colecao: 'pedidos',
        rotulo: 'Bia, 10:00',
        expiraEm: expira,
        travas: ['2026-12-01_1000', '2026-12-01_1030'],
      }),
      reserva({ id: 'c', rotulo: 'Cris, 10:30', travas: ['2026-12-01_1030'] }),
    ]);
    expect(plano.conflitos).toEqual([
      { trava: '2026-12-01_1000', rotulos: ['Bia, 10:00', 'Cris, 10:30'] },
    ]);
    expect(plano.gravar).toContainEqual({ id: '2026-12-01_1000', expiraEm: null });
  });
});
