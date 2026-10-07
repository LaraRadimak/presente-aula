const CACHE='registro-docente-v16';
const ASSETS=['./','./index.html','./instalar.html','./descargar-windows.html','./styles.css','./app.js','./history.js','./academic.js','./appearance.js','./pwa.js','./jszip.min.js','./pdf-classic.min.js','./pdf-classic.worker.min.js','./manifest.webmanifest','./registro-192.png','./registro-512.png','./registro-180.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin||new URL(event.request.url).pathname.endsWith('.zip'))return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>caches.match('./index.html'))));
});
