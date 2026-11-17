import { useState } from 'react';
import { useNavigate } from 'react-router';
import Aviso from '../../componentes/Aviso';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import Carregando from '../../componentes/Carregando';
import FormularioConfiguracoes from '../../componentes/FormularioConfiguracoes';
import FormularioPagamento from '../../componentes/FormularioPagamento';
import Icone from '../../componentes/Icone';
import {
  paraCampos,
  paraConfiguracoes,
  type DadosConfiguracoes,
} from '../../dominio/configuracoes';
import { paraCamposPagamento } from '../../dominio/pagamento';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { useLinkAgendamento } from '../../hooks/useLinkAgendamento';
import { usePagamento } from '../../hooks/usePagamento';
import { salvarConfiguracoes } from '../../servicos/configPublica';
import { copiarTexto } from '../../servicos/encurtador';
import { salvarPagamento } from '../../servicos/pagamento';

/** Link curto da página pública, pronto para colar no WhatsApp ou no Instagram (RF08). */
function LinkParaClientes({ slug }: { slug: string }) {
  const { link, carregando } = useLinkAgendamento(slug);
  const [aviso, setAviso] = useState<string>();

  async function copiar() {
    try {
      await copiarTexto(link);
      setAviso('Link copiado. Cole no WhatsApp ou no Instagram.');
    } catch {
      setAviso('Não foi possível copiar. Toque no link e segure para copiar.');
    }
  }

  return (
    <section
      aria-labelledby="titulo-link"
      className="mb-6 flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4"
    >
      <h2 id="titulo-link" className="text-secao font-medium">
        Link para as clientes
      </h2>
      {!slug ? (
        <p className="text-texto-suave">Salve as configurações para criar o seu link.</p>
      ) : carregando ? (
        <Carregando texto="Preparando o link…" />
      ) : (
        <>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="break-all text-marca underline underline-offset-4"
          >
            {link}
          </a>
          <Botao onClick={copiar}>
            <Icone nome="copiar" />
            Copiar link
          </Botao>
        </>
      )}
      <Aviso texto={aviso} />
    </section>
  );
}

/** Chave Pix e sinal (RF10): ficam em `config/pagamento`, que só a manicure lê. */
function SinalPeloPix() {
  const { pagamento, carregando, erro } = usePagamento();
  const [aviso, setAviso] = useState<string>();

  if (carregando) return <Carregando texto="Carregando o Pix…" />;
  if (erro) {
    return (
      <p role="alert" className="mb-6 text-erro">
        Não foi possível carregar a chave Pix. Confira a internet e tente de novo.
      </p>
    );
  }
  return (
    <>
      <FormularioPagamento
        inicial={paraCamposPagamento(pagamento)}
        aoEnviar={(dados) => {
          salvarPagamento(dados);
          setAviso('Sinal pelo Pix salvo.');
        }}
      />
      <Aviso texto={aviso} />
    </>
  );
}

/** `/mais/configuracoes` (RF04): espaço, expediente e regras do agendamento público. */
export default function Configuracoes() {
  const navegar = useNavigate();
  const { config, carregando, erro } = useConfiguracoes();

  function salvar(dados: DadosConfiguracoes) {
    salvarConfiguracoes(paraConfiguracoes(dados, config.slug));
    navegar('/mais', { state: { aviso: 'Configurações salvas.' } });
  }

  return (
    <>
      <BarraSuperior titulo="Configurações" voltarPara="/mais" />
      {carregando ? (
        <Carregando texto="Carregando configurações…" />
      ) : erro ? (
        <p role="alert" className="text-erro">
          Não foi possível carregar as configurações. Confira a internet e tente de novo.
        </p>
      ) : (
        <>
          <LinkParaClientes slug={config.slug} />
          <SinalPeloPix />
          <FormularioConfiguracoes
            inicial={paraCampos(config)}
            aoEnviar={salvar}
            aoCancelar={() => navegar('/mais')}
          />
        </>
      )}
    </>
  );
}
