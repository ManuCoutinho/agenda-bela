/**
 * Link curto pelo is.gd (gratuito, sem conta, aceita chamada do navegador).
 * O mesmo endereço longo devolve sempre o mesmo link curto; guardamos no
 * aparelho para não pedir de novo a cada visita.
 */
const CHAVE = 'link-curto:';

function lerGuardado(url: string) {
  try {
    return localStorage.getItem(CHAVE + url);
  } catch {
    return null;
  }
}

function guardar(url: string, curto: string) {
  try {
    localStorage.setItem(CHAVE + url, curto);
  } catch {
    // sem armazenamento (aba anônima): pede de novo na próxima vez
  }
}

/** Link curto, ou `null` se o serviço não respondeu (aí vale o link completo). */
export async function encurtarLink(url: string): Promise<string | null> {
  const guardado = lerGuardado(url);
  if (guardado) return guardado;
  try {
    const resposta = await fetch(
      `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`,
    );
    const { shorturl } = (await resposta.json()) as { shorturl?: string };
    if (!shorturl?.startsWith('https://')) return null;
    guardar(url, shorturl);
    return shorturl;
  } catch {
    return null;
  }
}

export async function copiarTexto(texto: string) {
  await navigator.clipboard.writeText(texto);
}
