import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inicioEm } from '../../dominio/agenda';
import { CONFIGURACOES_PADRAO } from '../../dominio/configuracoes';
import { HorarioJaPedido } from '../../dominio/pedidos';
import { useOcupadosNoPeriodo } from '../../hooks/useAgenda';
import { usePaginaPublica } from '../../hooks/usePaginaPublica';
import type { PaginaPublica } from '../../servicos/configPublica';
import { reservar } from '../../servicos/pedidos';
import Agendar from './Agendar';

vi.mock('../../hooks/usePaginaPublica', () => ({ usePaginaPublica: vi.fn() }));
vi.mock('../../hooks/useAgenda', () => ({ useOcupadosNoPeriodo: vi.fn() }));

const ocupados = (porDia: Record<string, string[]> = {}) =>
  vi.mocked(useOcupadosNoPeriodo).mockReturnValue({
    dados: new Map(Object.entries(porDia).map(([dia, horas]) => [dia, new Set(horas)])),
    carregando: false,
    erro: false,
  });
vi.mock('../../servicos/pedidos', async () => {
  const { HorarioJaPedido: Ocupado } = await import('../../dominio/pedidos');
  return { reservar: vi.fn(), SemInternet: class extends Error {}, HorarioJaPedido: Ocupado };
});

const PAGINA: PaginaPublica = {
  config: {
    ...CONFIGURACOES_PADRAO,
    nome: 'Espaço Juju',
    slug: 'espaco-juju',
    whatsapp: '5541900000000',
    endereco: 'Rua das Flores, 10',
    expediente: [{ dia: 2, ini: '09:00', fim: '11:00' }], // só terça
    intervaloMin: 30,
    antecedenciaMin: 0,
  },
  servicos: [
    { id: 's1', nome: 'Mão', duracaoMin: 60, precoCentavos: 3500, publico: true },
    { id: 's2', nome: 'Teste interno', duracaoMin: 30, precoCentavos: 0, publico: false },
  ],
  recorrentes: [],
  pausa: { ativa: false, aviso: '' },
  mesesAbertos: [202611, 202612],
};

function renderizar(rota = '/agendar/espaco-juju') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/agendar/:slug" element={<Agendar />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function ateOsDados() {
  renderizar();
  await userEvent.click(screen.getByRole('button', { name: /Mão/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
  await userEvent.click(screen.getByRole('button', { name: 'terça-feira, 1 de dezembro' }));
  await userEvent.click(screen.getByRole('button', { name: '09:00' }));
}

async function preencher() {
  await userEvent.type(screen.getByLabelText('Seu nome'), 'Ana');
  await userEvent.type(screen.getByLabelText('Seu WhatsApp com DDD'), '41988606636');
  await userEvent.click(screen.getByRole('button', { name: 'Marcar horário' }));
}

describe('Página pública (RF08, RF09)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-20T12:00:00Z'), toFake: ['Date'] });
    vi.mocked(reservar).mockReset();
    vi.mocked(usePaginaPublica).mockReturnValue({ pagina: PAGINA, carregando: false, erro: false });
    ocupados({ '2026-12-01': ['1000'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('link com outro nome mostra a página de não encontrada', () => {
    renderizar('/agendar/outro');
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });

  it('mostra o Instagram do espaço quando configurado', () => {
    renderizar();
    expect(screen.queryByRole('link', { name: /Instagram/ })).not.toBeInTheDocument();
    vi.mocked(usePaginaPublica).mockReturnValue({
      pagina: { ...PAGINA, config: { ...PAGINA.config, instagram: 'espacojuju' } },
      carregando: false,
      erro: false,
    });
    renderizar();
    expect(screen.getByRole('link', { name: 'Ver o Instagram de Espaço Juju' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/espacojuju/',
    );
  });

  it('mostra só os serviços públicos, com duração e preço', () => {
    renderizar();
    expect(screen.getByRole('heading', { name: 'Espaço Juju' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mão.*1 h.*35,00/ })).toBeInTheDocument();
    expect(screen.queryByText('Teste interno')).not.toBeInTheDocument();
  });

  it('I07: calendário do mês com só os dias em que o serviço cabe', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Mão/ }));
    expect(screen.getByRole('heading', { name: /Novembro/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'terça-feira, 24 de novembro' })).toBeEnabled();
    // sem expediente na quarta
    expect(
      screen.getByRole('button', { name: 'quarta-feira, 25 de novembro, sem horário' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    // 09:00 + 1 h + 30 min de intervalo invade as 10:00 ocupadas; 10:00 está ocupada
    expect(
      screen.getByRole('button', { name: 'terça-feira, 1 de dezembro, sem horário' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: /Próximo dia com horário: terça-feira, 8 de dezembro/ }),
    );
    expect(screen.getByRole('heading', { name: 'Escolha o horário' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '09:00' })).toBeInTheDocument();
  });

  it('I07: lê só as travas do mês na tela', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Mão/ }));
    expect(useOcupadosNoPeriodo).toHaveBeenLastCalledWith('2026-11-24', '2026-11-24'); // só terças
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(useOcupadosNoPeriodo).toHaveBeenLastCalledWith('2026-12-01', '2026-12-29');
  });

  it('I07: mês sem nenhum horário abre direto o seguinte', async () => {
    ocupados({ '2026-11-24': ['0900', '1000'] });
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Mão/ }));
    expect(await screen.findByRole('heading', { name: /Dezembro/ })).toBeInTheDocument();
  });

  it('pede o horário com as travas do serviço e oferece avisar no WhatsApp', async () => {
    ocupados();
    vi.mocked(reservar).mockResolvedValue();
    await ateOsDados();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText(/ficam guardados só para este agendamento/)).toBeInTheDocument();
    await preencher();

    expect(reservar).toHaveBeenCalledWith({
      nome: 'Ana',
      whatsapp: '5541988606636',
      servicoId: 's1',
      inicio: inicioEm('2026-12-01', '0900'),
      travas: ['2026-12-01_0900', '2026-12-01_1000'], // 1 h + 30 min de intervalo = 2 h
    });
    expect(await screen.findByRole('heading', { name: 'Horário marcado!' })).toBeInTheDocument();
    expect(screen.getByText('R$ 35,00')).toBeInTheDocument();
    const google = new URL(
      screen.getByRole('link', { name: 'Google Agenda' }).getAttribute('href') ?? '',
    );
    expect(google.searchParams.get('dates')).toBe('20261201T120000Z/20261201T130000Z');
    expect(screen.getByRole('link', { name: 'iPhone e outras agendas' })).toHaveAttribute(
      'download',
      'horario-marcado.ics',
    );
    const link = screen.getByRole('link', { name: 'Avisar no WhatsApp' });
    expect(link.getAttribute('href')).toMatch(
      /^https:\/\/wa\.me\/5541900000000\?text=Oi!%20Sou%20Ana%20e%20acabei%20de%20marcar/,
    );
  });

  it('se outra pessoa pediu antes, volta para os horários com o aviso', async () => {
    ocupados();
    vi.mocked(reservar).mockRejectedValue(new HorarioJaPedido());
    await ateOsDados();
    await preencher();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esse horário acabou de ser marcado por outra pessoa. Escolha outro.',
    );
    expect(screen.getByRole('heading', { name: 'Escolha o horário' })).toBeInTheDocument();
  });

  it('RF14: página pausada mostra o aviso e não deixa pedir', () => {
    vi.mocked(usePaginaPublica).mockReturnValue({
      pagina: { ...PAGINA, pausa: { ativa: true, aviso: 'Volto dia 10 de janeiro.' } },
      carregando: false,
      erro: false,
    });
    renderizar();
    expect(
      screen.getByRole('heading', { name: 'Agendamentos pausados no momento' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Volto dia 10 de janeiro.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mão/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Falar no WhatsApp' })).toBeInTheDocument();
  });
});
