import { describe, expect, it } from 'vitest';
import {
  esquemaPedido,
  expiracaoDoPedido,
  pedidoExpirado,
  textoAvisoPedido,
  textoConfirmacao,
  textoRecusa,
  VALIDADE_PEDIDO_MS,
} from './pedidos';

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

  it('normaliza o WhatsApp e exige a autorização', () => {
    expect(
      esquemaPedido.parse({ nome: ' Ana ', whatsapp: '(41) 98860-6636', consentimento: true }),
    ).toEqual({ nome: 'Ana', whatsapp: '5541988606636', consentimento: true });
    const r = esquemaPedido.safeParse({ nome: '', whatsapp: '123', consentimento: false });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0])).toEqual(['nome', 'whatsapp', 'consentimento']);
  });

  it('mensagem do aviso no WhatsApp', () => {
    expect(
      textoAvisoPedido({
        nome: 'Ana',
        servico: 'Mão',
        quando: 'terça-feira, 1 de dezembro, às 09:00',
      }),
    ).toBe(
      'Oi! Sou Ana e acabei de pedir um horário de Mão para terça-feira, 1 de dezembro, às 09:00 ' +
        'pela sua página de agendamento. Fico no aguardo da confirmação!',
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
