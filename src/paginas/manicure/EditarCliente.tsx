import BarraSuperior from '../../componentes/BarraSuperior';
import { Link, useNavigate, useParams } from 'react-router';
import FormularioCliente from '../../componentes/FormularioCliente';
import { ESTILO_LINK } from '../../componentes/estilos';
import { formatarWhatsApp, type DadosCliente } from '../../dominio/clientes';
import { useClientes } from '../../hooks/useClientes';
import { salvarCliente } from '../../servicos/clientes';

/** `/clientes/nova` cadastra; `/clientes/:id` edita. */
export default function EditarCliente() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { clientes, carregando, erro } = useClientes();
  const cliente = id ? clientes.find((c) => c.id === id) : undefined;
  const titulo = id ? 'Editar cliente' : 'Nova cliente';

  function salvar(dados: DadosCliente) {
    salvarCliente(dados, id);
    navegar('/clientes', { state: { aviso: `${dados.nome} foi salva.` } });
  }

  const voltar = () => navegar('/clientes');

  if (id && carregando) {
    return (
      <p role="status" className="text-texto-suave">
        Carregando cliente…
      </p>
    );
  }
  if (id && (erro || !cliente)) {
    return (
      <>
        <BarraSuperior titulo={titulo} voltarPara="/clientes" />
        <p role="alert" className="mt-4">
          Não encontramos essa cliente. Volte para a lista e tente de novo.
        </p>
        <Link to="/clientes" className={`mt-4 inline-flex min-h-12 items-center ${ESTILO_LINK}`}>
          Voltar para clientes
        </Link>
      </>
    );
  }

  return (
    <>
      <BarraSuperior titulo={titulo} voltarPara="/clientes" />
      <FormularioCliente
        key={cliente?.id ?? 'nova'}
        inicial={
          cliente && {
            nome: cliente.nome,
            whatsapp: formatarWhatsApp(cliente.whatsapp),
            observacao: cliente.observacao,
            consentimento: cliente.consentimento,
          }
        }
        aoEnviar={salvar}
        aoCancelar={voltar}
      />
    </>
  );
}
