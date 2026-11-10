import Aviso from '../../componentes/Aviso';
import LinkBotao from '../../componentes/LinkBotao';
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Hoje</h1>
          <p className="text-texto-suave first-letter:uppercase">{rotuloDia(hoje)}</p>
        </div>
        <LinkBotao to={`/atendimentos/novo?data=${hoje}`}>Novo atendimento</LinkBotao>
      </div>
      <Aviso texto={aviso} />
      <div className="mt-6">
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
      </div>
    </>
  );
}
