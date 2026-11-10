import { useEffect, useState, type ReactNode } from 'react';
import { observarUsuario } from '../servicos/autenticacao';
import { ContextoAuth, type EstadoAuth } from './contextoAuth';

export default function ProvedorAuth({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoAuth>({ usuario: null, carregando: true });

  useEffect(() => observarUsuario((usuario) => setEstado({ usuario, carregando: false })), []);

  return <ContextoAuth.Provider value={estado}>{children}</ContextoAuth.Provider>;
}
