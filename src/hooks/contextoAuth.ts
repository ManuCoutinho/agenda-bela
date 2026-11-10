import { createContext } from 'react';
import type { Usuario } from '../servicos/autenticacao';

export type EstadoAuth = { usuario: Usuario | null; carregando: boolean };

export const ContextoAuth = createContext<EstadoAuth | null>(null);
