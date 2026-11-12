import { dataDoDia, diaDaSemana, inicioEm, somarDias } from './agenda';
import { expedienteDoDia, type Configuracoes } from './configuracoes';
import { blocosNecessarios, emMinutos, hhmm, PASSO, type Recorrente } from './disponibilidade';

/** O que a página pública precisa saber para oferecer horários (vem de `config/publico`). */
export type RegrasHorario = Pick<
  Configuracoes,
  'expediente' | 'intervaloMin' | 'antecedenciaMin' | 'janelaDias'
> & { recorrentes: readonly Recorrente[] };

/** Dias (AAAA-MM-DD) que a cliente pode pedir: de hoje até hoje + janela (RN03). */
export function diasDaJanela(agora: Date, janelaDias: number): string[] {
  const hoje = dataDoDia(agora);
  return Array.from({ length: janelaDias + 1 }, (_, i) => somarDias(hoje, i));
}

/** Dias da janela em que a manicure atende (tem expediente nesse dia da semana). */
export const diasAbertos = (regras: RegrasHorario, agora: Date) =>
  diasDaJanela(agora, regras.janelaDias).filter(
    (data) => expedienteDoDia(regras.expediente, diaDaSemana(data)).length > 0,
  );

/**
 * RN01–RN04: horários de início (HHmm) livres para a cliente no dia
 * (AAAA-MM-DD, fuso de São Paulo), de 30 em 30 min.
 * - RN01: dentro do expediente; o serviço termina até o fim da faixa.
 * - RN02: trava ativa (atendimento, bloqueio ou pedido pendente) ocupa o horário.
 * - RN03: só a partir de agora + antecedência e até hoje + janela de dias.
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
  const janela = diasDaJanela(p.agora, regras.janelaDias);
  if (!janela.includes(p.data)) return [];

  const dia = diaDaSemana(p.data);
  const fixos = regras.recorrentes
    .filter((r) => r.dia === dia)
    .map((r) => ({ ini: emMinutos(r.ini), fim: emMinutos(r.fim) }));
  const tomado = (t: number) =>
    p.ocupados.has(hhmm(t)) || fixos.some((f) => t >= f.ini && t < f.fim);

  const minimo = p.agora.getTime() + regras.antecedenciaMin * 60_000;
  const total = blocosNecessarios(p.duracaoMin, regras.intervaloMin);
  const livres: string[] = [];
  for (const faixa of expedienteDoDia(regras.expediente, dia)) {
    const fim = emMinutos(faixa.fim);
    for (let ini = emMinutos(faixa.ini); ini + p.duracaoMin <= fim; ini += PASSO) {
      const inicio = inicioEm(p.data, hhmm(ini)).getTime();
      if (inicio <= p.agora.getTime() || inicio < minimo) continue;
      let livre = true;
      for (let t = ini; t < ini + total && livre; t += PASSO) livre = !tomado(t);
      if (livre) livres.push(hhmm(ini));
    }
  }
  return livres;
}
