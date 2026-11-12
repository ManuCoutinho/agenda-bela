import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HorarioOcupado, inicioEm } from '../../dominio/agenda';
import { CONFIGURACOES_PADRAO } from '../../dominio/configuracoes';
import type { Pedido } from '../../dominio/pedidos';
import { useClientes } from '../../hooks/useClientes';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { usePedidosPendentes } from '../../hooks/usePedidos';
import { useServicos } from '../../hooks/useServicos';
import { aprovarPedido, descartarPedido, recusarPedido } from '../../servicos/pedidos';
import PedidosPendentes from './PedidosPendentes';

vi.mock('../../hooks/usePedidos', () => ({ usePedidosPendentes: vi.fn() }));
vi.mock('../../hooks/useServicos', () => ({ useServicos: vi.fn() }));
vi.mock('../../hooks/useClientes', () => ({ useClientes: vi.fn() }));
vi.mock('../../hooks/useConfiguracoes', () => ({ useConfiguracoes: vi.fn() }));
vi.mock('../../servicos/pedidos', () => ({
  aprovarPedido: vi.fn(),
  recusarPedido: vi.fn(),
  descartarPedido: vi.fn(),
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

  it('aprova usando a cliente já cadastrada e oferece a confirmação no WhatsApp', async () => {
    vi.mocked(aprovarPedido).mockResolvedValue();
    render(<PedidosPendentes />);
    expect(screen.getByRole('heading', { name: 'Pedidos para responder (1)' })).toBeInTheDocument();
    expect(screen.getByText('terça-feira, 1 de dezembro, às 09:00')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(aprovarPedido).toHaveBeenCalledWith(PEDIDO, MAO, 'c1');
    expect(await screen.findByRole('status')).toHaveTextContent('Ana: aprovado');
    const link = screen.getByRole('link', { name: 'Enviar confirmação no WhatsApp' });
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain(
      'Seu horário de Mão está confirmado para terça-feira, 1 de dezembro, às 09:00. Endereço: Rua A, 1.',
    );
  });

  it('recusa só depois de confirmar e manda o link da página', async () => {
    render(<PedidosPendentes />);
    await userEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(recusarPedido).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Sim, recusar' }));
    expect(recusarPedido).toHaveBeenCalledWith(PEDIDO);
    const link = screen.getByRole('link', { name: 'Enviar aviso no WhatsApp' });
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain(
      `${window.location.origin}/agendar/espaco-juju`,
    );
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
});
