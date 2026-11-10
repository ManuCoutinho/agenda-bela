import { useEffect, useState } from 'react';
import type { Cliente } from '../dominio/clientes';
import { observarClientes } from '../servicos/clientes';

type EstadoClientes = { clientes: Cliente[]; carregando: boolean; erro: boolean };

export function useClientes(): EstadoClientes {
  const [estado, setEstado] = useState<EstadoClientes>({
    clientes: [],
    carregando: true,
    erro: false,
  });

  useEffect(
    () =>
      observarClientes(
        (clientes) => setEstado({ clientes, carregando: false, erro: false }),
        (erro) => {
          console.error(erro);
          setEstado((anterior) => ({ ...anterior, carregando: false, erro: true }));
        },
      ),
    [],
  );

  return estado;
}
