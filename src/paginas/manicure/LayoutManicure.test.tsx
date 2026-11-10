import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ContextoAuth, type EstadoAuth } from '../../hooks/contextoAuth';
import LayoutManicure from './LayoutManicure';

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
    renderizar({ usuario: null, carregando: false });
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('mostra a agenda e as 4 abas para quem entrou', () => {
    renderizar({ usuario: { uid: 'u1', nome: 'Ju', email: 'ju@x.com' }, carregando: false });
    expect(screen.getByText('Agenda de hoje')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(nav).toHaveTextContent('HojeSemanaClientesMais');
  });

  it('não redireciona enquanto o login ainda está carregando', () => {
    renderizar({ usuario: null, carregando: true });
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
  });
});
