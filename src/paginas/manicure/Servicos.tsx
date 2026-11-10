import { Link } from 'react-router';
import Aviso from '../../componentes/Aviso';
import LinkBotao from '../../componentes/LinkBotao';
import { ESTILO_LINK } from '../../componentes/estilos';
import { formatarDuracao, formatarPreco } from '../../dominio/servicos';
import { useAviso } from '../../hooks/useAviso';
import { useServicos } from '../../hooks/useServicos';

export default function Servicos() {
  const { servicos, carregando, erro } = useServicos();
  const aviso = useAviso();

  return (
    <>
      <Link to="/mais" className={`inline-flex min-h-11 items-center ${ESTILO_LINK}`}>
        Voltar
      </Link>
      <div className="mt-2 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Serviços</h1>
        <LinkBotao to="/mais/servicos/novo">Novo serviço</LinkBotao>
      </div>

      <Aviso texto={aviso} />
      {carregando && (
        <p role="status" className="mt-6 text-texto-suave">
          Carregando serviços…
        </p>
      )}
      {erro && (
        <p role="alert" className="mt-6 text-erro">
          Não foi possível carregar os serviços. Confira a internet e tente de novo.
        </p>
      )}
      {!carregando && !erro && servicos.length === 0 && (
        <p className="mt-6 text-texto-suave">
          Nenhum serviço cadastrado. Cadastre o que você oferece para as clientes poderem agendar.
        </p>
      )}

      {servicos.length > 0 && (
        <ul className="mt-6 divide-y divide-borda rounded-lg border border-borda bg-superficie">
          {servicos.map((s) => (
            <li key={s.id}>
              <Link
                to={`/mais/servicos/${s.id}`}
                className={`flex min-h-11 flex-col p-3 ${ESTILO_LINK} no-underline`}
              >
                <span className="font-medium">{s.nome}</span>
                <span className="text-texto-suave">
                  {formatarDuracao(s.duracaoMin)} · {formatarPreco(s.precoCentavos)}
                  {!s.publico && ' · só para você (fora da página pública)'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
