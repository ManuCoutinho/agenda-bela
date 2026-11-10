import { Navigate, Outlet } from 'react-router';
import BarraInferior from '../../componentes/BarraInferior';
import { useAuth } from '../../hooks/useAuth';

export default function LayoutManicure() {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <p role="status" className="p-6 text-center text-gray-700">
        Carregando…
      </p>
    );
  }
  if (!usuario) return <Navigate to="/entrar" replace />;

  return (
    <>
      <main className="mx-auto max-w-md p-4 pb-24">
        <Outlet />
      </main>
      <BarraInferior />
    </>
  );
}
