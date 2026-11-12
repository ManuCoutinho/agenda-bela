import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inicioEm, type Agendamento } from '../../dominio/agenda';
import { useAgendamentos } from '../../hooks/useAgenda';
import { useServicos } from '../../hooks/useServicos';
import Painel from './Painel';

vi.mock('../../hooks/useAgenda', () => ({ useAgendamentos: vi.fn() }));
vi.mock('../../hooks/useServicos', () => ({ useServicos: vi.fn() }));

const ag = (id: string, status: Agendamento['status'], precoCentavos: number) => ({
  id,
  clienteId: 'c',
  clienteNome: id,
  clienteWhatsapp: '',
  servicoId: 'mao',
  servicoNome: 'Mão',
  duracaoMin: 60,
  inicio: inicioEm('2026-11-10', '0900'),
  travas: [],
  status,
  observacao: '',
  precoCentavos,
});

describe('Painel do mês (RF13)', () => {
  beforeEach(() => {
    vi.mocked(useServicos).mockReturnValue({ servicos: [], carregando: false, erro: false });
    vi.mocked(useAgendamentos).mockReturnValue({
      dados: [ag('a', 'realizado', 4000), ag('b', 'realizado', 4000), ag('c', 'falta', 4000)],
      carregando: false,
      erro: false,
    });
  });

  it('mostra o recebido, as faltas e os serviços do mês pedido', async () => {
    render(
      <MemoryRouter initialEntries={['/mais/painel?mes=2026-11']}>
        <Painel />
      </MemoryRouter>,
    );
    expect(useAgendamentos).toHaveBeenLastCalledWith('2026-11-01', 30);
    expect(screen.getByRole('heading', { name: 'novembro de 2026' })).toBeInTheDocument();
    const recebido = screen.getByText('Recebido (realizados)').nextElementSibling;
    expect(recebido?.textContent?.replace(/\s/g, ' ')).toBe('R$ 80,00');
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Mão' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(useAgendamentos).toHaveBeenLastCalledWith('2026-12-01', 31);
  });
});
