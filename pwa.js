(() => {
  'use strict';
  const installButton = document.querySelector('#installButton');
  let installPrompt = null;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  if (!installButton) return;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
  });
  installButton.addEventListener('click', async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      return;
    }
    alert('En iPhone o iPad: pulsa Compartir y selecciona “Añadir a pantalla de inicio”. En Android: abre el menú del navegador y selecciona “Instalar aplicación”.');
  });
})();
