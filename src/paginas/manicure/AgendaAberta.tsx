import BarraSuperior from '../../componentes/BarraSuperior';
import Carregando from '../../componentes/Carregando';
import { ESTILO_ITEM_LISTA, ESTILO_LISTA } from '../../componentes/estilos';
import { proximosMeses, rotuloMes, type Mes } from '../../dominio/agendaAberta';
import { useMesesAbertos } from '../../hooks/useMesesAbertos';
import { salvarMesesAbertos } from '../../servicos/configPublica';

/** I06: a manicure escolhe em quais meses as clientes podem pedir horário. */
export default function AgendaAberta() {
  const { meses, carregando, erro } = useMesesAbertos();

  function alternar(mes: Mes, aberto: boolean) {
    salvarMesesAbertos(aberto ? [...meses, mes] : meses.filter((m) => m !== mes));
  }

  return (
    <>
      <BarraSuperior titulo="Agenda aberta" voltarPara="/mais" />
      <p className="mb-4 text-texto-suave">
        As clientes só conseguem pedir horário nos meses abertos. Fechar um mês não cancela o que já
        está marcado.
      </p>
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
                    onChange={(e) => alternar(mes, e.target.checked)}
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
