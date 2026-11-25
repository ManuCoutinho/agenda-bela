import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMesesAbertos } from '../../hooks/useMesesAbertos';
import { salvarMesesAbertos } from '../../servicos/configPublica';
import { reservarSeriesNoMes, SemPermissao } from '../../servicos/series';
import AgendaAberta from './AgendaAberta';

vi.mock('../../hooks/useMesesAbertos', () => ({ useMesesAbertos: vi.fn() }));
vi.mock('../../servicos/configPublica', () => ({ salvarMesesAbertos: vi.fn() }));
vi.mock('../../servicos/series', () => ({
  reservarSeriesNoMes: vi.fn(),
  SemPermissao: class SemPermissao extends Error {},
}));
vi.mock('../../hooks/useServicos', () => ({
  useServicos: () => ({ servicos: [MAO], carregando: false, erro: false }),
}));
vi.mock('../../hooks/useConfiguracoes', () => ({
  useConfiguracoes: () => ({
    config: { intervaloMin: 0 },
    carregando: false,
    erro: false,
  }),
}));

const MAO = { id: 's1', nome: 'Mão', duracaoMin: 60, precoCentavos: 3500, publico: true };

const renderizar = () =>
  render(
    <MemoryRouter>
      <AgendaAberta />
    </MemoryRouter>,
  );

describe('Agenda aberta (I06)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-24T15:00:00Z'), toFake: ['Date'] });
    vi.mocked(salvarMesesAbertos).mockReset();
    vi.mocked(reservarSeriesNoMes).mockReset().mockResolvedValue([]);
    vi.mocked(useMesesAbertos).mockReturnValue({
      meses: [202611],
      carregando: false,
      erro: false,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra os próximos 12 meses com o que está aberto', () => {
    renderizar();
    expect(screen.getAllByRole('switch')).toHaveLength(12);
    expect(screen.getByRole('switch', { name: /novembro de 2026/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /dezembro de 2026/ })).not.toBeChecked();
  });

  it('abre janeiro sem abrir dezembro, reservando antes os horários fixos', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('switch', { name: /janeiro de 2027/ }));
    expect(reservarSeriesNoMes).toHaveBeenCalledWith(202701, [MAO], 0);
    expect(salvarMesesAbertos).toHaveBeenCalledWith([202611, 202701]);
  });

  it('mostra os horários fixos que não couberam, com a mensagem pronta', async () => {
    vi.mocked(reservarSeriesNoMes).mockResolvedValue([
      {
        serie: {
          id: 'f1',
          nome: 'Bia',
          whatsapp: '5541911112222',
          servicoId: 's1',
          hora: '1000',
          frequenciaDias: 7,
          primeiraData: '2026-11-28',
          ativa: true,
        },
        data: '2027-01-02',
      },
    ]);
    renderizar();
    await userEvent.click(screen.getByRole('switch', { name: /janeiro de 2027/ }));
    expect(await screen.findByText('Bia: sábado, 2 de janeiro, às 10:00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Avisar Bia no WhatsApp' })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me/5541911112222'),
    );
  });

  it('fecha um mês aberto', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('switch', { name: /novembro de 2026/ }));
    expect(salvarMesesAbertos).toHaveBeenCalledWith([]);
  });
});

describe('Agenda aberta: servidor recusa (I06/I11)', () => {
  it('não abre o mês e explica o que fazer, sem culpar a internet', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-24T15:00:00Z'), toFake: ['Date'] });
    vi.mocked(salvarMesesAbertos).mockReset();
    vi.mocked(reservarSeriesNoMes).mockReset().mockRejectedValue(new SemPermissao());
    vi.mocked(useMesesAbertos).mockReturnValue({ meses: [202611], carregando: false, erro: false });
    renderizar();
    await userEvent.click(screen.getByRole('switch', { name: /dezembro de 2026/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'esta versão do app ainda não foi liberada no servidor',
    );
    expect(salvarMesesAbertos).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
