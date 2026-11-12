import { dataDoDia, diaDaSemana, horaDe, type Agendamento } from './agenda';
import { emMinutos } from './disponibilidade';
import { pedidoExpirado, type Pedido } from './pedidos';

/** O que um bloqueio novo vai cobrir: um dia ou toda semana. */
export type AlvoBloqueio =
  | { tipo: 'pontual'; data: string; ini: string; fim: string }
  | { tipo: 'recorrente'; dia: number; ini: string; fim: string };

/** Atendimento marcado ou pedido pendente que cai dentro do bloqueio (RF12). */
export type Conflito = {
  tipo: 'atendimento' | 'pedido';
  id: string;
  nome: string;
  whatsapp: string;
  servicoId: string;
  inicio: Date;
};

const minutosDe = (d: Date) => emMinutos(`${horaDe(d).slice(0, 2)}:${horaDe(d).slice(2)}`);

function cai(alvo: AlvoBloqueio, inicio: Date, duracaoMin: number) {
  const data = dataDoDia(inicio);
  const noDia = alvo.tipo === 'pontual' ? data === alvo.data : diaDaSemana(data) === alvo.dia;
  if (!noDia) return false;
  const ini = minutosDe(inicio);
  return ini < emMinutos(alvo.fim) && ini + duracaoMin > emMinutos(alvo.ini);
}

/** Atendimentos e pedidos de agora em diante que o bloqueio atropelaria, por horário. */
export function conflitosDoBloqueio(
  alvo: AlvoBloqueio,
  agendamentos: readonly Agendamento[],
  pedidos: readonly Pedido[],
  agora: Date,
): Conflito[] {
  const futuros = (d: Date) => d.getTime() > agora.getTime();
  return [
    ...agendamentos
      .filter((a) => a.status === 'marcado' && futuros(a.inicio))
      .filter((a) => cai(alvo, a.inicio, a.duracaoMin))
      .map((a) => ({
        tipo: 'atendimento' as const,
        id: a.id,
        nome: a.clienteNome,
        whatsapp: a.clienteWhatsapp,
        servicoId: a.servicoId,
        inicio: a.inicio,
      })),
    ...pedidos
      .filter((p) => p.status === 'pendente' && !pedidoExpirado(p, agora) && futuros(p.inicio))
      .filter((p) => cai(alvo, p.inicio, p.travas.length * 30))
      .map((p) => ({
        tipo: 'pedido' as const,
        id: p.id,
        nome: p.nome,
        whatsapp: p.whatsapp,
        servicoId: p.servicoId,
        inicio: p.inicio,
      })),
  ].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}
