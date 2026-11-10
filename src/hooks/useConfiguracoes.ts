import { useEffect, useState } from 'react';
import { CONFIGURACOES_PADRAO, type Configuracoes } from '../dominio/configuracoes';
import { observarConfiguracoes } from '../servicos/configPublica';

type EstadoConfiguracoes = { config: Configuracoes; carregando: boolean; erro: boolean };

export function useConfiguracoes(): EstadoConfiguracoes {
  const [estado, setEstado] = useState<EstadoConfiguracoes>({
    config: CONFIGURACOES_PADRAO,
    carregando: true,
    erro: false,
  });

  useEffect(
    () =>
      observarConfiguracoes(
        (config) => setEstado({ config, carregando: false, erro: false }),
        (erro) => {
          console.error(erro);
          setEstado((anterior) => ({ ...anterior, carregando: false, erro: true }));
        },
      ),
    [],
  );

  return estado;
}
