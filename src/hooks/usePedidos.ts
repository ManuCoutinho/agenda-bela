import { useEffect, useState } from 'react';
import type { Agendamento } from '../dominio/agenda';
import type { Pedido } from '../dominio/pedidos';
import { observarAgendamentosDaCliente } from '../servicos/agenda';
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

const NENHUM: Agendamento[] = [];

/** Atendimentos das clientes que têm pedido pendente, para achar troca de horário. */
export function useAgendamentosDasClientes(whatsapps: readonly string[]): Agendamento[] {
  const chave = [...new Set(whatsapps)].sort().join(',');
  const [porNumero, setPorNumero] = useState<Record<string, Agendamento[]>>({});

  useEffect(() => {
    if (!chave) return;
    const pararTodos = chave.split(',').map((numero) =>
      observarAgendamentosDaCliente(
        numero,
        (agendamentos) => setPorNumero((atual) => ({ ...atual, [numero]: agendamentos })),
        (erro) => console.error(erro),
      ),
    );
    return () => pararTodos.forEach((parar) => parar());
  }, [chave]);

  if (!chave) return NENHUM;
  return chave.split(',').flatMap((numero) => porNumero[numero] ?? NENHUM);
}
