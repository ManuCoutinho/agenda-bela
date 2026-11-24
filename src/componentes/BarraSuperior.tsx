import type { ReactNode } from 'react';
import { Link } from 'react-router';
import Icone from './Icone';
import { ESTILO_BOTAO_ICONE } from './estilos';

type Props = {
  titulo: string;
  voltarPara?: string;
  /** Botão de ícone à direita do título. */
  acao?: ReactNode;
};

/**
 * Top app bar do Material 3: 64 dp, título de 22 dp, seta de voltar opcional.
 * Fica sobre a moldura rosa; embaixo, a borda arredondada da folha do conteúdo.
 */
export default function BarraSuperior({ titulo, voltarPara, acao }: Props) {
  return (
    <header className="sticky top-0 z-10 -mx-4 mb-2 bg-moldura pt-[env(safe-area-inset-top)]">
      <div className="flex min-h-16 items-center gap-1 px-1">
        {voltarPara ? (
          <Link to={voltarPara} aria-label="Voltar" className={ESTILO_BOTAO_ICONE}>
            <Icone nome="voltar" />
          </Link>
        ) : (
          <span className="w-3" />
        )}
        <h1 className="flex-1 truncate text-titulo font-medium">{titulo}</h1>
        {acao}
      </div>
      <div aria-hidden="true" className="h-4 rounded-t-3xl bg-fundo" />
    </header>
  );
}
