import { useState } from 'react';
import { Navigate } from 'react-router';
import Botao from '../../componentes/Botao';
import { ESTILO_CARTAO_TELA } from '../../componentes/estilos';
import { useAuth } from '../../hooks/useAuth';
import { entrarComGoogle } from '../../servicos/autenticacao';

export default function Entrar() {
  const { usuario, carregando } = useAuth();
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!carregando && usuario) return <Navigate to="/" replace />;

  async function entrar() {
    setErro(null);
    setEntrando(true);
    try {
      await entrarComGoogle();
    } catch (e) {
      console.error(e);
      setErro('Não foi possível entrar. Confira a internet e tente de novo.');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-4">
      <div className={ESTILO_CARTAO_TELA}>
        <div>
          <h1 className="text-3xl font-semibold text-marca">Agenda Bela</h1>
          <p className="mt-2 text-texto-suave">Sua agenda de atendimentos.</p>
        </div>
        <Botao onClick={entrar} disabled={carregando || entrando}>
          {entrando ? 'Entrando…' : 'Entrar com Google'}
        </Botao>
        {erro && (
          <p role="alert" className="text-erro">
            {erro}
          </p>
        )}
      </div>
    </main>
  );
}
