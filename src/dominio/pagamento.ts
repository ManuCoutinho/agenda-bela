import { z } from 'zod';
import { formatarPreco } from './servicos';

/** `config/pagamento`: só a manicure lê (a chave vai na mensagem, não na página pública). */
export type Pagamento = {
  chavePix: string;
  /** Percentual do preço do serviço pedido como sinal. */
  sinalPercentual: number;
};

export const PAGAMENTO_PADRAO: Pagamento = { chavePix: '', sinalPercentual: 50 };

export const esquemaPagamento = z.object({
  // 77 caracteres: a chave aleatória (EVP) tem 36 e o e-mail do Pix vai até 77
  chavePix: z.string().trim().max(77, 'Use até 77 caracteres na chave Pix.'),
  sinalPercentual: z.coerce
    .number<string>()
    .int('Use um número inteiro, por exemplo 50.')
    .min(1, 'O sinal deve ser de 1% a 100%.')
    .max(100, 'O sinal deve ser de 1% a 100%.'),
});

export type CamposPagamento = z.input<typeof esquemaPagamento>;

export const paraCamposPagamento = (p: Pagamento): CamposPagamento => ({
  chavePix: p.chavePix,
  sinalPercentual: String(p.sinalPercentual),
});

/** 50% de 7000 → 3500 (arredonda para o centavo). */
export const valorSinal = (precoCentavos: number, percentual: number) =>
  Math.round((precoCentavos * percentual) / 100);

/** Confirmação que reserva o horário e pede o sinal pelo Pix. */
export const textoConfirmacaoComSinal = (p: {
  nome: string;
  servico: string;
  quando: string;
  endereco: string;
  sinalCentavos: number;
  percentual: number;
  chavePix: string;
}) =>
  `Oi, ${p.nome}! Reservei seu horário de ${p.servico} para ${p.quando}. ` +
  `Para confirmar, peço um sinal de ${formatarPreco(p.sinalCentavos)} ` +
  `(${p.percentual}% do valor) pelo Pix. Chave: ${p.chavePix}. ` +
  'Me mande o comprovante por aqui.' +
  (p.endereco ? ` Endereço: ${p.endereco}.` : '') +
  ' Até lá!';

/** I10: pedido do sinal depois que o horário já está marcado (a cliente confirmou sozinha). */
export const textoPedidoSinal = (p: {
  nome: string;
  servico: string;
  quando: string;
  sinalCentavos: number;
  percentual: number;
  chavePix: string;
}) =>
  `Oi, ${p.nome}! Para garantir seu horário de ${p.servico} (${p.quando}), ` +
  `peço um sinal de ${formatarPreco(p.sinalCentavos)} (${p.percentual}% do valor) pelo Pix. ` +
  `Chave: ${p.chavePix}. Me mande o comprovante por aqui. Obrigada!`;
