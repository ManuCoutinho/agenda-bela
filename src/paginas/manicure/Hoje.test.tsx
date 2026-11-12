import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inicioEm, type Agendamento } from '../../dominio/agenda';
import userEvent from '@testing-library/user-event';
import { CONFIGURACOES_PADRAO } from '../../dominio/configuracoes';
import { useAgendamentos } from '../../hooks/useAgenda';
import { useBloqueios } from '../../hooks/useBloqueios';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { bloquearHorario } from '../../servicos/bloqueios';
import Hoje from './Hoje';

vi.mock('../../hooks/useAgenda', () => ({ useAgendamentos: vi.fn() }));
vi.mock('../../hooks/useBloqueios', () => ({ useBloqueios: vi.fn() }));
vi.mock('../../hooks/useConfiguracoes', () => ({ useConfiguracoes: vi.fn() }));
vi.mock('../../servicos/bloqueios', () => ({ bloquearHorario: vi.fn() }));

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
    vi.mocked(useBloqueios).mockReturnValue({ bloqueios: [], carregando: false, erro: false });
    vi.mocked(useConfiguracoes).mockReturnValue({
      config: CONFIGURACOES_PADRAO,
      carregando: false,
      erro: false,
    });
    vi.mocked(bloquearHorario).mockReset();
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

  it('mostra o bloqueio do dia junto dos atendimentos', () => {
    vi.mocked(useAgendamentos).mockReturnValue({
      dados: [ag('a', '0900')],
      carregando: false,
      erro: false,
    });
    vi.mocked(useBloqueios).mockReturnValue({
      bloqueios: [
        { id: 'r1', tipo: 'recorrente', dia: 2, ini: '14:00', fim: '15:00', descricao: 'Terapia' },
      ],
      carregando: false,
      erro: false,
    });
    render(
      <MemoryRouter>
        <Hoje />
      </MemoryRouter>,
    );
    const links = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('href') !== '/atendimentos/novo?data=2026-11-10');
    expect(links.map((l) => l.textContent)).toEqual([
      '09:00–10:30Cliente aGel',
      '14:00–15:00Bloqueado (toda semana)Terapia',
    ]);
    expect(links[1]).toHaveAttribute('href', '/mais/bloqueios/r1');
  });

  it('bloqueia o resto do dia depois de confirmar, pulando o que já está marcado', async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T18:10:00Z')); // 15:10 em SP
    vi.mocked(useAgendamentos).mockReturnValue({ dados: [], carregando: false, erro: false });
    vi.mocked(bloquearHorario).mockResolvedValue(12);
    render(
      <MemoryRouter>
        <Hoje />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Bloquear o resto do dia' }));
    expect(screen.getByText(/Bloquear das 15:30 às 22:00\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sim, bloquear' }));

    expect(bloquearHorario).toHaveBeenCalledWith(
      expect.objectContaining({
        data: '2026-11-10',
        ini: '15:30',
        fim: '22:00',
        descricao: 'Resto do dia',
        travas: expect.arrayContaining(['2026-11-10_1530', '2026-11-10_2130']),
      }),
      true,
    );
    expect(await screen.findByText(/Bloqueado das 15:30 às 22:00/)).toBeInTheDocument();
  });

  it('sem "Bloquear o resto do dia" quando o dia já acabou', () => {
    vi.mocked(useAgendamentos).mockReturnValue({ dados: [], carregando: false, erro: false });
    render(
      <MemoryRouter>
        <Hoje />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole('button', { name: 'Bloquear o resto do dia' }),
    ).not.toBeInTheDocument();
  });
});
