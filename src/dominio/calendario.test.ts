import { describe, expect, it } from 'vitest';
import { inicioEm, type Agendamento } from './agenda';
import {
  dataValida,
  inicioDaSemana,
  intervaloDaVisao,
  lerToque,
  lerVisao,
  paraEventos,
  paraHoraDeParede,
  passarPeriodo,
  tituloDaVisao,
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

describe('visão do calendário', () => {
  it('lê a visão e a data do endereço', () => {
    expect(lerVisao('mes')).toBe('mes');
    expect(lerVisao(null)).toBe('semana');
    expect(lerVisao('ano')).toBe('semana');
    expect(dataValida('2026-11-12')).toBe(true);
    expect(dataValida('2026-13-40')).toBe(false);
    expect(dataValida('ontem')).toBe(false);
  });

  it('a semana começa no domingo', () => {
    expect(inicioDaSemana('2026-11-12')).toBe('2026-11-08'); // quinta → domingo
    expect(inicioDaSemana('2026-11-08')).toBe('2026-11-08');
    expect(intervaloDaVisao('semana', '2026-11-14')).toEqual({ inicio: '2026-11-08', dias: 7 });
  });

  it('o mês cobre semanas inteiras', () => {
    // novembro/2026: 1º é domingo, 30 é segunda → 5 semanas
    expect(intervaloDaVisao('mes', '2026-11-12')).toEqual({ inicio: '2026-11-01', dias: 35 });
    // agosto/2026: 1º é sábado → começa em 26/07, 6 semanas
    expect(intervaloDaVisao('mes', '2026-08-20')).toEqual({ inicio: '2026-07-26', dias: 42 });
  });

  it('anterior/próximo anda uma semana ou um mês', () => {
    expect(passarPeriodo('semana', '2026-11-12', 1)).toBe('2026-11-19');
    expect(passarPeriodo('mes', '2026-11-12', 1)).toBe('2026-12-01');
    expect(passarPeriodo('mes', '2026-01-31', -1)).toBe('2025-12-01');
    expect(passarPeriodo('mes', '2026-12-05', 1)).toBe('2027-01-01');
  });

  it('título da visão em português', () => {
    expect(tituloDaVisao('mes', '2026-11-12')).toBe('novembro de 2026');
    expect(tituloDaVisao('semana', '2026-11-12')).toBe('8 – 14 de novembro');
    expect(tituloDaVisao('semana', '2026-12-01')).toBe('29 de novembro – 5 de dezembro');
  });
});

describe('conversão para o FullCalendar', () => {
  it('usa a hora de parede de São Paulo', () => {
    expect(paraHoraDeParede(new Date('2026-11-12T17:30:00Z'))).toBe('2026-11-12T14:30:00');
  });

  it('lê o toque em dia ou em horário', () => {
    expect(lerToque('2026-11-12')).toEqual({ data: '2026-11-12', hora: null });
    expect(lerToque('2026-11-12T14:30:00Z')).toEqual({ data: '2026-11-12', hora: '1430' });
  });

  it('mostra só os marcados, com cliente, serviço e fim pela duração', () => {
    const eventos = paraEventos([atendimento(), atendimento({ id: 'a2', status: 'cancelado' })]);
    expect(eventos).toEqual([
      { id: 'a1', titulo: 'Ana · Mão', inicio: '2026-11-12T14:30:00', fim: '2026-11-12T16:00:00' },
    ]);
  });
});
