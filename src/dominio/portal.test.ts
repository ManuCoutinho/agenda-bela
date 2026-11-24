import { describe, expect, it } from 'vitest';
import { inicioEm, type Agendamento } from './agenda';
import { gerarChave, horariosDoPortal, juntarHorarios, type HorarioPortal } from './portal';

const AGORA = new Date('2026-11-24T15:00:00Z');

const ag = (id: string, dia: string, o: Partial<Agendamento> = {}): Agendamento => ({
  id,
  clienteId: 'c1',
  clienteNome: 'Ana',
  clienteWhatsapp: '5541988606636',
  servicoId: 's1',
  servicoNome: 'Mão',
  duracaoMin: 60,
  inicio: inicioEm(dia, '1000'),
  travas: [`${dia}_1000`],
  status: 'marcado',
  observacao: '',
  ...o,
});

describe('"Meus horários" (I13)', () => {
  it('chave com 24 letras e números', () => {
    const chave = gerarChave((n) => Uint8Array.from({ length: n }, (_, i) => i * 7));
    expect(chave).toMatch(/^[A-Za-z0-9]{24}$/);
  });

  it('só os horários futuros marcados da cliente', () => {
    const horarios = horariosDoPortal(
      [
        ag('passado', '2026-11-20'),
        ag('b', '2026-12-08', { serieId: 'f1' }),
        ag('cancelado', '2026-12-01', { status: 'cancelado' }),
        ag('outra', '2026-12-02', { clienteWhatsapp: '5541900000000' }),
        ag('a', '2026-12-01'),
      ],
      '5541988606636',
      AGORA,
    );
    expect(horarios.map((h) => h.id)).toEqual(['a', 'b']);
    expect(horarios[1]).toMatchObject({
      servico: 'Mão',
      serieId: 'f1',
      travas: ['2026-12-08_1000'],
    });
  });

  it('junta o que o aparelho acabou de marcar, sem repetir', () => {
    const h = (id: string, dia: string): HorarioPortal => ({
      id,
      inicio: inicioEm(dia, '1000'),
      servico: 'Mão',
      servicoId: 's1',
      duracaoMin: 60,
      travas: [],
    });
    expect(
      juntarHorarios(
        [h('a1', '2026-12-01')],
        [h('local', '2026-12-01'), h('novo', '2026-12-08')],
        AGORA,
      ).map((x) => x.id),
    ).toEqual(['a1', 'novo']);
  });
});
