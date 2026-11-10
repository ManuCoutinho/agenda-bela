import { Link } from 'react-router';
import Icone from './Icone';
import { ESTILO_BOTAO_ICONE } from './estilos';

type Props = { titulo: string; voltarPara?: string };

/** Top app bar do Material 3: 64 dp, título de 22 dp, seta de voltar opcional. */
export default function BarraSuperior({ titulo, voltarPara }: Props) {
  return (
    <header className="sticky top-0 z-10 -mx-4 mb-2 flex min-h-16 items-center gap-1 bg-fundo px-1 pt-[env(safe-area-inset-top)]">
      {voltarPara ? (
        <Link to={voltarPara} aria-label="Voltar" className={ESTILO_BOTAO_ICONE}>
          <Icone nome="voltar" />
        </Link>
      ) : (
        <span className="w-3" />
      )}
      <h1 className="truncate text-titulo font-normal">{titulo}</h1>
    </header>
  );
}
