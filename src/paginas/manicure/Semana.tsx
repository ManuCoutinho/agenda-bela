import { Link, useSearchParams } from 'react-router';
import Aviso from '../../componentes/Aviso';
import ListaDoDia from '../../componentes/ListaDoDia';
import { ESTILO_BOTAO, ESTILO_LINK } from '../../componentes/estilos';
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
      <h1 className="text-2xl font-semibold">Semana</h1>
      <Aviso texto={aviso} />

      <nav aria-label="Trocar semana" className="mt-4 flex flex-wrap gap-2">
        <Link to={`/semana?de=${somarDias(de, -DIAS)}`} className={ESTILO_BOTAO.secundario}>
          7 dias antes
        </Link>
        {de !== hoje && (
          <Link to="/semana" className={ESTILO_BOTAO.secundario}>
            A partir de hoje
          </Link>
        )}
        <Link to={`/semana?de=${somarDias(de, DIAS)}`} className={ESTILO_BOTAO.secundario}>
          7 dias depois
        </Link>
      </nav>

      {carregando && (
        <p role="status" className="mt-6 text-texto-suave">
          Carregando agenda…
        </p>
      )}
      {erro && (
        <p role="alert" className="mt-6 text-erro">
          Não foi possível carregar a agenda. Confira a internet e tente de novo.
        </p>
      )}

      {!carregando &&
        !erro &&
        diasAPartirDe(de, DIAS).map((dia) => (
          <section key={dia} aria-labelledby={`dia-${dia}`} className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-4">
              <h2 id={`dia-${dia}`} className="text-lg font-semibold first-letter:uppercase">
                {dia === hoje ? `Hoje, ${rotuloDia(dia)}` : rotuloDia(dia)}
              </h2>
              <Link
                to={`/atendimentos/novo?data=${dia}`}
                aria-label={`Marcar atendimento em ${rotuloDia(dia)}`}
                className={`inline-flex min-h-11 items-center ${ESTILO_LINK}`}
              >
                Marcar
              </Link>
            </div>
            <ListaDoDia agendamentos={porDia.get(dia) ?? []} vazio="Nenhum atendimento." />
          </section>
        ))}
    </>
  );
}
