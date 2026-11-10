import { useNavigate } from 'react-router';
import BarraSuperior from '../../componentes/BarraSuperior';
import FormularioConfiguracoes from '../../componentes/FormularioConfiguracoes';
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
      <BarraSuperior titulo="Configurações" voltarPara="/mais" />
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
