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

  it('sem o seletor (fora do Chrome Android), oferece só o arquivo .vcf', async () => {
    vi.mocked(temSeletorDeContatos).mockReturnValue(false);
    renderizar();
    expect(screen.queryByRole('button', { name: 'Escolher dos contatos' })).not.toBeInTheDocument();

    const vcf = new File(
      ['BEGIN:VCARD\nVERSION:3.0\nFN:Eva\nTEL:41 99555-6666\nEND:VCARD\n'],
      'contatos.vcf',
      { type: 'text/vcard' },
    );
    await userEvent.upload(screen.getByLabelText('Abrir arquivo .vcf'), vcf);
    expect(await screen.findByRole('checkbox', { name: /Eva/ })).toBeChecked();
  });

  it('avisa quando o arquivo não tem contatos', async () => {
    renderizar();
    const vazio = new File(['nada aqui'], 'x.vcf', { type: 'text/vcard' });
    await userEvent.upload(screen.getByLabelText('Abrir arquivo .vcf'), vazio);
    expect(await screen.findByRole('alert')).toHaveTextContent('Esse arquivo não tem contatos');
  });
});
