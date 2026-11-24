import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMesesAbertos } from '../../hooks/useMesesAbertos';
import { salvarMesesAbertos } from '../../servicos/configPublica';
import AgendaAberta from './AgendaAberta';

vi.mock('../../hooks/useMesesAbertos', () => ({ useMesesAbertos: vi.fn() }));
vi.mock('../../servicos/configPublica', () => ({ salvarMesesAbertos: vi.fn() }));

const renderizar = () =>
  render(
    <MemoryRouter>
      <AgendaAberta />
    </MemoryRouter>,
  );

describe('Agenda aberta (I06)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-24T15:00:00Z'), toFake: ['Date'] });
    vi.mocked(salvarMesesAbertos).mockReset();
    vi.mocked(useMesesAbertos).mockReturnValue({
      meses: [202611],
      carregando: false,
      erro: false,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra os próximos 12 meses com o que está aberto', () => {
    renderizar();
    expect(screen.getAllByRole('switch')).toHaveLength(12);
    expect(screen.getByRole('switch', { name: /novembro de 2026/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /dezembro de 2026/ })).not.toBeChecked();
  });

  it('abre janeiro sem abrir dezembro (meses avulsos)', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('switch', { name: /janeiro de 2027/ }));
    expect(salvarMesesAbertos).toHaveBeenCalledWith([202611, 202701]);
  });

  it('fecha um mês aberto', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('switch', { name: /novembro de 2026/ }));
    expect(salvarMesesAbertos).toHaveBeenCalledWith([]);
  });
});
