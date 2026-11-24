import type { Agendamento } from './agenda';

/** I10: o próximo atendimento marcado (futuro) da cliente, pelo WhatsApp. */
export const proximoHorario = (
  agendamentos: readonly Agendamento[],
  whatsapp: string,
  agora: Date,
): Agendamento | undefined =>
  agendamentos
    .filter((a) => a.clienteWhatsapp === whatsapp && a.status === 'marcado' && a.inicio > agora)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())[0];
