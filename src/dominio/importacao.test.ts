import { describe, expect, it } from 'vitest';
import { escolherWhatsApp, lerVcf, paraNovasClientes, prepararImportacao } from './importacao';

// Formato do app Contatos do Android (vCard 2.1, acentos em QUOTED-PRINTABLE)
const VCF_ANDROID = [
  'BEGIN:VCARD',
  'VERSION:2.1',
  'N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Concei=C3=A7=C3=A3o;Jos=C3=A9;;;',
  'FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Jos=C3=A9 Concei=C3=A7=C3=A3o',
  'TEL;CELL:+55 41 98860-6636',
  'TEL;HOME:(41) 3333-4444',
  'END:VCARD',
  'BEGIN:VCARD',
  'VERSION:2.1',
  'FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Maria Aparecida da Silva Ara=C3=BA=',
  'jo',
  'TEL;CELL:98877-6655',
  'END:VCARD',
].join('\r\n');

// vCard 3.0 (Google Contatos / iPhone), com linha dobrada e item1.TEL
const VCF_3 = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'N:Lima;Bia;;;',
  'item1.TEL;type=CELL:41 9 9111-2222',
  'NOTE:cliente da',
  '  manhã',
  'END:VCARD',
  'BEGIN:VCARD',
  'VERSION:3.0',
  'FN:Sem Telefone',
  'END:VCARD',
].join('\n');

describe('lerVcf', () => {
  it('lê o arquivo do Android, com acentos e quebra suave', () => {
    expect(lerVcf(VCF_ANDROID)).toEqual([
      { nome: 'José Conceição', telefones: ['+55 41 98860-6636', '(41) 3333-4444'] },
      { nome: 'Maria Aparecida da Silva Araújo', telefones: ['98877-6655'] },
    ]);
  });

  it('usa o N quando não há FN e aceita item1.TEL', () => {
    expect(lerVcf(VCF_3)).toEqual([
      { nome: 'Bia Lima', telefones: ['41 9 9111-2222'] },
      { nome: 'Sem Telefone', telefones: [] },
    ]);
  });

  it('arquivo sem contatos devolve lista vazia', () => {
    expect(lerVcf('qualquer coisa')).toEqual([]);
  });
});

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
