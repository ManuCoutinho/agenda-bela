import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { inicioEm, type Agendamento } from '../dominio/agenda';
import { salvarPortal } from '../servicos/portal';
import { useAgendamentos } from './useAgenda';
import { useClientes } from './useClientes';
import { useSincronizarPortais } from './useSincronizarPortais';

vi.mock('../servicos/portal', () => ({ salvarPortal: vi.fn() }));
vi.mock('./useClientes', () => ({ useClientes: vi.fn() }));
vi.mock('./useAgenda', () => ({ useAgendamentos: vi.fn() }));

const MARCADO: Agendamento = {
  id: 'a1',
  clienteId: 'c1',
  clienteNome: 'Ana',
  clienteWhatsapp: '5541988606636',
  servicoId: 's1',
  servicoNome: 'Mão',
  duracaoMin: 60,
  inicio: inicioEm('2099-12-01', '1000'),
  travas: ['2099-12-01_1000'],
  status: 'marcado',
  observacao: '',
};

describe('"Meus horários" atualizado pelo app da dona (I13)', () => {
  it('grava a cópia em cada chave da cliente, uma vez por mudança', () => {
    vi.mocked(useClientes).mockReturnValue({
      clientes: [
        {
          id: 'c1',
          nome: 'Ana',
          whatsapp: MARCADO.clienteWhatsapp,
          observacao: '',
          consentimento: true,
          chaves: ['k1', 'k2'],
        },
        { id: 'c2', nome: 'Bia', whatsapp: '5541900000000', observacao: '', consentimento: true },
      ],
      carregando: false,
      erro: false,
    });
    vi.mocked(useAgendamentos).mockReturnValue({
      dados: [MARCADO],
      carregando: false,
      erro: false,
    });
    const { rerender } = renderHook(() => useSincronizarPortais());
    rerender();
    expect(salvarPortal).toHaveBeenCalledTimes(2);
    expect(salvarPortal).toHaveBeenCalledWith('k1', {
      whatsapp: MARCADO.clienteWhatsapp,
      nome: 'Ana',
      horarios: [
        expect.objectContaining({ id: 'a1', servico: 'Mão', travas: ['2099-12-01_1000'] }),
      ],
      copiados: [],
    });
  });
});
