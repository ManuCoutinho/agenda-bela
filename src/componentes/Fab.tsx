import { Link } from 'react-router';
import Icone from './Icone';

type Props = { to: string; rotulo: string };

/**
 * FAB do Material 3: 56 dp, só o ícone (o rótulo vai para o leitor de tela),
 * acima da barra de navegação (80 dp) com 16 dp de folga.
 */
export default function Fab({ to, rotulo }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-md justify-end px-4">
      <Link
        to={to}
        aria-label={rotulo}
        title={rotulo}
        className="pointer-events-auto inline-flex size-14 items-center justify-center rounded-2xl bg-marca text-superficie shadow-lg transition-shadow hover:bg-marca-escura hover:shadow-xl active:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
      >
        <Icone nome="adicionar" />
      </Link>
    </div>
  );
}
