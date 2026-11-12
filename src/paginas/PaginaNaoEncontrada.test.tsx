import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import PaginaNaoEncontrada from './PaginaNaoEncontrada';

describe('PaginaNaoEncontrada', () => {
  it('explica o erro e leva de volta ao início', () => {
    render(
      <MemoryRouter>
        <PaginaNaoEncontrada />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
    expect(screen.getByText('Erro 404')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para o início' })).toHaveAttribute('href', '/');
  });
});
