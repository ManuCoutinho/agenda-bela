import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import Calendario from '../../componentes/Calendario';
import FormularioPedido from '../../componentes/FormularioPedido';
import Icone from '../../componentes/Icone';
import Carregando from '../../componentes/Carregando';
import {
  ESTILO_BOTAO,
  ESTILO_BOTAO_ICONE,
  ESTILO_FOLHA,
  ESTILO_ITEM_LISTA,
  ESTILO_LISTA,
} from '../../componentes/estilos';
import { dataDoDia, idsTravas, inicioEm, rotuloDia, rotuloHora } from '../../dominio/agenda';
import { tituloDoMes, type MarcasDoDia } from '../../dominio/calendario';
import { linkInstagram } from '../../dominio/configuracoes';
import {
  diasAbertos,
  diasComHorario,
  horariosLivres,
  type RegrasHorario,
} from '../../dominio/horariosLivres';
import { HorarioJaPedido, textoAvisoPedido, type DadosPedido } from '../../dominio/pedidos';
import {
  arquivoIcs,
  linkArquivoIcs,
  linkGoogleAgenda,
  tituloEvento,
  type EventoAgenda,
} from '../../dominio/salvarNaAgenda';
import { formatarDuracao, formatarPreco, type Servico } from '../../dominio/servicos';
import { linkWhatsApp } from '../../dominio/whatsapp';
import { useOcupadosNoPeriodo } from '../../hooks/useAgenda';
import { usePaginaPublica } from '../../hooks/usePaginaPublica';
import type { PaginaPublica } from '../../servicos/configPublica';
import { reservar, reservarSerie, SemInternet, type FalhaSerie } from '../../servicos/pedidos';
import { datasDaSerie } from '../../dominio/series';
import PaginaNaoEncontrada from '../PaginaNaoEncontrada';

const ESTILO_CHIP =
  'flex min-h-12 flex-col items-center justify-center rounded-lg border border-borda-campo bg-superficie px-2 py-2 text-texto hover:bg-marca-suave active:bg-marca-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca';

const SEM_MARCAS: ReadonlyMap<string, MarcasDoDia> = new Map();

const MOTIVO_FALHA: Record<FalhaSerie['motivo'], string> = {
  ocupado: 'já estava ocupado',
  'sem-internet': 'a internet caiu',
  erro: 'não foi possível agora',
};

const quando = (dia: string, hora: string) => `${rotuloDia(dia)}, às ${rotuloHora(hora)}`;

/** RF08: página pública `/agendar/:slug`, sem login. */
export default function Agendar() {
  const { slug } = useParams();
  const { pagina, carregando, erro } = usePaginaPublica();

  if (carregando) {
    return <Carregando texto="Carregando agenda…" telaCheia />;
  }
  if (erro) {
    return (
      <p role="alert" className="m-4 rounded-3xl bg-fundo p-6 text-center text-erro">
        Não foi possível abrir a agenda. Confira a internet e tente de novo.
      </p>
    );
  }
  if (!pagina || !pagina.config.slug || pagina.config.slug !== slug) {
    return <PaginaNaoEncontrada />;
  }
  return <Passos pagina={pagina} />;
}

type Enviado = {
  nome: string;
  servico: Servico;
  hora: string;
  /** Datas reservadas (uma, ou as do horário fixo). */
  dias: string[];
  /** Horário fixo: datas que não deram certo. */
  falhas: FalhaSerie[];
};

function Passos({ pagina }: { pagina: PaginaPublica }) {
  const { config } = pagina;
  const [busca, setBusca] = useSearchParams();
  const { pathname } = useLocation();
  const [aviso, setAviso] = useState<string>();
  const [erroEnvio, setErroEnvio] = useState<string>();
  const [enviado, setEnviado] = useState<Enviado>();

  const regras: RegrasHorario = {
    ...config,
    recorrentes: pagina.recorrentes,
    mesesAbertos: pagina.mesesAbertos,
  };
  const servicos = pagina.servicos.filter((s) => s.publico);
  const servico = servicos.find((s) => s.id === busca.get('servico'));
  const agora = new Date();
  const dias = diasAbertos(regras, agora);
  const diaPedido = busca.get('dia') ?? '';
  const dia = servico && dias.includes(diaPedido) ? diaPedido : undefined;
  const hora = dia ? (busca.get('hora') ?? undefined) : undefined;

  // I07: o calendário mostra um mês por vez e lê só as travas desse mês
  const meses = [...new Set(dias.map((d) => d.slice(0, 7)))];
  const mesPedido = busca.get('mes') ?? '';
  const mes = dia ? dia.slice(0, 7) : meses.includes(mesPedido) ? mesPedido : meses[0];
  const diasDoMes = mes ? dias.filter((d) => d.startsWith(mes)) : [];
  const ocupados = useOcupadosNoPeriodo(
    servico ? (diasDoMes[0] ?? '') : '',
    servico ? (diasDoMes.at(-1) ?? '') : '',
  );
  const { carregando, erro } = ocupados;
  const livres =
    servico && !carregando
      ? diasComHorario({
          dias: diasDoMes,
          duracaoMin: servico.duracaoMin,
          regras,
          ocupadosPorDia: ocupados.dados,
          agora,
        })
      : [];
  const horarios =
    servico && dia
      ? horariosLivres({
          data: dia,
          duracaoMin: servico.duracaoMin,
          regras,
          ocupados: ocupados.dados.get(dia) ?? new Set<string>(),
          agora,
        })
      : [];
  const proximoMes = mes ? meses[meses.indexOf(mes) + 1] : undefined;
  const mesSemHorario = Boolean(servico && !dia && !carregando && !erro && livres.length === 0);

  // mês inteiro sem horário: abre o seguinte, se ela não escolheu o mês
  useEffect(() => {
    if (mesSemHorario && !mesPedido && servico && proximoMes) {
      setBusca({ servico: servico.id, mes: proximoMes }, { replace: true });
    }
  }, [mesSemHorario, mesPedido, servico, proximoMes, setBusca]);

  const titulo = config.nome || 'Agendar horário';
  const base = { titulo, instagram: config.instagram };
  const ir = (params: Record<string, string>) => {
    setAviso(undefined);
    setErroEnvio(undefined);
    setBusca(params);
  };

  async function pedir(dados: DadosPedido) {
    if (!servico || !dia || !hora) return;
    setErroEnvio(undefined);
    const travasDe = (d: string) =>
      idsTravas(inicioEm(d, hora), servico.duracaoMin, config.intervaloMin);
    try {
      if (dados.repetir > 0) {
        const r = await reservarSerie({
          nome: dados.nome,
          whatsapp: dados.whatsapp,
          servicoId: servico.id,
          hora,
          frequenciaDias: dados.repetir,
          datas: datasDaSerie(dia, dados.repetir, regras.mesesAbertos, new Date()),
          travasDe,
        });
        if (r.reservadas.length === 0) throw new HorarioJaPedido();
        setEnviado({ nome: dados.nome, servico, hora, dias: r.reservadas, falhas: r.falhas });
        return;
      }
      await reservar({
        nome: dados.nome,
        whatsapp: dados.whatsapp,
        servicoId: servico.id,
        inicio: inicioEm(dia, hora),
        travas: travasDe(dia),
      });
      setEnviado({ nome: dados.nome, servico, hora, dias: [dia], falhas: [] });
    } catch (e) {
      if (e instanceof HorarioJaPedido) {
        setBusca({ servico: servico.id, dia });
        setAviso('Esse horário acabou de ser marcado por outra pessoa. Escolha outro.');
      } else if (e instanceof SemInternet) {
        setErroEnvio(
          'Sem internet no momento. Confira a conexão e toque de novo em Marcar horário.',
        );
      } else {
        console.error(e);
        setErroEnvio('Não foi possível enviar o pedido. Tente de novo em alguns minutos.');
      }
    }
  }

  if (pagina.pausa.ativa && !enviado) {
    return (
      <Moldura {...base} endereco={config.endereco}>
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
      <Moldura {...base}>
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
      <Moldura {...base} endereco={config.endereco}>
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
  const voltarDia = `${pathname}?servico=${servico.id}&mes=${mes ?? ''}`;

  if (!dia) {
    const indice = mes ? meses.indexOf(mes) : -1;
    const irParaMes = (passo: 1 | -1) => {
      const outro = meses[indice + passo];
      if (outro) ir({ servico: servico.id, mes: outro });
    };
    const titulos = mes ? tituloDoMes(`${mes}-01`) : null;
    const primeiroLivre = livres[0];
    return (
      <Moldura {...base} voltarPara={voltarServico}>
        <Passo numero={2} titulo="Escolha o dia" />
        <Escolhas servico={servico} />
        {!mes || !titulos ? (
          <p className="text-texto-suave">Não há dias abertos para agendar agora.</p>
        ) : (
          <>
            <nav aria-label="Trocar mês" className="mb-2 flex items-center gap-1">
              <h3 aria-live="polite" className="flex flex-1 flex-col-reverse">
                <span className="text-3xl font-semibold">{titulos.mes}</span>{' '}
                <span className="text-base text-texto-suave">{titulos.ano}</span>
              </h3>
              <button
                type="button"
                aria-label="Mês anterior"
                disabled={indice <= 0}
                onClick={() => irParaMes(-1)}
                className={`${ESTILO_BOTAO_ICONE} disabled:opacity-40`}
              >
                <Icone nome="anterior" />
              </button>
              <button
                type="button"
                aria-label="Próximo mês"
                disabled={!proximoMes}
                onClick={() => irParaMes(1)}
                className={`${ESTILO_BOTAO_ICONE} disabled:opacity-40`}
              >
                <Icone nome="proximo" />
              </button>
            </nav>
            {erro && (
              <p role="alert" className="mb-2 text-erro">
                Não foi possível ver os horários. Confira a internet e tente de novo.
              </p>
            )}
            <Calendario
              dia={`${mes}-01`}
              hoje={dataDoDia(agora)}
              marcas={SEM_MARCAS}
              habilitados={new Set(livres)}
              semSelecao
              aoEscolherDia={(d) => ir({ servico: servico.id, dia: d })}
              aoTrocarMes={irParaMes}
            />
            <div className="mt-4">
              {carregando ? (
                <p role="status" className="text-texto-suave">
                  Procurando dias com horário…
                </p>
              ) : primeiroLivre ? (
                <Botao
                  variante="secundario"
                  className="w-full"
                  onClick={() => ir({ servico: servico.id, dia: primeiroLivre })}
                >
                  <span className="first-letter:uppercase">
                    Próximo dia com horário: {rotuloDia(primeiroLivre)}
                  </span>
                </Botao>
              ) : (
                !erro && (
                  <p className="text-texto-suave">
                    Nenhum dia com horário neste mês
                    {proximoMes ? '. Veja o próximo mês.' : '.'}
                  </p>
                )
              )}
            </div>
          </>
        )}
      </Moldura>
    );
  }

  if (!hora) {
    return (
      <Moldura {...base} voltarPara={voltarDia}>
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
              onClick={() => ir({ servico: servico.id, mes: mes ?? '' })}
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
    <Moldura {...base} voltarPara={`${voltarDia}&dia=${dia}`}>
      <Passo numero={4} titulo="Seus dados" />
      <Escolhas servico={servico} dia={dia} hora={hora} />
      {aindaLivre ? (
        <>
          <p className="mb-4 text-texto-suave">
            Ao tocar em Marcar horário, ele já fica reservado para você.
          </p>
          <FormularioPedido
            aoEnviar={pedir}
            erro={erroEnvio}
            datasDaRepeticao={(r) => datasDaSerie(dia, r, regras.mesesAbertos, agora)}
          />
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
  instagram,
  voltarPara,
  endereco,
  children,
}: {
  titulo: string;
  instagram: string;
  voltarPara?: string;
  endereco?: string;
  children: ReactNode;
}) {
  return (
    <main className={`${ESTILO_FOLHA} pb-[calc(2rem+env(safe-area-inset-bottom))]`}>
      <BarraSuperior
        titulo={titulo}
        voltarPara={voltarPara}
        acao={
          instagram && (
            <a
              href={linkInstagram(instagram)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Ver o Instagram de ${titulo}`}
              className={ESTILO_BOTAO_ICONE}
            >
              <Icone nome="instagram" />
            </a>
          )
        }
      />
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
  const { servico, dias, hora, falhas } = enviado;
  const [primeiro] = dias as [string, ...string[]];
  const fixo = dias.length + falhas.length > 1;
  const texto = textoAvisoPedido({
    nome: enviado.nome,
    servico: servico.nome,
    quando: fixo ? `${quando(primeiro, hora)} (horário fixo)` : quando(primeiro, hora),
  });
  const eventos: EventoAgenda[] = dias.map((d) => {
    const inicio = inicioEm(d, hora);
    return {
      id: `${d}_${hora}_${servico.id}`,
      titulo: tituloEvento(espaco),
      inicio,
      fim: new Date(inicio.getTime() + servico.duracaoMin * 60_000),
      detalhes: `${servico.nome} (${formatarDuracao(servico.duracaoMin)})`,
    };
  });
  const [evento] = eventos as [EventoAgenda, ...EventoAgenda[]];
  return (
    <section aria-labelledby="enviado" className="flex flex-col gap-6 pt-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="inline-flex size-24 items-center justify-center rounded-full bg-marca-suave text-marca">
          <Icone nome="confirmado" className="size-12" />
        </span>
        <h2 id="enviado" className="text-titulo font-normal">
          Horário marcado!
        </h2>
      </div>
      <dl className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-4">
        <div>
          <dt className="text-texto-suave">Serviço</dt>
          <dd className="font-medium">
            {servico.nome} ({formatarDuracao(servico.duracaoMin)})
          </dd>
        </div>
        <div>
          <dt className="text-texto-suave">{fixo ? 'Horário fixo' : 'Quando'}</dt>
          {dias.map((d) => (
            <dd key={d} className="font-medium first-letter:uppercase">
              {quando(d, hora)}
            </dd>
          ))}
        </div>
        {servico.precoCentavos > 0 && (
          <div>
            <dt className="text-texto-suave">Valor</dt>
            <dd className="font-medium">{formatarPreco(servico.precoCentavos)}</dd>
          </div>
        )}
      </dl>
      {falhas.length > 0 && (
        <section
          aria-labelledby="sem-reserva"
          className="rounded-xl border border-borda bg-superficie p-4"
        >
          <h3 id="sem-reserva" className="font-medium">
            Não deu para reservar:
          </h3>
          <ul className="mt-2 flex flex-col gap-1">
            {falhas.map((f) => (
              <li key={f.data} className="first-letter:uppercase">
                {quando(f.data, hora)}: {MOTIVO_FALHA[f.motivo]}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-texto-suave">
            Se quiser outro horário nesses dias, fale com {espaco || 'o espaço'} no WhatsApp.
          </p>
        </section>
      )}
      <p>{espaco || 'O espaço'} manda a confirmação pelo WhatsApp e, na véspera, um lembrete.</p>
      <section aria-labelledby="salvar" className="flex flex-col gap-3">
        <h3 id="salvar" className="text-secao font-medium">
          Salvar na minha agenda
        </h3>
        <a
          href={linkGoogleAgenda(evento)}
          target="_blank"
          rel="noreferrer"
          className={ESTILO_BOTAO.secundario}
        >
          <Icone nome="hoje" />
          {fixo ? 'Google Agenda (primeira data)' : 'Google Agenda'}
        </a>
        <a
          href={linkArquivoIcs(arquivoIcs(eventos, new Date()))}
          download="horario-marcado.ics"
          className={ESTILO_BOTAO.secundario}
        >
          <Icone nome="hoje" />
          {fixo ? 'Todas as datas (iPhone e outras agendas)' : 'iPhone e outras agendas'}
        </a>
      </section>
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
        <Botao variante="texto" onClick={aoPedirOutro}>
          Marcar outro horário
        </Botao>
      </div>
    </section>
  );
}
