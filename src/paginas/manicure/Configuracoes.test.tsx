import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIGURACOES_PADRAO } from '../../dominio/configuracoes';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { salvarConfiguracoes } from '../../servicos/configPublica';
import Configuracoes from './Configuracoes';

vi.mock('../../hooks/useConfiguracoes', () => ({ useConfiguracoes: vi.fn() }));
vi.mock('../../servicos/configPublica', () => ({ salvarConfiguracoes: vi.fn() }));

function Destino() {
  return <p>Mais: {(useLocation().state as { aviso: string }).aviso}</p>;
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/mais/configuracoes']}>
      <Routes>
        <Route path="/mais" element={<Destino />} />
        <Route path="/mais/configuracoes" element={<Configuracoes />} />
      </Routes>
    </MemoryRouter>,
  );
}

const grupoDoDia = (dia: string) => screen.getByRole('group', { name: dia });

describe('Configurações (RF04)', () => {
  beforeEach(() => {
    vi.mocked(salvarConfiguracoes).mockReset();
    vi.mocked(useConfiguracoes).mockReturnValue({
      config: CONFIGURACOES_PADRAO,
      carregando: false,
      erro: false,
    });
  });

  it('sugere o link pelo nome e salva o expediente da semana', async () => {
    renderizar();
    await userEvent.type(screen.getByLabelText('Nome do espaço'), 'Espaço Juju');
    await userEvent.tab();
    expect(screen.getByLabelText('Link da página de agendamento')).toHaveValue('espaco-juju');

    await userEvent.type(screen.getByLabelText('Seu WhatsApp'), '41988606636');
    // abre o domingo, fecha o sábado, muda a terça
    await userEvent.click(within(grupoDoDia('Domingo')).getByLabelText('Domingo'));
    await userEvent.selectOptions(screen.getByLabelText('Fim (domingo)'), '12:00');
    await userEvent.click(within(grupoDoDia('Sábado')).getByLabelText('Sábado'));
    await userEvent.selectOptions(screen.getByLabelText('Início (terça-feira)'), '13:00');
    await userEvent.selectOptions(
      screen.getByLabelText('Intervalo depois de cada atendimento'),
      '30 min',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));

    expect(salvarConfiguracoes).toHaveBeenCalledWith({
      ...CONFIGURACOES_PADRAO,
      nome: 'Espaço Juju',
      slug: 'espaco-juju',
      whatsapp: '5541988606636',
      intervaloMin: 30,
      expediente: [
        { dia: 0, ini: '09:00', fim: '12:00' },
        { dia: 1, ini: '09:00', fim: '18:00' },
        { dia: 2, ini: '13:00', fim: '18:00' },
        { dia: 3, ini: '09:00', fim: '18:00' },
        { dia: 4, ini: '09:00', fim: '18:00' },
        { dia: 5, ini: '09:00', fim: '18:00' },
      ],
    });
    expect(await screen.findByText('Mais: Configurações salvas.')).toBeInTheDocument();
  });

  it('mostra o erro de horário ligado ao campo e não salva', async () => {
    vi.mocked(useConfiguracoes).mockReturnValue({
      config: { ...CONFIGURACOES_PADRAO, nome: 'Juju', slug: 'juju', whatsapp: '5541988606636' },
      carregando: false,
      erro: false,
    });
    renderizar();
    await userEvent.selectOptions(screen.getByLabelText('Fim (segunda-feira)'), '08:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    expect(screen.getByLabelText('Fim (segunda-feira)')).toHaveAccessibleDescription(
      'O fim precisa ser depois do início.',
    );
    expect(salvarConfiguracoes).not.toHaveBeenCalled();
  });

  it('dia fechado não mostra horários', () => {
    renderizar();
    expect(within(grupoDoDia('Domingo')).getByText('Sem atendimento.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Início (domingo)')).not.toBeInTheDocument();
  });

  it('avisa quando não consegue carregar', () => {
    vi.mocked(useConfiguracoes).mockReturnValue({
      config: CONFIGURACOES_PADRAO,
      carregando: false,
      erro: true,
    });
    renderizar();
    expect(screen.getByRole('alert')).toHaveTextContent('Confira a internet');
  });
});
