import { Link } from 'react-router';
import Icone from './Icone';

type Props = { to: string; rotulo: string };

/**
 * Extended FAB do Material 3: 56 dp, cantos de 16 dp, acima da barra de
 * navegação (80 dp) com 16 dp de folga. Ação principal da tela.
 */
export default function Fab({ to, rotulo }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-md justify-end px-4">
      <Link
        to={to}
        className="pointer-events-auto inline-flex min-h-14 items-center gap-3 rounded-2xl bg-marca-suave pr-5 pl-4 font-medium text-marca-escura shadow-lg transition-shadow hover:shadow-xl active:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
      >
        <Icone nome="adicionar" />
        {rotulo}
      </Link>
    </div>
  );
}
