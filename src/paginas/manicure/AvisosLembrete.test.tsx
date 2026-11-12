import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ativarAvisos, estadoAvisos } from '../../servicos/notificacoes';
import AvisosLembrete from './AvisosLembrete';

vi.mock('../../servicos/notificacoes', () => ({ ativarAvisos: vi.fn(), estadoAvisos: vi.fn() }));

describe('Avisos de lembrete (RF11, opção B)', () => {
  beforeEach(() => {
    vi.mocked(ativarAvisos).mockReset();
    vi.mocked(estadoAvisos).mockReturnValue('desligado');
  });

  it('some onde não há como notificar', () => {
    vi.mocked(estadoAvisos).mockReturnValue('indisponivel');
    const { container } = render(<AvisosLembrete />);
    expect(container).toBeEmptyDOMElement();
  });

  it('liga os avisos com um toque', async () => {
    vi.mocked(ativarAvisos).mockResolvedValue('ativado');
    render(<AvisosLembrete />);
    await userEvent.click(screen.getByRole('button', { name: 'Ativar avisos de lembrete' }));
    expect(ativarAvisos).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Avisos ligados neste celular');
  });

  it('explica como desbloquear quando ela nega a permissão', async () => {
    vi.mocked(ativarAvisos).mockResolvedValue('bloqueado');
    render(<AvisosLembrete />);
    await userEvent.click(screen.getByRole('button', { name: 'Ativar avisos de lembrete' }));
    expect(screen.getByRole('status')).toHaveTextContent('Permissões → Notificações → Permitir');
  });
});
