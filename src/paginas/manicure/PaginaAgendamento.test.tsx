import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIGURACOES_PADRAO } from '../../dominio/configuracoes';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { usePausa } from '../../hooks/usePausa';
import { salvarPausa } from '../../servicos/configPublica';
import PaginaAgendamento from './PaginaAgendamento';

vi.mock('../../hooks/useConfiguracoes', () => ({ useConfiguracoes: vi.fn() }));
vi.mock('../../hooks/usePausa', () => ({ usePausa: vi.fn() }));
vi.mock('../../servicos/configPublica', () => ({ salvarPausa: vi.fn() }));

const renderizar = () =>
  render(
    <MemoryRouter>
      <PaginaAgendamento />
    </MemoryRouter>,
  );

describe('Página de agendamento (RF14)', () => {
  beforeEach(() => {
    vi.mocked(salvarPausa).mockReset();
    vi.mocked(useConfiguracoes).mockReturnValue({
      config: { ...CONFIGURACOES_PADRAO, slug: 'espaco-juju' },
      carregando: false,
      erro: false,
    });
    vi.mocked(usePausa).mockReturnValue({
      pausa: { ativa: false, aviso: '' },
      carregando: false,
      erro: false,
    });
  });

  it('mostra o link e pausa com o aviso', async () => {
    renderizar();
    expect(
      screen.getByRole('link', { name: `${window.location.origin}/agendar/espaco-juju` }),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText('Aviso para as clientes (opcional)'),
      ' Volto dia 10. ',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pausar agendamentos' }));
    expect(salvarPausa).toHaveBeenCalledWith({ ativa: true, aviso: 'Volto dia 10.' });
  });

  it('pausada, reabre com um toque', async () => {
    vi.mocked(usePausa).mockReturnValue({
      pausa: { ativa: true, aviso: 'Férias' },
      carregando: false,
      erro: false,
    });
    renderizar();
    expect(screen.getByRole('heading', { name: 'Agendamentos pausados' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir agendamentos' }));
    expect(salvarPausa).toHaveBeenCalledWith({ ativa: false, aviso: '' });
  });
});
