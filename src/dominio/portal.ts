import type { Agendamento } from './agenda';

/**
 * I13: um horário futuro da cliente em "Meus horários" (`portal/{chave}`).
 * Só o que ela mesma já sabe: dia, hora, serviço e situação.
 */
export type HorarioPortal = {
  /** Id do atendimento. */
  id: string;
  inicio: Date;
  servico: string;
  servicoId: string;
  duracaoMin: number;
  /** Travas do horário: a remarcação pela cliente libera exatamente estas (I14). */
  travas: string[];
  serieId?: string;
};

export type Portal = {
  whatsapp: string;
  nome: string;
  horarios: HorarioPortal[];
  /**
   * Pedidos que a dona já copiou para a agenda, mesmo os cancelados depois:
   * a cópia local deles no aparelho não vale mais. Falta nos portais antigos.
   */
  copiados?: string[];
};

/** Chave pessoal do aparelho: 24 letras e números aleatórios (impossível de adivinhar). */
export function gerarChave(aleatorio: (n: number) => Uint8Array): string {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(aleatorio(24), (b) => letras[b % letras.length]).join('');
}

/** Horários futuros marcados da cliente (pelo WhatsApp), do mais próximo ao mais distante. */
export function horariosDoPortal(
  agendamentos: readonly Agendamento[],
  whatsapp: string,
  agora: Date,
): HorarioPortal[] {
  return agendamentos
    .filter((a) => a.clienteWhatsapp === whatsapp && a.status === 'marcado' && a.inicio > agora)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
    .map((a) => ({
      id: a.id,
      inicio: a.inicio,
      servico: a.servicoNome,
      servicoId: a.servicoId,
      duracaoMin: a.duracaoMin,
      travas: a.travas,
      ...(a.serieId ? { serieId: a.serieId } : {}),
    }));
}

/** Pedidos da cliente que já viraram atendimento, em qualquer situação. */
export function pedidosCopiados(agendamentos: readonly Agendamento[], whatsapp: string): string[] {
  return agendamentos
    .filter((a) => a.clienteWhatsapp === whatsapp && a.pedidoId)
    .map((a) => a.pedidoId as string)
    .sort();
}

/**
 * Junta o que o servidor sabe (`portal`) com o que este aparelho acabou de
 * marcar e o app da manicure ainda não copiou. Mesma data e hora = o mesmo.
 */
export function juntarHorarios(
  doServidor: readonly HorarioPortal[],
  locais: readonly HorarioPortal[],
  agora: Date,
  copiados: readonly string[] = [],
): HorarioPortal[] {
  const vistos = new Set(doServidor.map((h) => h.inicio.getTime()));
  const novos = locais.filter((h) => !vistos.has(h.inicio.getTime()) && !copiados.includes(h.id));
  return [...doServidor, ...novos]
    .filter((h) => h.inicio > agora)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}
