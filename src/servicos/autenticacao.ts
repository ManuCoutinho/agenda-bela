import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db, google } from './firebase';

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

/**
 * As regras só deixam a dona da agenda ler `config/*` além de `config/publico`.
 * Lê um documento privado direto no servidor: recusa = outra conta Google.
 * Sem internet não dá para saber; segue como permitido (o cache só tem dados
 * de quem já teve acesso, e as telas avisam quando não carregam).
 */
export async function verificarAcesso(): Promise<'permitido' | 'negado'> {
  try {
    await getDocFromServer(doc(db, 'config', 'acesso'));
    return 'permitido';
  } catch (e) {
    return e instanceof FirebaseError && e.code === 'permission-denied' ? 'negado' : 'permitido';
  }
}
