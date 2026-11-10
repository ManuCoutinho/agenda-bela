import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cliente } from '../../dominio/clientes';
import { useClientes } from '../../hooks/useClientes';
import Clientes from './Clientes';

vi.mock('../../hooks/useClientes', () => ({ useClientes: vi.fn() }));

const cliente = (id: string, nome: string, whatsapp: string): Cliente => ({
  id,
  nome,
  whatsapp,
  observacao: '',
  consentimento: true,
});

function renderizar(clientes: Cliente[], extra = {}) {
  vi.mocked(useClientes).mockReturnValue({ clientes, carregando: false, erro: false, ...extra });
  return render(
    <MemoryRouter>
      <Clientes />
    </MemoryRouter>,
  );
}

describe('Clientes (RF02)', () => {
  beforeEach(() => {
    vi.mocked(useClientes).mockReset();
  });

  it('orienta a cadastrar quando ainda não há clientes', () => {
    renderizar([]);
    expect(screen.getByText(/Nenhuma cliente cadastrada/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nova cliente' })).toHaveAttribute(
      'href',
      '/clientes/nova',
    );
  });

  it('lista em ordem alfabética com link para editar e para o WhatsApp', () => {
    renderizar([cliente('b', 'Bia', '5541977771111'), cliente('a', 'Ana', '5541988606636')]);
    const itens = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(itens[0]).toHaveTextContent('Ana(41) 98860-6636');
    expect(within(itens[0] as HTMLElement).getByRole('link', { name: /^Ana/ })).toHaveAttribute(
      'href',
      '/clientes/a',
    );
    expect(
      screen.getByRole('link', { name: 'Conversar com Ana no WhatsApp (abre outro app)' }),
    ).toHaveAttribute('href', expect.stringContaining('wa.me/5541988606636'));
  });

  it('busca pelo nome e avisa quando nada é encontrado', async () => {
    renderizar([cliente('a', 'Ana', '5541988606636'), cliente('b', 'Bia', '5541977771111')]);
    const busca = screen.getByLabelText('Buscar por nome ou WhatsApp');
    await userEvent.type(busca, 'bi');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('1 cliente')).toBeInTheDocument();
    await userEvent.clear(busca);
    await userEvent.type(busca, 'Zé');
    expect(screen.getByText('Nenhuma cliente encontrada para “Zé”.')).toBeInTheDocument();
  });

  it('diz o que fazer quando não consegue carregar', () => {
    renderizar([], { erro: true });
    expect(screen.getByRole('alert')).toHaveTextContent('tente de novo');
  });
});
