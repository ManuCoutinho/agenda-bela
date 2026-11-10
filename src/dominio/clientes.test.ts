import { describe, expect, it } from 'vitest';
import {
  buscarClientes,
  esquemaCliente,
  formatarWhatsApp,
  normalizarWhatsApp,
  type Cliente,
} from './clientes';

describe('normalizarWhatsApp', () => {
  it.each([
    ['(41) 98860-6636', '5541988606636'],
    ['41988606636', '5541988606636'],
    ['+55 41 98860-6636', '5541988606636'],
    ['041 98860-6636', '5541988606636'],
    ['(41) 3333-4444', '554133334444'],
  ])('%s → %s', (entrada, esperado) => {
    expect(normalizarWhatsApp(entrada)).toBe(esperado);
  });

  it.each(['', '98860-6636', '(10) 98860-6636', '41 98860-66361'])('recusa %s', (entrada) => {
    expect(normalizarWhatsApp(entrada)).toBeNull();
  });
});

describe('formatarWhatsApp', () => {
  it('mostra celular e fixo com DDD', () => {
    expect(formatarWhatsApp('5541988606636')).toBe('(41) 98860-6636');
    expect(formatarWhatsApp('554133334444')).toBe('(41) 3333-4444');
  });
});

describe('esquemaCliente (RF02)', () => {
  const valido = {
    nome: '  Ana Souza ',
    whatsapp: '(41) 98860-6636',
    observacao: '',
    consentimento: true,
  };

  it('limpa o nome e normaliza o WhatsApp', () => {
    expect(esquemaCliente.parse(valido)).toEqual({
      nome: 'Ana Souza',
      whatsapp: '5541988606636',
      observacao: '',
      consentimento: true,
    });
  });

  it('exige a autorização da cliente (LGPD)', () => {
    const r = esquemaCliente.safeParse({ ...valido, consentimento: false });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch('autorização');
  });

  it('explica como escrever o WhatsApp quando ele está errado', () => {
    const r = esquemaCliente.safeParse({ ...valido, whatsapp: '9999' });
    expect(r.error?.issues[0]?.message).toMatch('DDD');
  });

  it('exige nome de até 80 letras', () => {
    expect(esquemaCliente.safeParse({ ...valido, nome: '   ' }).success).toBe(false);
    expect(esquemaCliente.safeParse({ ...valido, nome: 'a'.repeat(81) }).success).toBe(false);
  });
});

describe('buscarClientes (RF02)', () => {
  const cliente = (id: string, nome: string, whatsapp: string): Cliente => ({
    id,
    nome,
    whatsapp,
    observacao: '',
    consentimento: true,
  });
  const lista = [
    cliente('1', 'Júlia Ramos', '5541988606636'),
    cliente('2', 'ana Souza', '5541977771111'),
    cliente('3', 'Bianca Lima', '5511912345678'),
  ];
  const nomes = (r: Cliente[]) => r.map((c) => c.nome);

  it('sem termo, lista todas em ordem alfabética', () => {
    expect(nomes(buscarClientes(lista, ''))).toEqual(['ana Souza', 'Bianca Lima', 'Júlia Ramos']);
  });

  it('acha pelo nome sem diferenciar acento nem maiúscula', () => {
    expect(nomes(buscarClientes(lista, 'JULIA'))).toEqual(['Júlia Ramos']);
  });

  it('acha por parte do WhatsApp, com ou sem máscara', () => {
    expect(nomes(buscarClientes(lista, '98860'))).toEqual(['Júlia Ramos']);
    expect(nomes(buscarClientes(lista, '(11) 91234'))).toEqual(['Bianca Lima']);
  });

  it('não altera a lista recebida', () => {
    buscarClientes(lista, '');
    expect(lista[0]?.nome).toBe('Júlia Ramos');
  });
});
