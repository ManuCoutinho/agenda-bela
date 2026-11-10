import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useClientes } from '../../hooks/useClientes';
import { salvarCliente } from '../../servicos/clientes';
import EditarCliente from './EditarCliente';

vi.mock('../../hooks/useClientes', () => ({ useClientes: vi.fn() }));
vi.mock('../../servicos/clientes', () => ({ salvarCliente: vi.fn() }));

function Lista() {
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso;
  return <p>Lista: {aviso}</p>;
}

function renderizar(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/clientes" element={<Lista />} />
        <Route path="/clientes/nova" element={<EditarCliente />} />
        <Route path="/clientes/:id" element={<EditarCliente />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EditarCliente (RF02)', () => {
  beforeEach(() => {
    vi.mocked(salvarCliente).mockReset();
    vi.mocked(useClientes).mockReturnValue({
      clientes: [
        {
          id: 'c1',
          nome: 'Ana',
          whatsapp: '5541988606636',
          observacao: 'Alergia a acetona',
          consentimento: true,
        },
      ],
      carregando: false,
      erro: false,
    });
  });

  it('cadastra com WhatsApp normalizado e volta para a lista com aviso', async () => {
    renderizar('/clientes/nova');
    await userEvent.type(screen.getByLabelText('Nome'), ' Júlia ');
    await userEvent.type(screen.getByLabelText('WhatsApp com DDD'), '(41) 97777-1111');
    await userEvent.click(screen.getByLabelText(/autorizou guardar/));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cliente' }));

    expect(salvarCliente).toHaveBeenCalledWith(
      { nome: 'Júlia', whatsapp: '5541977771111', observacao: '', consentimento: true },
      undefined,
    );
    expect(await screen.findByText('Lista: Júlia foi salva.')).toBeInTheDocument();
  });

  it('não salva sem a autorização e mostra o erro ligado ao campo', async () => {
    renderizar('/clientes/nova');
    await userEvent.type(screen.getByLabelText('Nome'), 'Júlia');
    await userEvent.type(screen.getByLabelText('WhatsApp com DDD'), '41977771111');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cliente' }));

    const caixa = screen.getByLabelText(/autorizou guardar/);
    expect(caixa).toHaveAttribute('aria-invalid', 'true');
    expect(caixa).toHaveAccessibleDescription(/Marque a autorização/);
    expect(salvarCliente).not.toHaveBeenCalled();
  });

  it('mostra o WhatsApp errado com a dica de formato', async () => {
    renderizar('/clientes/nova');
    await userEvent.type(screen.getByLabelText('WhatsApp com DDD'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cliente' }));
    expect(screen.getByLabelText('WhatsApp com DDD')).toHaveAccessibleDescription(
      /Ex.: \(41\) 98860-6636 .*DDD/,
    );
  });

  it('edita a cliente existente com os dados preenchidos', async () => {
    renderizar('/clientes/c1');
    expect(screen.getByRole('heading', { name: 'Editar cliente' })).toBeInTheDocument();
    expect(screen.getByLabelText('WhatsApp com DDD')).toHaveValue('(41) 98860-6636');
    const obs = screen.getByLabelText('Observação (opcional)');
    await userEvent.clear(obs);
    await userEvent.type(obs, 'Prefere unha curta');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cliente' }));

    expect(salvarCliente).toHaveBeenCalledWith(
      {
        nome: 'Ana',
        whatsapp: '5541988606636',
        observacao: 'Prefere unha curta',
        consentimento: true,
      },
      'c1',
    );
  });

  it('avisa quando a cliente não existe', () => {
    renderizar('/clientes/nao-existe');
    expect(screen.getByRole('alert')).toHaveTextContent('Não encontramos essa cliente');
  });
});
