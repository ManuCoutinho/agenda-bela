import { Link } from 'react-router';
import Aviso from '../../componentes/Aviso';
import BarraSuperior from '../../componentes/BarraSuperior';
import Fab from '../../componentes/Fab';
import { ESTILO_ITEM_LISTA, ESTILO_LISTA } from '../../componentes/estilos';
import { dataDoDia } from '../../dominio/agenda';
import {
  rotuloHorario,
  rotuloQuando,
  separarBloqueios,
  type Bloqueio,
} from '../../dominio/bloqueios';
import { useAviso } from '../../hooks/useAviso';
import { useBloqueios } from '../../hooks/useBloqueios';

function Lista({ titulo, itens, vazio }: { titulo: string; itens: Bloqueio[]; vazio: string }) {
  const id = `secao-${titulo.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <section aria-labelledby={id} className="mt-6 first:mt-0">
      <h2 id={id} className="mb-2 text-secao font-medium">
        {titulo}
      </h2>
      {itens.length === 0 ? (
        <p className="text-texto-suave">{vazio}</p>
      ) : (
        <ul className={ESTILO_LISTA}>
          {itens.map((b) => (
            <li key={b.id}>
              <Link to={`/mais/bloqueios/${b.id}`} className={`${ESTILO_ITEM_LISTA} min-h-18`}>
                <span className="flex flex-col">
                  <span className="font-medium first-letter:uppercase">
                    {rotuloQuando(b)} · {rotuloHorario(b)}
                  </span>
                  <span className="text-texto-suave">{b.descricao || 'Sem descrição'}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** `/mais/bloqueios` (RF05, RF06): horários em que a manicure não atende. */
export default function Bloqueios() {
  const { bloqueios, carregando, erro } = useBloqueios();
  const aviso = useAviso();
  const { recorrentes, proximos } = separarBloqueios(bloqueios, dataDoDia(new Date()));

  return (
    <>
      <BarraSuperior titulo="Bloqueios" voltarPara="/mais" />
      <p className="mb-4 text-texto-suave">
        Horários em que você não atende. As clientes não conseguem pedir esses horários.
      </p>
      {carregando ? (
        <p role="status" className="text-texto-suave">
          Carregando bloqueios…
        </p>
      ) : erro ? (
        <p role="alert" className="text-erro">
          Não foi possível carregar os bloqueios. Confira a internet e tente de novo.
        </p>
      ) : (
        <>
          <Lista titulo="Toda semana" itens={recorrentes} vazio="Nenhum bloqueio fixo." />
          <Lista titulo="Próximos dias" itens={proximos} vazio="Nenhum bloqueio marcado." />
        </>
      )}
      <Fab to="/mais/bloqueios/novo" rotulo="Novo bloqueio" />
      <Aviso texto={aviso} />
    </>
  );
}
