import { useEffect, useState } from 'react';
import type { Solicitacao } from '../dominio/pedidos';
import { observarSolicitacoes } from '../servicos/solicitacoes';

export function useSolicitacoes(): Solicitacao[] {
  const [lista, setLista] = useState<Solicitacao[]>([]);
  useEffect(() => observarSolicitacoes(setLista, (erro) => console.error(erro)), []);
  return lista;
}
