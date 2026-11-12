import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type Calendario from '../../componentes/Calendario';
import { inicioEm, type Agendamento } from '../../dominio/agenda';
import { useAgendamentos } from '../../hooks/useAgenda';
import Agenda from './Agenda';

vi.mock('../../hooks/useAgenda', () => ({ useAgendamentos: vi.fn() }));

// O FullCalendar precisa de layout real; aqui só conferimos o que a tela passa
// para ele e o que ela faz com os toques.
type PropsCalendario = ComponentProps<typeof Calendario>;
let ultimo: PropsCalendario;
vi.mock('../../componentes/Calendario', () => ({
  default: (props: PropsCalendario) => {
    ultimo = props;
    return <p>{`calendário ${props.visao} ${props.dia} (${props.eventos.length})`}</p>;
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

function Onde() {
  const l = useLocation();
  return <p>{`em ${l.pathname}${l.search}`}</p>;
}

function renderizar(rota = '/agenda') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/atendimentos/*" element={<Onde />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Agenda (RF07)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-12T15:00:00Z'), toFake: ['Date'] });
    vi.mocked(useAgendamentos).mockReturnValue({ dados: [ANA], carregando: false, erro: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('abre na semana de hoje e mostra os atendimentos do dia', () => {
    renderizar();
    expect(screen.getByText('calendário semana 2026-11-12 (1)')).toBeInTheDocument();
    expect(useAgendamentos).toHaveBeenCalledWith('2026-11-08', 7);
    expect(screen.getByRole('heading', { name: '8 – 14 de novembro' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Hoje, quinta-feira, 12 de novembro/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo atendimento' })).toHaveAttribute(
      'href',
      '/atendimentos/novo?data=2026-11-12',
    );
  });

  it('troca para o mês e anda para o próximo', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Mês' }));
    expect(screen.getByRole('button', { name: 'Mês' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'novembro de 2026' })).toBeInTheDocument();
    expect(useAgendamentos).toHaveBeenLastCalledWith('2026-11-01', 35);

    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByRole('heading', { name: 'dezembro de 2026' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(screen.getByRole('heading', { name: 'novembro de 2026' })).toBeInTheDocument();
  });

  it('tocar num dia mostra a lista dele e o botão marca nesse dia', async () => {
    vi.mocked(useAgendamentos).mockReturnValue({ dados: [ANA], carregando: false, erro: false });
    renderizar('/agenda?visao=mes&dia=2026-11-12');
    ultimo.aoTocarDia('2026-11-20');
    expect(
      await screen.findByRole('heading', { name: 'sexta-feira, 20 de novembro' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Nenhum atendimento neste dia.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo atendimento' })).toHaveAttribute(
      'href',
      '/atendimentos/novo?data=2026-11-20',
    );
  });

  it('tocar num horário abre "Novo atendimento" com dia e hora', async () => {
    renderizar();
    ultimo.aoTocarHorario('2026-11-13', '1030');
    expect(
      await screen.findByText('em /atendimentos/novo?data=2026-11-13&hora=1030'),
    ).toBeInTheDocument();
  });

  it('tocar num atendimento abre para editar', async () => {
    renderizar();
    ultimo.aoTocarEvento('a1');
    expect(await screen.findByText('em /atendimentos/a1')).toBeInTheDocument();
  });

  it('avisa quando a agenda não carrega', () => {
    vi.mocked(useAgendamentos).mockReturnValue({ dados: [], carregando: false, erro: true });
    renderizar();
    expect(screen.getByRole('alert')).toHaveTextContent('Confira a internet');
  });
});
