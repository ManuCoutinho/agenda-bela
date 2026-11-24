import { describe, expect, it } from 'vitest';
import {
  esquemaPedido,
  expiracaoDoPedido,
  outrosHorariosDaCliente,
  pedidoExpirado,
  textoAvisoPedido,
  textoConfirmacao,
  textoRecusa,
  textoTroca,
  VALIDADE_PEDIDO_MS,
  type Pedido,
} from './pedidos';
import type { Agendamento } from './agenda';

const AGORA = new Date('2026-12-01T12:00:00Z');

describe('pedidos (RF09, RN02)', () => {
  it('trava do pedido vence um pouco antes de 24 h (folga para o relógio)', () => {
    const vence = expiracaoDoPedido(AGORA).getTime() - AGORA.getTime();
    expect(vence).toBeLessThan(VALIDADE_PEDIDO_MS);
    expect(vence).toBeGreaterThan(VALIDADE_PEDIDO_MS - 3_600_000);
  });

  it('pedido sem resposta expira junto com as travas', () => {
    const criadoEm = AGORA;
    expect(pedidoExpirado({ criadoEm }, new Date(AGORA.getTime() + 3_600_000))).toBe(false);
    expect(pedidoExpirado({ criadoEm }, new Date(AGORA.getTime() + VALIDADE_PEDIDO_MS))).toBe(true);
  });

  it('normaliza o WhatsApp e exige nome e número', () => {
    expect(
      esquemaPedido.parse({ nome: ' Ana ', whatsapp: '(41) 98860-6636', repetir: '7' }),
    ).toEqual({ nome: 'Ana', whatsapp: '5541988606636', repetir: 7 });
    expect(
      esquemaPedido.safeParse({ nome: 'Ana', whatsapp: '41988606636', repetir: '3' }).success,
    ).toBe(false);
    const r = esquemaPedido.safeParse({ nome: '', whatsapp: '123', repetir: '0' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0])).toEqual(['nome', 'whatsapp']);
  });

  it('mensagem do aviso no WhatsApp', () => {
    expect(
      textoAvisoPedido({
        nome: 'Ana',
        servico: 'Mão',
        quando: 'terça-feira, 1 de dezembro, às 09:00',
      }),
    ).toBe(
      'Oi! Sou Ana e acabei de marcar um horário de Mão para terça-feira, 1 de dezembro, às 09:00 ' +
        'pela sua página de agendamento. Até lá!',
    );
  });
});

describe('mensagens da manicure (RF10)', () => {
  it('confirmação com e sem endereço', () => {
    const base = { nome: 'Ana', servico: 'Mão', quando: 'terça-feira, 1 de dezembro, às 09:00' };
    expect(textoConfirmacao({ ...base, endereco: 'Rua A, 1' })).toBe(
      'Oi, Ana! Seu horário de Mão está confirmado para terça-feira, 1 de dezembro, às 09:00. ' +
        'Endereço: Rua A, 1. Até lá!',
    );
    expect(textoConfirmacao({ ...base, endereco: '' })).not.toContain('Endereço');
  });

  it('recusa com o link da página', () => {
    expect(
      textoRecusa({
        nome: 'Ana',
        quando: 'terça-feira, 1 de dezembro, às 09:00',
        link: 'https://x/agendar/j',
      }),
    ).toContain('escolha outro horário por aqui: https://x/agendar/j');
  });
});

describe('troca de horário (RF10)', () => {
  const ANA = '5541988606636';
  const pedido: Pedido = {
    id: 'p2',
    nome: 'Ana',
    whatsapp: ANA,
    servicoId: 's1',
    inicio: new Date('2026-12-10T13:00:00Z'),
    travas: ['2026-12-10_1000'],
    status: 'pendente',
    criadoEm: AGORA,
  };
  const marcado = (id: string, extra: Partial<Agendamento> = {}): Agendamento => ({
    id,
    clienteId: 'c1',
    clienteNome: 'Ana',
    clienteWhatsapp: ANA,
    servicoId: 's1',
    servicoNome: 'Mão',
    duracaoMin: 60,
    inicio: new Date('2026-12-05T13:00:00Z'),
    travas: ['2026-12-05_1000'],
    status: 'marcado',
    observacao: '',
    ...extra,
  });

  it('acha horário futuro e pedido pendente do mesmo WhatsApp, do mais próximo ao mais distante', () => {
    const anterior = { ...pedido, id: 'p1', inicio: new Date('2026-12-03T13:00:00Z') };
    const outros = outrosHorariosDaCliente(pedido, {
      agendamentos: [marcado('a1')],
      pendentes: [pedido, anterior],
      agora: AGORA,
    });
    expect(outros).toEqual([
      { tipo: 'pedido', pedido: anterior },
      { tipo: 'agendamento', agendamento: marcado('a1') },
    ]);
  });

  it('ignora horário que já passou, cancelado e outro número', () => {
    const outros = outrosHorariosDaCliente(pedido, {
      agendamentos: [
        marcado('passado', { inicio: new Date('2026-11-30T13:00:00Z') }),
        marcado('cancelado', { status: 'cancelado' }),
        marcado('outra', { clienteWhatsapp: '5541999990000' }),
      ],
      pendentes: [{ ...pedido, id: 'p3', whatsapp: '5541999990000' }],
      agora: AGORA,
    });
    expect(outros).toEqual([]);
  });

  it('mensagem da troca', () => {
    expect(
      textoTroca({
        nome: 'Ana',
        servico: 'Mão',
        antes: 'sábado, 5 de dezembro, às 10:00',
        quando: 'quinta-feira, 10 de dezembro, às 10:00',
        endereco: 'Rua A, 1',
      }),
    ).toBe(
      'Oi, Ana! Troquei o seu horário: o de sábado, 5 de dezembro, às 10:00 passou para ' +
        'quinta-feira, 10 de dezembro, às 10:00 (Mão). Endereço: Rua A, 1. Até lá!',
    );
  });
});
