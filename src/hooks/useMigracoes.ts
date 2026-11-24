import { useEffect, useState } from 'react';
import type { ConflitoDeHora } from '../dominio/migracaoTravas';
import { migrarTravasPorHora, observarConflitosDeHora } from '../servicos/migracoes';

/** Converte os dados antigos uma vez, quando a dona abre o app. */
export function useMigracoes() {
  useEffect(() => {
    migrarTravasPorHora().catch((erro: unknown) => console.error(erro));
  }, []);
}

export function useConflitosDeHora(): ConflitoDeHora[] {
  const [conflitos, setConflitos] = useState<ConflitoDeHora[]>([]);
  useEffect(() => observarConflitosDeHora(setConflitos, (erro) => console.error(erro)), []);
  return conflitos;
}
