import { z } from 'zod';

/**
 * Aceita o número como a manicure digitar ("(41) 98860-6636", "41988606636",
 * "+55 41 98860-6636") e devolve 55 + DDD + número, só dígitos – o formato
 * de `wa.me` e das regras do Firestore. Devolve `null` se não for um número BR.
 */
export function normalizarWhatsApp(texto: string): string | null {
  const digitos = texto.replace(/\D/g, '').replace(/^0+/, '');
  const nacional = /^55\d{10,11}$/.test(digitos) ? digitos.slice(2) : digitos;
  if (!/^[1-9]{2}\d{8,9}$/.test(nacional)) return null;
  return `55${nacional}`;
}

/** "5541988606636" → "(41) 98860-6636" */
export function formatarWhatsApp(numero: string): string {
  const nacional = numero.replace(/\D/g, '').replace(/^55/, '');
  const ddd = nacional.slice(0, 2);
  const resto = nacional.slice(2);
  const corte = resto.length - 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

export const esquemaCliente = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Escreva o nome da cliente.')
    .max(80, 'Use até 80 letras no nome.'),
  whatsapp: z.string().transform((texto, ctx) => {
    const numero = normalizarWhatsApp(texto);
    if (!numero) {
      ctx.addIssue({
        code: 'custom',
        message: 'Escreva o WhatsApp com DDD, por exemplo (41) 98860-6636.',
      });
      return z.NEVER;
    }
    return numero;
  }),
  observacao: z.string().trim().max(500, 'Use até 500 letras na observação.'),
  // LGPD: só grava com a autorização marcada
  consentimento: z
    .boolean()
    .refine((v) => v, 'Marque a autorização da cliente para guardar os dados.')
    .transform(() => true as const),
});

/** O que o formulário preenche (antes da validação). */
export type CamposCliente = z.input<typeof esquemaCliente>;
/** O que é gravado: nome sem espaços sobrando, WhatsApp normalizado. */
export type DadosCliente = z.output<typeof esquemaCliente>;
export type Cliente = DadosCliente & { id: string };

const semAcento = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR');

const porNome = (a: Cliente, b: Cliente) =>
  a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });

/**
 * Busca por nome (sem diferenciar acento nem maiúscula) ou por parte do
 * WhatsApp, quando o termo é numérico. Sempre em ordem alfabética.
 */
export function buscarClientes(clientes: readonly Cliente[], termo: string): Cliente[] {
  const busca = termo.trim();
  const digitos = busca.replace(/\D/g, '');
  const numerica = digitos.length > 0 && /^[\d\s()+-]+$/.test(busca);

  const encontradas = !busca
    ? clientes
    : clientes.filter((c) =>
        numerica ? c.whatsapp.includes(digitos) : semAcento(c.nome).includes(semAcento(busca)),
      );
  return [...encontradas].sort(porNome);
}
