import { Link, useSearchParams } from 'react-router';
import Aviso from '../../componentes/Aviso';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import Calendario from '../../componentes/Calendario';
import Carregando from '../../componentes/Carregando';
import Fab from '../../componentes/Fab';
import Icone from '../../componentes/Icone';
import ListaDoDia from '../../componentes/ListaDoDia';
import { ESTILO_BOTAO, ESTILO_BOTAO_ICONE } from '../../componentes/estilos';
import { agruparPorDia, dataDoDia, rotuloDia } from '../../dominio/agenda';
import { bloqueiosDoDia } from '../../dominio/bloqueios';
import {
  dataValida,
  intervaloDoMes,
  marcasPorDia,
  passarMes,
  tituloDoMes,
} from '../../dominio/calendario';
import { useAgendamentos } from '../../hooks/useAgenda';
import { useAviso } from '../../hooks/useAviso';
import { useBloqueios } from '../../hooks/useBloqueios';

/**
 * `/agenda?dia=AAAA-MM-DD` (RF07): calendário do mês com pontos nos dias que
 * têm atendimento ou bloqueio; tocar num dia mostra a lista dele embaixo.
 */
export default function Agenda() {
  const [busca, setBusca] = useSearchParams();
  const hoje = dataDoDia(new Date());
  const pedido = busca.get('dia');
  const dia = dataValida(pedido) ? pedido : hoje;

  const { inicio, dias } = intervaloDoMes(dia);
  const { dados, carregando, erro } = useAgendamentos(inicio, dias);
  const { bloqueios } = useBloqueios();
  const aviso = useAviso();
  const doDia = agruparPorDia(dados).get(dia) ?? [];
  const { mes, ano } = tituloDoMes(dia);

  const ir = (novo: string) => setBusca({ dia: novo }, { replace: true, preventScrollReset: true });
  const trocarMes = (passo: 1 | -1) => ir(passarMes(dia, passo));

  return (
    <>
      <BarraSuperior titulo="Agenda" />

      <nav aria-label="Trocar mês" className="mb-2 flex items-center gap-1">
        <h2 aria-live="polite" className="flex flex-1 flex-col-reverse">
          <span className="text-3xl font-semibold">{mes}</span>{' '}
          <span className="text-base text-texto-suave">{ano}</span>
        </h2>
        {dia !== hoje && (
          <Botao variante="texto" onClick={() => ir(hoje)}>
            Hoje
          </Botao>
        )}
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => trocarMes(-1)}
          className={ESTILO_BOTAO_ICONE}
        >
          <Icone nome="anterior" />
        </button>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => trocarMes(1)}
          className={ESTILO_BOTAO_ICONE}
        >
          <Icone nome="proximo" />
        </button>
      </nav>

      {erro && (
        <p role="alert" className="mb-2 text-erro">
          Não foi possível carregar a agenda. Confira a internet e tente de novo.
        </p>
      )}

      <Calendario
        dia={dia}
        hoje={hoje}
        marcas={marcasPorDia(dados, bloqueios, inicio, dias)}
        aoEscolherDia={ir}
        aoTrocarMes={trocarMes}
      />

      <section aria-labelledby="dia-escolhido" className="mt-4 border-t border-borda pt-4">
        <div className="mb-2 flex items-center justify-between gap-4">
          <h2 id="dia-escolhido" className="text-secao font-medium first-letter:uppercase">
            {dia === hoje ? `Hoje, ${rotuloDia(dia)}` : rotuloDia(dia)}
          </h2>
          <Link
            to={`/mais/bloqueios/novo?data=${dia}`}
            aria-label={`Bloquear horário em ${rotuloDia(dia)}`}
            className={ESTILO_BOTAO.texto}
          >
            Bloquear
          </Link>
        </div>
        {carregando ? (
          <Carregando texto="Carregando agenda…" />
        ) : (
          !erro && (
            <ListaDoDia
              agendamentos={doDia}
              bloqueios={bloqueiosDoDia(bloqueios, dia)}
              vazio="Nenhum atendimento neste dia."
            />
          )
        )}
      </section>

      <Fab to={`/atendimentos/novo?data=${dia}`} rotulo="Novo atendimento" />
      <Aviso texto={aviso} />
    </>
  );
}
