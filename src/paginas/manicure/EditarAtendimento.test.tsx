import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HorarioOcupado, inicioEm, type Agendamento } from '../../dominio/agenda';
import { useAgendamento, useOcupados } from '../../hooks/useAgenda';
import { CONFIGURACOES_PADRAO } from '../../dominio/configuracoes';
import { useClientes } from '../../hooks/useClientes';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { useServicos } from '../../hooks/useServicos';
import { cancelarAtendimento, marcarAtendimento } from '../../servicos/agenda';
import EditarAtendimento from './EditarAtendimento';

vi.mock('../../hooks/useClientes', () => ({ useClientes: vi.fn() }));
vi.mock('../../hooks/useServicos', () => ({ useServicos: vi.fn() }));
vi.mock('../../hooks/useConfiguracoes', () => ({ useConfiguracoes: vi.fn() }));
vi.mock('../../hooks/useAgenda', () => ({ useAgendamento: vi.fn(), useOcupados: vi.fn() }));
vi.mock('../../servicos/agenda', () => ({
  marcarAtendimento: vi.fn(),
  cancelarAtendimento: vi.fn(),
}));

const ANA = {
  id: 'c1',
  nome: 'Ana',
  whatsapp: '5541988606636',
  observacao: '',
  consentimento: true as const,
};
const MAO = { id: 's1', nome: 'Mão', duracaoMin: 60, precoCentavos: 3500, publico: true };

const ATUAL: Agendamento = {
  id: 'a1',
  clienteId: 'c1',
  clienteNome: 'Ana',
  clienteWhatsapp: ANA.whatsapp,
  servicoId: 's1',
  servicoNome: 'Mão',
  duracaoMin: 60,
  inicio: inicioEm('2026-12-01', '1000'),
  travas: ['2026-12-01_1000', '2026-12-01_1030'],
  status: 'marcado',
  observacao: '',
};

function Destino() {
  const local = useLocation();
  return <p>{`${local.pathname}${local.search} | ${(local.state as { aviso: string }).aviso}`}</p>;
}

function renderizar(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/atendimentos/novo" element={<EditarAtendimento />} />
        <Route path="/atendimentos/:id" element={<EditarAtendimento />} />
        <Route path="/semana" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  );
}

const opcao = (nome: string) => screen.getByRole('option', { name: nome }) as HTMLOptionElement;

describe('EditarAtendimento (RF07)', () => {
  beforeEach(() => {
    vi.mocked(marcarAtendimento).mockReset();
    vi.mocked(cancelarAtendimento).mockReset();
    vi.mocked(useClientes).mockReturnValue({ clientes: [ANA], carregando: false, erro: false });
    vi.mocked(useServicos).mockReturnValue({ servicos: [MAO], carregando: false, erro: false });
    vi.mocked(useConfiguracoes).mockReturnValue({
      config: CONFIGURACOES_PADRAO, // terça, 09h–18h, sem intervalo
      carregando: false,
      erro: false,
    });
    vi.mocked(useAgendamento).mockReturnValue({ dados: null, carregando: false, erro: false });
    vi.mocked(useOcupados).mockReturnValue({
      dados: new Set(['1000', '1030']),
      carregando: false,
      erro: false,
    });
  });

  it('marca com as travas do serviço e volta para a semana do dia', async () => {
    vi.mocked(marcarAtendimento).mockResolvedValue('novo');
    renderizar('/atendimentos/novo?data=2026-12-01');
    await userEvent.selectOptions(screen.getByLabelText('Cliente'), 'Ana');
    await userEvent.selectOptions(screen.getByLabelText('Serviço'), 'Mão (1 h)');

    expect(opcao('09:30 (ocupado)').disabled).toBe(true); // 09:30–10:30 invade as 10h
    expect(opcao('11:00').disabled).toBe(false);
    expect(opcao('08:00 (fora do expediente)').disabled).toBe(false); // encaixe permitido

    await userEvent.selectOptions(screen.getByLabelText('Horário de início'), '09:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar atendimento' }));

    expect(marcarAtendimento).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteNome: 'Ana',
        servicoNome: 'Mão',
        inicio: inicioEm('2026-12-01', '0900'),
        travas: ['2026-12-01_0900', '2026-12-01_0930'],
        status: 'marcado',
      }),
      undefined,
      undefined,
    );
    expect(
      await screen.findByText(
        '/semana?de=2026-12-01 | Ana: terça-feira, 1 de dezembro, às 09:00. Salvo.',
      ),
    ).toBeInTheDocument();
  });

  it('avisa quando outra pessoa ocupou o horário no meio do caminho', async () => {
    vi.mocked(marcarAtendimento).mockRejectedValue(new HorarioOcupado());
    renderizar('/atendimentos/novo?data=2026-12-01');
    await userEvent.selectOptions(screen.getByLabelText('Cliente'), 'Ana');
    await userEvent.selectOptions(screen.getByLabelText('Serviço'), 'Mão (1 h)');
    await userEvent.selectOptions(screen.getByLabelText('Horário de início'), '09:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar atendimento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Escolha outro');
  });

  it('pede cliente, serviço e horário antes de salvar', async () => {
    renderizar('/atendimentos/novo?data=2026-12-01');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar atendimento' }));
    expect(screen.getByLabelText('Cliente')).toHaveAccessibleDescription('Escolha a cliente.');
    expect(screen.getByLabelText('Horário de início')).toHaveAccessibleDescription(
      /Escolha o horário\./,
    );
    expect(marcarAtendimento).not.toHaveBeenCalled();
  });

  it('ao editar, o horário atual não aparece como ocupado e as travas antigas vão junto', async () => {
    vi.mocked(useAgendamento).mockReturnValue({ dados: ATUAL, carregando: false, erro: false });
    vi.mocked(marcarAtendimento).mockResolvedValue('a1');
    renderizar('/atendimentos/a1');
    expect(screen.getByLabelText('Horário de início')).toHaveValue('1000');
    expect(opcao('10:00').disabled).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar atendimento' }));
    expect(marcarAtendimento).toHaveBeenCalledWith(
      expect.objectContaining({ travas: ATUAL.travas }),
      'a1',
      ATUAL.travas,
    );
  });

  it('cancela só depois de confirmar', async () => {
    vi.mocked(useAgendamento).mockReturnValue({ dados: ATUAL, carregando: false, erro: false });
    renderizar('/atendimentos/a1');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar atendimento' }));
    expect(cancelarAtendimento).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Sim, cancelar' }));
    expect(cancelarAtendimento).toHaveBeenCalledWith(ATUAL);
    expect(await screen.findByText(/cancelado\. O horário ficou livre\./)).toBeInTheDocument();
  });

  it('orienta a cadastrar cliente antes de marcar', () => {
    vi.mocked(useClientes).mockReturnValue({ clientes: [], carregando: false, erro: false });
    renderizar('/atendimentos/novo');
    expect(screen.getByRole('link', { name: 'uma cliente' })).toHaveAttribute(
      'href',
      '/clientes/nova',
    );
  });
});
