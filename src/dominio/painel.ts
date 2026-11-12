import { addMonths, format, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { dataDoDia, inicioEm, type Agendamento } from './agenda';
import type { Servico } from './servicos';

/** 'AAAA-MM' do instante em São Paulo. */
export const mesDe = (agora: Date) => dataDoDia(agora).slice(0, 7);

export const mesValido = (mes: string | null): mes is string =>
  !!mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);

/** '2026-11' → { primeiroDia: '2026-11-01', dias: 30 } */
export function diasDoMes(mes: string) {
  const primeiroDia = `${mes}-01`;
  return { primeiroDia, dias: getDaysInMonth(inicioEm(primeiroDia, '1200')) };
}

export const passarMes = (mes: string, n: number) =>
  format(addMonths(inicioEm(`${mes}-01`, '1200'), n), 'yyyy-MM');

/** '2026-11' → 'novembro de 2026' */
export const rotuloMes = (mes: string) =>
  format(inicioEm(`${mes}-15`, '1200'), "MMMM 'de' yyyy", { locale: ptBR });

export type ResumoMes = {
  realizados: number;
  faltas: number;
  cancelados: number;
  /** Marcados que ainda não tiveram resultado registrado. */
  semResultado: number;
  /** Soma dos preços dos realizados. */
  faturadoCentavos: number;
  /** Soma dos preços dos que ainda estão marcados. */
  previstoCentavos: number;
  /** Faltas sobre (realizados + faltas), de 0 a 1; `null` sem nenhum dos dois. */
  taxaFaltas: number | null;
  porServico: { nome: string; quantidade: number; totalCentavos: number }[];
};

/**
 * RF13: números do mês. O preço é o guardado no atendimento; os antigos
 * (marcados antes do painel existir) usam o preço atual do serviço.
 */
export function resumoDoMes(
  agendamentos: readonly Agendamento[],
  servicos: readonly Servico[],
): ResumoMes {
  const preco = (a: Agendamento) =>
    a.precoCentavos ?? servicos.find((s) => s.id === a.servicoId)?.precoCentavos ?? 0;
  const com = (status: Agendamento['status']) => agendamentos.filter((a) => a.status === status);
  const realizados = com('realizado');
  const faltas = com('falta').length;
  const marcados = com('marcado');

  const porServico = new Map<string, { nome: string; quantidade: number; totalCentavos: number }>();
  for (const a of realizados) {
    const atual = porServico.get(a.servicoId) ?? {
      nome: a.servicoNome,
      quantidade: 0,
      totalCentavos: 0,
    };
    porServico.set(a.servicoId, {
      ...atual,
      quantidade: atual.quantidade + 1,
      totalCentavos: atual.totalCentavos + preco(a),
    });
  }

  const soma = (lista: Agendamento[]) => lista.reduce((t, a) => t + preco(a), 0);
  return {
    realizados: realizados.length,
    faltas,
    cancelados: com('cancelado').length,
    semResultado: marcados.length,
    faturadoCentavos: soma(realizados),
    previstoCentavos: soma(marcados),
    taxaFaltas: realizados.length + faltas ? faltas / (realizados.length + faltas) : null,
    porServico: [...porServico.values()].sort(
      (a, b) => b.totalCentavos - a.totalCentavos || a.nome.localeCompare(b.nome),
    ),
  };
}
