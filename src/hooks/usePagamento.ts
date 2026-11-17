import { useEffect, useState } from 'react';
import { PAGAMENTO_PADRAO, type Pagamento } from '../dominio/pagamento';
import { observarPagamento } from '../servicos/pagamento';

type EstadoPagamento = { pagamento: Pagamento; carregando: boolean; erro: boolean };

export function usePagamento(): EstadoPagamento {
  const [estado, setEstado] = useState<EstadoPagamento>({
    pagamento: PAGAMENTO_PADRAO,
    carregando: true,
    erro: false,
  });

  useEffect(
    () =>
      observarPagamento(
        (pagamento) => setEstado({ pagamento, carregando: false, erro: false }),
        (erro) => {
          console.error(erro);
          setEstado((anterior) => ({ ...anterior, carregando: false, erro: true }));
        },
      ),
    [],
  );

  return estado;
}
