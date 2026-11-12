import { useEffect, useState } from 'react';
import { observarPaginaPublica, type PaginaPublica } from '../servicos/configPublica';

type EstadoPaginaPublica = { pagina: PaginaPublica | null; carregando: boolean; erro: boolean };

/** `config/publico`, legível sem login: nome, expediente, serviços e bloqueios fixos. */
export function usePaginaPublica(): EstadoPaginaPublica {
  const [estado, setEstado] = useState<EstadoPaginaPublica>({
    pagina: null,
    carregando: true,
    erro: false,
  });

  useEffect(
    () =>
      observarPaginaPublica(
        (pagina) => setEstado({ pagina, carregando: false, erro: false }),
        (erro) => {
          console.error(erro);
          setEstado((anterior) => ({ ...anterior, carregando: false, erro: true }));
        },
      ),
    [],
  );

  return estado;
}
