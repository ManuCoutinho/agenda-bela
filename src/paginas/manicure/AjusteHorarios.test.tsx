import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useConflitosDeHora } from '../../hooks/useMigracoes';
import { dispensarConflitosDeHora } from '../../servicos/migracoes';
import AjusteHorarios from './AjusteHorarios';

vi.mock('../../hooks/useMigracoes', () => ({ useConflitosDeHora: vi.fn() }));
vi.mock('../../servicos/migracoes', () => ({ dispensarConflitosDeHora: vi.fn() }));

describe('Ajuste para horários de 1 hora (I05)', () => {
  it('sem conflito, não mostra nada', () => {
    vi.mocked(useConflitosDeHora).mockReturnValue([]);
    const { container } = render(<AjusteHorarios />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lista quem ficou na mesma hora e some com "Entendi"', async () => {
    vi.mocked(useConflitosDeHora).mockReturnValue([
      { trava: '2026-12-01_1000', rotulos: ['Ana, 09:30', 'Bia, 10:30'] },
    ]);
    render(<AjusteHorarios />);
    expect(screen.getByText('Ana, 09:30 e Bia, 10:30')).toBeInTheDocument();
    expect(screen.getByText(/terça-feira, 1 de dezembro, 10:00/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(dispensarConflitosDeHora).toHaveBeenCalled();
  });
});
