import { describe, expect, it } from 'vitest';
import { inicioEm, type Agendamento } from './agenda';
import { proximoHorario } from './proximoHorario';

const ag = (id: string, dia: string, o: Partial<Agendamento> = {}): Agendamento => ({
  id,
  clienteId: 'c1',
  clienteNome: 'Ana',
  clienteWhatsapp: '5541988606636',
  servicoId: 's1',
  servicoNome: 'Mão',
  duracaoMin: 60,
  inicio: inicioEm(dia, '1000'),
  travas: [],
  status: 'marcado',
  observacao: '',
  ...o,
});

describe('proximoHorario (I10)', () => {
  it('o mais próximo no futuro, sem cancelados nem de outra cliente', () => {
    const agora = new Date('2026-11-24T15:00:00Z');
    const lista = [
      ag('passado', '2026-11-20'),
      ag('depois', '2026-12-10'),
      ag('cancelado', '2026-11-30', { status: 'cancelado' }),
      ag('outra', '2026-11-26', { clienteWhatsapp: '5541900000000' }),
      ag('proximo', '2026-12-01'),
    ];
    expect(proximoHorario(lista, '5541988606636', agora)?.id).toBe('proximo');
    expect(proximoHorario([], '5541988606636', agora)).toBeUndefined();
  });
});
