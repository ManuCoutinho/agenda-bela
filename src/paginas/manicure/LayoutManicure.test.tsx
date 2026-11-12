import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ContextoAuth, type EstadoAuth } from '../../hooks/contextoAuth';
import LayoutManicure from './LayoutManicure';

vi.mock('../../servicos/autenticacao', () => ({ sair: vi.fn() }));

function renderizar(estado: EstadoAuth) {
  return render(
    <ContextoAuth.Provider value={estado}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/entrar" element={<p>Tela de login</p>} />
          <Route element={<LayoutManicure />}>
            <Route index element={<p>Agenda de hoje</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ContextoAuth.Provider>,
  );
}

describe('LayoutManicure (RF01)', () => {
  it('manda para o login quem não entrou', () => {
    renderizar({ usuario: null, carregando: false, acessoNegado: false });
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('mostra a agenda e as 4 abas para quem entrou', () => {
    renderizar({
      usuario: { uid: 'u1', nome: 'Ju', email: 'ju@x.com' },
      carregando: false,
      acessoNegado: false,
    });
    expect(screen.getByText('Agenda de hoje')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(nav).toHaveTextContent('HojeAgendaClientesMais');
  });

  it('não redireciona enquanto o login ainda está carregando', () => {
    renderizar({ usuario: null, carregando: true, acessoNegado: false });
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
  });

  it('mostra "Acesso não permitido" para outra conta Google, sem as abas', () => {
    renderizar({
      usuario: { uid: 'outra', nome: 'Visita', email: 'visita@x.com' },
      carregando: false,
      acessoNegado: true,
    });
    expect(screen.getByRole('heading', { name: 'Acesso não permitido' })).toBeInTheDocument();
    expect(screen.getByText('visita@x.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar com outra conta' })).toBeInTheDocument();
    expect(screen.queryByText('Agenda de hoje')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
