// Incluído no service worker do PWA (workbox importScripts). Mostra a
// notificação das 18h enviada pelo GitHub Actions via Cloud Messaging e, no
// toque, abre (ou traz para a frente) o app em /lembretes.
self.addEventListener('push', (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = {};
  }
  const aviso = dados.notification || {};
  const link = (dados.data && dados.data.link) || '/lembretes';
  evento.waitUntil(
    self.registration.showNotification(aviso.title || 'Lembretes de amanhã', {
      body: aviso.body || 'Toque para enviar os lembretes das clientes.',
      icon: aviso.icon || '/icon-192.png',
      tag: aviso.tag || 'lembretes',
      data: { link },
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = new URL(evento.notification.data?.link || '/lembretes', self.location.origin)
    .href;
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((j) => j.url.startsWith(self.location.origin));
      if (aberta) return aberta.navigate(destino).then((j) => (j || aberta).focus());
      return self.clients.openWindow(destino);
    }),
  );
});
