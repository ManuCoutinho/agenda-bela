import { Link } from 'react-router';
import { fimDe, horaDe, rotuloHora, type Agendamento } from '../dominio/agenda';

/** Atendimento na lista do dia (card outlined, 12 dp): horário, cliente e serviço. */
export default function CartaoAtendimento({ agendamento: a }: { agendamento: Agendamento }) {
  const horario = `${rotuloHora(horaDe(a.inicio))}–${rotuloHora(horaDe(fimDe(a)))}`;
  return (
    <Link
      to={`/atendimentos/${a.id}`}
      className="flex min-h-18 items-center gap-4 rounded-xl border border-borda border-l-4 border-l-marcado bg-superficie px-4 py-3 text-texto no-underline hover:bg-fundo active:bg-marca-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
    >
      <span className="w-28 shrink-0 font-medium tabular-nums">{horario}</span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{a.clienteNome}</span>
        <span className="truncate text-texto-suave">{a.servicoNome}</span>
      </span>
    </Link>
  );
}
