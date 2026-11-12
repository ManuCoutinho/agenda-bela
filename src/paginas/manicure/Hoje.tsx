import { useState } from 'react';
import Aviso from '../../componentes/Aviso';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import Fab from '../../componentes/Fab';
import Icone from '../../componentes/Icone';
import LinkBotao from '../../componentes/LinkBotao';
import ListaDoDia from '../../componentes/ListaDoDia';
import { agruparPorDia, dataDoDia, diaDaSemana, rotuloDia } from '../../dominio/agenda';
import { bloqueiosDoDia, restoDoDia, travasDoIntervalo } from '../../dominio/bloqueios';
import { expedienteDoDia } from '../../dominio/configuracoes';
import { useAgendamentos } from '../../hooks/useAgenda';
import { useAviso } from '../../hooks/useAviso';
import { useBloqueios } from '../../hooks/useBloqueios';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { useLembretes } from '../../hooks/useLembretes';
import { bloquearHorario } from '../../servicos/bloqueios';
import PedidosPendentes from './PedidosPendentes';

export default function Hoje() {
  const agora = new Date();
  const hoje = dataDoDia(agora);
  const { dados, carregando, erro } = useAgendamentos(hoje, 1);
  const { bloqueios } = useBloqueios();
  const { config } = useConfiguracoes();
  const lembretes = useLembretes();
  const avisoDaNavegacao = useAviso();
  const [avisoLocal, setAvisoLocal] = useState<string>();
  const [confirmando, setConfirmando] = useState(false);
  const [bloqueando, setBloqueando] = useState(false);
  const [erroBloqueio, setErroBloqueio] = useState<string>();

  const resto = restoDoDia(agora, expedienteDoDia(config.expediente, diaDaSemana(hoje)));

  async function bloquearResto() {
    if (!resto) return;
    setBloqueando(true);
    setErroBloqueio(undefined);
    try {
      const n = await bloquearHorario(
        {
          ...resto,
          descricao: 'Resto do dia',
          travas: travasDoIntervalo(resto.data, resto.ini, resto.fim),
        },
        true,
      );
      setConfirmando(false);
      setAvisoLocal(
        n > 0
          ? `Bloqueado das ${resto.ini} às ${resto.fim}. Para liberar, toque no bloqueio.`
          : 'Não havia horário livre para bloquear.',
      );
    } catch (e) {
      console.error(e);
      setErroBloqueio('Não foi possível bloquear. Confira a internet e tente de novo.');
    } finally {
      setBloqueando(false);
    }
  }

  return (
    <>
      <BarraSuperior titulo="Hoje" />
      <p className="mb-4 text-texto-suave first-letter:uppercase">{rotuloDia(hoje)}</p>
      <PedidosPendentes />
      {lembretes.pendentes > 0 && (
        <section
          aria-label="Lembretes de amanhã"
          className="mb-6 flex flex-col gap-3 rounded-xl bg-marca-suave p-4"
        >
          <p className="text-marca-escura">
            {lembretes.atendimentos.length === 1
              ? 'Amanhã você tem 1 atendimento.'
              : `Amanhã você tem ${lembretes.atendimentos.length} atendimentos.`}{' '}
            {lembretes.pendentes === 1
              ? 'Falta 1 lembrete.'
              : `Faltam ${lembretes.pendentes} lembretes.`}
          </p>
          <LinkBotao to="/lembretes">
            <Icone nome="conversa" />
            Enviar lembretes
          </LinkBotao>
        </section>
      )}
      {carregando ? (
        <p role="status" className="text-texto-suave">
          Carregando agenda…
        </p>
      ) : erro ? (
        <p role="alert" className="text-erro">
          Não foi possível carregar a agenda. Confira a internet e tente de novo.
        </p>
      ) : (
        <ListaDoDia
          agendamentos={agruparPorDia(dados).get(hoje) ?? []}
          bloqueios={bloqueiosDoDia(bloqueios, hoje)}
          vazio="Nenhum atendimento marcado para hoje."
        />
      )}

      {resto && !carregando && !erro && (
        <section aria-label="Bloquear o resto do dia" className="mt-6">
          {confirmando ? (
            <div className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4">
              <p>
                Bloquear das {resto.ini} às {resto.fim}? As clientes não vão conseguir pedir horário
                hoje. Os atendimentos já marcados continuam.
              </p>
              {erroBloqueio && (
                <p role="alert" className="text-erro">
                  {erroBloqueio}
                </p>
              )}
              <Botao onClick={bloquearResto} disabled={bloqueando}>
                {bloqueando ? 'Bloqueando…' : 'Sim, bloquear'}
              </Botao>
              <Botao variante="secundario" onClick={() => setConfirmando(false)}>
                Não bloquear
              </Botao>
            </div>
          ) : (
            <Botao variante="secundario" className="w-full" onClick={() => setConfirmando(true)}>
              Bloquear o resto do dia
            </Botao>
          )}
        </section>
      )}

      <Fab to={`/atendimentos/novo?data=${hoje}`} rotulo="Novo atendimento" />
      <Aviso texto={avisoLocal ?? avisoDaNavegacao} />
    </>
  );
}
