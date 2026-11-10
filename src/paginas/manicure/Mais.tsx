import Botao from '../../componentes/Botao';
import { useAuth } from '../../hooks/useAuth';
import { sair } from '../../servicos/autenticacao';

export default function Mais() {
  const { usuario } = useAuth();
  return (
    <>
      <h1 className="text-2xl font-semibold">Mais</h1>
      <p className="mt-4 text-gray-700">Conectada como {usuario?.email}</p>
      <Botao variante="secundario" className="mt-4 w-full" onClick={() => sair()}>
        Sair
      </Botao>
    </>
  );
}
