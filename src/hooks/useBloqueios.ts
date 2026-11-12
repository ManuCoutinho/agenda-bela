import { useEffect, useState } from 'react';
import type { Bloqueio } from '../dominio/bloqueios';
import { observarBloqueios } from '../servicos/bloqueios';

type EstadoBloqueios = { bloqueios: Bloqueio[]; carregando: boolean; erro: boolean };

export function useBloqueios(): EstadoBloqueios {
  const [estado, setEstado] = useState<EstadoBloqueios>({
    bloqueios: [],
    carregando: true,
    erro: false,
  });

  useEffect(
    () =>
      observarBloqueios(
        (bloqueios) => setEstado({ bloqueios, carregando: false, erro: false }),
        (erro) => {
          console.error(erro);
          setEstado((anterior) => ({ ...anterior, carregando: false, erro: true }));
        },
      ),
    [],
  );

  return estado;
}
