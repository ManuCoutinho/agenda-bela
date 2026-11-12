import { horariosLivres, type RegrasHorario } from '../dominio/horariosLivres';
import { useOcupados } from './useAgenda';

const NENHUM: string[] = [];

/**
 * Horários (HHmm) que a cliente pode pedir no dia (AAAA-MM-DD), em tempo real:
 * quando alguém trava um horário, ele some da lista. Sem dia ou sem serviço
 * escolhido, devolve a lista vazia sem consultar nada.
 */
export function useHorariosLivres(
  data: string,
  duracaoMin: number | undefined,
  regras: RegrasHorario | undefined,
) {
  const pronto = Boolean(data && duracaoMin && regras);
  const { dados: ocupados, carregando, erro } = useOcupados(pronto ? data : '');
  if (!pronto || !duracaoMin || !regras)
    return { horarios: NENHUM, carregando: false, erro: false };
  return {
    horarios: horariosLivres({ data, duracaoMin, regras, ocupados, agora: new Date() }),
    carregando,
    erro,
  };
}
