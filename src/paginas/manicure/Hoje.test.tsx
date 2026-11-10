import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inicioEm, type Agendamento } from '../../dominio/agenda';
import { useAgendamentos } from '../../hooks/useAgenda';
import Hoje from './Hoje';

vi.mock('../../hooks/useAgenda', () => ({ useAgendamentos: vi.fn() }));

const ag = (id: string, hora: string, status: Agendamento['status'] = 'marcado'): Agendamento => ({
  id,
  clienteId: 'c',
  clienteNome: `Cliente ${id}`,
  clienteWhatsapp: '5541988606636',
  servicoId: 's',
  servicoNome: 'Gel',
  duracaoMin: 90,
  inicio: inicioEm('2026-11-10', hora),
  travas: [],
  status,
  observacao: '',
});

describe('Hoje (RF07)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-11T01:00:00Z')); // 22h do dia 10 em SP
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra os atendimentos do dia de São Paulo em ordem, sem os cancelados', () => {
    vi.mocked(useAgendamentos).mockReturnValue({
      dados: [ag('b', '1400'), ag('x', '1000', 'cancelado'), ag('a', '0900')],
      carregando: false,
      erro: false,
    });
    render(
      <MemoryRouter>
        <Hoje />
      </MemoryRouter>,
    );
    expect(useAgendamentos).toHaveBeenCalledWith('2026-11-10', 1);
    expect(screen.getByText('terça-feira, 10 de novembro')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: /Cliente/ });
    expect(links.map((l) => l.textContent)).toEqual([
      '09:00–10:30Cliente aGel',
      '14:00–15:30Cliente bGel',
    ]);
    expect(screen.getByRole('link', { name: 'Novo atendimento' })).toHaveAttribute(
      'href',
      '/atendimentos/novo?data=2026-11-10',
    );
  });

  it('diz quando não há atendimentos', () => {
    vi.mocked(useAgendamentos).mockReturnValue({ dados: [], carregando: false, erro: false });
    render(
      <MemoryRouter>
        <Hoje />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nenhum atendimento marcado para hoje.')).toBeInTheDocument();
  });
});
