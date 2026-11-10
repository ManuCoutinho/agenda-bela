import { useContext } from 'react';
import { ContextoAuth } from './contextoAuth';

export function useAuth() {
  const estado = useContext(ContextoAuth);
  if (!estado) throw new Error('useAuth precisa estar dentro de <ProvedorAuth>');
  return estado;
}
