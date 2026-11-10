import { useLocation } from 'react-router';

/** Mensagem passada na navegação (`navigate(rota, { state: { aviso } })`). */
export function useAviso(): string | undefined {
  return (useLocation().state as { aviso?: string } | null)?.aviso;
}
