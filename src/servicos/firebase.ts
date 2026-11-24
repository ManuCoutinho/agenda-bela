import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const appId: string = import.meta.env.VITE_FIREBASE_APP_ID ?? '';

export const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId,
  // o número do projeto já vem no appId ("1:<número>:web:…"); o Cloud Messaging precisa dele
  messagingSenderId: appId.split(':')[1],
});

export const auth = getAuth(app);
export const google = new GoogleAuthProvider();
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// `VITE_USAR_EMULADOR=true` no .env.local aponta o app para o Emulator Suite
if (import.meta.env.VITE_USAR_EMULADOR === 'true') {
  // portas trocáveis para rodar ao lado de outro emulador (padrão do firebase.json)
  const portaAuth = import.meta.env.VITE_EMULADOR_PORTA_AUTH ?? '9099';
  const portaFirestore = Number(import.meta.env.VITE_EMULADOR_PORTA_FIRESTORE ?? 8080);
  connectAuthEmulator(auth, `http://localhost:${portaAuth}`, { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', portaFirestore);
}

/**
 * Offline (RNF06): o Firestore aplica a gravação no cache local na hora e só
 * resolve a promessa quando o servidor confirma. As telas não esperam: seguem
 * em frente e a gravação sincroniza quando houver internet.
 */
export function gravarEmSegundoPlano(gravacao: Promise<unknown>) {
  gravacao.catch((erro: unknown) => console.error('Falha ao sincronizar gravação', erro));
}
