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

  it('vira atendimento da cliente cadastrada, com a confirmação na fila de avisos, uma vez só', () => {
    const { rerender } = renderHook(() => useConversaoPedidos());
    rerender();
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
  });
});
