/** Confirmação de ação concluída, anunciada pelo leitor de tela. */
export default function Aviso({ texto }: { texto: string | undefined }) {
  if (!texto) return null;
  return (
    <p role="status" className="mt-4 rounded-lg bg-marca-suave p-3">
      {texto}
    </p>
  );
}
