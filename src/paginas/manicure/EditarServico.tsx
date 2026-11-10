import { Link, useNavigate, useParams } from 'react-router';
import FormularioServico from '../../componentes/FormularioServico';
import { ESTILO_LINK } from '../../componentes/estilos';
import {
  gravarNaLista,
  paraServico,
  precoParaCampo,
  type DadosServico,
} from '../../dominio/servicos';
import { useServicos } from '../../hooks/useServicos';
import { novoIdServico, salvarServicos } from '../../servicos/configPublica';

/** `/mais/servicos/novo` cadastra; `/mais/servicos/:id` edita. */
export default function EditarServico() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { servicos, carregando, erro } = useServicos();
  const servico = id ? servicos.find((s) => s.id === id) : undefined;
  const titulo = id ? 'Editar serviço' : 'Novo serviço';

  function salvar(dados: DadosServico) {
    salvarServicos(gravarNaLista(servicos, paraServico(id ?? novoIdServico(), dados)));
    navegar('/mais/servicos', { state: { aviso: `${dados.nome} foi salvo.` } });
  }

  if (carregando) {
    return (
      <p role="status" className="text-texto-suave">
        Carregando serviços…
      </p>
    );
  }
  if (erro || (id && !servico)) {
    return (
      <>
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        <p role="alert" className="mt-4">
          {erro
            ? 'Não foi possível carregar os serviços. Confira a internet e tente de novo.'
            : 'Não encontramos esse serviço. Volte para a lista e tente de novo.'}
        </p>
        <Link
          to="/mais/servicos"
          className={`mt-4 inline-flex min-h-11 items-center ${ESTILO_LINK}`}
        >
          Voltar para serviços
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{titulo}</h1>
      <FormularioServico
        key={servico?.id ?? 'novo'}
        inicial={
          servico && {
            nome: servico.nome,
            duracaoMin: String(servico.duracaoMin),
            preco: precoParaCampo(servico.precoCentavos),
            publico: servico.publico,
          }
        }
        aoEnviar={salvar}
        aoCancelar={() => navegar('/mais/servicos')}
      />
    </>
  );
}
