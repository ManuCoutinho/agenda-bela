import { useEffect, useState } from 'react';
import type { Portal } from '../dominio/portal';
import { observarPortal } from '../servicos/portal';

type Estado = { chave: string; portal: Portal | null; erro: boolean };

/** "Meus horários" da chave deste aparelho; sem chave, não lê nada. */
export function usePortal(chave: string | undefined) {
  const [estado, setEstado] = useState<Estado | null>(null);
  useEffect(() => {
    if (!chave) return;
    return observarPortal(
      chave,
      (portal) => setEstado({ chave, portal, erro: false }),
      (erro) => {
        console.error(erro);
        setEstado({ chave, portal: null, erro: true });
      },
    );
  }, [chave]);
  const atual = estado?.chave === chave ? estado : null;
  return {
    portal: atual?.portal ?? null,
    carregando: Boolean(chave) && !atual,
    erro: atual?.erro ?? false,
  };
}
