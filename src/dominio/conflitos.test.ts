import { describe, expect, it } from 'vitest';
import { inicioEm, type Agendamento } from './agenda';
import { conflitosDoBloqueio } from './conflitos';
import type { Pedido } from './pedidos';

const AGORA = new Date('2026-11-20T12:00:00Z');
const ag = (id: string, data: string, hora: string, extra: Partial<Agendamento> = {}) => ({
  id,
  clienteId: 'c',
  clienteNome: id,
  clienteWhatsapp: '5541988606636',
  servicoId: 's',
  servicoNome: 'Mão',
  duracaoMin: 60,
  inicio: inicioEm(data, hora),
  travas: [],
  status: 'marcado' as const,
  observacao: '',
  ...extra,
});
const pedido = (id: string, data: string, hora: string, criadoEm = AGORA): Pedido => ({
  id,
  nome: id,
  whatsapp: '5541900000000',
  servicoId: 's',
  inicio: inicioEm(data, hora),
  travas: [`${data}_${hora}`, 'x'],
  status: 'pendente',
  criadoEm,
});

describe('conflitosDoBloqueio (RF12)', () => {
  it('um dia: pega quem se sobrepõe, não quem encosta', () => {
    const r = conflitosDoBloqueio(
      { tipo: 'pontual', data: '2026-12-01', ini: '10:00', fim: '12:00' },
      [
        ag('antes', '2026-12-01', '0900'), // 9–10: encosta
        ag('invade', '2026-12-01', '0930'), // 9:30–10:30
        ag('dentro', '2026-12-01', '1100'),
        ag('cancelado', '2026-12-01', '1000', { status: 'cancelado' }),
        ag('outroDia', '2026-12-02', '1000'),
      ],
      [pedido('pedido', '2026-12-01', '1130')],
      AGORA,
    );
    expect(r.map((c) => `${c.tipo}:${c.id}`)).toEqual([
      'atendimento:invade',
      'atendimento:dentro',
      'pedido:pedido',
    ]);
  });

  it('toda semana: só daqui para frente, no mesmo dia da semana', () => {
    const r = conflitosDoBloqueio(
      { tipo: 'recorrente', dia: 2, ini: '14:00', fim: '15:00' },
      [
        ag('passado', '2026-11-17', '1400'),
        ag('terca', '2026-11-24', '1430'),
        ag('outraTerca', '2026-12-08', '1400'),
        ag('quarta', '2026-11-25', '1400'),
      ],
      [pedido('expirado', '2026-12-01', '1400', new Date('2026-11-18T12:00:00Z'))],
      AGORA,
    );
    expect(r.map((c) => c.id)).toEqual(['terca', 'outraTerca']);
  });
});
