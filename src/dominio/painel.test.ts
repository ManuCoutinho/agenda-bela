import { describe, expect, it } from 'vitest';
import { inicioEm, type Agendamento } from './agenda';
import { diasDoMes, mesDe, passarMes, resumoDoMes, rotuloMes } from './painel';

const ag = (id: string, status: Agendamento['status'], extra: Partial<Agendamento> = {}) => ({
  id,
  clienteId: 'c',
  clienteNome: id,
  clienteWhatsapp: '',
  servicoId: 'mao',
  servicoNome: 'Mão',
  duracaoMin: 60,
  inicio: inicioEm('2026-11-10', '0900'),
  travas: [],
  status,
  observacao: '',
  ...extra,
});

describe('painel do mês (RF13)', () => {
  it('conta resultados, faturamento e faltas', () => {
    const r = resumoDoMes(
      [
        ag('a', 'realizado', { precoCentavos: 4000 }),
        ag('b', 'realizado'), // antigo, sem preço guardado: usa o do serviço
        ag('c', 'realizado', { servicoId: 'gel', servicoNome: 'Gel', precoCentavos: 9000 }),
        ag('d', 'falta'),
        ag('e', 'cancelado'),
        ag('f', 'marcado', { precoCentavos: 3500 }),
      ],
      [{ id: 'mao', nome: 'Mão', duracaoMin: 60, precoCentavos: 3500, publico: true }],
    );
    expect(r).toEqual({
      realizados: 3,
      faltas: 1,
      cancelados: 1,
      semResultado: 1,
      faturadoCentavos: 16500,
      previstoCentavos: 3500,
      taxaFaltas: 0.25,
      porServico: [
        { nome: 'Gel', quantidade: 1, totalCentavos: 9000 },
        { nome: 'Mão', quantidade: 2, totalCentavos: 7500 },
      ],
    });
  });

  it('mês sem atendimentos não tem taxa de faltas', () => {
    expect(resumoDoMes([], []).taxaFaltas).toBeNull();
  });

  it('meses no fuso de São Paulo', () => {
    expect(mesDe(new Date('2026-12-01T02:00:00Z'))).toBe('2026-11'); // 23h do dia 30
    expect(diasDoMes('2026-02')).toEqual({ primeiroDia: '2026-02-01', dias: 28 });
    expect(passarMes('2026-12', 1)).toBe('2027-01');
    expect(passarMes('2026-01', -1)).toBe('2025-12');
    expect(rotuloMes('2026-11')).toBe('novembro de 2026');
  });
});
