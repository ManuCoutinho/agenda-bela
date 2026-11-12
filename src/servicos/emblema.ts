/**
 * Número no ícone do app instalado (Badging API; Chrome no Android e no
 * computador). Onde não existe, não faz nada.
 */
export function mostrarEmblema(quantidade: number) {
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  const pedido = quantidade > 0 ? nav.setAppBadge?.(quantidade) : nav.clearAppBadge?.();
  pedido?.catch(() => undefined); // sem permissão ou app não instalado: segue sem o número
}
