import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import FormularioBloqueio from '../../componentes/FormularioBloqueio';
import { ESTILO_LINK } from '../../componentes/estilos';
import { dataDoDia, diaDaSemana, HorarioOcupado } from '../../dominio/agenda';
import {
  paraRecorrentesPublicos,
  rotuloHorario,
  rotuloQuando,
  travasDoIntervalo,
  type DadosBloqueio,
} from '../../dominio/bloqueios';
import { useBloqueios } from '../../hooks/useBloqueios';
import {
  bloquearHorario,
  excluirBloqueio,
  salvarBloqueioRecorrente,
} from '../../servicos/bloqueios';

const VOLTAR = '/mais/bloqueios';

/** `/mais/bloqueios/novo?data=AAAA-MM-DD` cria; `/mais/bloqueios/:id` mostra e exclui. */
export default function EditarBloqueio() {
  const { id } = useParams();
  const [busca] = useSearchParams();
  const navegar = useNavigate();
  const { bloqueios, carregando, erro } = useBloqueios();
  const [erroEnvio, setErroEnvio] = useState<string>();
  const [confirmando, setConfirmando] = useState(false);

  async function salvar(d: DadosBloqueio) {
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
      await bloquearHorario({
        data: d.data,
        ini: d.ini,
        fim: d.fim,
        descricao: d.descricao,
        travas: travasDoIntervalo(d.data, d.ini, d.fim),
      });
      navegar(VOLTAR, { state: { aviso: `Horário bloqueado: ${quando}.` } });
    } catch (e) {
      if (e instanceof HorarioOcupado) {
        setErroEnvio(
          'Já há atendimento ou pedido nesse horário. Escolha outro horário ou remarque o atendimento antes.',
        );
      } else {
        console.error(e);
        setErroEnvio('Não foi possível salvar. Confira a internet e tente de novo.');
      }
    }
  }

  if (!id) {
    const pedida = busca.get('data') ?? '';
    const data = /^\d{4}-\d{2}-\d{2}$/.test(pedida) ? pedida : dataDoDia(new Date());
    return (
      <>
        <BarraSuperior titulo="Novo bloqueio" voltarPara={VOLTAR} />
        <FormularioBloqueio
          inicial={{
            tipo: 'pontual',
            data,
            dia: String(diaDaSemana(data)),
            ini: '09:00',
            fim: '10:00',
            descricao: '',
          }}
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
