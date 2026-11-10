import { normalizarWhatsApp, type Cliente, type DadosCliente } from './clientes';

/** Contato como vem do celular (seletor de contatos ou arquivo .vcf). */
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

const decodificador = new TextDecoder('utf-8');

/** `=C3=A9` → "é" (vCard 2.1 do Android usa QUOTED-PRINTABLE para acentos). */
function decodificarQuotedPrintable(texto: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i] as string;
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(texto.slice(i + 1, i + 3))) {
      bytes.push(parseInt(texto.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(...new TextEncoder().encode(c));
    }
  }
  return decodificador.decode(new Uint8Array(bytes));
}

const desescapar = (valor: string) =>
  valor
    .replace(/\\n/gi, ' ')
    .replace(/\\([,;\\])/g, '$1')
    .trim();

/**
 * Lê um arquivo .vcf (vCard 2.1, 3.0 ou 4.0), como o que o app Contatos do
 * Android exporta: nome (FN, ou N) e telefones (TEL) de cada contato.
 */
export function lerVcf(texto: string): ContatoImportado[] {
  const linhas: string[] = [];
  for (const crua of texto.split(/\r?\n/)) {
    const anterior = linhas.at(-1);
    if (/^[ \t]/.test(crua) && anterior !== undefined) {
      linhas[linhas.length - 1] = anterior + crua.slice(1); // dobra (3.0/4.0)
    } else if (anterior?.endsWith('=') && /ENCODING=QUOTED-PRINTABLE/i.test(anterior)) {
      linhas[linhas.length - 1] = anterior.slice(0, -1) + crua; // quebra suave (2.1)
    } else {
      linhas.push(crua);
    }
  }

  const contatos: ContatoImportado[] = [];
  let atual: { fn: string; n: string; telefones: string[] } | null = null;
  for (const linha of linhas) {
    const doisPontos = linha.indexOf(':');
    if (doisPontos < 0) continue;
    const cabecalho = linha.slice(0, doisPontos);
    const [propriedade = ''] = cabecalho.split(';');
    const nomeProp = propriedade.replace(/^item\d+\./i, '').toUpperCase();
    let valor = linha.slice(doisPontos + 1);
    if (/ENCODING=QUOTED-PRINTABLE/i.test(cabecalho)) valor = decodificarQuotedPrintable(valor);

    if (nomeProp === 'BEGIN' && /^VCARD$/i.test(valor.trim())) {
      atual = { fn: '', n: '', telefones: [] };
    } else if (atual && nomeProp === 'END') {
      const nome = atual.fn || atual.n;
      contatos.push({ nome, telefones: atual.telefones });
      atual = null;
    } else if (atual && nomeProp === 'FN') {
      atual.fn = desescapar(valor);
    } else if (atual && nomeProp === 'N') {
      // N:Sobrenome;Nome;Meio;Prefixo;Sufixo
      const [sobrenome = '', nome = '', meio = ''] = valor.split(';').map(desescapar);
      atual.n = [nome, meio, sobrenome].filter(Boolean).join(' ');
    } else if (atual && nomeProp === 'TEL') {
      atual.telefones.push(valor.replace(/^tel:/i, '').trim());
    }
  }
  return contatos;
}

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
