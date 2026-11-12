import { useSearchParams, useNavigate } from 'react-router';
import Aviso from '../../componentes/Aviso';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import Calendario from '../../componentes/Calendario';
import Fab from '../../componentes/Fab';
import Icone from '../../componentes/Icone';
import ListaDoDia from '../../componentes/ListaDoDia';
import { ESTILO_BOTAO_ICONE } from '../../componentes/estilos';
import { agruparPorDia, dataDoDia, rotuloDia } from '../../dominio/agenda';
import {
  dataValida,
  intervaloDaVisao,
  lerVisao,
  paraEventos,
  paraHoraDeParede,
  passarPeriodo,
  tituloDaVisao,
  type Visao,
} from '../../dominio/calendario';
import { useAgendamentos } from '../../hooks/useAgenda';
import { useAviso } from '../../hooks/useAviso';

const VISOES: { visao: Visao; rotulo: string }[] = [
  { visao: 'semana', rotulo: 'Semana' },
  { visao: 'mes', rotulo: 'Mês' },
];

/**
 * `/agenda?visao=semana|mes&dia=AAAA-MM-DD` (RF07): calendário com visão de
 * semana e de mês. Tocar num dia mostra os atendimentos dele embaixo; tocar
 * num horário da semana abre "Novo atendimento" já com dia e hora.
 */
export default function Agenda() {
  const navegar = useNavigate();
  const [busca, setBusca] = useSearchParams();
  const hoje = dataDoDia(new Date());
  const visao = lerVisao(busca.get('visao'));
  const pedido = busca.get('dia');
  const dia = dataValida(pedido) ? pedido : hoje;

  const { inicio, dias } = intervaloDaVisao(visao, dia);
  const { dados, carregando, erro } = useAgendamentos(inicio, dias);
  const aviso = useAviso();
  const doDia = agruparPorDia(dados).get(dia) ?? [];

  const ir = (proxima: { visao?: Visao; dia?: string }) =>
    setBusca(
      { visao: proxima.visao ?? visao, dia: proxima.dia ?? dia },
      { replace: true, preventScrollReset: true },
    );

  return (
    <>
      <BarraSuperior titulo="Agenda" />

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Visão"
          className="flex rounded-full border border-borda-campo"
        >
          {VISOES.map((v) => (
            <button
              key={v.visao}
              type="button"
              aria-pressed={visao === v.visao}
              onClick={() => ir({ visao: v.visao })}
              className="min-h-12 min-w-20 rounded-full px-4 font-medium text-texto aria-pressed:bg-marca-suave aria-pressed:text-marca-escura focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
            >
              {v.rotulo}
            </button>
          ))}
        </div>
        {dia !== hoje && (
          <Botao variante="texto" onClick={() => ir({ dia: hoje })}>
            Hoje
          </Botao>
        )}
      </div>

      <nav aria-label="Trocar período" className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={visao === 'semana' ? 'Semana anterior' : 'Mês anterior'}
          onClick={() => ir({ dia: passarPeriodo(visao, dia, -1) })}
          className={ESTILO_BOTAO_ICONE}
        >
          <Icone nome="anterior" />
        </button>
        <h2 aria-live="polite" className="text-secao font-medium first-letter:uppercase">
          {tituloDaVisao(visao, dia)}
        </h2>
        <button
          type="button"
          aria-label={visao === 'semana' ? 'Próxima semana' : 'Próximo mês'}
          onClick={() => ir({ dia: passarPeriodo(visao, dia, 1) })}
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
        visao={visao}
        dia={dia}
        eventos={paraEventos(dados)}
        agora={paraHoraDeParede(new Date())}
        aoTocarDia={(d) => ir({ dia: d })}
        aoTocarHorario={(d, hora) => navegar(`/atendimentos/novo?data=${d}&hora=${hora}`)}
        aoTocarEvento={(id) => navegar(`/atendimentos/${id}`)}
      />

      <section aria-labelledby="dia-escolhido" className="mt-6">
        <h2 id="dia-escolhido" className="mb-2 text-secao font-medium first-letter:uppercase">
          {dia === hoje ? `Hoje, ${rotuloDia(dia)}` : rotuloDia(dia)}
        </h2>
        {carregando ? (
          <p role="status" className="text-texto-suave">
            Carregando agenda…
          </p>
        ) : (
          !erro && <ListaDoDia agendamentos={doDia} vazio="Nenhum atendimento neste dia." />
        )}
      </section>

      <Fab to={`/atendimentos/novo?data=${dia}`} rotulo="Novo atendimento" />
      <Aviso texto={aviso} />
    </>
  );
}
