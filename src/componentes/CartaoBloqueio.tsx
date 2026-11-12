import { Link } from 'react-router';
import { rotuloHorario, type BloqueioNoDia } from '../dominio/bloqueios';

/** Bloqueio na lista do dia: mesmo formato do atendimento, com a cor de "bloqueado". */
export default function CartaoBloqueio({ bloqueio: b }: { bloqueio: BloqueioNoDia }) {
  return (
    <Link
      to={`/mais/bloqueios/${b.id}`}
      className="flex min-h-18 items-center gap-4 rounded-xl border border-borda border-l-4 border-l-bloqueado bg-fundo px-4 py-3 text-texto no-underline hover:bg-superficie active:bg-marca-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
    >
      <span className="w-28 shrink-0 font-medium tabular-nums">{rotuloHorario(b)}</span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">
          Bloqueado{b.recorrente ? ' (toda semana)' : ''}
        </span>
        {b.descricao && <span className="truncate text-texto-suave">{b.descricao}</span>}
      </span>
    </Link>
  );
}
