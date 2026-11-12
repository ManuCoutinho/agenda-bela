import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import ConflitosBloqueio from '../../componentes/ConflitosBloqueio';
import FormularioBloqueio from '../../componentes/FormularioBloqueio';
import { ESTILO_LINK } from '../../componentes/estilos';
import { dataDoDia, diaDaSemana, HorarioOcupado } from '../../dominio/agenda';
import { conflitosDoBloqueio, type Conflito } from '../../dominio/conflitos';
import {
  paraRecorrentesPublicos,
  rotuloHorario,
  rotuloQuando,
  travasDoIntervalo,
  type CamposBloqueio,
  type DadosBloqueio,
} from '../../dominio/bloqueios';
import { useAgendamentos } from '../../hooks/useAgenda';
import { useBloqueios } from '../../hooks/useBloqueios';
import { usePedidosPendentes } from '../../hooks/usePedidos';
import { useServicos } from '../../hooks/useServicos';
import {
  bloquearHorario,
  excluirBloqueio,
  salvarBloqueioRecorrente,
} from '../../servicos/bloqueios';

const VOLTAR = '/mais/bloqueios';
/** Janela em que se procuram atendimentos no caminho de um bloqueio fixo. */
const DIAS_CONFLITO = 92;

const paraCampos = (d: DadosBloqueio): CamposBloqueio => ({ ...d, dia: String(d.dia) });

/** `/mais/bloqueios/novo?data=AAAA-MM-DD` cria; `/mais/bloqueios/:id` mostra e exclui. */
export default function EditarBloqueio() {
  const { id } = useParams();
  const [busca] = useSearchParams();
  const navegar = useNavigate();
  const { bloqueios, carregando, erro } = useBloqueios();
  const [erroEnvio, setErroEnvio] = useState<string>();
  const [confirmando, setConfirmando] = useState(false);

  const hoje = dataDoDia(new Date());
  const { dados: agendamentos } = useAgendamentos(hoje, DIAS_CONFLITO);
  const { pedidos } = usePedidosPendentes();
  const { servicos } = useServicos();
  const [pendente, setPendente] = useState<{ dados: DadosBloqueio; conflitos: Conflito[] }>();
  const [inicialDoForm, setInicialDoForm] = useState<CamposBloqueio>();
  const [seguindo, setSeguindo] = useState(false);

  async function gravar(d: DadosBloqueio, pularOcupados: boolean) {
    setErroEnvio(undefined);
    const quando = `${d.ini}–${d.fim}`;
    if (d.tipo === 'recorrente') {
      const novo = { dia: d.dia, ini: d.ini, fim: d.fim, descricao: d.descricao };
      salvarBloqueioRecorrente(novo, [
        ...paraRecorrentesPublicos(bloqueios),
        { dia: d.dia, ini: d.ini, fim: d.fim },
      ]);
      navegar(VOLTAR, { state: { aviso: `Bloqueio fixo salvo: ${quando}.` } });
      return;
    }
    try {
      const n = await bloquearHorario(
        {
          data: d.data,
          ini: d.ini,
          fim: d.fim,
          descricao: d.descricao,
          travas: travasDoIntervalo(d.data, d.ini, d.fim),
        },
        pularOcupados,
      );
      if (n === 0) {
        setPendente(undefined);
        setInicialDoForm(paraCampos(d));
        setErroEnvio('Não havia horário livre para bloquear nesse intervalo.');
        return;
      }
      navegar(VOLTAR, {
        state: {
          aviso: pularOcupados
            ? `Bloqueados os horários livres de ${quando}. Os atendimentos continuam marcados.`
            : `Horário bloqueado: ${quando}.`,
        },
      });
    } catch (e) {
      setPendente(undefined);
      setInicialDoForm(paraCampos(d));
      if (e instanceof HorarioOcupado) {
        setErroEnvio(
          'Já há atendimento, pedido ou bloqueio nesse horário. Escolha outro horário ou remarque antes.',
        );
      } else {
        console.error(e);
        setErroEnvio('Não foi possível salvar. Confira a internet e tente de novo.');
      }
    }
  }

  async function salvar(d: DadosBloqueio) {
    const alvo =
      d.tipo === 'recorrente'
        ? { tipo: d.tipo, dia: d.dia, ini: d.ini, fim: d.fim }
        : { tipo: d.tipo, data: d.data, ini: d.ini, fim: d.fim };
    const conflitos = conflitosDoBloqueio(alvo, agendamentos, pedidos, new Date());
    if (conflitos.length > 0) {
      setPendente({ dados: d, conflitos });
      return;
    }
    await gravar(d, false);
  }

  async function seguirMesmoAssim() {
    if (!pendente) return;
    setSeguindo(true);
    try {
      await gravar(pendente.dados, true);
    } finally {
      setSeguindo(false);
    }
  }

  if (!id) {
    const pedida = busca.get('data') ?? '';
    const data = /^\d{4}-\d{2}-\d{2}$/.test(pedida) ? pedida : hoje;
    if (pendente) {
      return (
        <>
          <BarraSuperior titulo="Novo bloqueio" voltarPara={VOLTAR} />
          <ConflitosBloqueio
            conflitos={pendente.conflitos}
            nomeServico={(sid) => servicos.find((s) => s.id === sid)?.nome ?? 'Atendimento'}
            recorrente={pendente.dados.tipo === 'recorrente'}
            aoSeguir={seguirMesmoAssim}
            aoVoltar={() => {
              setInicialDoForm(paraCampos(pendente.dados));
              setPendente(undefined);
            }}
            seguindo={seguindo}
          />
        </>
      );
    }
    return (
      <>
        <BarraSuperior titulo="Novo bloqueio" voltarPara={VOLTAR} />
        <FormularioBloqueio
          inicial={
            inicialDoForm ?? {
              tipo: 'pontual',
              data,
              dia: String(diaDaSemana(data)),
              ini: '09:00',
              fim: '10:00',
              descricao: '',
            }
          }
          aoEnviar={salvar}
          aoCancelar={() => navegar(-1)}
          erroEnvio={erroEnvio}
        />
      </>
    );
  }

  const bloqueio = bloqueios.find((b) => b.id === id);

  if (carregando) {
    return (
      <p role="status" className="text-texto-suave">
        Carregando bloqueio…
      </p>
    );
  }
  if (erro || !bloqueio) {
    return (
      <>
        <BarraSuperior titulo="Bloqueio" voltarPara={VOLTAR} />
        <p role="alert" className="mt-4">
          {erro
            ? 'Não foi possível carregar o bloqueio. Confira a internet e tente de novo.'
            : 'Não encontramos esse bloqueio. Ele pode ter sido excluído.'}
        </p>
        <Link to={VOLTAR} className={`mt-4 inline-flex min-h-12 items-center ${ESTILO_LINK}`}>
          Voltar para bloqueios
        </Link>
      </>
    );
  }

  function excluir() {
    if (!bloqueio) return;
    const restantes = bloqueios.filter((b) => b.id !== bloqueio.id);
    excluirBloqueio(bloqueio, paraRecorrentesPublicos(restantes));
    navegar(VOLTAR, { state: { aviso: 'Bloqueio excluído. O horário está livre de novo.' } });
  }

  return (
    <>
      <BarraSuperior titulo="Bloqueio" voltarPara={VOLTAR} />
      <dl className="flex flex-col gap-4">
        <div>
          <dt className="text-texto-suave">Quando</dt>
          <dd className="text-secao first-letter:uppercase">
            {rotuloQuando(bloqueio)} · {rotuloHorario(bloqueio)}
          </dd>
        </div>
        <div>
          <dt className="text-texto-suave">Descrição</dt>
          <dd>{bloqueio.descricao || 'Sem descrição'}</dd>
        </div>
      </dl>
      <p className="mt-4 text-texto-suave">Para mudar, exclua e crie outro.</p>

      <section aria-labelledby="excluir" className="mt-8 border-t border-borda pt-6">
        <h2 id="excluir" className="sr-only">
          Excluir bloqueio
        </h2>
        {confirmando ? (
          <div className="flex flex-col gap-3">
            <p role="alert">
              Excluir este bloqueio? O horário volta a ficar livre para as clientes.
            </p>
            <Botao onClick={excluir}>Sim, excluir</Botao>
            <Botao variante="secundario" onClick={() => setConfirmando(false)}>
              Não, manter
            </Botao>
          </div>
        ) : (
          <Botao variante="secundario" className="w-full" onClick={() => setConfirmando(true)}>
            Excluir bloqueio
          </Botao>
        )}
      </section>
    </>
  );
}
