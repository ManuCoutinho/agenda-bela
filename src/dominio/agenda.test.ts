import { describe, expect, it } from 'vitest';
import {
  agruparPorDia,
  dataDoDia,
  diaDaSemana,
  diasAPartirDe,
  horaDe,
  horariosParaMarcar,
  idsTravas,
  inicioEm,
  rotuloDia,
  travaLivre,
  type Agendamento,
} from './agenda';

describe('datas no fuso de São Paulo', () => {
  it('monta o instante a partir de dia e hora locais (UTC−3)', () => {
    expect(inicioEm('2026-11-10', '0930').toISOString()).toBe('2026-11-10T12:30:00.000Z');
  });

  it('lê dia e hora em São Paulo mesmo perto da meia-noite UTC', () => {
    const d = new Date('2026-11-11T01:30:00Z'); // 22:30 do dia 10 em SP
    expect(dataDoDia(d)).toBe('2026-11-10');
    expect(horaDe(d)).toBe('2230');
  });

  it('escreve o dia por extenso em português', () => {
    expect(rotuloDia('2026-11-10')).toBe('terça-feira, 10 de novembro');
  });

  it('lista dias seguidos atravessando o mês', () => {
    expect(diasAPartirDe('2026-11-29', 3)).toEqual(['2026-11-29', '2026-11-30', '2026-12-01']);
  });
});

describe('idsTravas (RF07)', () => {
  it('ocupa blocos de 30 min pela duração mais o intervalo', () => {
    expect(idsTravas(inicioEm('2026-12-01', '0900'), 60, 15)).toEqual([
      '2026-12-01_0900',
      '2026-12-01_0930',
      '2026-12-01_1000',
    ]);
  });
});

describe('travaLivre', () => {
  const agora = new Date('2026-11-10T12:00:00Z');
  it('livre se não existe ou já expirou', () => {
    expect(travaLivre(undefined, agora)).toBe(true);
    expect(travaLivre(new Date('2026-11-10T11:00:00Z'), agora)).toBe(true);
  });
  it('ocupada se confirmada (nula) ou pedido ainda pendente', () => {
    expect(travaLivre(null, agora)).toBe(false);
    expect(travaLivre(new Date('2026-11-10T13:00:00Z'), agora)).toBe(false);
  });
});

describe('horariosParaMarcar', () => {
  it('marca como ocupado o início que invadiria uma trava', () => {
    const opcoes = horariosParaMarcar(new Set(['1000']), 60, 0, []);
    const porHora = Object.fromEntries(opcoes.map((o) => [o.hora, o.livre]));
    expect(porHora['0900']).toBe(true);
    expect(porHora['0930']).toBe(false); // 09:30–10:30 pega o bloco das 10h
    expect(porHora['1000']).toBe(false);
    expect(porHora['1030']).toBe(true);
  });

  it('o intervalo depois do atendimento também precisa estar livre', () => {
    const opcoes = horariosParaMarcar(new Set(['1000']), 60, 30, []);
    const porHora = Object.fromEntries(opcoes.map((o) => [o.hora, o.livre]));
    expect(porHora['0830']).toBe(true); // 08:30–09:30 + intervalo até 10:00
    expect(porHora['0900']).toBe(false); // o intervalo cairia no bloco das 10h
  });

  it('vai das 6h até o último início que termina às 22h', () => {
    const opcoes = horariosParaMarcar(new Set(), 90, 0, []);
    expect(opcoes[0]?.hora).toBe('0600');
    expect(opcoes.at(-1)?.hora).toBe('2030');
  });

  it('sinaliza o que fica fora do expediente e amplia a faixa se ele for maior', () => {
    const opcoes = horariosParaMarcar(new Set(), 60, 0, [{ ini: '05:00', fim: '12:00' }]);
    const noExpediente = Object.fromEntries(opcoes.map((o) => [o.hora, o.noExpediente]));
    expect(opcoes[0]?.hora).toBe('0500');
    expect(noExpediente['1100']).toBe(true); // 11h–12h cabe
    expect(noExpediente['1130']).toBe(false); // passaria das 12h
    expect(noExpediente['1400']).toBe(false);
  });

  it('sem expediente no dia, tudo é encaixe', () => {
    const opcoes = horariosParaMarcar(new Set(), 60, 0, []);
    expect(opcoes.every((o) => !o.noExpediente)).toBe(true);
  });
});

describe('diaDaSemana', () => {
  it('usa o dia em São Paulo', () => {
    expect(diaDaSemana('2026-12-01')).toBe(2); // terça
    expect(diaDaSemana('2026-12-06')).toBe(0); // domingo
  });
});

describe('agruparPorDia', () => {
  const ag = (
    id: string,
    inicio: Date,
    status: Agendamento['status'] = 'marcado',
  ): Agendamento => ({
    id,
    clienteId: 'c',
    clienteNome: 'Ana',
    clienteWhatsapp: '5541988606636',
    servicoId: 's',
    servicoNome: 'Gel',
    duracaoMin: 60,
    inicio,
    travas: [],
    status,
    observacao: '',
  });

  it('agrupa por dia de São Paulo, ordena e esconde cancelados', () => {
    const grupos = agruparPorDia([
      ag('b', inicioEm('2026-11-10', '1400')),
      ag('x', inicioEm('2026-11-10', '1000'), 'cancelado'),
      ag('a', inicioEm('2026-11-10', '0900')),
      ag('c', inicioEm('2026-11-11', '0900')),
    ]);
    expect(grupos.get('2026-11-10')?.map((a) => a.id)).toEqual(['a', 'b']);
    expect(grupos.get('2026-11-11')?.map((a) => a.id)).toEqual(['c']);
  });
});
