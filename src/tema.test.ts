import { describe, expect, it } from 'vitest';
import css from './index.css?raw';

/** Lê as cores do `@theme` de `index.css`, a fonte única da paleta. */
function lerCores() {
  const cores = new Map<string, string>();
  for (const [, nome, hex] of css.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)) {
    cores.set(nome, hex);
  }
  return cores;
}

function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string) {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

const TEXTO = 4.5; // WCAG 1.4.3, texto normal
const COMPONENTE = 3; // WCAG 1.4.11, contorno de campos e foco

// [frente, fundo, mínimo]: toda combinação usada nas telas entra aqui
const PARES: [string, string, number][] = [
  ['texto', 'fundo', TEXTO],
  ['texto', 'superficie', TEXTO],
  ['texto', 'marca-suave', TEXTO],
  ['texto-suave', 'fundo', TEXTO],
  ['texto-suave', 'superficie', TEXTO],
  ['texto-suave', 'marca-suave', TEXTO],
  ['marca', 'fundo', TEXTO],
  ['marca', 'superficie', TEXTO],
  ['marca', 'marca-suave', TEXTO],
  ['superficie', 'marca', TEXTO], // botão principal
  ['superficie', 'marca-escura', TEXTO], // botão principal pressionado
  ['marca-escura', 'marca-suave', TEXTO], // FAB e ícone da aba ativa
  ['superficie', 'texto', TEXTO], // snackbar
  ['texto', 'container', TEXTO], // aba ativa na barra de navegação
  ['texto-suave', 'container', TEXTO], // abas inativas
  ['texto', 'marca-suave', TEXTO], // rótulo sobre o indicador (hover)
  ['erro', 'fundo', TEXTO],
  ['erro', 'superficie', TEXTO],
  ['marcado', 'fundo', TEXTO],
  ['livre', 'fundo', TEXTO],
  ['bloqueado', 'fundo', TEXTO],
  ['texto', 'pendente', TEXTO],
  ['superficie', 'marcado', TEXTO], // atendimento no calendário
  ['borda-campo', 'superficie', COMPONENTE],
  ['borda-campo', 'fundo', COMPONENTE],
  ['marca-decorativa', 'fundo', COMPONENTE],
];

describe('tema: contraste da paleta (RNF de acessibilidade)', () => {
  const cores = lerCores();

  it.each(PARES)('%s sobre %s ≥ %d:1', (frente, fundo, minimo) => {
    const a = cores.get(frente);
    const b = cores.get(fundo);
    expect(a, `cor --color-${frente} não existe`).toBeDefined();
    expect(b, `cor --color-${fundo} não existe`).toBeDefined();
    expect(contraste(a as string, b as string)).toBeGreaterThanOrEqual(minimo);
  });
});
