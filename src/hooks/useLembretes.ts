import { useEffect } from 'react';
import { atendimentosDeAmanha, dataDoDia, somarDias } from '../dominio/agenda';
import { mostrarEmblema } from '../servicos/emblema';
import { useAgendamentos } from './useAgenda';

/**
 * RF11: atendimentos de amanhã e quantos ainda esperam o lembrete. O número
 * também vai para o ícone do app instalado.
 */
export function useLembretes() {
  const agora = new Date();
  const amanha = somarDias(dataDoDia(agora), 1);
  const { dados, carregando, erro } = useAgendamentos(amanha, 1);
  const atendimentos = atendimentosDeAmanha(dados, agora);
  const pendentes = atendimentos.filter((a) => !a.lembreteEnviado).length;

  useEffect(() => {
    if (!carregando && !erro) mostrarEmblema(pendentes);
  }, [pendentes, carregando, erro]);

  return { amanha, atendimentos, pendentes, carregando, erro };
}
