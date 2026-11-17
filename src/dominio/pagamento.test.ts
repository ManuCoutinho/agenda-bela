import { describe, expect, it } from 'vitest';
import { esquemaPagamento, textoConfirmacaoComSinal, valorSinal } from './pagamento';

describe('sinal pelo Pix (RF10)', () => {
  it('calcula o sinal pelo percentual, arredondando para o centavo', () => {
    expect(valorSinal(7000, 50)).toBe(3500);
    expect(valorSinal(4550, 50)).toBe(2275);
    expect(valorSinal(3333, 50)).toBe(1667);
    expect(valorSinal(5000, 100)).toBe(5000);
  });

  it('valida chave e percentual', () => {
    expect(esquemaPagamento.parse({ chavePix: ' ana@x.com ', sinalPercentual: '50' })).toEqual({
      chavePix: 'ana@x.com',
      sinalPercentual: 50,
    });
    for (const sinalPercentual of ['0', '101', '12,5', 'abc']) {
      expect(esquemaPagamento.safeParse({ chavePix: '', sinalPercentual }).success).toBe(false);
    }
  });

  it('mensagem com o valor, o percentual e a chave', () => {
    const base = {
      nome: 'Ana',
      servico: 'Mão e pé',
      quando: 'sábado, 5 de dezembro, às 10:00',
      sinalCentavos: 3500,
      percentual: 50,
      chavePix: '41988606636',
    };
    expect(textoConfirmacaoComSinal({ ...base, endereco: 'Rua A, 1' })).toBe(
      'Oi, Ana! Reservei seu horário de Mão e pé para sábado, 5 de dezembro, às 10:00. ' +
        'Para confirmar, peço um sinal de R$ 35,00 (50% do valor) pelo Pix. ' +
        'Chave: 41988606636. Me mande o comprovante por aqui. Endereço: Rua A, 1. Até lá!',
    );
    expect(textoConfirmacaoComSinal({ ...base, endereco: '' })).not.toContain('Endereço');
  });
});
