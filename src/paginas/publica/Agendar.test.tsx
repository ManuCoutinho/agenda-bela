import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inicioEm } from '../../dominio/agenda';
import { CONFIGURACOES_PADRAO } from '../../dominio/configuracoes';
import { HorarioJaPedido } from '../../dominio/pedidos';
import { useOcupados } from '../../hooks/useAgenda';
import { usePaginaPublica } from '../../hooks/usePaginaPublica';
import type { PaginaPublica } from '../../servicos/configPublica';
import { reservar } from '../../servicos/pedidos';
import Agendar from './Agendar';

vi.mock('../../hooks/usePaginaPublica', () => ({ usePaginaPublica: vi.fn() }));
vi.mock('../../hooks/useAgenda', () => ({ useOcupados: vi.fn() }));
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
    janelaDias: 14,
  },
  servicos: [
    { id: 's1', nome: 'Mão', duracaoMin: 60, precoCentavos: 3500, publico: true },
    { id: 's2', nome: 'Teste interno', duracaoMin: 30, precoCentavos: 0, publico: false },
  ],
  recorrentes: [],
  pausa: { ativa: false, aviso: '' },
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
  await userEvent.click(screen.getByRole('button', { name: 'terça-feira, 1 de dezembro' }));
  await userEvent.click(screen.getByRole('button', { name: '09:00' }));
}

async function preencher() {
  await userEvent.type(screen.getByLabelText('Seu nome'), 'Ana');
  await userEvent.type(screen.getByLabelText('Seu WhatsApp com DDD'), '41988606636');
  await userEvent.click(screen.getByLabelText(/Autorizo/));
  await userEvent.click(screen.getByRole('button', { name: 'Pedir horário' }));
}

describe('Página pública (RF08, RF09)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-20T12:00:00Z'), toFake: ['Date'] });
    vi.mocked(reservar).mockReset();
    vi.mocked(usePaginaPublica).mockReturnValue({ pagina: PAGINA, carregando: false, erro: false });
    vi.mocked(useOcupados).mockReturnValue({
      dados: new Set(['1000']),
      carregando: false,
      erro: false,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('link com outro nome mostra a página de não encontrada', () => {
    renderizar('/agendar/outro');
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });

  it('mostra só os serviços públicos, com duração e preço', () => {
    renderizar();
    expect(screen.getByRole('heading', { name: 'Espaço Juju' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mão.*1 h.*35,00/ })).toBeInTheDocument();
    expect(screen.queryByText('Teste interno')).not.toBeInTheDocument();
  });

  it('só oferece dias com expediente e horários livres (com o intervalo)', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Mão/ }));
    const dias = screen.getAllByRole('button', { name: /feira|sábado|domingo/ });
    expect(dias.map((d) => d.textContent)).toEqual([
      'ter24 novterça-feira, 24 de novembro',
      'ter1 dezterça-feira, 1 de dezembro',
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'terça-feira, 1 de dezembro' }));
    // 09:00 + 1 h + 30 min de intervalo invade as 10:00 ocupadas
    expect(screen.getByText('Nenhum horário livre neste dia.')).toBeInTheDocument();
  });

  it('pede o horário com as travas do serviço e oferece avisar no WhatsApp', async () => {
    vi.mocked(useOcupados).mockReturnValue({ dados: new Set(), carregando: false, erro: false });
    vi.mocked(reservar).mockResolvedValue();
    await ateOsDados();
    await preencher();

    expect(reservar).toHaveBeenCalledWith({
      nome: 'Ana',
      whatsapp: '5541988606636',
      consentimento: true,
      servicoId: 's1',
      inicio: inicioEm('2026-12-01', '0900'),
      travas: ['2026-12-01_0900', '2026-12-01_0930', '2026-12-01_1000'],
    });
    expect(await screen.findByRole('heading', { name: 'Pedido enviado!' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Avisar no WhatsApp' });
    expect(link.getAttribute('href')).toMatch(
      /^https:\/\/wa\.me\/5541900000000\?text=Oi!%20Sou%20Ana/,
    );
  });

  it('se outra pessoa pediu antes, volta para os horários com o aviso', async () => {
    vi.mocked(useOcupados).mockReturnValue({ dados: new Set(), carregando: false, erro: false });
    vi.mocked(reservar).mockRejectedValue(new HorarioJaPedido());
    await ateOsDados();
    await preencher();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esse horário acabou de ser pedido por outra pessoa. Escolha outro.',
    );
    expect(screen.getByRole('heading', { name: 'Escolha o horário' })).toBeInTheDocument();
  });

  it('não envia sem a autorização', async () => {
    vi.mocked(useOcupados).mockReturnValue({ dados: new Set(), carregando: false, erro: false });
    await ateOsDados();
    await userEvent.type(screen.getByLabelText('Seu nome'), 'Ana');
    await userEvent.type(screen.getByLabelText('Seu WhatsApp com DDD'), '41988606636');
    await userEvent.click(screen.getByRole('button', { name: 'Pedir horário' }));
    expect(screen.getByLabelText(/Autorizo/)).toHaveAccessibleDescription(
      'Marque a autorização para enviar o pedido.',
    );
    expect(reservar).not.toHaveBeenCalled();
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
