import { arrayUnion, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { app, db } from './firebase';

const VAPID = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/** `config/notificacoes`: só a manicure lê e grava (regra de config/*). */
const destino = doc(db, 'config', 'notificacoes');

export type EstadoAvisos = 'indisponivel' | 'desligado' | 'ativado' | 'bloqueado';

/** O que dá para fazer neste aparelho, sem pedir nada à manicure. */
export function estadoAvisos(): EstadoAvisos {
  if (!VAPID || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'indisponivel';
  }
  if (Notification.permission === 'granted') return 'ativado';
  if (Notification.permission === 'denied') return 'bloqueado';
  return 'desligado';
}

/**
 * Pede permissão de notificação e guarda o endereço deste celular no
 * Cloud Messaging. O GitHub Actions avisa às 18h quando houver atendimento amanhã.
 */
export async function ativarAvisos(): Promise<EstadoAvisos> {
  if (estadoAvisos() === 'indisponivel') return 'indisponivel';
  const permissao = await Notification.requestPermission();
  if (permissao === 'denied') return 'bloqueado';
  if (permissao !== 'granted') return 'desligado';

  // o Cloud Messaging só é baixado quando a manicure ativa os avisos
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!(await isSupported())) return 'indisponivel';
  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID,
    serviceWorkerRegistration: await navigator.serviceWorker.ready,
  });
  await setDoc(
    destino,
    { tokens: arrayUnion(token), atualizadoEm: serverTimestamp() },
    { merge: true },
  );
  return 'ativado';
}
