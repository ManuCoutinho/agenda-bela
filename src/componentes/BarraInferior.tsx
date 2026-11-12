import { NavLink } from 'react-router';
import Icone, { type NomeIcone } from './Icone';

const ABAS: { para: string; rotulo: string; icone: NomeIcone }[] = [
  { para: '/', rotulo: 'Hoje', icone: 'hoje' },
  { para: '/agenda', rotulo: 'Agenda', icone: 'semana' },
  { para: '/clientes', rotulo: 'Clientes', icone: 'clientes' },
  { para: '/mais', rotulo: 'Mais', icone: 'mais' },
];

/** Navigation bar do Material 3: 80 dp, ícone num indicador em pílula (64 × 32 dp) + rótulo. */
export default function BarraInferior() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 bg-container pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-20 max-w-md grid-cols-4">
        {ABAS.map((aba) => (
          <li key={aba.para} className="flex">
            <NavLink
              to={aba.para}
              end={aba.para === '/'}
              className="group flex flex-1 flex-col items-center justify-center gap-1 text-texto-suave aria-[current=page]:font-semibold aria-[current=page]:text-texto focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-marca"
            >
              <span className="flex h-8 w-16 items-center justify-center rounded-full transition-colors group-hover:bg-marca-suave group-active:bg-marca-suave group-aria-[current=page]:bg-marca-suave group-aria-[current=page]:text-marca-escura">
                <Icone nome={aba.icone} />
              </span>
              <span className="text-base leading-5">{aba.rotulo}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
