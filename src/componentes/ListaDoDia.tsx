import { horaDe, type Agendamento } from '../dominio/agenda';
import type { BloqueioNoDia } from '../dominio/bloqueios';
import CartaoAtendimento from './CartaoAtendimento';
import CartaoBloqueio from './CartaoBloqueio';

type Props = {
  agendamentos: readonly Agendamento[];
  bloqueios?: readonly BloqueioNoDia[];
  vazio: string;
};

type Item =
  | { tipo: 'atendimento'; hora: string; agendamento: Agendamento }
  | { tipo: 'bloqueio'; hora: string; bloqueio: BloqueioNoDia };

/** Atendimentos e bloqueios do dia, em ordem de horário. */
export default function ListaDoDia({ agendamentos, bloqueios = [], vazio }: Props) {
  const itens: Item[] = [
    ...agendamentos.map((a) => ({
      tipo: 'atendimento' as const,
      hora: horaDe(a.inicio),
      agendamento: a,
    })),
    ...bloqueios.map((b) => ({
      tipo: 'bloqueio' as const,
      hora: b.ini.replace(':', ''),
      bloqueio: b,
    })),
  ].sort((a, b) => a.hora.localeCompare(b.hora));

  if (itens.length === 0) return <p className="text-texto-suave">{vazio}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {itens.map((item) => (
        <li key={item.tipo === 'atendimento' ? item.agendamento.id : `b-${item.bloqueio.id}`}>
          {item.tipo === 'atendimento' ? (
            <CartaoAtendimento agendamento={item.agendamento} />
          ) : (
            <CartaoBloqueio bloqueio={item.bloqueio} />
          )}
        </li>
      ))}
    </ul>
  );
}
