import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inicioEm, type Agendamento } from '../../dominio/agenda';
import { CONFIGURACOES_PADRAO } from '../../dominio/configuracoes';
import { useAgendamentos } from '../../hooks/useAgenda';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { marcarLembreteEnviado } from '../../servicos/agenda';
import { mostrarEmblema } from '../../servicos/emblema';
import Lembretes from './Lembretes';

vi.mock('../../hooks/useAgenda', () => ({ useAgendamentos: vi.fn() }));
vi.mock('../../hooks/useConfiguracoes', () => ({ useConfiguracoes: vi.fn() }));
vi.mock('../../servicos/agenda', () => ({ marcarLembreteEnviado: vi.fn() }));
vi.mock('../../servicos/emblema', () => ({ mostrarEmblema: vi.fn() }));

const ag = (id: string, hora: string, extra: Partial<Agendamento> = {}): Agendamento => ({
  id,
  clienteId: 'c',
  clienteNome: `Cliente ${id}`,
  clienteWhatsapp: '5541988606636',
  servicoId: 's',
  servicoNome: 'Gel',
  duracaoMin: 60,
  inicio: inicioEm('2026-12-02', hora),
  travas: [],
  status: 'marcado',
  observacao: '',
  ...extra,
});

describe('Lembretes de amanhã (RF11)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-12-01T21:00:00Z'), toFake: ['Date'] }); // 18h em SP
    vi.mocked(useConfiguracoes).mockReturnValue({
      config: { ...CONFIGURACOES_PADRAO, endereco: 'Rua A, 1' },
      carregando: false,
      erro: false,
    });
    vi.mocked(useAgendamentos).mockReturnValue({
      dados: [
        ag('b', '1400', { lembreteEnviado: true }),
        ag('a', '0900'),
        ag('x', '1000', { status: 'cancelado' }),
      ],
      carregando: false,
      erro: false,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('lista amanhã em ordem, com o lembrete pronto, e marca como enviado', async () => {
    render(
      <MemoryRouter>
        <Lembretes />
      </MemoryRouter>,
    );
    expect(useAgendamentos).toHaveBeenCalledWith('2026-12-02', 1);
    expect(screen.getByText('Falta 1 lembrete.', { exact: false })).toBeInTheDocument();
    expect(mostrarEmblema).toHaveBeenLastCalledWith(1);

    const enviar = screen.getByRole('link', { name: 'Enviar lembrete para Cliente a' });
    expect(decodeURIComponent(enviar.getAttribute('href') ?? '')).toContain(
      'lembrar do seu horário de Gel amanhã (quarta-feira, 2 de dezembro) às 09:00. Endereço: Rua A, 1.',
    );
    expect(screen.getByRole('link', { name: 'Enviar de novo para Cliente b' })).toBeInTheDocument();
    expect(screen.queryByText(/Cliente x/)).not.toBeInTheDocument();

    enviar.addEventListener('click', (e) => e.preventDefault());
    await userEvent.click(enviar);
    expect(marcarLembreteEnviado).toHaveBeenCalledWith('a');
  });
});
