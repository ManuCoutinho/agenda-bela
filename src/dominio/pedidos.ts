import { z } from 'zod';
import { normalizarWhatsApp } from './clientes';

/** RN02: o pedido segura o horário por 24 h (as regras aceitam até 24 h). */
export const VALIDADE_PEDIDO_MS = 24 * 3_600_000;
/** Folga para relógio de celular adiantado: as regras recusam além de 24 h. */
const FOLGA_RELOGIO_MS = 10 * 60_000;

export const expiracaoDoPedido = (agora: Date) =>
  new Date(agora.getTime() + VALIDADE_PEDIDO_MS - FOLGA_RELOGIO_MS);

export type StatusPedido = 'pendente' | 'aprovado' | 'recusado' | 'expirado';

/** Pedido da cliente pela página pública (RF09); só a manicure lê. */
export type Pedido = {
  id: string;
  nome: string;
  whatsapp: string;
  servicoId: string;
  inicio: Date;
  travas: string[];
  status: StatusPedido;
  criadoEm: Date;
};

/** RN02: passadas 24 h sem resposta, as travas soltam e o horário volta a ficar livre. */
export const pedidoExpirado = (p: Pick<Pedido, 'criadoEm'>, agora: Date) =>
  agora.getTime() - p.criadoEm.getTime() >= VALIDADE_PEDIDO_MS - FOLGA_RELOGIO_MS;

/** A cliente tentou um horário que outra pessoa travou antes (RF09). */
export class HorarioJaPedido extends Error {
  constructor() {
    super('Horário já pedido');
    this.name = 'HorarioJaPedido';
  }
}

export const esquemaPedido = z.object({
  nome: z.string().trim().min(1, 'Escreva o seu nome.').max(80, 'Use até 80 letras no nome.'),
  whatsapp: z.string().transform((texto, ctx) => {
    const numero = normalizarWhatsApp(texto);
    if (!numero) {
      ctx.addIssue({
        code: 'custom',
        message: 'Escreva o seu WhatsApp com DDD, por exemplo (41) 98860-6636.',
      });
      return z.NEVER;
    }
    return numero;
  }),
  // LGPD: a cliente autoriza o uso dos dados para o agendamento
  consentimento: z
    .boolean()
    .refine((v) => v, 'Marque a autorização para enviar o pedido.')
    .transform(() => true as const),
});

export type CamposPedido = z.input<typeof esquemaPedido>;
export type DadosPedido = z.output<typeof esquemaPedido>;

/** Mensagem que a cliente manda à manicure depois de pedir ("Avisar no WhatsApp"). */
export const textoAvisoPedido = (p: { nome: string; servico: string; quando: string }) =>
  `Oi! Sou ${p.nome} e acabei de pedir um horário de ${p.servico} para ${p.quando} ` +
  'pela sua página de agendamento. Fico no aguardo da confirmação!';

/** Mensagem da manicure ao aprovar (abre no WhatsApp da cliente). */
export const textoConfirmacao = (p: {
  nome: string;
  servico: string;
  quando: string;
  endereco: string;
}) =>
  `Oi, ${p.nome}! Seu horário de ${p.servico} está confirmado para ${p.quando}.` +
  (p.endereco ? ` Endereço: ${p.endereco}.` : '') +
  ' Até lá!';

/** Mensagem da manicure ao recusar, com o link para a cliente escolher outro horário. */
export const textoRecusa = (p: { nome: string; quando: string; link: string }) =>
  `Oi, ${p.nome}! Infelizmente não consigo te atender no horário que você pediu (${p.quando}). ` +
  `Se quiser, escolha outro horário por aqui: ${p.link}`;
