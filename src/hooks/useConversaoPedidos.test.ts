import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inicioEm } from '../dominio/agenda';
import { CONFIGURACOES_PADRAO } from '../dominio/configuracoes';
import type { Pedido } from '../dominio/pedidos';
import { aprovarPedido, observarPedidosConfirmados } from '../servicos/pedidos';
import { useClientes } from './useClientes';
import { useConfiguracoes } from './useConfiguracoes';
import { useConversaoPedidos } from './useConversaoPedidos';
import { useServicos } from './useServicos';

vi.mock('../servicos/pedidos', () => ({
  aprovarPedido: vi.fn(),
  observarPedidosConfirmados: vi.fn(),
}));
vi.mock('../servicos/encurtador', () => ({
  encurtarLink: vi.fn(async () => 'https://is.gd/agenda'),
}));
vi.mock('./useServicos', () => ({ useServicos: vi.fn() }));
vi.mock('./useClientes', () => ({ useClientes: vi.fn() }));
vi.mock('./useConfiguracoes', () => ({ useConfiguracoes: vi.fn() }));

const PEDIDO: Pedido = {
  id: 'p1',
  nome: 'Ana',
  whatsapp: '5541988606636',
  servicoId: 's1',
  inicio: inicioEm('2026-12-01', '0900'),
  travas: ['2026-12-01_0900'],
  status: 'confirmado',
  criadoEm: new Date(),
};

describe('conversão automática dos horários confirmados (I08)', () => {
  beforeEach(() => {
    vi.mocked(aprovarPedido).mockReset().mockResolvedValue();
    vi.mocked(observarPedidosConfirmados).mockImplementation((aoMudar) => {
      aoMudar([PEDIDO]);
      return () => undefined;
    });
    vi.mocked(useServicos).mockReturnValue({
      servicos: [{ id: 's1', nome: 'Mão', duracaoMin: 60, precoCentavos: 3500, publico: true }],
      carregando: false,
      erro: false,
    });
    vi.mocked(useClientes).mockReturnValue({
      clientes: [
        { id: 'c1', nome: 'Ana', whatsapp: PEDIDO.whatsapp, observacao: '', consentimento: true },
      ],
      carregando: false,
      erro: false,
    });
    vi.mocked(useConfiguracoes).mockReturnValue({
      config: { ...CONFIGURACOES_PADRAO, endereco: 'Rua A, 1' },
      carregando: false,
      erro: false,
    });
  });

  it('vira atendimento da cliente cadastrada, com a confirmação na fila de avisos, uma vez só', async () => {
    const { rerender } = renderHook(() => useConversaoPedidos());
    rerender();
    await vi.waitFor(() => expect(aprovarPedido).toHaveBeenCalled());
    expect(aprovarPedido).toHaveBeenCalledTimes(1);
    expect(aprovarPedido).toHaveBeenCalledWith(PEDIDO, expect.objectContaining({ nome: 'Mão' }), {
      clienteId: 'c1',
      aviso: {
        tipo: 'confirmacao',
        texto: expect.stringContaining(
          'Seu horário de Mão está confirmado para terça-feira, 1 de dezembro, às 09:00. Endereço: Rua A, 1.',
        ),
      },
    });
    expect(vi.mocked(aprovarPedido).mock.calls[0]?.[2].aviso?.texto).toContain(
      'Salvar na sua agenda: https://is.gd/agenda',
    );
  });
});

describe('remarcação feita pela cliente (I14)', () => {
  it('vira aviso de troca, com o horário antigo', async () => {
    vi.mocked(aprovarPedido).mockReset().mockResolvedValue();
    const troca = {
      ...PEDIDO,
      id: 'p2',
      substitui: 'a1',
      substituiInicio: inicioEm('2026-11-28', '1000'),
    };
    vi.mocked(observarPedidosConfirmados).mockImplementation((aoMudar) => {
      aoMudar([troca]);
      return () => undefined;
    });
    renderHook(() => useConversaoPedidos());
    await vi.waitFor(() => expect(aprovarPedido).toHaveBeenCalled());
    expect(vi.mocked(aprovarPedido).mock.calls[0]?.[2].aviso).toEqual({
      tipo: 'troca',
      texto: expect.stringContaining(
        'o de sábado, 28 de novembro, às 10:00 passou para terça-feira, 1 de dezembro, às 09:00',
      ),
    });
  });
});
