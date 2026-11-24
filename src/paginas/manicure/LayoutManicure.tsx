import { Navigate, Outlet } from 'react-router';
import BarraInferior from '../../componentes/BarraInferior';
import Carregando from '../../componentes/Carregando';
import { ESTILO_FOLHA } from '../../componentes/estilos';
import { useAuth } from '../../hooks/useAuth';
import { useMigracoes } from '../../hooks/useMigracoes';
import AcessoNegado from '../AcessoNegado';

export default function LayoutManicure() {
  const { usuario, carregando, acessoNegado } = useAuth();

  if (carregando) {
    return <Carregando telaCheia />;
  }
  if (!usuario) return <Navigate to="/entrar" replace />;
  if (acessoNegado) return <AcessoNegado email={usuario.email} />;

  // 16 dp nas laterais; embaixo, espaço para a barra (80 dp) e o FAB (56 + 16 dp)
  return (
    <>
      <Migracoes />
      <main className={`${ESTILO_FOLHA} pb-[calc(10rem+env(safe-area-inset-bottom))]`}>
        <Outlet />
      </main>
      <BarraInferior />
    </>
  );
}

function Migracoes() {
  useMigracoes();
  return null;
}
