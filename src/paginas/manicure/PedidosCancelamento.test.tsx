import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inicioEm, type Agendamento } from '../../dominio/agenda';
import { CONFIGURACOES_PADRAO } from '../../dominio/configuracoes';
import { useAgendamento } from '../../hooks/useAgenda';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { useSolicitacoes } from '../../hooks/useSolicitacoes';
import { marcarSolicitacaoAvisada, responderCancelamento } from '../../servicos/solicitacoes';
import PedidosCancelamento from './PedidosCancelamento';

vi.mock('../../hooks/useAgenda', () => ({ useAgendamento: vi.fn() }));
vi.mock('../../hooks/useConfiguracoes', () => ({ useConfiguracoes: vi.fn() }));
vi.mock('../../hooks/useSolicitacoes', () => ({ useSolicitacoes: vi.fn() }));
vi.mock('../../servicos/solicitacoes', () => ({
  responderCancelamento: vi.fn(),
  marcarSolicitacaoAvisada: vi.fn(),
}));

const ATENDIMENTO: Agendamento = {
  id: 'a1',
  clienteId: 'c1',
  clienteNome: 'Ana',
  clienteWhatsapp: '5541988606636',
  servicoId: 's1',
  servicoNome: 'Mão',
  duracaoMin: 60,
  inicio: inicioEm('2026-12-08', '0900'),
  travas: ['2026-12-08_0900'],
  status: 'marcado',
  observacao: '',
};
const PEDIDO = {
  id: 's1',
  horario: 'a1',
  motivo: 'Viagem',
  criadoEm: new Date(),
  status: 'pendente' as const,
  avisada: false,
};

describe('Pedidos de cancelamento (I14)', () => {
  beforeEach(() => {
    vi.mocked(responderCancelamento).mockReset();
    vi.mocked(useAgendamento).mockReturnValue({
      dados: ATENDIMENTO,
      carregando: false,
      erro: false,
    });
    vi.mocked(useConfiguracoes).mockReturnValue({
      config: { ...CONFIGURACOES_PADRAO, slug: 'espaco-juju' },
      carregando: false,
      erro: false,
    });
  });

  it('sem pedidos, não mostra nada', () => {
    vi.mocked(useSolicitacoes).mockReturnValue([]);
    const { container } = render(<PedidosCancelamento />);
    expect(container).toBeEmptyDOMElement();
  });

  it('aprova: cancela o atendimento e guarda a mensagem com o link da página', async () => {
    vi.mocked(useSolicitacoes).mockReturnValue([PEDIDO]);
    render(<PedidosCancelamento />);
    expect(
      screen.getByRole('heading', { name: 'Pedidos de cancelamento (1)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Motivo: Viagem')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Aprovar cancelamento' }));
    expect(responderCancelamento).toHaveBeenCalledWith(
      PEDIDO,
      ATENDIMENTO,
      true,
      expect.stringContaining(`${window.location.origin}/agendar/espaco-juju`),
    );
  });

  it('depois de responder, fica o aviso para enviar', async () => {
    vi.mocked(useSolicitacoes).mockReturnValue([
      { ...PEDIDO, status: 'recusada', aviso: 'Oi, Ana! Me chama aqui?' },
    ]);
    render(<PedidosCancelamento />);
    const link = screen.getByRole('link', { name: 'Enviar aviso no WhatsApp' });
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain(
      'Oi, Ana! Me chama aqui?',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Já avisei' }));
    expect(marcarSolicitacaoAvisada).toHaveBeenCalledWith('s1');
  });
});
