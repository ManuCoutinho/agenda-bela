import { Link, useSearchParams } from 'react-router';
import Aviso from '../../componentes/Aviso';
import BarraSuperior from '../../componentes/BarraSuperior';
import Icone from '../../componentes/Icone';
import ListaDoDia from '../../componentes/ListaDoDia';
import { ESTILO_BOTAO, ESTILO_BOTAO_ICONE } from '../../componentes/estilos';
import {
  agruparPorDia,
  dataDoDia,
  diasAPartirDe,
  rotuloDia,
  somarDias,
} from '../../dominio/agenda';
import { useAgendamentos } from '../../hooks/useAgenda';
import { useAviso } from '../../hooks/useAviso';

const DIAS = 7;

/** Sete dias a partir de hoje ou de `?de=AAAA-MM-DD`. */
export default function Semana() {
  const hoje = dataDoDia(new Date());
  const [busca] = useSearchParams();
  const pedido = busca.get('de') ?? '';
  const de = /^\d{4}-\d{2}-\d{2}$/.test(pedido) ? pedido : hoje;
  const { dados, carregando, erro } = useAgendamentos(de, DIAS);
  const aviso = useAviso();
  const porDia = agruparPorDia(dados);

  return (
    <>
      <BarraSuperior titulo="Semana" />

      <nav aria-label="Trocar semana" className="flex items-center justify-between gap-2">
        <Link
          to={`/semana?de=${somarDias(de, -DIAS)}`}
          aria-label="7 dias antes"
          className={ESTILO_BOTAO_ICONE}
        >
          <Icone nome="anterior" />
        </Link>
        {de !== hoje ? (
          <Link to="/semana" className={ESTILO_BOTAO.texto}>
            A partir de hoje
          </Link>
        ) : (
          <span className="text-texto-suave">Próximos 7 dias</span>
        )}
        <Link
          to={`/semana?de=${somarDias(de, DIAS)}`}
          aria-label="7 dias depois"
          className={ESTILO_BOTAO_ICONE}
        >
          <Icone nome="proximo" />
        </Link>
      </nav>

      {carregando && (
        <p role="status" className="mt-4 text-texto-suave">
          Carregando agenda…
        </p>
      )}
      {erro && (
        <p role="alert" className="mt-4 text-erro">
          Não foi possível carregar a agenda. Confira a internet e tente de novo.
        </p>
      )}

      {!carregando &&
        !erro &&
        diasAPartirDe(de, DIAS).map((dia) => (
          <section key={dia} aria-labelledby={`dia-${dia}`} className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-4">
              <h2 id={`dia-${dia}`} className="text-secao font-medium first-letter:uppercase">
                {dia === hoje ? `Hoje, ${rotuloDia(dia)}` : rotuloDia(dia)}
              </h2>
              <Link
                to={`/atendimentos/novo?data=${dia}`}
                aria-label={`Marcar atendimento em ${rotuloDia(dia)}`}
                className={ESTILO_BOTAO.texto}
              >
                Marcar
              </Link>
            </div>
            <ListaDoDia agendamentos={porDia.get(dia) ?? []} vazio="Nenhum atendimento." />
          </section>
        ))}
      <Aviso texto={aviso} />
    </>
  );
}
