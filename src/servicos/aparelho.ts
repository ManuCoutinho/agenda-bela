import { gerarChave } from '../dominio/portal';

/**
 * I13: o que este aparelho lembra da cliente na página pública: nome,
 * WhatsApp e a chave de "Meus horários". Sem armazenamento (aba anônima),
 * a página funciona igual, só não lembra.
 */
export type ClienteDoAparelho = { nome: string; whatsapp: string; chave?: string };

/** Horários marcados por este aparelho e ainda não copiados pela manicure. */
export type HorarioLocal = { inicio: string; servico: string; duracaoMin: number };

const CHAVE_CLIENTE = 'agenda-bela:cliente';
const CHAVE_HORARIOS = 'agenda-bela:horarios';

function ler<T>(chave: string): T | null {
  try {
    const texto = localStorage.getItem(chave);
    return texto ? (JSON.parse(texto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // sem armazenamento: só não lembra na próxima visita
  }
}

export const lerClienteDoAparelho = () => ler<ClienteDoAparelho>(CHAVE_CLIENTE);

/** Guarda o WhatsApp digitado; outro número = outra pessoa, perde a chave antiga. */
export function guardarWhatsApp(whatsapp: string) {
  const atual = lerClienteDoAparelho();
  if (atual?.whatsapp === whatsapp) return atual;
  const nova: ClienteDoAparelho = { nome: '', whatsapp };
  gravar(CHAVE_CLIENTE, nova);
  gravar(CHAVE_HORARIOS, []);
  return nova;
}

/** Ao marcar: guarda nome e devolve a chave (cria na primeira vez). */
export function chaveParaMarcar(nome: string, whatsapp: string): string {
  const atual = lerClienteDoAparelho();
  const chave =
    atual?.whatsapp === whatsapp && atual.chave
      ? atual.chave
      : gerarChave((n) => crypto.getRandomValues(new Uint8Array(n)));
  gravar(CHAVE_CLIENTE, { nome, whatsapp, chave });
  return chave;
}

export function esquecerCliente() {
  gravar(CHAVE_CLIENTE, null);
  gravar(CHAVE_HORARIOS, []);
}

export const lerHorariosLocais = () => ler<HorarioLocal[]>(CHAVE_HORARIOS) ?? [];

export function guardarHorariosLocais(novos: readonly HorarioLocal[]) {
  const agora = Date.now();
  const atuais = lerHorariosLocais().filter((h) => Date.parse(h.inicio) > agora);
  gravar(CHAVE_HORARIOS, [...atuais, ...novos]);
}
