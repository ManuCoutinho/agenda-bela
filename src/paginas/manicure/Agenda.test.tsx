import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type Calendario from '../../componentes/Calendario';
import { inicioEm, type Agendamento } from '../../dominio/agenda';
import { useAgendamentos } from '../../hooks/useAgenda';
import { useBloqueios } from '../../hooks/useBloqueios';
import Agenda from './Agenda';

vi.mock('../../hooks/useAgenda', () => ({ useAgendamentos: vi.fn() }));
vi.mock('../../hooks/useBloqueios', () => ({ useBloqueios: vi.fn() }));

// A grade do mês tem teste próprio; aqui só o que a tela passa para ela.
type PropsCalendario = ComponentProps<typeof Calendario>;
let ultimo: PropsCalendario;
vi.mock('../../componentes/Calendario', () => ({
  default: (props: PropsCalendario) => {
    ultimo = props;
    return <p>{`calendário ${props.dia} (${props.marcas.size} dias marcados)`}</p>;
  },
}));

const ANA: Agendamento = {
  id: 'a1',
  clienteId: 'c1',
  clienteNome: 'Ana',
  clienteWhatsapp: '5541988606636',
  servicoId: 's1',
  servicoNome: 'Mão',
  duracaoMin: 60,
  inicio: inicioEm('2026-11-12', '1430'),
  travas: [],
  status: 'marcado',
  observacao: '',
};

function renderizar(rota = '/agenda') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/agenda" element={<Agenda />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Agenda (RF07)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-12T15:00:00Z'), toFake: ['Date'] });
    vi.mocked(useAgendamentos).mockReturnValue({ dados: [ANA], carregando: false, erro: false });
    vi.mocked(useBloqueios).mockReturnValue({
      bloqueios: [
        { id: 'r1', tipo: 'recorrente', dia: 4, ini: '09:00', fim: '10:00', descricao: 'Terapia' },
      ],
      carregando: false,
      erro: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('abre no mês de hoje e mostra os atendimentos do dia', () => {
    renderizar();
    // Ana no dia 12 + terapia às quintas da grade (5, 12, 19, 26 e 3/12)
    expect(screen.getByText('calendário 2026-11-12 (5 dias marcados)')).toBeInTheDocument();
    expect(useAgendamentos).toHaveBeenCalledWith('2026-11-01', 35);
    expect(screen.getByRole('heading', { name: 'Novembro 2026' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Hoje, quinta-feira, 12 de novembro/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo atendimento' })).toHaveAttribute(
      'href',
      '/atendimentos/novo?data=2026-11-12',
    );
    expect(screen.queryByRole('button', { name: 'Hoje' })).not.toBeInTheDocument();
  });

  it('anda para o próximo mês e volta para hoje', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByRole('heading', { name: 'Dezembro 2026' })).toBeInTheDocument();
    expect(useAgendamentos).toHaveBeenLastCalledWith('2026-11-29', 35);
    await userEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(screen.getByRole('heading', { name: 'Novembro 2026' })).toBeInTheDocument();
  });

  it('deslizar troca de mês', async () => {
    renderizar();
    ultimo.aoTrocarMes(-1);
    expect(await screen.findByRole('heading', { name: 'Outubro 2026' })).toBeInTheDocument();
  });

  it('tocar num dia mostra a lista dele e o botão marca nesse dia', async () => {
    renderizar('/agenda?dia=2026-11-12');
    ultimo.aoEscolherDia('2026-11-20');
    expect(
      await screen.findByRole('heading', { name: 'sexta-feira, 20 de novembro' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Nenhum atendimento neste dia.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo atendimento' })).toHaveAttribute(
      'href',
      '/atendimentos/novo?data=2026-11-20',
    );
  });

  it('bloqueios aparecem na lista do dia e abrem ao tocar', () => {
    renderizar();
    expect(screen.getByRole('link', { name: /Bloqueado \(toda semana\)/ })).toHaveAttribute(
      'href',
      '/mais/bloqueios/r1',
    );
    expect(screen.getByRole('link', { name: /Bloquear horário em/ })).toHaveAttribute(
      'href',
      '/mais/bloqueios/novo?data=2026-11-12',
    );
  });

  it('avisa quando a agenda não carrega', () => {
    vi.mocked(useAgendamentos).mockReturnValue({ dados: [], carregando: false, erro: true });
    renderizar();
    expect(screen.getByRole('alert')).toHaveTextContent('Confira a internet');
  });
});
