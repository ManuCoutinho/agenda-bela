import { useEffect, useState } from 'react';
import type { Servico } from '../dominio/servicos';
import { observarServicos } from '../servicos/configPublica';

type EstadoServicos = { servicos: Servico[]; carregando: boolean; erro: boolean };

export function useServicos(): EstadoServicos {
  const [estado, setEstado] = useState<EstadoServicos>({
    servicos: [],
    carregando: true,
    erro: false,
  });

  useEffect(
    () =>
      observarServicos(
        (servicos) => setEstado({ servicos, carregando: false, erro: false }),
        (erro) => {
          console.error(erro);
          setEstado((anterior) => ({ ...anterior, carregando: false, erro: true }));
        },
      ),
    [],
  );

  return estado;
}
