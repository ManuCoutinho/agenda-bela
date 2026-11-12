import { useEffect, useState } from 'react';
import { observarPausa, type Pausa } from '../servicos/configPublica';

type EstadoPausa = { pausa: Pausa; carregando: boolean; erro: boolean };

export function usePausa(): EstadoPausa {
  const [estado, setEstado] = useState<EstadoPausa>({
    pausa: { ativa: false, aviso: '' },
    carregando: true,
    erro: false,
  });

  useEffect(
    () =>
      observarPausa(
        (pausa) => setEstado({ pausa, carregando: false, erro: false }),
        (erro) => {
          console.error(erro);
          setEstado((anterior) => ({ ...anterior, carregando: false, erro: true }));
        },
      ),
    [],
  );

  return estado;
}
