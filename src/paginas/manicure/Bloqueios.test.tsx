import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBloqueios } from '../../hooks/useBloqueios';
import { usePausa } from '../../hooks/usePausa';
import { salvarPausa } from '../../servicos/configPublica';
import Bloqueios from './Bloqueios';

vi.mock('../../hooks/useBloqueios', () => ({ useBloqueios: vi.fn() }));
vi.mock('../../hooks/usePausa', () => ({ usePausa: vi.fn() }));
vi.mock('../../servicos/configPublica', () => ({ salvarPausa: vi.fn() }));

const renderizar = () =>
  render(
    <MemoryRouter>
      <Bloqueios />
    </MemoryRouter>,
  );

describe('Bloqueios: pausar a página pública (RF14)', () => {
  beforeEach(() => {
    vi.mocked(salvarPausa).mockReset();
    vi.mocked(useBloqueios).mockReturnValue({ bloqueios: [], carregando: false, erro: false });
    vi.mocked(usePausa).mockReturnValue({
      pausa: { ativa: false, aviso: '' },
      carregando: false,
      erro: false,
    });
  });

  it('pausa com o aviso para as clientes', async () => {
    renderizar();
    await userEvent.type(
      screen.getByLabelText('Aviso para as clientes (opcional)'),
      ' Volto dia 10. ',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pausar agendamentos' }));
    expect(salvarPausa).toHaveBeenCalledWith({ ativa: true, aviso: 'Volto dia 10.' });
  });

  it('pausada: mostra o aviso e reabre', async () => {
    vi.mocked(usePausa).mockReturnValue({
      pausa: { ativa: true, aviso: 'Volto dia 10.' },
      carregando: false,
      erro: false,
    });
    renderizar();
    expect(screen.getByRole('heading', { name: 'Agendamentos pausados' })).toBeInTheDocument();
    expect(screen.getByText(/Volto dia 10\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir agendamentos' }));
    expect(salvarPausa).toHaveBeenCalledWith({ ativa: false, aviso: '' });
  });

  it('o botão de novo bloqueio é só o ícone, com nome para o leitor de tela', () => {
    renderizar();
    const fab = screen.getByRole('link', { name: 'Novo bloqueio' });
    expect(fab).toHaveAttribute('href', '/mais/bloqueios/novo');
    expect(fab).not.toHaveTextContent('Novo bloqueio');
  });
});
