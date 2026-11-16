import { describe, expect, it } from 'vitest';
import { inicioEm, type Agendamento } from './agenda';
import {
  dataValida,
  deDataLocal,
  inicioDaSemana,
  intervaloDoMes,
  marcasPorDia,
  paraDataLocal,
  passarMes,
  tituloDoMes,
} from './calendario';

const atendimento = (extra: Partial<Agendamento> = {}): Agendamento => ({
  id: 'a1',
  clienteId: 'c1',
  clienteNome: 'Ana',
  clienteWhatsapp: '5541988606636',
  servicoId: 's1',
  servicoNome: 'Mão',
  duracaoMin: 90,
  inicio: inicioEm('2026-11-12', '1430'),
  travas: [],
  status: 'marcado',
  observacao: '',
  ...extra,
});

describe('calendário do mês', () => {
  it('lê a data do endereço', () => {
    expect(dataValida('2026-11-12')).toBe(true);
    expect(dataValida('2026-13-40')).toBe(false);
    expect(dataValida('ontem')).toBe(false);
    expect(dataValida(null)).toBe(false);
  });

  it('a semana começa no domingo', () => {
    expect(inicioDaSemana('2026-11-12')).toBe('2026-11-08'); // quinta → domingo
    expect(inicioDaSemana('2026-11-08')).toBe('2026-11-08');
  });

  it('o mês cobre semanas inteiras', () => {
    // novembro/2026: 1º é domingo, 30 é segunda → 5 semanas
    expect(intervaloDoMes('2026-11-12')).toEqual({ inicio: '2026-11-01', dias: 35 });
    // agosto/2026: 1º é sábado → começa em 26/07, 6 semanas
    expect(intervaloDoMes('2026-08-20')).toEqual({ inicio: '2026-07-26', dias: 42 });
  });

  it('trocar de mês mantém o dia, ou vai para o último do mês mais curto', () => {
    expect(passarMes('2026-11-12', 1)).toBe('2026-12-12');
    expect(passarMes('2026-12-05', 1)).toBe('2027-01-05');
    expect(passarMes('2026-01-31', 1)).toBe('2026-02-28');
    expect(passarMes('2026-03-31', -1)).toBe('2026-02-28');
  });

  it('título com o mês em português e o ano', () => {
    expect(tituloDoMes('2026-11-12')).toEqual({ mes: 'Novembro', ano: '2026' });
    expect(tituloDoMes('2027-03-01')).toEqual({ mes: 'Março', ano: '2027' });
  });

  it('converte o dia para a data do seletor e de volta', () => {
    expect(deDataLocal(paraDataLocal('2026-11-12'))).toBe('2026-11-12');
    expect(paraDataLocal('2026-02-01').getMonth()).toBe(1);
  });
});

describe('marcas por dia', () => {
  it('conta atendimentos (sem cancelados) e bloqueios; recorrente vale toda semana', () => {
    const marcas = marcasPorDia(
      [atendimento(), atendimento({ id: 'a2', status: 'cancelado' })],
      [
        { id: 'r1', tipo: 'recorrente', dia: 2, ini: '14:00', fim: '15:00', descricao: '' },
        {
          id: 'p1',
          tipo: 'pontual',
          data: '2026-11-12',
          ini: '09:00',
          fim: '10:00',
          descricao: '',
          travas: [],
        },
      ],
      '2026-11-08',
      14,
    );
    expect(marcas.get('2026-11-12')).toEqual({ atendimentos: 1, bloqueios: 1 });
    expect(marcas.get('2026-11-10')).toEqual({ atendimentos: 0, bloqueios: 1 });
    expect(marcas.get('2026-11-17')).toEqual({ atendimentos: 0, bloqueios: 1 });
    expect(marcas.has('2026-11-11')).toBe(false);
  });
});
