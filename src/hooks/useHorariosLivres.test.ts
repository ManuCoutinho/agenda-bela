import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegrasHorario } from '../dominio/horariosLivres';
import { useOcupados } from './useAgenda';
import { useHorariosLivres } from './useHorariosLivres';

vi.mock('./useAgenda', () => ({ useOcupados: vi.fn() }));

const regras: RegrasHorario = {
  expediente: [{ dia: 2, ini: '09:00', fim: '11:00' }],
  intervaloMin: 0,
  antecedenciaMin: 0,
  janelaDias: 30,
  recorrentes: [],
};

describe('useHorariosLivres', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-20T12:00:00Z'), toFake: ['Date'] });
    vi.mocked(useOcupados).mockReturnValue({
      dados: new Set(['0930']),
      carregando: false,
      erro: false,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('cruza as travas do dia com as regras', () => {
    const { result } = renderHook(() => useHorariosLivres('2026-12-01', 30, regras));
    expect(useOcupados).toHaveBeenLastCalledWith('2026-12-01');
    expect(result.current.horarios).toEqual(['0900', '1000', '1030']);
  });

  it('sem serviço escolhido não consulta o dia', () => {
    const { result } = renderHook(() => useHorariosLivres('2026-12-01', undefined, regras));
    expect(useOcupados).toHaveBeenLastCalledWith('');
    expect(result.current).toEqual({ horarios: [], carregando: false, erro: false });
  });
});
