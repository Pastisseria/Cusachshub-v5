// Generated with the complete production output, including lazy chunks.
const BASE = new URL('./', self.location.href);
const PREFIX = 'cusachs-shell-' + BASE.pathname + '-';
const CACHE = PREFIX + '__VERSION__';
const FILES = __FILES__;
const urls = FILES.map(file => new URL(file, BASE).href);
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urls)));
});
self.addEventListener('activate', event => {
 event.waitUntil(self.clients.claim());
 // Keep prior versions: already open tabs may still request their old chunks.
});
self.addEventListener('fetch', event => {
 const request=event.request, url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  // Serve HTML and assets from the SAME fully installed release.
  const cached=await cache.match(request.mode==='navigate'?new URL('index.html',BASE).href:request);
  if(cached)return cached;
  const old=await caches.match(request);if(old)return old;
  return fetch(request);
 })());
});
