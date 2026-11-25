import { useEffect, useState } from 'react';
import type { Mes } from '../dominio/agendaAberta';
import { observarMesesAbertos } from '../servicos/configPublica';

type EstadoMeses = { meses: Mes[]; carregando: boolean; erro: boolean };

export function useMesesAbertos(): EstadoMeses {
  const [estado, setEstado] = useState<EstadoMeses>({ meses: [], carregando: true, erro: false });
  useEffect(
    () =>
      observarMesesAbertos(
        (meses) => setEstado({ meses, carregando: false, erro: false }),
        (erro) => {
          console.error(erro);
          setEstado((anterior) => ({ ...anterior, carregando: false, erro: true }));
        },
      ),
    [],
  );
  return estado;
}
