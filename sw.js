const CACHE_NAME = 'treino-pwa-v1';

// Apenas instala o service worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Intercepta as requisições para manter o PWA ativo
self.addEventListener('fetch', (event) => {
  // Como nosso site já usa o localStorage e cache local, 
  // este arquivo atua mais como uma "permissão" para o celular instalar o App.
});
