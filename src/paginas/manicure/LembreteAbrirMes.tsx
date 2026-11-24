import Icone from '../../componentes/Icone';
import LinkBotao from '../../componentes/LinkBotao';
import { mesParaAbrir, rotuloMes } from '../../dominio/agendaAberta';
import { useMesesAbertos } from '../../hooks/useMesesAbertos';

/** I06: a partir do dia 20, lembra de abrir o mês seguinte para as clientes. */
export default function LembreteAbrirMes() {
  const { meses, carregando } = useMesesAbertos();
  const mes = carregando ? null : mesParaAbrir(new Date(), meses);
  if (mes === null) return null;
  return (
    <section
      aria-label="Abrir a agenda do próximo mês"
      className="mb-6 flex flex-col gap-3 rounded-xl bg-marca-suave p-4"
    >
      <p className="text-marca-escura first-letter:uppercase">
        {rotuloMes(mes)} ainda não está aberto para as clientes.
      </p>
      <LinkBotao to="/mais/agenda-aberta">
        <Icone nome="hoje" />
        Abrir a agenda
      </LinkBotao>
    </section>
  );
}
