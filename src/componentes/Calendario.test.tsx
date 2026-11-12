import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Calendario from './Calendario';

const EVENTOS = [
  {
    id: 'a1',
    tipo: 'atendimento' as const,
    titulo: 'Ana · Mão',
    inicio: '2026-11-12T14:30:00',
    fim: '2026-11-12T15:30:00',
  },
  {
    id: 'b1',
    tipo: 'bloqueio' as const,
    titulo: 'Bloqueado',
    inicio: '2026-11-13T09:00:00',
    fim: '2026-11-13T10:00:00',
  },
];

function renderizar(visao: 'semana' | 'mes') {
  const props = {
    aoTocarDia: vi.fn(),
    aoTocarHorario: vi.fn(),
    aoTocarEvento: vi.fn(),
  };
  render(
    <Calendario
      visao={visao}
      dia="2026-11-12"
      eventos={EVENTOS}
      agora="2026-11-12T10:00:00"
      {...props}
    />,
  );
  return props;
}

// Fumaça: o FullCalendar de verdade monta no jsdom (sem medir layout).
describe('Calendario (FullCalendar)', () => {
  it('semana: mostra o atendimento na hora de São Paulo e abre ao tocar', () => {
    const { aoTocarEvento } = renderizar('semana');
    expect(screen.getByText('Ana · Mão')).toBeInTheDocument();
    expect(screen.getByText('14:30 - 15:30')).toBeInTheDocument();
    screen.getByText('Ana · Mão').click();
    expect(aoTocarEvento).toHaveBeenCalledWith('a1', 'atendimento');
    screen.getByText('Bloqueado').click();
    expect(aoTocarEvento).toHaveBeenCalledWith('b1', 'bloqueio');
  });

  it('mês: destaca o dia escolhido e troca de dia ao tocar no número', () => {
    const { aoTocarDia } = renderizar('mes');
    const escolhido = document.querySelector('.dia-escolhido');
    expect(escolhido).toHaveAttribute('data-date', '2026-11-12');
    screen.getByTitle('Ir para 20 de novembro de 2026').click();
    expect(aoTocarDia).toHaveBeenCalledWith('2026-11-20');
  });
});
