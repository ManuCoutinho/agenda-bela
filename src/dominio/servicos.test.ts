import { describe, expect, it } from 'vitest';
import {
  esquemaServico,
  formatarDuracao,
  formatarPreco,
  gravarNaLista,
  lerPreco,
  mascararPreco,
  precoParaCampo,
  servicosPublicos,
  type Servico,
} from './servicos';

describe('lerPreco', () => {
  it.each([
    ['45', 4500],
    ['45,5', 4550],
    ['45,50', 4550],
    ['R$ 1.200,00', 120000],
    [' 0,99 ', 99],
  ])('%s → %d centavos', (texto, centavos) => {
    expect(lerPreco(texto)).toBe(centavos);
  });

  it.each(['', 'abc', '45,505', '-10', '45.50'])('recusa %s', (texto) => {
    expect(lerPreco(texto)).toBeNull();
  });
});

describe('formatação', () => {
  it('mostra preço em reais', () => {
    expect(formatarPreco(4550)).toBe('R$ 45,50');
    expect(precoParaCampo(4500)).toMatch(/^R\$\s45,00$/);
  });

  it.each([
    ['2', 'R$ 0,02'],
    ['2555', 'R$ 25,55'],
    ['R$ 25,555', 'R$ 255,55'], // digitou mais um número
    ['R$ 25,5', 'R$ 2,55'], // apagou o último
    ['0045', 'R$ 0,45'],
    ['12345678', 'R$ 12.345,67'], // até 7 números
    ['abc', ''],
    ['', ''],
  ])('máscara: %s → %s', (texto, esperado) => {
    expect(mascararPreco(texto).replace(/\s/g, ' ')).toBe(esperado);
  });

  it('o valor mascarado volta a centavos', () => {
    expect(lerPreco(mascararPreco('2555'))).toBe(2555);
    expect(lerPreco(mascararPreco('12345678'))).toBe(1234567);
  });

  it('mostra duração em horas e minutos', () => {
    expect(formatarDuracao(30)).toBe('30 min');
    expect(formatarDuracao(60)).toBe('1 h');
    expect(formatarDuracao(150)).toBe('2 h 30 min');
  });
});

describe('esquemaServico (RF03)', () => {
  const valido = { nome: ' Pé e mão ', duracaoMin: '90', preco: '70,00', publico: true };

  it('converte duração e preço', () => {
    expect(esquemaServico.parse(valido)).toEqual({
      nome: 'Pé e mão',
      duracaoMin: 90,
      preco: 7000,
      publico: true,
    });
  });

  it('só aceita durações em blocos de 30 min até 5 h', () => {
    expect(esquemaServico.safeParse({ ...valido, duracaoMin: '45' }).success).toBe(false);
    expect(esquemaServico.safeParse({ ...valido, duracaoMin: '330' }).success).toBe(false);
  });

  it('explica o formato do preço', () => {
    const r = esquemaServico.safeParse({ ...valido, preco: 'barato' });
    expect(r.error?.issues[0]?.message).toMatch('45,00');
  });
});

describe('lista de serviços', () => {
  const s = (id: string, nome: string, publico = true): Servico => ({
    id,
    nome,
    duracaoMin: 60,
    precoCentavos: 5000,
    publico,
  });

  it('inclui, substitui pelo id e mantém ordem alfabética', () => {
    const lista = gravarNaLista([s('1', 'Gel'), s('2', 'Mão')], s('3', 'Esmaltação'));
    expect(lista.map((x) => x.nome)).toEqual(['Esmaltação', 'Gel', 'Mão']);
    expect(gravarNaLista(lista, s('1', 'Alongamento')).map((x) => x.nome)).toEqual([
      'Alongamento',
      'Esmaltação',
      'Mão',
    ]);
  });

  it('a página pública só vê os serviços públicos', () => {
    expect(servicosPublicos([s('1', 'Gel'), s('2', 'Teste', false)]).map((x) => x.id)).toEqual([
      '1',
    ]);
  });
});
