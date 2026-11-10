import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth, google } from './firebase';

export type Usuario = { uid: string; nome: string | null; email: string | null };

const paraUsuario = (u: User): Usuario => ({ uid: u.uid, nome: u.displayName, email: u.email });

export function observarUsuario(aoMudar: (usuario: Usuario | null) => void) {
  return onAuthStateChanged(auth, (u) => aoMudar(u ? paraUsuario(u) : null));
}

/** Abre o login Google; se o navegador bloquear a janela, usa redirecionamento. */
export async function entrarComGoogle(): Promise<'ok' | 'cancelado'> {
  try {
    await signInWithPopup(auth, google);
    return 'ok';
  } catch (e) {
    if (e instanceof FirebaseError) {
      if (e.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, google);
        return 'ok';
      }
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        return 'cancelado';
      }
    }
    throw e;
  }
}

export const sair = () => signOut(auth);
