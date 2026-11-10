import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextoAuth } from '../../hooks/contextoAuth';
import { entrarComGoogle } from '../../servicos/autenticacao';
import Entrar from './Entrar';

vi.mock('../../servicos/autenticacao', () => ({ entrarComGoogle: vi.fn() }));

function renderizar() {
  return render(
    <ContextoAuth.Provider value={{ usuario: null, carregando: false }}>
      <MemoryRouter>
        <Entrar />
      </MemoryRouter>
    </ContextoAuth.Provider>,
  );
}

describe('Entrar (RF01)', () => {
  beforeEach(() => {
    vi.mocked(entrarComGoogle).mockReset();
  });

  it('entra com Google ao tocar no botão', async () => {
    vi.mocked(entrarComGoogle).mockResolvedValue('ok');
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Entrar com Google' }));
    expect(entrarComGoogle).toHaveBeenCalledOnce();
  });

  it('mostra mensagem do que fazer quando o login falha', async () => {
    vi.mocked(entrarComGoogle).mockImplementation(async () => {
      throw new Error('rede');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Entrar com Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('tente de novo');
  });
});
