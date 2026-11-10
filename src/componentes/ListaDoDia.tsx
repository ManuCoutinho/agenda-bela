import type { Agendamento } from '../dominio/agenda';
import CartaoAtendimento from './CartaoAtendimento';

type Props = { agendamentos: readonly Agendamento[]; vazio: string };

export default function ListaDoDia({ agendamentos, vazio }: Props) {
  if (agendamentos.length === 0) return <p className="text-texto-suave">{vazio}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {agendamentos.map((a) => (
        <li key={a.id}>
          <CartaoAtendimento agendamento={a} />
        </li>
      ))}
    </ul>
  );
}
