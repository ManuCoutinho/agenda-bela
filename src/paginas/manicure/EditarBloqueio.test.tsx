import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HorarioOcupado } from '../../dominio/agenda';
import type { Bloqueio } from '../../dominio/bloqueios';
import { useBloqueios } from '../../hooks/useBloqueios';
import {
  bloquearHorario,
  excluirBloqueio,
  salvarBloqueioRecorrente,
} from '../../servicos/bloqueios';
import Bloqueios from './Bloqueios';
import EditarBloqueio from './EditarBloqueio';

vi.mock('../../hooks/useBloqueios', () => ({ useBloqueios: vi.fn() }));
vi.mock('../../servicos/bloqueios', () => ({
  bloquearHorario: vi.fn(),
  excluirBloqueio: vi.fn(),
  salvarBloqueioRecorrente: vi.fn(),
}));

const TERAPIA: Bloqueio = {
  id: 'r1',
  tipo: 'recorrente',
  dia: 2,
  ini: '14:00',
  fim: '15:00',
  descricao: 'Terapia',
};
const DENTISTA: Bloqueio = {
  id: 'p1',
  tipo: 'pontual',
  data: '2099-01-06',
  ini: '09:00',
  fim: '10:00',
  descricao: 'Dentista',
  travas: ['2099-01-06_0900', '2099-01-06_0930'],
};

function Destino() {
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso;
  return <p>Lista: {aviso}</p>;
}

function renderizar(rota: string, lista = <Destino />) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/mais/bloqueios" element={lista} />
        <Route path="/mais/bloqueios/novo" element={<EditarBloqueio />} />
        <Route path="/mais/bloqueios/:id" element={<EditarBloqueio />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Bloqueios (RF05, RF06)', () => {
  beforeEach(() => {
    vi.mocked(bloquearHorario).mockReset();
    vi.mocked(excluirBloqueio).mockReset();
    vi.mocked(salvarBloqueioRecorrente).mockReset();
    vi.mocked(useBloqueios).mockReturnValue({
      bloqueios: [TERAPIA, DENTISTA],
      carregando: false,
      erro: false,
    });
  });

  it('lista os fixos da semana e os próximos dias', () => {
    renderizar('/mais/bloqueios', <Bloqueios />);
    expect(
      screen.getByRole('link', { name: /Toda terça-feira · 14:00–15:00\s*Terapia/ }),
    ).toHaveAttribute('href', '/mais/bloqueios/r1');
    expect(
      screen.getByRole('link', { name: /6 de janeiro · 09:00–10:00\s*Dentista/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo bloqueio' })).toBeInTheDocument();
  });

  it('bloqueia um dia com as travas do intervalo', async () => {
    vi.mocked(bloquearHorario).mockResolvedValue(3);
    renderizar('/mais/bloqueios/novo?data=2099-01-06');
    expect(screen.getByLabelText('Dia')).toHaveValue('2099-01-06');
    await userEvent.selectOptions(screen.getByLabelText('Das'), '13:00');
    await userEvent.selectOptions(screen.getByLabelText('Até'), '14:30');
    await userEvent.type(screen.getByLabelText('Descrição (opcional)'), 'Médico');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar bloqueio' }));

    expect(bloquearHorario).toHaveBeenCalledWith({
      data: '2099-01-06',
      ini: '13:00',
      fim: '14:30',
      descricao: 'Médico',
      travas: ['2099-01-06_1300', '2099-01-06_1330', '2099-01-06_1400'],
    });
    expect(await screen.findByText('Lista: Horário bloqueado: 13:00–14:30.')).toBeInTheDocument();
  });

  it('avisa quando já há atendimento no horário', async () => {
    vi.mocked(bloquearHorario).mockRejectedValue(new HorarioOcupado());
    renderizar('/mais/bloqueios/novo?data=2099-01-06');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar bloqueio' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Já há atendimento ou pedido');
  });

  it('fixo da semana atualiza a lista pública sem a descrição', async () => {
    renderizar('/mais/bloqueios/novo?data=2099-01-06');
    await userEvent.click(screen.getByLabelText(/Toda semana/));
    await userEvent.selectOptions(screen.getByLabelText('Dia da semana'), 'Quinta-feira');
    await userEvent.selectOptions(screen.getByLabelText('Das'), '08:00');
    await userEvent.selectOptions(screen.getByLabelText('Até'), '09:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar bloqueio' }));

    expect(salvarBloqueioRecorrente).toHaveBeenCalledWith(
      { dia: 4, ini: '08:00', fim: '09:00', descricao: '' },
      [
        { dia: 2, ini: '14:00', fim: '15:00' },
        { dia: 4, ini: '08:00', fim: '09:00' },
      ],
    );
    expect(await screen.findByText('Lista: Bloqueio fixo salvo: 08:00–09:00.')).toBeInTheDocument();
  });

  it('fim antes do início não salva', async () => {
    renderizar('/mais/bloqueios/novo?data=2099-01-06');
    await userEvent.selectOptions(screen.getByLabelText('Das'), '12:00');
    await userEvent.selectOptions(screen.getByLabelText('Até'), '11:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar bloqueio' }));
    expect(screen.getByLabelText('Até')).toHaveAccessibleDescription(
      'O fim precisa ser depois do início.',
    );
    expect(bloquearHorario).not.toHaveBeenCalled();
  });

  it('exclui depois de confirmar, tirando o fixo da lista pública', async () => {
    renderizar('/mais/bloqueios/r1');
    expect(screen.getByText('Toda terça-feira · 14:00–15:00')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir bloqueio' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }));
    expect(excluirBloqueio).toHaveBeenCalledWith(TERAPIA, []);
    expect(await screen.findByText(/Lista: Bloqueio excluído/)).toBeInTheDocument();
  });

  it('bloqueio que não existe mais', () => {
    renderizar('/mais/bloqueios/sumiu');
    expect(screen.getByRole('alert')).toHaveTextContent('Não encontramos esse bloqueio');
  });
});
