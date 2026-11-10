import { Link } from 'react-router';
import Aviso from '../../componentes/Aviso';
import BarraSuperior from '../../componentes/BarraSuperior';
import Fab from '../../componentes/Fab';
import { ESTILO_ITEM_LISTA, ESTILO_LISTA } from '../../componentes/estilos';
import { formatarDuracao, formatarPreco } from '../../dominio/servicos';
import { useAviso } from '../../hooks/useAviso';
import { useServicos } from '../../hooks/useServicos';

export default function Servicos() {
  const { servicos, carregando, erro } = useServicos();
  const aviso = useAviso();

  return (
    <>
      <BarraSuperior titulo="Serviços" voltarPara="/mais" />
      {carregando && (
        <p role="status" className="text-texto-suave">
          Carregando serviços…
        </p>
      )}
      {erro && (
        <p role="alert" className="text-erro">
          Não foi possível carregar os serviços. Confira a internet e tente de novo.
        </p>
      )}
      {!carregando && !erro && servicos.length === 0 && (
        <p className="text-texto-suave">
          Nenhum serviço cadastrado. Cadastre o que você oferece para as clientes poderem agendar.
        </p>
      )}

      {servicos.length > 0 && (
        <ul className={ESTILO_LISTA}>
          {servicos.map((s) => (
            <li key={s.id}>
              <Link to={`/mais/servicos/${s.id}`} className={`${ESTILO_ITEM_LISTA} min-h-18`}>
                <span className="flex flex-col">
                  <span className="font-medium">{s.nome}</span>
                  <span className="text-texto-suave">
                    {formatarDuracao(s.duracaoMin)} · {formatarPreco(s.precoCentavos)}
                    {!s.publico && ' · só para você (fora da página pública)'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Fab to="/mais/servicos/novo" rotulo="Novo serviço" />
      <Aviso texto={aviso} />
    </>
  );
}
