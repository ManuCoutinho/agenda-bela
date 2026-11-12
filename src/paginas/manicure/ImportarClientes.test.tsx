import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIGURACOES_PADRAO } from '../../dominio/configuracoes';
import { useClientes } from '../../hooks/useClientes';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { importarClientes } from '../../servicos/clientes';
import { escolherContatos, temSeletorDeContatos } from '../../servicos/contatos';
import ImportarClientes from './ImportarClientes';

vi.mock('../../hooks/useClientes', () => ({ useClientes: vi.fn() }));
vi.mock('../../hooks/useConfiguracoes', () => ({ useConfiguracoes: vi.fn() }));
vi.mock('../../servicos/clientes', () => ({ importarClientes: vi.fn() }));
vi.mock('../../servicos/contatos', () => ({
  escolherContatos: vi.fn(),
  temSeletorDeContatos: vi.fn(),
}));

const ANA = {
  id: 'c1',
  nome: 'Ana',
  whatsapp: '5541988606636',
  observacao: '',
  consentimento: true as const,
};

function Destino() {
  return <p>Clientes: {(useLocation().state as { aviso: string }).aviso}</p>;
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/clientes/importar']}>
      <Routes>
        <Route path="/clientes" element={<Destino />} />
        <Route path="/clientes/importar" element={<ImportarClientes />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Importar clientes (RF02)', () => {
  beforeEach(() => {
    vi.mocked(importarClientes).mockReset();
    vi.mocked(temSeletorDeContatos).mockReturnValue(true);
    vi.mocked(escolherContatos).mockResolvedValue([
      { nome: 'Ana', telefones: ['41 98860-6636'] },
      { nome: 'Bia', telefones: ['99111-2222'] }, // sem DDD: usa o do WhatsApp da manicure
      { nome: 'Carla', telefones: ['41 99333-4444'] },
      { nome: 'Dora', telefones: [] },
    ]);
    vi.mocked(useClientes).mockReturnValue({ clientes: [ANA], carregando: false, erro: false });
    vi.mocked(useConfiguracoes).mockReturnValue({
      config: { ...CONFIGURACOES_PADRAO, whatsapp: '5541900000000' },
      carregando: false,
      erro: false,
    });
  });

  it('escolhe dos contatos, revisa e importa só as marcadas com autorização', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Escolher dos contatos' }));

    expect(screen.getByRole('checkbox', { name: /Ana.*já está nas suas clientes/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Dora.*sem celular com DDD/ })).toBeDisabled();
    expect(screen.getByText('2 clientes marcadas para importar.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /Carla/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Importar 1 cliente' }));
    expect(screen.getByRole('checkbox', { name: /autorizaram/ })).toHaveAccessibleDescription(
      'Marque a autorização das clientes para importar.',
    );
    expect(importarClientes).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('checkbox', { name: /autorizaram/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Importar 1 cliente' }));
    expect(importarClientes).toHaveBeenCalledWith([
      { nome: 'Bia', whatsapp: '5541991112222', observacao: '', consentimento: true },
    ]);
    expect(await screen.findByText('Clientes: 1 cliente importada.')).toBeInTheDocument();
  });

  it('sem o seletor (fora do Chrome Android), oferece só o cadastro à mão', () => {
    vi.mocked(temSeletorDeContatos).mockReturnValue(false);
    renderizar();
    expect(screen.queryByRole('button', { name: 'Escolher dos contatos' })).not.toBeInTheDocument();
    expect(screen.getByText(/use o Chrome no Android/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar à mão' })).toHaveAttribute(
      'href',
      '/clientes/nova',
    );
  });

  it('não oferece mais o arquivo .vcf', () => {
    renderizar();
    expect(screen.queryByText(/\.vcf/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar à mão' })).toBeInTheDocument();
  });

  it('se ela fecha o seletor sem escolher, avisa sem tom de erro', async () => {
    vi.mocked(escolherContatos).mockResolvedValue([]);
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Escolher dos contatos' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Nenhum contato foi escolhido.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
