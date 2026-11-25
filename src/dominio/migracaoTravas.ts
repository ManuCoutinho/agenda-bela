import { horaCheia } from './disponibilidade';

/** Algo futuro que ocupa travas: atendimento, bloqueio de um dia ou pedido pendente. */
export type Reserva = {
  colecao: 'agendamentos' | 'bloqueios' | 'pedidos';
  id: string;
  travas: readonly string[];
  /** `null` = definitiva (atendimento, bloqueio); data = pedido pendente. */
  expiraEm: Date | null;
  /** Para a manicure reconhecer no aviso de conflito (ex.: "Ana, 10:30"). */
  rotulo: string;
};

export type ConflitoDeHora = { trava: string; rotulos: string[] };

export type PlanoMigracao = {
  /** Reservas cujas travas mudam, com a lista nova. */
  mudancas: { reserva: Reserva; travas: string[] }[];
  /** Travas de hora cheia a gravar, na ordem (as definitivas por último, para prevalecer). */
  gravar: { id: string; expiraEm: Date | null }[];
  /** Travas antigas de meia hora a apagar. */
  apagar: string[];
  /** Horas que passaram a ser de mais de uma reserva. */
  conflitos: ConflitoDeHora[];
};

/** '2026-12-01_1030' → '2026-12-01_1000' */
export const travaDaHora = (id: string) => `${id.slice(0, 11)}${horaCheia(id.slice(11))}`;

/**
 * I05: travas de 30 min viram travas de 1 h. Cada reserva passa a ocupar as
 * horas cheias que tocava; as travas de meia hora somem. Duas reservas que
 * caem na mesma hora continuam gravadas e viram conflito para a manicure ver.
 */
export function planejarTravasPorHora(reservas: readonly Reserva[]): PlanoMigracao {
  const mudancas: PlanoMigracao['mudancas'] = [];
  const donos = new Map<string, Reserva[]>();
  const apagar = new Set<string>();

  for (const reserva of reservas) {
    const travas = [...new Set(reserva.travas.map(travaDaHora))];
    for (const id of reserva.travas) if (travaDaHora(id) !== id) apagar.add(id);
    for (const id of travas) donos.set(id, [...(donos.get(id) ?? []), reserva]);
    const iguais =
      travas.length === reserva.travas.length && travas.every((t, i) => t === reserva.travas[i]);
    if (!iguais) mudancas.push({ reserva, travas });
  }

  const gravar = [...donos].map(([id, rs]) => ({
    id,
    expiraEm: rs.some((r) => r.expiraEm === null)
      ? null
      : new Date(Math.max(...rs.map((r) => r.expiraEm?.getTime() ?? 0))),
  }));
  const conflitos = [...donos]
    .filter(([, rs]) => rs.length > 1)
    .map(([trava, rs]) => ({ trava, rotulos: rs.map((r) => r.rotulo) }))
    .sort((a, b) => a.trava.localeCompare(b.trava));

  return { mudancas, gravar, apagar: [...apagar].sort(), conflitos };
}
