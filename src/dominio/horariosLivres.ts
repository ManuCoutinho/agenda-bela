import { dataDoDia, diaDaSemana, inicioEm } from './agenda';
import { diasDosMesesAbertos, mesDoDia, mesesValidos, type Mes } from './agendaAberta';
import { expedienteDoDia, type Configuracoes } from './configuracoes';
import {
  arredondarHora,
  blocosNecessarios,
  emMinutos,
  hhmm,
  PASSO,
  porHora,
  type Recorrente,
} from './disponibilidade';

/** O que a página pública precisa saber para oferecer horários (vem de `config/publico`). */
export type RegrasHorario = Pick<
  Configuracoes,
  'expediente' | 'intervaloMin' | 'antecedenciaMin'
> & { recorrentes: readonly Recorrente[]; mesesAbertos: readonly Mes[] };

/** Dias dos meses abertos (RN03, I06) em que a manicure atende (tem expediente). */
export const diasAbertos = (regras: RegrasHorario, agora: Date) =>
  diasDosMesesAbertos(agora, regras.mesesAbertos).filter(
    (data) => expedienteDoDia(regras.expediente, diaDaSemana(data)).length > 0,
  );

/**
 * RN01–RN04: horários de início (HHmm) livres para a cliente no dia
 * (AAAA-MM-DD, fuso de São Paulo), de hora em hora.
 * - RN01: dentro do expediente; o serviço termina até o fim da faixa.
 * - RN02: trava ativa (atendimento, bloqueio ou pedido pendente) ocupa o horário.
 * - RN03: só a partir de agora + antecedência e só nos meses abertos (I06).
 * - RN04: o intervalo depois do serviço também precisa estar livre.
 * Bloqueios fixos da semana (`recorrentes`) contam como ocupados.
 */
export function horariosLivres(p: {
  data: string;
  duracaoMin: number;
  regras: RegrasHorario;
  /** Horas (HHmm) com trava ativa no dia. */
  ocupados: ReadonlySet<string>;
  agora: Date;
}): string[] {
  const { regras } = p;
  const abertos = mesesValidos(regras.mesesAbertos, p.agora);
  if (p.data < dataDoDia(p.agora) || !abertos.includes(mesDoDia(p.data))) return [];

  const dia = diaDaSemana(p.data);
  const fixos = regras.recorrentes
    .filter((r) => r.dia === dia)
    .map((r) => ({ ini: emMinutos(r.ini), fim: emMinutos(r.fim) }));
  const ocupados = porHora(p.ocupados);
  const tomado = (t: number) =>
    ocupados.has(hhmm(t)) || fixos.some((f) => f.ini < t + PASSO && f.fim > t);

  const minimo = p.agora.getTime() + regras.antecedenciaMin * 60_000;
  const total = blocosNecessarios(p.duracaoMin, regras.intervaloMin);
  const livres: string[] = [];
  for (const faixa of expedienteDoDia(regras.expediente, dia)) {
    const fim = emMinutos(faixa.fim);
    for (
      let ini = arredondarHora(emMinutos(faixa.ini), true);
      ini + p.duracaoMin <= fim;
      ini += PASSO
    ) {
      const inicio = inicioEm(p.data, hhmm(ini)).getTime();
      if (inicio <= p.agora.getTime() || inicio < minimo) continue;
      let livre = true;
      for (let t = ini; t < ini + total && livre; t += PASSO) livre = !tomado(t);
      if (livre) livres.push(hhmm(ini));
    }
  }
  return livres;
}

const NENHUMA_HORA: ReadonlySet<string> = new Set();

/** I07: dos `dias`, os que têm ao menos um horário em que o serviço cabe. */
export const diasComHorario = (p: {
  dias: readonly string[];
  duracaoMin: number;
  regras: RegrasHorario;
  ocupadosPorDia: ReadonlyMap<string, ReadonlySet<string>>;
  agora: Date;
}) =>
  p.dias.filter(
    (data) =>
      horariosLivres({
        data,
        duracaoMin: p.duracaoMin,
        regras: p.regras,
        ocupados: p.ocupadosPorDia.get(data) ?? NENHUMA_HORA,
        agora: p.agora,
      }).length > 0,
  );
