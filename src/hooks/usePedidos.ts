import { useEffect, useState } from 'react';
import type { Pedido } from '../dominio/pedidos';
import { observarPedidosPendentes } from '../servicos/pedidos';

type EstadoPedidos = { pedidos: Pedido[]; carregando: boolean; erro: boolean };

export function usePedidosPendentes(): EstadoPedidos {
  const [estado, setEstado] = useState<EstadoPedidos>({
    pedidos: [],
    carregando: true,
    erro: false,
  });

  useEffect(
    () =>
      observarPedidosPendentes(
        (pedidos) => setEstado({ pedidos, carregando: false, erro: false }),
        (erro) => {
          console.error(erro);
          setEstado((anterior) => ({ ...anterior, carregando: false, erro: true }));
        },
      ),
    [],
  );

  return estado;
}
