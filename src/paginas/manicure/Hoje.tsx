import Aviso from '../../componentes/Aviso';
import BarraSuperior from '../../componentes/BarraSuperior';
import Fab from '../../componentes/Fab';
import ListaDoDia from '../../componentes/ListaDoDia';
import { agruparPorDia, dataDoDia, rotuloDia } from '../../dominio/agenda';
import { useAgendamentos } from '../../hooks/useAgenda';
import { useAviso } from '../../hooks/useAviso';

export default function Hoje() {
  const hoje = dataDoDia(new Date());
  const { dados, carregando, erro } = useAgendamentos(hoje, 1);
  const aviso = useAviso();

  return (
    <>
      <BarraSuperior titulo="Hoje" />
      <p className="mb-4 text-texto-suave first-letter:uppercase">{rotuloDia(hoje)}</p>
      {carregando ? (
        <p role="status" className="text-texto-suave">
          Carregando agenda…
        </p>
      ) : erro ? (
        <p role="alert" className="text-erro">
          Não foi possível carregar a agenda. Confira a internet e tente de novo.
        </p>
      ) : (
        <ListaDoDia
          agendamentos={agruparPorDia(dados).get(hoje) ?? []}
          vazio="Nenhum atendimento marcado para hoje."
        />
      )}
      <Fab to={`/atendimentos/novo?data=${hoje}`} rotulo="Novo atendimento" />
      <Aviso texto={aviso} />
    </>
  );
}
