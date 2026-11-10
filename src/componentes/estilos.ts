// Classes compartilhadas entre componentes (só tokens do tema: ver src/index.css).

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca';

export const ESTILO_BOTAO = {
  principal: `inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-medium bg-marca text-superficie hover:bg-marca-escura disabled:opacity-60 ${FOCO}`,
  secundario: `inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-medium border border-marca bg-superficie text-marca hover:bg-marca-suave disabled:opacity-60 ${FOCO}`,
} as const;

export type VarianteBotao = keyof typeof ESTILO_BOTAO;

export const ESTILO_CAMPO = `min-h-11 w-full rounded-lg border border-borda-campo bg-superficie px-3 py-2 text-base text-texto aria-invalid:border-erro aria-invalid:border-2 ${FOCO}`;

export const ESTILO_LINK = `rounded underline underline-offset-4 text-marca hover:text-marca-escura ${FOCO}`;
