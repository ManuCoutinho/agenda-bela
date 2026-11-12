import { describe, expect, it } from 'vitest';
import { inicioEm } from './agenda';
import { csvAtendimentos, csvClientes, paraCsv } from './exportacao';

describe('exportação CSV (RNF02)', () => {
  it('separa com ponto e vírgula, protege aspas, quebras e fórmulas', () => {
    expect(paraCsv([['a;b', 'diz "oi"', 'linha\nnova', '=SOMA(1)', -3]])).toBe(
      '\uFEFF"a;b";"diz ""oi""";"linha\nnova";\'=SOMA(1);-3\r\n',
    );
  });

  it('clientes em ordem alfabética com o WhatsApp formatado', () => {
    const csv = csvClientes([
      { id: '2', nome: 'Bia', whatsapp: '5541999998888', observacao: '', consentimento: true },
      {
        id: '1',
        nome: 'Ana',
        whatsapp: '5541988606636',
        observacao: 'unha curta',
        consentimento: true,
      },
    ]);
    expect(csv.split('\r\n').slice(0, 3)).toEqual([
      '\uFEFFNome;WhatsApp;Observação',
      'Ana;(41) 98860-6636;unha curta',
      'Bia;(41) 99999-8888;',
    ]);
  });

  it('atendimentos com data, hora e preço no formato brasileiro', () => {
    const csv = csvAtendimentos([
      {
        id: 'a',
        clienteId: 'c',
        clienteNome: 'Ana',
        clienteWhatsapp: '5541988606636',
        servicoId: 's',
        servicoNome: 'Gel',
        duracaoMin: 90,
        inicio: inicioEm('2026-12-01', '0930'),
        travas: [],
        status: 'realizado',
        observacao: '',
        precoCentavos: 8050,
      },
    ]);
    expect(csv.split('\r\n')[1]).toBe(
      '01/12/2026;09:30;Ana;(41) 98860-6636;Gel;90;80,50;Realizado;',
    );
  });
});
