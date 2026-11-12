import { Navigate, Outlet } from 'react-router';
import BarraInferior from '../../componentes/BarraInferior';
import { useAuth } from '../../hooks/useAuth';
import AcessoNegado from '../AcessoNegado';

export default function LayoutManicure() {
  const { usuario, carregando, acessoNegado } = useAuth();

  if (carregando) {
    return (
      <p role="status" className="p-6 text-center text-texto-suave">
        Carregando…
      </p>
    );
  }
  if (!usuario) return <Navigate to="/entrar" replace />;
  if (acessoNegado) return <AcessoNegado email={usuario.email} />;

  // 16 dp nas laterais; embaixo, espaço para a barra (80 dp) e o FAB (56 + 16 dp)
  return (
    <>
      <main className="mx-auto max-w-md px-4 pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BarraInferior />
    </>
  );
}
