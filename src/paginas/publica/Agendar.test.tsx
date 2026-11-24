import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inicioEm } from '../../dominio/agenda';
import { CONFIGURACOES_PADRAO } from '../../dominio/configuracoes';
import { HorarioJaPedido } from '../../dominio/pedidos';
import { useOcupadosNoPeriodo } from '../../hooks/useAgenda';
import { usePaginaPublica } from '../../hooks/usePaginaPublica';
import { usePortal } from '../../hooks/usePortal';
import type { PaginaPublica } from '../../servicos/configPublica';
import { pedirCancelamento, remarcar, reservar, reservarSerie } from '../../servicos/pedidos';
import Agendar from './Agendar';

vi.mock('../../hooks/usePaginaPublica', () => ({ usePaginaPublica: vi.fn() }));
vi.mock('../../hooks/usePortal', () => ({ usePortal: vi.fn() }));
vi.mock('../../hooks/useAgenda', () => ({ useOcupadosNoPeriodo: vi.fn() }));

const ocupados = (porDia: Record<string, string[]> = {}) =>
  vi.mocked(useOcupadosNoPeriodo).mockReturnValue({
    dados: new Map(Object.entries(porDia).map(([dia, horas]) => [dia, new Set(horas)])),
    carregando: false,
    erro: false,
  });
vi.mock('../../servicos/pedidos', async () => {
  const { HorarioJaPedido: Ocupado } = await import('../../dominio/pedidos');
  return {
    reservar: vi.fn(),
    reservarSerie: vi.fn(),
    remarcar: vi.fn(),
    pedirCancelamento: vi.fn(),
    SemInternet: class extends Error {},
    HorarioJaPedido: Ocupado,
  };
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
  await userEvent.clear(screen.getByLabelText('Seu nome'));
  await userEvent.type(screen.getByLabelText('Seu nome'), 'Ana');
  await userEvent.clear(screen.getByLabelText('Seu WhatsApp com DDD'));
  await userEvent.type(screen.getByLabelText('Seu WhatsApp com DDD'), '41988606636');
  await userEvent.click(screen.getByRole('button', { name: 'Marcar horário' }));
}

describe('Página pública (RF08, RF09)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-20T12:00:00Z'), toFake: ['Date'] });
    localStorage.clear();
    // este celular já informou o WhatsApp (o passo da pergunta tem teste próprio)
    localStorage.setItem(
      'agenda-bela:cliente',
      JSON.stringify({ nome: '', whatsapp: '5541988606636' }),
    );
    vi.mocked(usePortal).mockReturnValue({ portal: null, carregando: false, erro: false });
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
      chave: expect.stringMatching(/^[A-Za-z0-9]{24}$/),
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

  it('I11: horário fixo reserva as datas dos meses abertos e mostra a que não deu', async () => {
    ocupados();
    vi.mocked(reservarSerie).mockResolvedValue({
      reservadas: ['2026-12-01', '2026-12-08', '2026-12-22', '2026-12-29'],
      falhas: [{ data: '2026-12-15', motivo: 'ocupado' }],
    });
    await ateOsDados();
    await userEvent.selectOptions(screen.getByLabelText('Repetir este horário'), 'Toda semana');
    expect(screen.getByText('Vamos reservar 5 datas:')).toBeInTheDocument();
    await preencher();

    expect(reservarSerie).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Ana',
        whatsapp: '5541988606636',
        hora: '0900',
        frequenciaDias: 7,
        datas: ['2026-12-01', '2026-12-08', '2026-12-15', '2026-12-22', '2026-12-29'],
      }),
    );
    expect(vi.mocked(reservarSerie).mock.calls[0]?.[0].travasDe('2026-12-08')).toEqual([
      '2026-12-08_0900',
      '2026-12-08_1000',
    ]);
    expect(await screen.findByText('Horário fixo')).toBeInTheDocument();
    expect(screen.getByText('terça-feira, 22 de dezembro, às 09:00')).toBeInTheDocument();
    expect(screen.getByText(/15 de dezembro, às 09:00: já estava ocupado/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Todas as datas/ })).toBeInTheDocument();
    expect(reservar).not.toHaveBeenCalled();
  });

  it('I13: começa pelo WhatsApp e mostra os horários deste celular', async () => {
    localStorage.clear();
    renderizar();
    expect(screen.getByRole('heading', { name: 'Qual o seu WhatsApp?' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Seu WhatsApp com DDD'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByLabelText('Seu WhatsApp com DDD')).toHaveAccessibleDescription(
      /Escreva o seu WhatsApp com DDD/,
    );
    await userEvent.clear(screen.getByLabelText('Seu WhatsApp com DDD'));
    await userEvent.type(screen.getByLabelText('Seu WhatsApp com DDD'), '41988606636');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('heading', { name: 'Meus horários' })).toBeInTheDocument();
    expect(screen.getByText(/Os horários que você marcar por este celular/)).toBeInTheDocument();
    expect(usePortal).toHaveBeenLastCalledWith(undefined); // sem chave, não lê nada
    expect(screen.getByRole('button', { name: /Mão/ })).toBeInTheDocument();
  });

  it('I13: com a chave do celular, lista os horários e preenche os dados', async () => {
    localStorage.setItem(
      'agenda-bela:cliente',
      JSON.stringify({ nome: 'Ana', whatsapp: '5541988606636', chave: 'k'.repeat(24) }),
    );
    vi.mocked(usePortal).mockReturnValue({
      portal: {
        nome: 'Ana',
        whatsapp: '5541988606636',
        horarios: [
          {
            id: 'a1',
            inicio: inicioEm('2026-12-08', '0900'),
            servico: 'Mão',
            servicoId: 's1',
            duracaoMin: 60,
            travas: ['2026-12-08_0900'],
          },
        ],
      },
      carregando: false,
      erro: false,
    });
    ocupados();
    await ateOsDados();
    expect(usePortal).toHaveBeenCalledWith('k'.repeat(24));
    expect(screen.getByLabelText('Seu nome')).toHaveValue('Ana');
    expect(screen.getByLabelText('Seu WhatsApp com DDD')).toHaveValue('(41) 98860-6636');
    renderizar();
    expect(screen.getAllByText('terça-feira, 8 de dezembro, às 09:00').length).toBeGreaterThan(0);
  });

  describe('I14: remarcar e pedir cancelamento', () => {
    const CHAVE = 'k'.repeat(24);
    const longe = {
      id: 'a1',
      inicio: inicioEm('2026-12-08', '0900'),
      servico: 'Mão',
      servicoId: 's1',
      duracaoMin: 60,
      travas: ['2026-12-08_0900', '2026-12-08_1000'],
    };
    const perto = { ...longe, id: 'a2', inicio: inicioEm('2026-11-21', '0800'), travas: [] };

    beforeEach(() => {
      localStorage.setItem(
        'agenda-bela:cliente',
        JSON.stringify({ nome: 'Ana', whatsapp: '5541988606636', chave: CHAVE }),
      );
      vi.mocked(usePortal).mockReturnValue({
        portal: { nome: 'Ana', whatsapp: '5541988606636', horarios: [perto, longe] },
        carregando: false,
        erro: false,
      });
      vi.mocked(remarcar).mockReset().mockResolvedValue();
      vi.mocked(pedirCancelamento).mockReset().mockResolvedValue();
      ocupados();
    });

    it('com menos de 24 h, só pelo WhatsApp', () => {
      renderizar();
      expect(screen.getByText(/Faltam menos de 24 horas/)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Remarcar' })).toHaveLength(1);
    });

    it('pede cancelamento com motivo e mostra que está aguardando', async () => {
      renderizar();
      await userEvent.click(screen.getByRole('button', { name: 'Pedir cancelamento' }));
      await userEvent.type(screen.getByLabelText('Motivo (opcional)'), 'Viagem');
      await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido de cancelamento' }));
      expect(pedirCancelamento).toHaveBeenCalledWith(CHAVE, 'a1', 'Viagem');
      expect(
        await screen.findByText('Cancelamento pedido – aguardando a confirmação.'),
      ).toBeInTheDocument();
    });

    it('remarca na hora: escolhe o dia e a hora e confirma a troca', async () => {
      renderizar();
      await userEvent.click(screen.getByRole('button', { name: 'Remarcar' }));
      await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
      await userEvent.click(screen.getByRole('button', { name: 'terça-feira, 1 de dezembro' }));
      await userEvent.click(screen.getByRole('button', { name: '09:00' }));
      expect(screen.getByRole('heading', { name: 'Confirme a troca' })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Trocar horário' }));
      expect(remarcar).toHaveBeenCalledWith(
        expect.objectContaining({
          chave: CHAVE,
          servicoId: 's1',
          inicio: inicioEm('2026-12-01', '0900'),
          antigo: expect.objectContaining({ id: 'a1', travas: longe.travas }),
        }),
      );
      expect(await screen.findByRole('heading', { name: 'Horário trocado!' })).toBeInTheDocument();
    });
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
