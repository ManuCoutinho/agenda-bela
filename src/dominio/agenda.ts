import { TZDate } from '@date-fns/tz';
import { addDays, addMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { blocosNecessarios, hhmm, PASSO } from './disponibilidade';

export const FUSO = 'America/Sao_Paulo';

/** Até a C9 (configurações), o intervalo entre atendimentos é fixo. */
export const INTERVALO_PADRAO_MIN = 0;

/** Faixa de horários oferecida à manicure ao marcar (o expediente vem na C9). */
export const FAIXA_MARCACAO = { ini: 6 * 60, fim: 22 * 60 };

export type StatusAgendamento = 'marcado' | 'cancelado';

export type Agendamento = {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteWhatsapp: string;
  servicoId: string;
  servicoNome: string;
  duracaoMin: number;
  inicio: Date;
  /** IDs `AAAA-MM-DD_HHmm` dos blocos de 30 min ocupados (inclui o intervalo). */
  travas: string[];
  status: StatusAgendamento;
  observacao: string;
};

export type NovoAgendamento = Omit<Agendamento, 'id'>;

/** Quando a manicure tenta marcar um horário que já tem trava ativa. */
export class HorarioOcupado extends Error {
  constructor() {
    super('Horário ocupado');
    this.name = 'HorarioOcupado';
  }
}

const noFuso = (d: Date) => new TZDate(d, FUSO);

/** ('2026-11-10', '0930') → instante 09:30 em São Paulo */
export function inicioEm(data: string, hora: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number) as [number, number, number];
  const local = new TZDate(
    ano,
    mes - 1,
    dia,
    Number(hora.slice(0, 2)),
    Number(hora.slice(2)),
    FUSO,
  );
  return new Date(local.getTime());
}

/** Dia (AAAA-MM-DD) do instante em São Paulo. */
export const dataDoDia = (d: Date) => format(noFuso(d), 'yyyy-MM-dd');

/** Hora (HHmm) do instante em São Paulo. */
export const horaDe = (d: Date) => format(noFuso(d), 'HHmm');

/** '0930' → '09:30' */
export const rotuloHora = (hora: string) => `${hora.slice(0, 2)}:${hora.slice(2)}`;

/** '2026-11-10' → 'terça-feira, 10 de novembro' */
export const rotuloDia = (data: string) =>
  format(inicioEm(data, '1200'), "EEEE, d 'de' MMMM", { locale: ptBR });

export const somarDias = (data: string, dias: number) =>
  dataDoDia(addDays(inicioEm(data, '1200'), dias));

/** `n` dias seguidos a partir de `data`. */
export const diasAPartirDe = (data: string, n: number) =>
  Array.from({ length: n }, (_, i) => somarDias(data, i));

/** Travas de 30 min que o atendimento ocupa, contando o intervalo depois dele. */
export function idsTravas(inicio: Date, duracaoMin: number, intervaloMin: number): string[] {
  const total = blocosNecessarios(duracaoMin, intervaloMin);
  const ids: string[] = [];
  for (let t = 0; t < total; t += PASSO) {
    ids.push(format(noFuso(addMinutes(inicio, t)), "yyyy-MM-dd'_'HHmm"));
  }
  return ids;
}

/** Trava inexistente ou expirada está livre; `expiraEm` nulo = atendimento confirmado. */
export const travaLivre = (expiraEm: Date | null | undefined, agora: Date) =>
  expiraEm !== null && (expiraEm === undefined || expiraEm <= agora);

export type OpcaoHorario = { hora: string; livre: boolean };

/**
 * Horários de início para a manicure marcar no dia, de 30 em 30 min.
 * `ocupados` são as horas (HHmm) com trava ativa nesse dia, sem as do próprio
 * atendimento quando ele está sendo editado.
 */
export function horariosParaMarcar(
  ocupados: ReadonlySet<string>,
  duracaoMin: number,
  intervaloMin: number,
): OpcaoHorario[] {
  const total = blocosNecessarios(duracaoMin, intervaloMin);
  const opcoes: OpcaoHorario[] = [];
  for (let ini = FAIXA_MARCACAO.ini; ini + duracaoMin <= FAIXA_MARCACAO.fim; ini += PASSO) {
    let livre = true;
    for (let t = ini; t < ini + total; t += PASSO) {
      if (ocupados.has(hhmm(t))) livre = false;
    }
    opcoes.push({ hora: hhmm(ini), livre });
  }
  return opcoes;
}

export const fimDe = (a: Pick<Agendamento, 'inicio' | 'duracaoMin'>) =>
  addMinutes(a.inicio, a.duracaoMin);

/** Atendimentos marcados, por dia (AAAA-MM-DD) e em ordem de horário. */
export function agruparPorDia(agendamentos: readonly Agendamento[]) {
  const porDia = new Map<string, Agendamento[]>();
  const marcados = agendamentos
    .filter((a) => a.status === 'marcado')
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  for (const a of marcados) {
    const dia = dataDoDia(a.inicio);
    porDia.set(dia, [...(porDia.get(dia) ?? []), a]);
  }
  return porDia;
}

export const esquemaAtendimento = z.object({
  clienteId: z.string().min(1, 'Escolha a cliente.'),
  servicoId: z.string().min(1, 'Escolha o serviço.'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Escolha o dia.'),
  hora: z.string().regex(/^\d{4}$/, 'Escolha o horário.'),
  observacao: z.string().trim().max(500, 'Use até 500 letras na observação.'),
});

export type CamposAtendimento = z.input<typeof esquemaAtendimento>;
export type DadosAtendimento = z.output<typeof esquemaAtendimento>;
