const CACHE_NAME = 'agenda-tarefas-cache V2';

const ARQUIVOS_OFFLINE = [
    './',
    './index.html',
    './manifest.json',
    './icone.png'
];

// Instala e salva os arquivos essenciais
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ARQUIVOS_OFFLINE))
            .then(() => self.skipWaiting())
    );
});

// Assume o controle imediatamente
self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

// Internet primeiro.
// Se estiver offline, usa o que foi salvo no cache.
self.addEventListener('fetch', event => {

    // Para páginas HTML
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const copia = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => cache.put('./index.html', copia));

                    return response;
                })
                .catch(() =>
                    caches.match('./index.html')
                )
        );

        return;
    }

    // Para os outros arquivos
    event.respondWith(
        caches.match(event.request)
            .then(cache => {

                if (cache) {
                    return cache;
                }

                return fetch(event.request)
                    .then(response => {

                        if (
                            !response ||
                            response.status !== 200 ||
                            response.type === 'opaque'
                        ) {
                            return response;
                        }

                        const copia = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, copia);
                            });

                        return response;
                    });
            })
    );
});2
