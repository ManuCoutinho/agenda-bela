import { NavLink } from 'react-router';

const ABAS = [
  { para: '/', rotulo: 'Hoje' },
  { para: '/semana', rotulo: 'Semana' },
  { para: '/clientes', rotulo: 'Clientes' },
  { para: '/mais', rotulo: 'Mais' },
];

export default function BarraInferior() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 border-t border-borda bg-superficie pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ABAS.map((aba) => (
          <li key={aba.para}>
            <NavLink
              to={aba.para}
              end={aba.para === '/'}
              className={({ isActive }) =>
                `flex min-h-14 items-center justify-center text-base ${
                  isActive ? 'bg-marca-suave font-semibold text-marca' : 'text-texto-suave'
                }`
              }
            >
              {aba.rotulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
