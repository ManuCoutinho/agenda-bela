import { useEffect, useState } from 'react';
import type { Solicitacao } from '../dominio/pedidos';
import { observarAgendamentoDoPedido } from '../servicos/pedidos';
import { observarSolicitacoes } from '../servicos/solicitacoes';
import { useAgendamento } from './useAgenda';

export function useSolicitacoes(): Solicitacao[] {
  const [lista, setLista] = useState<Solicitacao[]>([]);
  useEffect(() => observarSolicitacoes(setLista, (erro) => console.error(erro)), []);
  return lista;
}

/**
 * O atendimento de um pedido de cancelamento: o `horario` é o id do
 * atendimento ou, se a cliente pediu antes de a dona abrir o app, do pedido.
 */
export function useAtendimentoDoHorario(horario: string) {
  const direto = useAgendamento(horario);
  const procurarPeloPedido = !direto.carregando && !direto.dados;
  const [peloPedido, setPeloPedido] = useState<{ horario: string; id: string | null } | null>(null);
  useEffect(() => {
    if (!procurarPeloPedido) return;
    return observarAgendamentoDoPedido(
      horario,
      (id) => setPeloPedido({ horario, id }),
      (erro) => {
        console.error(erro);
        setPeloPedido({ horario, id: null });
      },
    );
  }, [procurarPeloPedido, horario]);
  const id = peloPedido?.horario === horario ? peloPedido.id : null;
  const indireto = useAgendamento(procurarPeloPedido && id ? id : undefined);
  if (!procurarPeloPedido) return direto;
  if (peloPedido?.horario !== horario || indireto.carregando) {
    return { dados: null, carregando: true, erro: false };
  }
  return indireto;
}
