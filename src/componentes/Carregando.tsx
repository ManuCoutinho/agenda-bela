type Props = {
  /** Lido pelo leitor de tela; na tela fica só o indicador girando. */
  texto?: string;
  /** Ocupa a tela toda (abertura do app). */
  telaCheia?: boolean;
};

/** Indicador de progresso circular do Material 3. */
export default function Carregando({ texto = 'Carregando…', telaCheia = false }: Props) {
  return (
    <div
      role="status"
      className={`flex items-center justify-center ${telaCheia ? 'min-h-dvh' : 'py-12'}`}
    >
      <span
        aria-hidden="true"
        className="size-10 animate-spin rounded-full border-4 border-marca-suave border-t-marca motion-reduce:animate-[spin_1.5s_linear_infinite]"
      />
      <span className="sr-only">{texto}</span>
    </div>
  );
}
