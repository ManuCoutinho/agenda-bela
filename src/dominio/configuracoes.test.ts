import { describe, expect, it } from 'vitest';
import {
  CONFIGURACOES_PADRAO,
  esquemaConfiguracoes,
  expedienteDoDia,
  formatarAntecedencia,
  gerarSlug,
  paraCampos,
  paraConfiguracoes,
  usuarioInstagram,
  type CamposConfiguracoes,
} from './configuracoes';

const campos = (mudancas: Partial<CamposConfiguracoes> = {}): CamposConfiguracoes => ({
  ...paraCampos(CONFIGURACOES_PADRAO),
  nome: 'Espaço Juju',
  whatsapp: '(41) 98860-6636',
  ...mudancas,
});

const mensagens = (c: CamposConfiguracoes) => {
  const r = esquemaConfiguracoes.safeParse(c);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('gerarSlug', () => {
  it('tira acento, espaço e símbolo', () => {
    expect(gerarSlug('  Espaço Juju – Unhas! ')).toBe('espaco-juju-unhas');
  });
  it('não termina em hífen ao cortar em 40 letras', () => {
    expect(gerarSlug(`${'a'.repeat(39)} b`)).toBe('a'.repeat(39));
  });
});

describe('formatarAntecedencia', () => {
  it.each([
    [0, 'Sem antecedência'],
    [60, '1 h'],
    [720, '12 h'],
    [1440, '1 dia'],
    [2880, '2 dias'],
  ])('%i min → %s', (min, texto) => expect(formatarAntecedencia(min)).toBe(texto));
});

describe('esquemaConfiguracoes (RF04)', () => {
  it('aceita o padrão com nome e WhatsApp', () => {
    expect(mensagens(campos())).toEqual([]);
  });

  it('normaliza o WhatsApp e converte os dias abertos em faixas', () => {
    const config = paraConfiguracoes(esquemaConfiguracoes.parse(campos({ intervaloMin: '30' })));
    expect(config.whatsapp).toBe('5541988606636');
    expect(config.intervaloMin).toBe(30);
    expect(config.expediente).toEqual(CONFIGURACOES_PADRAO.expediente);
  });

  it('volta ao formulário com os mesmos valores (ida e volta)', () => {
    const config = { ...CONFIGURACOES_PADRAO, nome: 'X', slug: 'x-y', whatsapp: '5541988606636' };
    expect(paraConfiguracoes(esquemaConfiguracoes.parse(paraCampos(config)), 'x-y')).toEqual(
      config,
    );
  });

  it('o link sai do nome na primeira vez e depois não muda', () => {
    const dados = esquemaConfiguracoes.parse(campos());
    expect(paraConfiguracoes(dados).slug).toBe('espaco-juju');
    expect(paraConfiguracoes(dados, 'juju').slug).toBe('juju');
    expect(paraConfiguracoes({ ...dados, nome: '!!!' }).slug).toBe('agenda');
  });

  it('recusa fim antes do início só em dia aberto', () => {
    const invertido = { ini: '18:00', fim: '09:00' };
    const dias = campos().dias.map((d, i) =>
      i === 2 ? { aberto: true, ...invertido } : i === 0 ? { ...d, ...invertido } : d,
    );
    expect(mensagens(campos({ dias }))).toEqual([
      'dias.2.fim: O fim precisa ser depois do início.',
    ]);
  });

  it('recusa WhatsApp sem DDD', () => {
    expect(mensagens(campos({ whatsapp: '98860-6636' }))).toEqual([
      'whatsapp: Escreva o WhatsApp com DDD, por exemplo (41) 98860-6636.',
    ]);
  });

  it('recusa valor fora das listas', () => {
    expect(mensagens(campos({ janelaDias: '45' }))).toEqual([
      'janelaDias: Escolha uma opção da lista.',
    ]);
  });
});

describe('expedienteDoDia', () => {
  it('pega as faixas do dia da semana', () => {
    expect(expedienteDoDia(CONFIGURACOES_PADRAO.expediente, 2)).toEqual([
      { ini: '09:00', fim: '18:00' },
    ]);
    expect(expedienteDoDia(CONFIGURACOES_PADRAO.expediente, 0)).toEqual([]);
  });
});

describe('usuarioInstagram', () => {
  it.each([
    ['@EspacoJuju', 'espacojuju'],
    ['espaco.juju_', 'espaco.juju_'],
    ['https://www.instagram.com/espacojuju/?hl=pt', 'espacojuju'],
    ['instagram.com/espacojuju', 'espacojuju'],
    ['  ', ''],
  ])('%s → %s', (texto, usuario) => {
    expect(usuarioInstagram(texto)).toBe(usuario);
  });

  it('recusa o que não é usuário', () => {
    expect(usuarioInstagram('espaço juju')).toBeNull();
    expect(mensagens(campos({ instagram: 'espaço juju' }))).toEqual([
      'instagram: Escreva o seu @ do Instagram, por exemplo @espacojuju.',
    ]);
  });

  it('o formulário mostra com @ e grava sem', () => {
    const config = { ...CONFIGURACOES_PADRAO, instagram: 'espacojuju' };
    expect(paraCampos(config).instagram).toBe('@espacojuju');
    expect(
      paraConfiguracoes(esquemaConfiguracoes.parse(campos({ instagram: '@espacojuju' }))).instagram,
    ).toBe('espacojuju');
  });
});
