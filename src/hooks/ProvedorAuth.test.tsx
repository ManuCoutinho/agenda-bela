import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { observarUsuario, verificarAcesso, type Usuario } from '../servicos/autenticacao';
import ProvedorAuth from './ProvedorAuth';
import { useAuth } from './useAuth';

vi.mock('../servicos/autenticacao', () => ({ observarUsuario: vi.fn(), verificarAcesso: vi.fn() }));

const ANA: Usuario = { uid: 'u1', nome: 'Ana', email: 'ana@x.com' };

function Estado() {
  const { usuario, carregando, acessoNegado } = useAuth();
  return (
    <p>{`${usuario?.uid ?? '-'} ${carregando ? 'carregando' : 'pronto'} ${acessoNegado ? 'negado' : 'ok'}`}</p>
  );
}

function entrarCom(usuario: Usuario | null) {
  vi.mocked(observarUsuario).mockImplementation((aoMudar) => {
    aoMudar(usuario);
    return () => {};
  });
}

describe('ProvedorAuth (RF01)', () => {
  beforeEach(() => {
    vi.mocked(verificarAcesso).mockReset();
  });

  it('confere o acesso antes de liberar a conta', async () => {
    entrarCom(ANA);
    vi.mocked(verificarAcesso).mockResolvedValue('permitido');
    render(
      <ProvedorAuth>
        <Estado />
      </ProvedorAuth>,
    );
    expect(screen.getByText('u1 carregando ok')).toBeInTheDocument();
    expect(await screen.findByText('u1 pronto ok')).toBeInTheDocument();
  });

  it('marca acesso negado quando as regras recusam a conta', async () => {
    entrarCom(ANA);
    vi.mocked(verificarAcesso).mockResolvedValue('negado');
    render(
      <ProvedorAuth>
        <Estado />
      </ProvedorAuth>,
    );
    expect(await screen.findByText('u1 pronto negado')).toBeInTheDocument();
  });

  it('sem login não confere nada', () => {
    entrarCom(null);
    render(
      <ProvedorAuth>
        <Estado />
      </ProvedorAuth>,
    );
    expect(screen.getByText('- pronto ok')).toBeInTheDocument();
    expect(verificarAcesso).not.toHaveBeenCalled();
  });
});
