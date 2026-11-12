import { describe, expect, it } from 'vitest';
import { linkWhatsApp, textoLembrete, textoRemarcacao } from './whatsapp';

describe('linkWhatsApp', () => {
  it('remove a máscara do número e codifica o texto', () => {
    expect(linkWhatsApp('+55 (11) 98765-4321', 'Oi, tudo bem?')).toBe(
      'https://wa.me/5511987654321?text=Oi%2C%20tudo%20bem%3F',
    );
  });
});

describe('textoLembrete', () => {
  it('monta o lembrete com serviço, data, hora e endereço', () => {
    const texto = textoLembrete({
      nome: 'Ana',
      servico: 'Alongamento',
      data: '14/10',
      hora: '10:00',
      endereco: 'Rua das Flores, 10',
    });
    expect(texto).toContain('Oi, Ana!');
    expect(texto).toContain('Alongamento amanhã (14/10) às 10:00');
    expect(texto).toContain('Endereço: Rua das Flores, 10.');
  });

  it('sem endereço cadastrado, não fala de endereço', () => {
    const texto = textoLembrete({
      nome: 'Ana',
      servico: 'Mão',
      data: '14/10',
      hora: '10:00',
      endereco: '',
    });
    expect(texto).not.toContain('Endereço');
    expect(texto).toMatch(/às 10:00\. Pode confirmar\?$/);
  });
});

describe('textoRemarcacao', () => {
  it('pede para a cliente escolher outro horário', () => {
    expect(textoRemarcacao({ nome: 'Ana', quando: 'terça-feira, 1 de dezembro, às 10:00' })).toBe(
      'Oi, Ana! Precisei mudar minha agenda e não vou conseguir te atender terça-feira, 1 de dezembro, às 10:00. ' +
        'Me diz qual outro dia e horário fica bom para você que eu remarco. Desculpa o transtorno!',
    );
  });
});
