import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const google = new GoogleAuthProvider();
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// `VITE_USAR_EMULADOR=true` no .env.local aponta o app para o Emulator Suite
if (import.meta.env.VITE_USAR_EMULADOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}

/**
 * Offline (RNF06): o Firestore aplica a gravação no cache local na hora e só
 * resolve a promessa quando o servidor confirma. As telas não esperam: seguem
 * em frente e a gravação sincroniza quando houver internet.
 */
export function gravarEmSegundoPlano(gravacao: Promise<unknown>) {
  gravacao.catch((erro: unknown) => console.error('Falha ao sincronizar gravação', erro));
}
