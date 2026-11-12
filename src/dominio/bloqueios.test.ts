import { describe, expect, it } from 'vitest';
import { inicioEm } from './agenda';
import {
  bloqueiosDoDia,
  esquemaBloqueio,
  horasRecorrentesNoDia,
  paraRecorrentesPublicos,
  restoDoDia,
  rotuloQuando,
  separarBloqueios,
  travasDoIntervalo,
  type Bloqueio,
} from './bloqueios';

const TERAPIA: Bloqueio = {
  id: 'r1',
  tipo: 'recorrente',
  dia: 2, // terça
  ini: '14:00',
  fim: '15:30',
  descricao: 'Terapia',
};
const DENTISTA: Bloqueio = {
  id: 'p1',
  tipo: 'pontual',
  data: '2026-11-17', // terça
  ini: '09:00',
  fim: '10:00',
  descricao: 'Dentista',
  travas: ['2026-11-17_0900', '2026-11-17_0930'],
};
const PASSADO: Bloqueio = { ...DENTISTA, id: 'p0', data: '2026-11-03' };

describe('bloqueios (RF05, RF06)', () => {
  it('travas de 30 min do intervalo, sem incluir o fim', () => {
    expect(travasDoIntervalo('2026-11-17', '09:00', '10:30')).toEqual([
      '2026-11-17_0900',
      '2026-11-17_0930',
      '2026-11-17_1000',
    ]);
  });

  it('no dia valem os pontuais da data e os recorrentes do dia da semana', () => {
    expect(bloqueiosDoDia([TERAPIA, DENTISTA, PASSADO], '2026-11-17')).toEqual([
      { id: 'p1', ini: '09:00', fim: '10:00', descricao: 'Dentista', recorrente: false },
      { id: 'r1', ini: '14:00', fim: '15:30', descricao: 'Terapia', recorrente: true },
    ]);
    expect(bloqueiosDoDia([TERAPIA, DENTISTA], '2026-11-18')).toEqual([]);
  });

  it('horas dos recorrentes no dia (os pontuais já têm trava)', () => {
    expect([...horasRecorrentesNoDia([TERAPIA, DENTISTA], '2026-11-24')]).toEqual([
      '1400',
      '1430',
      '1500',
    ]);
  });

  it('a página pública recebe só dia e horário dos recorrentes, sem a descrição', () => {
    expect(paraRecorrentesPublicos([DENTISTA, TERAPIA])).toEqual([
      { dia: 2, ini: '14:00', fim: '15:30' },
    ]);
  });

  it('separa recorrentes e próximos pontuais, sem os que já passaram', () => {
    const { recorrentes, proximos } = separarBloqueios([PASSADO, DENTISTA, TERAPIA], '2026-11-12');
    expect(recorrentes.map((b) => b.id)).toEqual(['r1']);
    expect(proximos.map((b) => b.id)).toEqual(['p1']);
  });

  it('rótulo de quando vale', () => {
    expect(rotuloQuando(TERAPIA)).toBe('Toda terça-feira');
    expect(rotuloQuando({ ...TERAPIA, dia: 6 })).toBe('Todo sábado');
    expect(rotuloQuando(DENTISTA)).toBe('terça-feira, 17 de novembro');
  });
});

describe('restoDoDia', () => {
  it('do próximo meio-horário até as 22h', () => {
    expect(restoDoDia(inicioEm('2026-11-12', '1510'), [{ ini: '09:00', fim: '18:00' }])).toEqual({
      data: '2026-11-12',
      ini: '15:30',
      fim: '22:00',
    });
  });

  it('vai até o fim do expediente se ele passar das 22h', () => {
    expect(restoDoDia(inicioEm('2026-11-12', '2200'), [{ ini: '14:00', fim: '23:00' }])).toEqual({
      data: '2026-11-12',
      ini: '22:00',
      fim: '23:00',
    });
  });

  it('null quando o dia já acabou', () => {
    expect(restoDoDia(inicioEm('2026-11-12', '2145'), [])).toBeNull();
  });
});

describe('esquemaBloqueio', () => {
  const valido = {
    tipo: 'pontual' as const,
    data: '2026-11-17',
    dia: '2',
    ini: '09:00',
    fim: '10:00',
    descricao: ' Dentista ',
  };

  it('aceita e limpa a descrição', () => {
    expect(esquemaBloqueio.parse(valido)).toMatchObject({ descricao: 'Dentista', dia: 2 });
  });

  it('pede o dia no pontual e o fim depois do início', () => {
    const r = esquemaBloqueio.safeParse({ ...valido, data: '', fim: '09:00' });
    expect(r.error?.issues.map((i) => i.message)).toEqual([
      'Escolha o dia.',
      'O fim precisa ser depois do início.',
    ]);
  });

  it('recorrente não precisa de data', () => {
    expect(esquemaBloqueio.safeParse({ ...valido, tipo: 'recorrente', data: '' }).success).toBe(
      true,
    );
  });
});
