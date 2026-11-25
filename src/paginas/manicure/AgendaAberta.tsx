import { useState } from 'react';
import BarraSuperior from '../../componentes/BarraSuperior';
import Carregando from '../../componentes/Carregando';
import Icone from '../../componentes/Icone';
import { ESTILO_BOTAO, ESTILO_ITEM_LISTA, ESTILO_LISTA } from '../../componentes/estilos';
import { inicioEm, rotuloInicio } from '../../dominio/agenda';
import { proximosMeses, rotuloMes, type Mes } from '../../dominio/agendaAberta';
import { linkWhatsApp, textoRemarcacao } from '../../dominio/whatsapp';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { useMesesAbertos } from '../../hooks/useMesesAbertos';
import { useServicos } from '../../hooks/useServicos';
import { salvarMesesAbertos } from '../../servicos/configPublica';
import { reservarSeriesNoMes, SemPermissao, type DataSemHorario } from '../../servicos/series';

/**
 * I06: a manicure escolhe em quais meses as clientes podem pedir horário.
 * I11: ao abrir um mês, os horários fixos são reservados antes.
 */
export default function AgendaAberta() {
  const { meses, carregando, erro } = useMesesAbertos();
  const { servicos } = useServicos();
  const { config } = useConfiguracoes();
  const [abrindo, setAbrindo] = useState<Mes>();
  const [semHorario, setSemHorario] = useState<DataSemHorario[]>([]);
  const [erroAbrir, setErroAbrir] = useState<string>();

  async function alternar(mes: Mes, aberto: boolean) {
    setErroAbrir(undefined);
    if (!aberto) {
      salvarMesesAbertos(meses.filter((m) => m !== mes));
      return;
    }
    setAbrindo(mes);
    try {
      const faltou = await reservarSeriesNoMes(mes, servicos, config.intervaloMin);
      setSemHorario(faltou);
      salvarMesesAbertos([...meses, mes]);
    } catch (e) {
      console.error(e);
      setErroAbrir(
        e instanceof SemPermissao
          ? `Não foi possível abrir ${rotuloMes(mes)}: esta versão do app ainda não foi liberada no servidor. Avise quem cuida do app.`
          : `Não foi possível abrir ${rotuloMes(mes)}. Confira a internet e tente de novo.`,
      );
    } finally {
      setAbrindo(undefined);
    }
  }

  return (
    <>
      <BarraSuperior titulo="Agenda aberta" voltarPara="/mais" />
      <p className="mb-4 text-texto-suave">
        As clientes só conseguem pedir horário nos meses abertos. Ao abrir um mês, os horários fixos
        são reservados primeiro. Fechar um mês não cancela o que já está marcado.
      </p>
      {abrindo !== undefined && (
        <p role="status" className="mb-4">
          Reservando os horários fixos de {rotuloMes(abrindo)}…
        </p>
      )}
      {erroAbrir && (
        <p role="alert" className="mb-4 text-erro">
          {erroAbrir}
        </p>
      )}
      {semHorario.length > 0 && (
        <section
          aria-labelledby="sem-horario"
          className="mb-6 flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4"
        >
          <h2 id="sem-horario" className="text-secao font-medium">
            Horários fixos que não couberam
          </h2>
          <p>Estas datas já estavam ocupadas. Combine outro horário com a cliente:</p>
          <ul className="flex flex-col gap-3">
            {semHorario.map(({ serie, data }) => {
              const quando = rotuloInicio(inicioEm(data, serie.hora));
              return (
                <li key={`${serie.id}-${data}`} className="flex flex-col gap-2">
                  <span className="first-letter:uppercase">
                    {serie.nome}: {quando}
                  </span>
                  <a
                    href={linkWhatsApp(
                      serie.whatsapp,
                      textoRemarcacao({ nome: serie.nome, quando }),
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className={ESTILO_BOTAO.secundario}
                  >
                    <Icone nome="conversa" />
                    Avisar {serie.nome} no WhatsApp
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {carregando ? (
        <Carregando texto="Carregando meses…" />
      ) : erro ? (
        <p role="alert" className="text-erro">
          Não foi possível carregar. Confira a internet e tente de novo.
        </p>
      ) : (
        <ul className={ESTILO_LISTA}>
          {proximosMeses(new Date()).map((mes) => {
            const aberto = meses.includes(mes);
            const id = `mes-${mes}`;
            return (
              <li key={mes}>
                <label
                  htmlFor={id}
                  aria-label={rotuloMes(mes)}
                  className={`${ESTILO_ITEM_LISTA} cursor-pointer`}
                >
                  <span className="flex flex-1 flex-col">
                    <span className="font-medium first-letter:uppercase">{rotuloMes(mes)}</span>
                    <span className="text-texto-suave">
                      {aberto ? 'Aberto para as clientes' : 'Fechado'}
                    </span>
                  </span>
                  <input
                    id={id}
                    type="checkbox"
                    role="switch"
                    checked={aberto}
                    disabled={abrindo !== undefined}
                    onChange={(e) => void alternar(mes, e.target.checked)}
                    className="size-6 shrink-0 accent-marca"
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
