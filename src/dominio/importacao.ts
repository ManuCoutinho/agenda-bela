import { normalizarWhatsApp, type Cliente, type DadosCliente } from './clientes';

/** Contato como vem do seletor de contatos do celular. */
export type ContatoImportado = { nome: string; telefones: string[] };

export type SituacaoImportacao = 'nova' | 'cadastrada' | 'repetida' | 'sem-numero' | 'sem-nome';

export type Candidata = {
  /** Posição na lista, para a tela marcar/desmarcar. */
  chave: number;
  nome: string;
  /** 55 + DDD + número, ou `null` se nenhum telefone serviu. */
  whatsapp: string | null;
  situacao: SituacaoImportacao;
};

/** Só as novas podem ser importadas; as outras aparecem com o motivo. */
export const MOTIVO: Record<SituacaoImportacao, string> = {
  nova: '',
  cadastrada: 'já está nas suas clientes',
  repetida: 'aparece mais de uma vez na lista',
  'sem-numero': 'sem celular com DDD',
  'sem-nome': 'sem nome',
};

/** DDD (2 dígitos) de um número 55 + DDD + número. */
export const dddDe = (whatsapp: string) => whatsapp.replace(/\D/g, '').slice(2, 4);

/**
 * Melhor telefone para WhatsApp: prefere celular (9 dígitos depois do DDD).
 * Número sem DDD (8 ou 9 dígitos) recebe o DDD padrão, se houver.
 */
export function escolherWhatsApp(telefones: readonly string[], dddPadrao = ''): string | null {
  const normalizados = telefones
    .map((t) => {
      const digitos = t.replace(/\D/g, '').replace(/^0+/, '');
      const comDdd = /^\d{8,9}$/.test(digitos) && dddPadrao ? `${dddPadrao}${digitos}` : t;
      return normalizarWhatsApp(comDdd);
    })
    .filter((n): n is string => n !== null);
  return normalizados.find((n) => n.length === 13) ?? normalizados[0] ?? null;
}

/** Marca o que pode ser importado e o motivo de quem fica de fora. */
export function prepararImportacao(
  contatos: readonly ContatoImportado[],
  existentes: readonly Pick<Cliente, 'whatsapp'>[],
  dddPadrao = '',
): Candidata[] {
  const cadastrados = new Set(existentes.map((c) => c.whatsapp));
  const vistos = new Set<string>();
  return contatos
    .map((c, chave) => {
      const nome = c.nome.replace(/\s+/g, ' ').trim().slice(0, 80);
      const whatsapp = escolherWhatsApp(c.telefones, dddPadrao);
      let situacao: SituacaoImportacao = 'nova';
      if (!nome) situacao = 'sem-nome';
      else if (!whatsapp) situacao = 'sem-numero';
      else if (cadastrados.has(whatsapp)) situacao = 'cadastrada';
      else if (vistos.has(whatsapp)) situacao = 'repetida';
      if (whatsapp && situacao === 'nova') vistos.add(whatsapp);
      return { chave, nome, whatsapp, situacao };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
}

/** Dados a gravar; o consentimento foi confirmado pela manicure para o lote. */
export const paraNovasClientes = (escolhidas: readonly Candidata[]): DadosCliente[] =>
  escolhidas
    .filter((c): c is Candidata & { whatsapp: string } => c.situacao === 'nova' && !!c.whatsapp)
    .map((c) => ({ nome: c.nome, whatsapp: c.whatsapp, observacao: '', consentimento: true }));
