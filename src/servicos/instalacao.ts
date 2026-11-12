/**
 * Instalação do PWA (RNF02). O Chrome dispara `beforeinstallprompt` logo ao
 * abrir; guardamos o evento para o botão "Instalar agora" usar depois.
 */
type EventoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let pendente: EventoInstalar | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // o app mostra o próprio botão
    pendente = e as EventoInstalar;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    pendente = null;
    avisar();
  });
}

export const podeInstalarAgora = () => pendente !== null;

export const jaInstalado = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

/** Abre o pedido de instalação do navegador; `true` se ela aceitou. */
export async function instalarAgora(): Promise<boolean> {
  if (!pendente) return false;
  const evento = pendente;
  pendente = null;
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  avisar();
  return outcome === 'accepted';
}

export function aoMudarInstalacao(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}
