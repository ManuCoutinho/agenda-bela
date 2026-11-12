import { useSearchParams } from 'react-router';
import BarraSuperior from '../../componentes/BarraSuperior';
import Icone from '../../componentes/Icone';
import { ESTILO_BOTAO_ICONE } from '../../componentes/estilos';
import {
  diasDoMes,
  mesDe,
  mesValido,
  passarMes,
  resumoDoMes,
  rotuloMes,
} from '../../dominio/painel';
import { formatarPreco } from '../../dominio/servicos';
import { useAgendamentos } from '../../hooks/useAgenda';
import { useServicos } from '../../hooks/useServicos';

/** RF13: `/mais/painel?mes=AAAA-MM` – como foi o mês. */
export default function Painel() {
  const [busca, setBusca] = useSearchParams();
  const pedido = busca.get('mes');
  const mes = mesValido(pedido) ? pedido : mesDe(new Date());
  const { primeiroDia, dias } = diasDoMes(mes);
  const { dados, carregando, erro } = useAgendamentos(primeiroDia, dias);
  const { servicos } = useServicos();
  const r = resumoDoMes(dados, servicos);

  const numeros = [
    { rotulo: 'Realizados', valor: String(r.realizados) },
    { rotulo: 'Faltas', valor: String(r.faltas) },
    { rotulo: 'Cancelados', valor: String(r.cancelados) },
    {
      rotulo: 'Taxa de faltas',
      valor: r.taxaFaltas === null ? '–' : `${Math.round(r.taxaFaltas * 100)}%`,
    },
  ];

  return (
    <>
      <BarraSuperior titulo="Painel do mês" voltarPara="/mais" />
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className={ESTILO_BOTAO_ICONE}
          aria-label="Mês anterior"
          onClick={() => setBusca({ mes: passarMes(mes, -1) })}
        >
          <Icone nome="anterior" />
        </button>
        <h2 className="text-secao font-medium first-letter:uppercase" aria-live="polite">
          {rotuloMes(mes)}
        </h2>
        <button
          type="button"
          className={ESTILO_BOTAO_ICONE}
          aria-label="Próximo mês"
          onClick={() => setBusca({ mes: passarMes(mes, 1) })}
        >
          <Icone nome="proximo" />
        </button>
      </div>

      {carregando ? (
        <p role="status" className="text-texto-suave">
          Carregando…
        </p>
      ) : erro ? (
        <p role="alert" className="text-erro">
          Não foi possível carregar o mês. Confira a internet e tente de novo.
        </p>
      ) : (
        <>
          <dl className="mb-4 rounded-xl border border-borda bg-superficie p-4">
            <dt className="text-texto-suave">Recebido (realizados)</dt>
            <dd className="text-titulo">{formatarPreco(r.faturadoCentavos)}</dd>
            {r.semResultado > 0 && (
              <>
                <dt className="mt-3 text-texto-suave">
                  Ainda marcados ({r.semResultado}): previsto
                </dt>
                <dd>{formatarPreco(r.previstoCentavos)}</dd>
              </>
            )}
          </dl>

          <dl className="mb-6 grid grid-cols-2 gap-3">
            {numeros.map((n) => (
              <div key={n.rotulo} className="rounded-xl border border-borda bg-superficie p-4">
                <dt className="text-texto-suave">{n.rotulo}</dt>
                <dd className="text-titulo">{n.valor}</dd>
              </div>
            ))}
          </dl>

          <h2 className="mb-3 text-secao font-medium">Serviços realizados</h2>
          {r.porServico.length === 0 ? (
            <p className="text-texto-suave">
              Nenhum atendimento registrado como realizado neste mês. Abra o atendimento depois do
              horário e toque em “Atendimento realizado”.
            </p>
          ) : (
            <table className="w-full overflow-hidden rounded-xl border border-borda bg-superficie">
              <thead>
                <tr className="text-left text-texto-suave">
                  <th scope="col" className="px-4 py-2 font-normal">
                    Serviço
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-normal">
                    Qtd.
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-normal">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {r.porServico.map((s) => (
                  <tr key={s.nome}>
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      {s.nome}
                    </th>
                    <td className="px-2 py-3 text-right tabular-nums">{s.quantidade}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatarPreco(s.totalCentavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {r.semResultado > 0 && (
            <p className="mt-4 text-texto-suave">
              Os atendimentos que já passaram e continuam como marcados não entram no recebido. Abra
              cada um e registre se foi realizado ou falta.
            </p>
          )}
        </>
      )}
    </>
  );
}
