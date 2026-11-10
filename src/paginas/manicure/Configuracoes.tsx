import { Link, useNavigate } from 'react-router';
import FormularioConfiguracoes from '../../componentes/FormularioConfiguracoes';
import { ESTILO_LINK } from '../../componentes/estilos';
import {
  paraCampos,
  paraConfiguracoes,
  type DadosConfiguracoes,
} from '../../dominio/configuracoes';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { salvarConfiguracoes } from '../../servicos/configPublica';

/** `/mais/configuracoes` (RF04): espaço, expediente e regras do agendamento público. */
export default function Configuracoes() {
  const navegar = useNavigate();
  const { config, carregando, erro } = useConfiguracoes();

  function salvar(dados: DadosConfiguracoes) {
    salvarConfiguracoes(paraConfiguracoes(dados));
    navegar('/mais', { state: { aviso: 'Configurações salvas.' } });
  }

  return (
    <>
      <Link to="/mais" className={`inline-flex min-h-11 items-center ${ESTILO_LINK}`}>
        Voltar
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Configurações</h1>
      {carregando ? (
        <p role="status" className="text-texto-suave">
          Carregando configurações…
        </p>
      ) : erro ? (
        <p role="alert" className="text-erro">
          Não foi possível carregar as configurações. Confira a internet e tente de novo.
        </p>
      ) : (
        <FormularioConfiguracoes
          inicial={paraCampos(config)}
          aoEnviar={salvar}
          aoCancelar={() => navegar('/mais')}
        />
      )}
    </>
  );
}
