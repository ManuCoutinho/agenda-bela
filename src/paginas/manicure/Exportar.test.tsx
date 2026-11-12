import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useClientes } from '../../hooks/useClientes';
import { buscarTodosAgendamentos } from '../../servicos/agenda';
import { baixarArquivo } from '../../servicos/arquivos';
import Exportar from './Exportar';

vi.mock('../../hooks/useClientes', () => ({ useClientes: vi.fn() }));
vi.mock('../../servicos/agenda', () => ({ buscarTodosAgendamentos: vi.fn() }));
vi.mock('../../servicos/arquivos', () => ({ baixarArquivo: vi.fn() }));

describe('Exportar para planilha (RNF02)', () => {
  beforeEach(() => {
    vi.mocked(baixarArquivo).mockReset();
    vi.mocked(useClientes).mockReturnValue({
      clientes: [
        { id: '1', nome: 'Ana', whatsapp: '5541988606636', observacao: '', consentimento: true },
      ],
      carregando: false,
      erro: false,
    });
  });

  it('baixa clientes e atendimentos em CSV', async () => {
    vi.mocked(buscarTodosAgendamentos).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <Exportar />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Baixar clientes' }));
    expect(baixarArquivo).toHaveBeenCalledWith(
      expect.stringMatching(/^clientes-\d{4}-\d{2}-\d{2}\.csv$/),
      expect.stringContaining('Ana;(41) 98860-6636'),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Arquivo com 1 clientes baixado.');

    await userEvent.click(screen.getByRole('button', { name: 'Baixar atendimentos' }));
    expect(await screen.findByText(/Arquivo com 0 atendimentos baixado/)).toBeInTheDocument();
  });

  it('sem internet, explica o que fazer', async () => {
    vi.mocked(buscarTodosAgendamentos).mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <Exportar />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Baixar atendimentos' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Confira a internet');
  });
});
