import BarraSuperior from '../../componentes/BarraSuperior';
import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import Botao from '../../componentes/Botao';
import FormularioAtendimento from '../../componentes/FormularioAtendimento';
import { ESTILO_LINK } from '../../componentes/estilos';
import {
  dataDoDia,
  horaDe,
  HorarioOcupado,
  idsTravas,
  inicioEm,
  rotuloDia,
  rotuloHora,
  type DadosAtendimento,
} from '../../dominio/agenda';
import { useAgendamento, useOcupados } from '../../hooks/useAgenda';
import { useClientes } from '../../hooks/useClientes';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { useServicos } from '../../hooks/useServicos';
import { cancelarAtendimento, marcarAtendimento } from '../../servicos/agenda';

const ERRO_CARREGAR = 'Não foi possível carregar os dados. Confira a internet e tente de novo.';

/** Para onde voltar depois de salvar: Hoje, ou a semana que começa no dia marcado. */
const destino = (data: string) => (data === dataDoDia(new Date()) ? '/' : `/semana?de=${data}`);

/** `/atendimentos/novo?data=AAAA-MM-DD` marca; `/atendimentos/:id` edita ou cancela. */
export default function EditarAtendimento() {
  const { id } = useParams();
  const [busca] = useSearchParams();
  const navegar = useNavigate();
  const clientes = useClientes();
  const servicos = useServicos();
  const configuracoes = useConfiguracoes();
  const { config } = configuracoes;
  const atendimento = useAgendamento(id);
  const atual = atendimento.dados;

  const dataInicial = atual
    ? dataDoDia(atual.inicio)
    : (busca.get('data') ?? dataDoDia(new Date()));
  const [dataEscolhida, setDataEscolhida] = useState<string | null>(null);
  const data = dataEscolhida ?? dataInicial;
  const ocupadosDoDia = useOcupados(data).dados;
  const [erroEnvio, setErroEnvio] = useState<string>();
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);

  const aoMudarData = useCallback((d: string) => setDataEscolhida(d), []);

  // ao editar, as travas do próprio atendimento não contam como ocupadas
  const proprias = new Set(
    (atual?.travas ?? []).filter((t) => t.startsWith(`${data}_`)).map((t) => t.slice(11)),
  );
  const ocupados = new Set([...ocupadosDoDia].filter((h) => !proprias.has(h)));

  async function salvar(d: DadosAtendimento) {
    setErroEnvio(undefined);
    const cliente = clientes.clientes.find((c) => c.id === d.clienteId);
    const servico = servicos.servicos.find((s) => s.id === d.servicoId);
    if (!cliente || !servico) {
      setErroEnvio('Escolha a cliente e o serviço de novo.');
      return;
    }
    const inicio = inicioEm(d.data, d.hora);
    try {
      await marcarAtendimento(
        {
          clienteId: cliente.id,
          clienteNome: cliente.nome,
          clienteWhatsapp: cliente.whatsapp,
          servicoId: servico.id,
          servicoNome: servico.nome,
          duracaoMin: servico.duracaoMin,
          inicio,
          travas: idsTravas(inicio, servico.duracaoMin, config.intervaloMin),
          status: 'marcado',
          observacao: d.observacao,
        },
        id,
        atual?.travas,
      );
      navegar(destino(d.data), {
        state: {
          aviso: `${cliente.nome}: ${rotuloDia(d.data)}, às ${rotuloHora(d.hora)}. Salvo.`,
        },
      });
    } catch (e) {
      if (e instanceof HorarioOcupado) {
        setErroEnvio('Esse horário acabou de ser ocupado. Escolha outro.');
      } else {
        console.error(e);
        setErroEnvio('Não foi possível salvar. Confira a internet e tente de novo.');
      }
    }
  }

  function cancelar() {
    if (!atual) return;
    cancelarAtendimento(atual);
    navegar(destino(dataDoDia(atual.inicio)), {
      state: { aviso: `Atendimento de ${atual.clienteNome} cancelado. O horário ficou livre.` },
    });
  }

  const titulo = id ? 'Atendimento' : 'Novo atendimento';
  const carregando =
    clientes.carregando ||
    servicos.carregando ||
    configuracoes.carregando ||
    atendimento.carregando;
  const erro = clientes.erro || servicos.erro || configuracoes.erro || atendimento.erro;

  if (carregando) {
    return (
      <p role="status" className="text-texto-suave">
        Carregando…
      </p>
    );
  }
  if (erro || (id && !atual)) {
    return (
      <>
        <BarraSuperior titulo={titulo} voltarPara="/" />
        <p role="alert" className="mt-4">
          {erro ? ERRO_CARREGAR : 'Não encontramos esse atendimento. Volte para a agenda.'}
        </p>
        <Link to="/" className={`mt-4 inline-flex min-h-12 items-center ${ESTILO_LINK}`}>
          Voltar para hoje
        </Link>
      </>
    );
  }
  if (atual?.status === 'cancelado') {
    return (
      <>
        <BarraSuperior titulo={titulo} voltarPara="/" />
        <p className="mt-4">
          O atendimento de {atual.clienteNome} em {rotuloDia(dataDoDia(atual.inicio))} foi
          cancelado.
        </p>
      </>
    );
  }
  if (clientes.clientes.length === 0 || servicos.servicos.length === 0) {
    return (
      <>
        <BarraSuperior titulo={titulo} voltarPara="/" />
        <p className="mt-4">Para marcar, cadastre antes:</p>
        <ul className="mt-2 flex flex-col">
          {clientes.clientes.length === 0 && (
            <li>
              <Link
                to="/clientes/nova"
                className={`inline-flex min-h-12 items-center ${ESTILO_LINK}`}
              >
                uma cliente
              </Link>
            </li>
          )}
          {servicos.servicos.length === 0 && (
            <li>
              <Link
                to="/mais/servicos/novo"
                className={`inline-flex min-h-12 items-center ${ESTILO_LINK}`}
              >
                um serviço
              </Link>
            </li>
          )}
        </ul>
      </>
    );
  }

  return (
    <>
      <BarraSuperior titulo={titulo} voltarPara="/" />
      <FormularioAtendimento
        key={atual?.id ?? 'novo'}
        clientes={clientes.clientes}
        servicos={servicos.servicos}
        inicial={{
          clienteId: atual?.clienteId ?? '',
          servicoId: atual?.servicoId ?? '',
          data: dataInicial,
          hora: atual ? horaDe(atual.inicio) : '',
          observacao: atual?.observacao ?? '',
        }}
        ocupados={ocupados}
        intervaloMin={config.intervaloMin}
        expediente={config.expediente}
        aoMudarData={aoMudarData}
        aoEnviar={salvar}
        aoCancelar={() => navegar(-1)}
        erroEnvio={erroEnvio}
      />

      {atual && (
        <section aria-labelledby="cancelar" className="mt-10 border-t border-borda pt-6">
          <h2 id="cancelar" className="text-secao font-medium">
            Cancelar atendimento
          </h2>
          {confirmandoCancelamento ? (
            <div className="mt-3 flex flex-col gap-3">
              <p>
                Cancelar o atendimento de {atual.clienteNome} às {rotuloHora(horaDe(atual.inicio))}?
                O horário volta a ficar livre.
              </p>
              <Botao onClick={cancelar}>Sim, cancelar</Botao>
              <Botao variante="secundario" onClick={() => setConfirmandoCancelamento(false)}>
                Não, manter
              </Botao>
            </div>
          ) : (
            <Botao
              variante="secundario"
              className="mt-3 w-full"
              onClick={() => setConfirmandoCancelamento(true)}
            >
              Cancelar atendimento
            </Botao>
          )}
        </section>
      )}
    </>
  );
}
