import { useEffect, useState } from 'react';

const DURACAO_MS = 6000;

/**
 * Snackbar do Material 3: confirmação curta, anunciada pelo leitor de tela,
 * acima do FAB e da barra de navegação. Some sozinha depois de alguns segundos.
 */
export default function Aviso({ texto }: { texto: string | undefined }) {
  const [visivel, setVisivel] = useState(texto);
  const [anterior, setAnterior] = useState(texto);
  if (texto !== anterior) {
    setAnterior(texto);
    setVisivel(texto);
  }

  useEffect(() => {
    if (!visivel) return;
    const t = setTimeout(() => setVisivel(undefined), DURACAO_MS);
    return () => clearTimeout(t);
  }, [visivel]);

  if (!visivel) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(10.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md px-4">
      <p role="status" className="rounded bg-texto px-4 py-3.5 text-superficie shadow-lg">
        {visivel}
      </p>
    </div>
  );
}
