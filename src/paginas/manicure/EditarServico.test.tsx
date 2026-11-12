import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Servico } from '../../dominio/servicos';
import { useServicos } from '../../hooks/useServicos';
import { salvarServicos } from '../../servicos/configPublica';
import EditarServico from './EditarServico';
import Servicos from './Servicos';

vi.mock('../../hooks/useServicos', () => ({ useServicos: vi.fn() }));
vi.mock('../../servicos/configPublica', () => ({
  salvarServicos: vi.fn(),
  novoIdServico: () => 'novo1',
}));

const GEL: Servico = {
  id: 'g1',
  nome: 'Esmaltação em gel',
  duracaoMin: 90,
  precoCentavos: 8000,
  publico: true,
};

function Destino() {
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso;
  return <p>Lista: {aviso}</p>;
}

function renderizar(rota: string, telaLista = <Destino />) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/mais/servicos" element={telaLista} />
        <Route path="/mais/servicos/novo" element={<EditarServico />} />
        <Route path="/mais/servicos/:id" element={<EditarServico />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Serviços (RF03)', () => {
  beforeEach(() => {
    vi.mocked(salvarServicos).mockReset();
    vi.mocked(useServicos).mockReturnValue({ servicos: [GEL], carregando: false, erro: false });
  });

  it('lista com duração, preço e aviso de fora da página pública', () => {
    vi.mocked(useServicos).mockReturnValue({
      servicos: [GEL, { ...GEL, id: 'x', nome: 'Teste', publico: false }],
      carregando: false,
      erro: false,
    });
    renderizar('/mais/servicos', <Servicos />);
    expect(screen.getByRole('link', { name: /Esmaltação em gel/ })).toHaveTextContent(
      /1 h 30 min · R\$\s80,00$/,
    );
    expect(screen.getByRole('link', { name: /Teste/ })).toHaveTextContent('fora da página pública');
  });

  it('cadastra um serviço novo somando à lista existente', async () => {
    renderizar('/mais/servicos/novo');
    await userEvent.type(screen.getByLabelText('Nome do serviço'), 'Pé e mão');
    await userEvent.selectOptions(screen.getByLabelText('Duração'), '1 h');
    await userEvent.type(screen.getByLabelText('Preço'), '7000');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar serviço' }));

    expect(salvarServicos).toHaveBeenCalledWith([
      GEL,
      { id: 'novo1', nome: 'Pé e mão', duracaoMin: 60, precoCentavos: 7000, publico: true },
    ]);
    expect(await screen.findByText('Lista: Pé e mão foi salvo.')).toBeInTheDocument();
  });

  it('edita e tira da página pública', async () => {
    renderizar('/mais/servicos/g1');
    expect(screen.getByLabelText('Preço')).toHaveValue('R$\u00a080,00');
    await userEvent.click(screen.getByLabelText(/Mostrar na página/));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar serviço' }));
    expect(salvarServicos).toHaveBeenCalledWith([{ ...GEL, publico: false }]);
  });

  it('o campo de preço só aceita números e mostra em reais', async () => {
    renderizar('/mais/servicos/novo');
    const preco = screen.getByLabelText('Preço');
    await userEvent.type(preco, 'caro2555');
    expect(preco).toHaveValue('R$\u00a025,55');
  });

  it('mostra o erro de preço vazio ligado ao campo', async () => {
    renderizar('/mais/servicos/novo');
    await userEvent.type(screen.getByLabelText('Nome do serviço'), 'Gel');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar serviço' }));
    expect(screen.getByLabelText('Preço')).toHaveAccessibleDescription(/por exemplo R\$ 45,00/);
    expect(salvarServicos).not.toHaveBeenCalled();
  });
});
