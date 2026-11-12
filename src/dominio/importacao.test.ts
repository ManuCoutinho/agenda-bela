import { describe, expect, it } from 'vitest';
import { escolherWhatsApp, paraNovasClientes, prepararImportacao } from './importacao';

// Formato do app Contatos do Android (vCard 2.1, acentos em QUOTED-PRINTABLE)
describe('escolherWhatsApp', () => {
  it('prefere o celular ao fixo', () => {
    expect(escolherWhatsApp(['(41) 3333-4444', '41 98860-6636'])).toBe('5541988606636');
  });
  it('completa número sem DDD com o DDD padrão', () => {
    expect(escolherWhatsApp(['98877-6655'], '41')).toBe('5541988776655');
    expect(escolherWhatsApp(['98877-6655'])).toBeNull();
  });
});

describe('prepararImportacao', () => {
  const contatos = [
    { nome: 'Ana', telefones: ['41 98860-6636'] }, // já cadastrada
    { nome: '  Bia   Lima ', telefones: ['41 99111-2222'] },
    { nome: 'Bia (outro)', telefones: ['+55 41 99111-2222'] }, // mesmo número
    { nome: 'Carla', telefones: [] },
    { nome: '', telefones: ['41 99999-0000'] },
  ];

  it('marca nova, já cadastrada, repetida, sem número e sem nome', () => {
    const lista = prepararImportacao(contatos, [{ whatsapp: '5541988606636' }]);
    expect(lista.map((c) => [c.nome, c.situacao])).toEqual([
      ['', 'sem-nome'],
      ['Ana', 'cadastrada'],
      ['Bia (outro)', 'repetida'],
      ['Bia Lima', 'nova'],
      ['Carla', 'sem-numero'],
    ]);
  });

  it('grava só as novas, com consentimento do lote', () => {
    const lista = prepararImportacao(contatos, []);
    expect(paraNovasClientes(lista)).toEqual([
      { nome: 'Ana', whatsapp: '5541988606636', observacao: '', consentimento: true },
      { nome: 'Bia Lima', whatsapp: '5541991112222', observacao: '', consentimento: true },
    ]);
  });
});
