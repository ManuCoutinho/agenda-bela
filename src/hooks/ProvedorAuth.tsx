import { useEffect, useState, type ReactNode } from 'react';
import { observarUsuario, verificarAcesso } from '../servicos/autenticacao';
import { ContextoAuth, type EstadoAuth } from './contextoAuth';

const INICIAL: EstadoAuth = { usuario: null, carregando: true, acessoNegado: false };

export default function ProvedorAuth({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoAuth>(INICIAL);

  useEffect(() => {
    let atual = 0;
    const parar = observarUsuario((usuario) => {
      const vez = ++atual;
      if (!usuario) {
        setEstado({ usuario: null, carregando: false, acessoNegado: false });
        return;
      }
      setEstado({ usuario, carregando: true, acessoNegado: false });
      void verificarAcesso().then((acesso) => {
        if (vez === atual) {
          setEstado({ usuario, carregando: false, acessoNegado: acesso === 'negado' });
        }
      });
    });
    return () => {
      atual++;
      parar();
    };
  }, []);

  return <ContextoAuth.Provider value={estado}>{children}</ContextoAuth.Provider>;
}
