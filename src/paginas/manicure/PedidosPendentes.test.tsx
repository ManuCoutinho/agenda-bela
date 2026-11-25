import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HorarioOcupado, inicioEm, type Agendamento } from '../../dominio/agenda';
import { CONFIGURACOES_PADRAO } from '../../dominio/configuracoes';
import type { AvisoPendente, Pedido } from '../../dominio/pedidos';
import { useClientes } from '../../hooks/useClientes';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { usePagamento } from '../../hooks/usePagamento';
import {
  useAgendamentosDasClientes,
  useAvisosPendentes,
  usePedidosPendentes,
} from '../../hooks/usePedidos';
import { useServicos } from '../../hooks/useServicos';
import {
  aprovarPedido,
  descartarPedido,
  marcarAvisado,
  recusarPedido,
} from '../../servicos/pedidos';
import PedidosPendentes from './PedidosPendentes';

vi.mock('../../hooks/usePedidos', () => ({
  usePedidosPendentes: vi.fn(),
  useAgendamentosDasClientes: vi.fn(),
  useAvisosPendentes: vi.fn(),
}));
vi.mock('../../hooks/useServicos', () => ({ useServicos: vi.fn() }));
vi.mock('../../hooks/useClientes', () => ({ useClientes: vi.fn() }));
vi.mock('../../hooks/useConfiguracoes', () => ({ useConfiguracoes: vi.fn() }));
vi.mock('../../hooks/usePagamento', () => ({ usePagamento: vi.fn() }));
vi.mock('../../servicos/pedidos', () => ({
  aprovarPedido: vi.fn(),
  recusarPedido: vi.fn(),
  descartarPedido: vi.fn(),
  marcarAvisado: vi.fn(),
}));

const AGORA = new Date('2026-11-20T12:00:00Z');
const MAO = { id: 's1', nome: 'Mão', duracaoMin: 60, precoCentavos: 3500, publico: true };
const PEDIDO: Pedido = {
  id: 'p1',
  nome: 'Ana',
  whatsapp: '5541988606636',
  servicoId: 's1',
  inicio: inicioEm('2026-12-01', '0900'),
  travas: ['2026-12-01_0900', '2026-12-01_0930'],
  status: 'pendente',
  criadoEm: new Date(AGORA.getTime() - 3_600_000),
};

describe('Pedidos para responder (RF10, RN02)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: AGORA, toFake: ['Date'] });
    vi.mocked(aprovarPedido).mockReset();
    vi.mocked(recusarPedido).mockReset();
    vi.mocked(usePedidosPendentes).mockReturnValue({
      pedidos: [PEDIDO],
      carregando: false,
      erro: false,
    });
    vi.mocked(useAgendamentosDasClientes).mockReturnValue([]);
    vi.mocked(useAvisosPendentes).mockReturnValue({ avisos: [], carregando: false, erro: false });
    vi.mocked(usePagamento).mockReturnValue({
      pagamento: { chavePix: '', sinalPercentual: 50 },
      carregando: false,
      erro: false,
    });
    vi.mocked(useServicos).mockReturnValue({ servicos: [MAO], carregando: false, erro: false });
    vi.mocked(useClientes).mockReturnValue({
      clientes: [
        { id: 'c1', nome: 'Ana', whatsapp: PEDIDO.whatsapp, observacao: '', consentimento: true },
      ],
      carregando: false,
      erro: false,
    });
    vi.mocked(useConfiguracoes).mockReturnValue({
      config: { ...CONFIGURACOES_PADRAO, slug: 'espaco-juju', endereco: 'Rua A, 1' },
      carregando: false,
      erro: false,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sem pedidos, não mostra nada', () => {
    vi.mocked(usePedidosPendentes).mockReturnValue({ pedidos: [], carregando: false, erro: false });
    const { container } = render(<PedidosPendentes />);
    expect(container).toBeEmptyDOMElement();
  });

  it('aprova usando a cliente já cadastrada e grava a confirmação a enviar', async () => {
    vi.mocked(aprovarPedido).mockResolvedValue();
    render(<PedidosPendentes />);
    expect(screen.getByRole('heading', { name: 'Pedidos para responder (1)' })).toBeInTheDocument();
    expect(screen.getByText('terça-feira, 1 de dezembro, às 09:00')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(aprovarPedido).toHaveBeenCalledWith(PEDIDO, MAO, {
      clienteId: 'c1',
      aviso: {
        tipo: 'confirmacao',
        texto: expect.stringContaining(
          'Seu horário de Mão está confirmado para terça-feira, 1 de dezembro, às 09:00. Endereço: Rua A, 1.',
        ),
      },
    });
  });

  it('recusa só depois de confirmar e grava o aviso com o link da página', async () => {
    render(<PedidosPendentes />);
    await userEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(recusarPedido).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Sim, recusar' }));
    expect(recusarPedido).toHaveBeenCalledWith(
      PEDIDO,
      expect.stringContaining(`${window.location.origin}/agendar/espaco-juju`),
    );
  });

  describe('avisos para enviar (lidos do Firestore)', () => {
    const aviso = (pedidoId: string, nome: string): AvisoPendente => ({
      pedidoId,
      nome,
      whatsapp: PEDIDO.whatsapp,
      inicio: PEDIDO.inicio,
      tipo: 'confirmacao',
      texto: `Oi, ${nome}! Seu horário está confirmado.`,
    });
    const FILA = [aviso('p1', 'Ana'), aviso('p2', 'Bia'), aviso('p3', 'Cris')];

    beforeEach(() => {
      vi.mocked(marcarAvisado).mockReset();
      vi.mocked(usePedidosPendentes).mockReturnValue({
        pedidos: [],
        carregando: false,
        erro: false,
      });
      vi.mocked(useAvisosPendentes).mockReturnValue({
        avisos: FILA,
        carregando: false,
        erro: false,
      });
    });

    it('mostra cada aviso com a mensagem pronta, sem a lista de pedidos vazia', () => {
      render(<PedidosPendentes />);
      expect(screen.getByRole('heading', { name: 'Avisos para enviar (3)' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Pedidos para responder/ })).toBeNull();
      const [primeiro] = screen.getAllByRole('link', { name: 'Enviar confirmação no WhatsApp' });
      expect(decodeURIComponent(primeiro?.getAttribute('href') ?? '')).toContain(
        'Oi, Ana! Seu horário está confirmado.',
      );
    });

    it('enviar o primeiro só tira ele da fila; os outros continuam depois de reabrir o app', async () => {
      const { unmount } = render(<PedidosPendentes />);
      const [primeiro] = screen.getAllByRole('link', { name: 'Enviar confirmação no WhatsApp' });
      primeiro?.addEventListener('click', (e) => e.preventDefault());
      if (primeiro) await userEvent.click(primeiro);
      expect(marcarAvisado).toHaveBeenCalledTimes(1);
      expect(marcarAvisado).toHaveBeenCalledWith(expect.objectContaining({ pedidoId: 'p1' }));

      // o WhatsApp abriu e o app recarregou: a fila vem de novo do Firestore
      unmount();
      vi.mocked(useAvisosPendentes).mockReturnValue({
        avisos: FILA.slice(1),
        carregando: false,
        erro: false,
      });
      render(<PedidosPendentes />);
      expect(screen.getByRole('heading', { name: 'Avisos para enviar (2)' })).toBeInTheDocument();
      expect(screen.getByText(/^Bia:/)).toBeInTheDocument();
      expect(screen.getByText(/^Cris:/)).toBeInTheDocument();
    });

    it('"Já avisei" tira o aviso sem abrir o WhatsApp', async () => {
      render(<PedidosPendentes />);
      const [, segundo] = screen.getAllByRole('button', { name: 'Já avisei' });
      if (segundo) await userEvent.click(segundo);
      expect(marcarAvisado).toHaveBeenCalledWith(expect.objectContaining({ pedidoId: 'p2' }));
    });

    it('recusa aparece como aviso, não como confirmação', () => {
      vi.mocked(useAvisosPendentes).mockReturnValue({
        avisos: [{ ...aviso('p1', 'Ana'), tipo: 'recusa' }],
        carregando: false,
        erro: false,
      });
      render(<PedidosPendentes />);
      expect(screen.getByText('Ana: recusado e horário liberado. Avise a cliente:')).toBeVisible();
      expect(screen.getByRole('link', { name: 'Enviar aviso no WhatsApp' })).toBeInTheDocument();
    });
  });

  it('pedido expirado: avisa, deixa descartar e explica se o horário foi ocupado', async () => {
    const velho = { ...PEDIDO, criadoEm: new Date(AGORA.getTime() - 25 * 3_600_000) };
    vi.mocked(usePedidosPendentes).mockReturnValue({
      pedidos: [velho],
      carregando: false,
      erro: false,
    });
    vi.mocked(aprovarPedido).mockRejectedValue(new HorarioOcupado());
    render(<PedidosPendentes />);
    expect(screen.getByText(/Passou de 24 horas sem resposta/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Aprovar mesmo assim' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Esse horário já foi ocupado.');

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(descartarPedido).toHaveBeenCalledWith(velho);
  });

  describe('mesma cliente com outro horário (troca)', () => {
    const MARCADO: Agendamento = {
      id: 'a1',
      clienteId: 'c1',
      clienteNome: 'Ana',
      clienteWhatsapp: PEDIDO.whatsapp,
      servicoId: 's1',
      servicoNome: 'Mão',
      duracaoMin: 60,
      inicio: inicioEm('2026-11-28', '1000'),
      travas: ['2026-11-28_1000', '2026-11-28_1030'],
      status: 'marcado',
      observacao: '',
    };

    beforeEach(() => {
      vi.mocked(useAgendamentosDasClientes).mockReturnValue([MARCADO]);
      vi.mocked(aprovarPedido).mockResolvedValue();
    });

    it('avisa que ela já tem horário e troca em vez de marcar outro', async () => {
      render(<PedidosPendentes />);
      expect(screen.getByText('Ana já tem horário:')).toBeInTheDocument();
      expect(screen.getByText('sábado, 28 de novembro, às 10:00 (Mão)')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Trocar horário' }));
      expect(aprovarPedido).toHaveBeenCalledWith(PEDIDO, MAO, {
        clienteId: 'c1',
        substitui: {
          tipo: 'agendamento',
          agendamento: MARCADO,
        },
        aviso: {
          tipo: 'troca',
          texto: expect.stringContaining(
            'Troquei o seu horário: o de sábado, 28 de novembro, às 10:00 passou para ' +
              'terça-feira, 1 de dezembro, às 09:00 (Mão).',
          ),
        },
      });
    });

    it('"Marcar mais um" aprova sem mexer no horário que ela já tem', async () => {
      render(<PedidosPendentes />);
      await userEvent.click(screen.getByRole('button', { name: 'Marcar mais um' }));
      expect(aprovarPedido).toHaveBeenCalledWith(PEDIDO, MAO, {
        clienteId: 'c1',
        aviso: expect.objectContaining({ tipo: 'confirmacao' }),
      });
    });

    it('dois pedidos sem resposta do mesmo número: a troca substitui o outro pedido', async () => {
      vi.mocked(useAgendamentosDasClientes).mockReturnValue([]);
      const anterior = { ...PEDIDO, id: 'p0', inicio: inicioEm('2026-11-30', '1400') };
      vi.mocked(usePedidosPendentes).mockReturnValue({
        pedidos: [anterior, PEDIDO],
        carregando: false,
        erro: false,
      });
      render(<PedidosPendentes />);
      expect(
        screen.getByText('segunda-feira, 30 de novembro, às 14:00 (pedido sem resposta)'),
      ).toBeInTheDocument();
      const [, doNovo] = screen.getAllByRole('button', { name: 'Trocar horário' });
      if (doNovo) await userEvent.click(doNovo);
      expect(aprovarPedido).toHaveBeenCalledWith(PEDIDO, MAO, {
        clienteId: 'c1',
        substitui: {
          tipo: 'pedido',
          pedido: anterior,
        },
        aviso: expect.objectContaining({ tipo: 'troca' }),
      });
    });
  });

  describe('aprovar com sinal pelo Pix', () => {
    it('sem chave Pix, o botão fica desabilitado e explica onde cadastrar', () => {
      render(<PedidosPendentes />);
      const botao = screen.getByRole('button', { name: 'Aprovar com sinal' });
      expect(botao).toBeDisabled();
      expect(botao).toHaveAccessibleDescription(
        'Para aprovar com sinal, cadastre a chave Pix em Mais › Configurações.',
      );
    });

    it('serviço sem preço não oferece sinal', () => {
      vi.mocked(useServicos).mockReturnValue({
        servicos: [{ ...MAO, precoCentavos: 0 }],
        carregando: false,
        erro: false,
      });
      render(<PedidosPendentes />);
      expect(screen.queryByRole('button', { name: 'Aprovar com sinal' })).not.toBeInTheDocument();
    });

    it('grava o sinal e manda a mensagem com o valor e a chave', async () => {
      vi.mocked(usePagamento).mockReturnValue({
        pagamento: { chavePix: 'ana@pix.com', sinalPercentual: 50 },
        carregando: false,
        erro: false,
      });
      vi.mocked(aprovarPedido).mockResolvedValue();
      render(<PedidosPendentes />);
      await userEvent.click(screen.getByRole('button', { name: 'Aprovar com sinal' }));
      expect(aprovarPedido).toHaveBeenCalledWith(PEDIDO, MAO, {
        clienteId: 'c1',
        sinalCentavos: 1750,
        aviso: {
          tipo: 'confirmacao',
          texto: expect.stringContaining(
            'peço um sinal de R$ 17,50 (50% do valor) pelo Pix. Chave: ana@pix.com.',
          ),
        },
      });
    });
  });
});
