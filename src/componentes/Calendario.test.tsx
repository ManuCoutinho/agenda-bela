import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Calendario from './Calendario';

function renderizar() {
  const props = { aoEscolherDia: vi.fn(), aoTrocarMes: vi.fn() };
  render(
    <Calendario
      dia="2026-11-12"
      hoje="2026-11-10"
      marcas={new Map([['2026-11-12', { atendimentos: 2, bloqueios: 1 }]])}
      {...props}
    />,
  );
  return props;
}

describe('Calendario (mês)', () => {
  it('mostra o mês do dia escolhido, com hoje e as marcas no nome do dia', () => {
    renderizar();
    expect(screen.getAllByRole('button')).toHaveLength(30);
    const escolhido = screen.getByRole('button', {
      name: 'quinta-feira, 12 de novembro, 2 atendimentos, 1 bloqueio',
    });
    expect(escolhido.closest('[role="gridcell"]')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'terça-feira, 10 de novembro, hoje' })).toBeVisible();
  });

  it('tocar num dia escolhe o dia', async () => {
    const { aoEscolherDia } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'sexta-feira, 20 de novembro' }));
    expect(aoEscolherDia).toHaveBeenCalledWith('2026-11-20');
  });

  it('deslizar para a esquerda vai ao próximo mês', () => {
    const { aoTrocarMes } = renderizar();
    const grade = screen.getByRole('grid');
    fireEvent.touchStart(grade, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchEnd(grade, { changedTouches: [{ clientX: 100, clientY: 110 }] });
    expect(aoTrocarMes).toHaveBeenCalledWith(1);
  });
});
