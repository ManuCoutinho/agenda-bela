// Classes compartilhadas (só tokens do tema: ver src/index.css). Medidas do Material 3.

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca';

/** Botões: 48 dp de altura (alvo de toque do Android), cantos totalmente arredondados. */
const BASE_BOTAO = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 font-medium transition-colors disabled:opacity-60 ${FOCO}`;

export const ESTILO_BOTAO = {
  /** Filled button */
  principal: `${BASE_BOTAO} bg-marca text-superficie hover:bg-marca-escura active:bg-marca-escura`,
  /** Outlined button */
  secundario: `${BASE_BOTAO} border border-borda-campo bg-superficie text-marca hover:bg-marca-suave active:bg-marca-suave`,
  /** Text button */
  texto: `${BASE_BOTAO} px-3 text-marca hover:bg-marca-suave active:bg-marca-suave`,
} as const;

export type VarianteBotao = keyof typeof ESTILO_BOTAO;

/** Botão só com ícone: 48 × 48 dp, ícone de 24 dp. */
export const ESTILO_BOTAO_ICONE = `inline-flex size-12 shrink-0 items-center justify-center rounded-full text-texto hover:bg-marca-suave active:bg-marca-suave ${FOCO}`;

/** Outlined text field: 56 dp, cantos de 4 dp, borda de 2 dp ao focar. */
export const ESTILO_CAMPO = `min-h-14 w-full rounded border border-borda-campo bg-superficie px-4 py-3 text-base text-texto focus:outline-none focus:border-2 focus:border-marca focus:px-[15px] aria-invalid:border-2 aria-invalid:border-erro aria-invalid:px-[15px]`;

export const ESTILO_LINK = `rounded underline underline-offset-4 text-marca hover:text-marca-escura ${FOCO}`;

/** Lista do Material: contêiner arredondado (12 dp) com divisórias. */
export const ESTILO_LISTA =
  'divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie';

/** Item de lista clicável: 56 dp no mínimo (72 dp com duas linhas), 16 dp nas laterais. */
export const ESTILO_ITEM_LISTA = `flex min-h-14 w-full items-center gap-4 px-4 py-2 text-texto no-underline hover:bg-fundo active:bg-marca-suave focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marca`;
