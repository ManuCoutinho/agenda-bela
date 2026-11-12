import { useState, type ReactNode } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import FormularioPedido from '../../componentes/FormularioPedido';
import Icone from '../../componentes/Icone';
import { ESTILO_BOTAO, ESTILO_ITEM_LISTA, ESTILO_LISTA } from '../../componentes/estilos';
import { idsTravas, inicioEm, rotuloDia, rotuloDiaCurto, rotuloHora } from '../../dominio/agenda';
import { diasAbertos, type RegrasHorario } from '../../dominio/horariosLivres';
import { HorarioJaPedido, textoAvisoPedido, type DadosPedido } from '../../dominio/pedidos';
import { formatarDuracao, formatarPreco, type Servico } from '../../dominio/servicos';
import { linkWhatsApp } from '../../dominio/whatsapp';
import { useHorariosLivres } from '../../hooks/useHorariosLivres';
import { usePaginaPublica } from '../../hooks/usePaginaPublica';
import type { PaginaPublica } from '../../servicos/configPublica';
import { reservar, SemInternet } from '../../servicos/pedidos';
import PaginaNaoEncontrada from '../PaginaNaoEncontrada';

const ESTILO_CHIP =
  'flex min-h-12 flex-col items-center justify-center rounded-lg border border-borda-campo bg-superficie px-2 py-2 text-texto hover:bg-marca-suave active:bg-marca-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca';

const quando = (dia: string, hora: string) => `${rotuloDia(dia)}, às ${rotuloHora(hora)}`;

/** RF08: página pública `/agendar/:slug`, sem login. */
export default function Agendar() {
  const { slug } = useParams();
  const { pagina, carregando, erro } = usePaginaPublica();

  if (carregando) {
    return (
      <p role="status" className="p-6 text-center text-texto-suave">
        Carregando agenda…
      </p>
    );
  }
  if (erro) {
    return (
      <p role="alert" className="p-6 text-center text-erro">
        Não foi possível abrir a agenda. Confira a internet e tente de novo.
      </p>
    );
  }
  if (!pagina || !pagina.config.slug || pagina.config.slug !== slug) {
    return <PaginaNaoEncontrada />;
  }
  return <Passos pagina={pagina} />;
}

type Enviado = { nome: string; servico: string; dia: string; hora: string };

function Passos({ pagina }: { pagina: PaginaPublica }) {
  const { config } = pagina;
  const [busca, setBusca] = useSearchParams();
  const { pathname } = useLocation();
  const [aviso, setAviso] = useState<string>();
  const [erroEnvio, setErroEnvio] = useState<string>();
  const [enviado, setEnviado] = useState<Enviado>();

  const regras: RegrasHorario = { ...config, recorrentes: pagina.recorrentes };
  const servicos = pagina.servicos.filter((s) => s.publico);
  const servico = servicos.find((s) => s.id === busca.get('servico'));
  const dias = diasAbertos(regras, new Date());
  const diaPedido = busca.get('dia') ?? '';
  const dia = servico && dias.includes(diaPedido) ? diaPedido : undefined;
  const hora = dia ? (busca.get('hora') ?? undefined) : undefined;
  const { horarios, carregando, erro } = useHorariosLivres(dia ?? '', servico?.duracaoMin, regras);

  const titulo = config.nome || 'Agendar horário';
  const ir = (params: Record<string, string>) => {
    setAviso(undefined);
    setErroEnvio(undefined);
    setBusca(params);
  };

  async function pedir(dados: DadosPedido) {
    if (!servico || !dia || !hora) return;
    setErroEnvio(undefined);
    const inicio = inicioEm(dia, hora);
    try {
      await reservar({
        ...dados,
        servicoId: servico.id,
        inicio,
        travas: idsTravas(inicio, servico.duracaoMin, config.intervaloMin),
      });
      setEnviado({ nome: dados.nome, servico: servico.nome, dia, hora });
    } catch (e) {
      if (e instanceof HorarioJaPedido) {
        setBusca({ servico: servico.id, dia });
        setAviso('Esse horário acabou de ser pedido por outra pessoa. Escolha outro.');
      } else if (e instanceof SemInternet) {
        setErroEnvio(
          'Sem internet no momento. Confira a conexão e toque de novo em Pedir horário.',
        );
      } else {
        console.error(e);
        setErroEnvio('Não foi possível enviar o pedido. Tente de novo em alguns minutos.');
      }
    }
  }

  if (pagina.pausa.ativa && !enviado) {
    return (
      <Moldura titulo={titulo} endereco={config.endereco}>
        <section aria-labelledby="pausada" className="flex flex-col gap-4">
          <h2 id="pausada" className="text-secao font-medium">
            Agendamentos pausados no momento
          </h2>
          <p>{pagina.pausa.aviso || 'Volte em breve para pedir seu horário.'}</p>
          {config.whatsapp && (
            <a
              href={linkWhatsApp(config.whatsapp, 'Oi! Vi que a agenda está pausada. ')}
              target="_blank"
              rel="noreferrer"
              className={ESTILO_BOTAO.secundario}
            >
              <Icone nome="conversa" />
              Falar no WhatsApp
            </a>
          )}
        </section>
      </Moldura>
    );
  }

  if (enviado) {
    return (
      <Moldura titulo={titulo}>
        <Confirmacao
          enviado={enviado}
          espaco={config.nome}
          whatsapp={config.whatsapp}
          aoPedirOutro={() => {
            setEnviado(undefined);
            ir({});
          }}
        />
      </Moldura>
    );
  }

  if (!servico) {
    return (
      <Moldura titulo={titulo} endereco={config.endereco}>
        <Passo numero={1} titulo="Escolha o serviço" />
        {servicos.length === 0 ? (
          <p className="text-texto-suave">
            Ainda não há serviços para agendar por aqui. Fale direto com {config.nome || 'o espaço'}
            .
          </p>
        ) : (
          <ul className={ESTILO_LISTA}>
            {servicos.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={ESTILO_ITEM_LISTA}
                  onClick={() => ir({ servico: s.id })}
                >
                  <ResumoServico servico={s} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Moldura>
    );
  }

  const voltarServico = pathname;
  const voltarDia = `${pathname}?servico=${servico.id}`;

  if (!dia) {
    return (
      <Moldura titulo={titulo} voltarPara={voltarServico}>
        <Passo numero={2} titulo="Escolha o dia" />
        <Escolhas servico={servico} />
        {dias.length === 0 ? (
          <p className="text-texto-suave">Não há dias abertos para agendar agora.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {dias.map((d) => {
              const curto = rotuloDiaCurto(d);
              return (
                <li key={d}>
                  <button
                    type="button"
                    className={`${ESTILO_CHIP} w-full`}
                    onClick={() => ir({ servico: servico.id, dia: d })}
                  >
                    <span aria-hidden="true" className="text-texto-suave">
                      {curto.semana}
                    </span>
                    <span aria-hidden="true" className="font-medium">
                      {curto.dia}
                    </span>
                    <span className="sr-only">{rotuloDia(d)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Moldura>
    );
  }

  if (!hora) {
    return (
      <Moldura titulo={titulo} voltarPara={voltarDia}>
        <Passo numero={3} titulo="Escolha o horário" />
        <Escolhas servico={servico} dia={dia} />
        {aviso && (
          <p role="alert" className="mb-4 text-erro">
            {aviso}
          </p>
        )}
        {carregando ? (
          <p role="status" className="text-texto-suave">
            Procurando horários livres…
          </p>
        ) : erro ? (
          <p role="alert" className="text-erro">
            Não foi possível ver os horários. Confira a internet e tente de novo.
          </p>
        ) : horarios.length === 0 ? (
          <p className="text-texto-suave">
            Nenhum horário livre neste dia.{' '}
            <button
              type="button"
              className="underline underline-offset-4 text-marca"
              onClick={() => ir({ servico: servico.id })}
            >
              Escolher outro dia
            </button>
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {horarios.map((h) => (
              <li key={h}>
                <button
                  type="button"
                  className={`${ESTILO_CHIP} w-full font-medium`}
                  onClick={() => ir({ servico: servico.id, dia, hora: h })}
                >
                  {rotuloHora(h)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Moldura>
    );
  }

  const aindaLivre = carregando || horarios.includes(hora);
  return (
    <Moldura titulo={titulo} voltarPara={`${voltarDia}&dia=${dia}`}>
      <Passo numero={4} titulo="Seus dados" />
      <Escolhas servico={servico} dia={dia} hora={hora} />
      {aindaLivre ? (
        <>
          <p className="mb-4 text-texto-suave">
            É um pedido: {config.nome || 'o espaço'} confirma pelo WhatsApp. O horário fica guardado
            para você por até 24 horas.
          </p>
          <FormularioPedido aoEnviar={pedir} erro={erroEnvio} />
        </>
      ) : (
        <p role="alert" className="text-erro">
          Esse horário não está mais livre.{' '}
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => ir({ servico: servico.id, dia })}
          >
            Escolher outro horário
          </button>
        </p>
      )}
    </Moldura>
  );
}

function Moldura({
  titulo,
  voltarPara,
  endereco,
  children,
}: {
  titulo: string;
  voltarPara?: string;
  endereco?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-md px-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <BarraSuperior titulo={titulo} voltarPara={voltarPara} />
      {endereco && <p className="mb-4 text-texto-suave">{endereco}</p>}
      {children}
    </main>
  );
}

function Passo({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <div className="mb-4">
      <p className="text-texto-suave">Passo {numero} de 4</p>
      <h2 className="text-secao font-medium">{titulo}</h2>
    </div>
  );
}

function ResumoServico({ servico }: { servico: Servico }) {
  return (
    <span className="flex flex-1 flex-col text-left">
      <span>{servico.nome}</span>
      <span className="text-texto-suave">
        {formatarDuracao(servico.duracaoMin)} · {formatarPreco(servico.precoCentavos)}
      </span>
    </span>
  );
}

/** O que a cliente já escolheu, para ela conferir a cada passo. */
function Escolhas({ servico, dia, hora }: { servico: Servico; dia?: string; hora?: string }) {
  return (
    <dl className="mb-4 rounded-xl border border-borda bg-superficie px-4 py-3">
      <dt className="sr-only">Serviço</dt>
      <dd className="font-medium">{servico.nome}</dd>
      <dd className="text-texto-suave">
        {formatarDuracao(servico.duracaoMin)} · {formatarPreco(servico.precoCentavos)}
      </dd>
      {dia && (
        <>
          <dt className="sr-only">Quando</dt>
          <dd className="mt-1 first-letter:uppercase">
            {hora ? quando(dia, hora) : rotuloDia(dia)}
          </dd>
        </>
      )}
    </dl>
  );
}

function Confirmacao({
  enviado,
  espaco,
  whatsapp,
  aoPedirOutro,
}: {
  enviado: Enviado;
  espaco: string;
  whatsapp: string;
  aoPedirOutro: () => void;
}) {
  const texto = textoAvisoPedido({
    nome: enviado.nome,
    servico: enviado.servico,
    quando: quando(enviado.dia, enviado.hora),
  });
  return (
    <section aria-labelledby="enviado" className="flex flex-col gap-6 pt-4 text-center">
      <span className="mx-auto inline-flex size-24 items-center justify-center rounded-full bg-marca-suave text-marca">
        <Icone nome="confirmado" className="size-12" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 id="enviado" className="text-titulo font-normal">
          Pedido enviado!
        </h2>
        <p className="first-letter:uppercase">
          {enviado.servico}: {quando(enviado.dia, enviado.hora)}.
        </p>
        <p className="text-texto-suave">
          {espaco || 'O espaço'} vai confirmar pelo WhatsApp. O horário fica guardado por até 24
          horas.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {whatsapp && (
          <a
            href={linkWhatsApp(whatsapp, texto)}
            target="_blank"
            rel="noreferrer"
            className={ESTILO_BOTAO.principal}
          >
            <Icone nome="conversa" />
            Avisar no WhatsApp
          </a>
        )}
        <Botao variante="secundario" onClick={aoPedirOutro}>
          Pedir outro horário
        </Botao>
      </div>
    </section>
  );
}
