import { createContext } from 'react';
import type { Usuario } from '../servicos/autenticacao';

/**
 * `carregando` cobre também a conferência de acesso: só depois dela se sabe se a
 * conta é a da dona da agenda (`acessoNegado`).
 */
export type EstadoAuth = { usuario: Usuario | null; carregando: boolean; acessoNegado: boolean };

export const ContextoAuth = createContext<EstadoAuth | null>(null);
