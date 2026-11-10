import { Link } from 'react-router';
import { fimDe, horaDe, rotuloHora, type Agendamento } from '../dominio/agenda';
import { ESTILO_LINK } from './estilos';

/** Atendimento na lista do dia: horário, cliente e serviço; abre a edição. */
export default function CartaoAtendimento({ agendamento: a }: { agendamento: Agendamento }) {
  const horario = `${rotuloHora(horaDe(a.inicio))}–${rotuloHora(horaDe(fimDe(a)))}`;
  return (
    <Link
      to={`/atendimentos/${a.id}`}
      className={`flex min-h-11 gap-3 rounded-lg border border-borda border-l-4 border-l-marcado bg-superficie p-3 ${ESTILO_LINK} no-underline`}
    >
      <span className="w-28 shrink-0 font-semibold tabular-nums text-texto">{horario}</span>
      <span className="flex flex-col">
        <span className="font-medium">{a.clienteNome}</span>
        <span className="text-texto-suave">{a.servicoNome}</span>
      </span>
    </Link>
  );
}
