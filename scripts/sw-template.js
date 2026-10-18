// Keep hashed assets available for tabs opened before an update.
const BASE = new URL('./', self.location.href);
const PREFIX = 'cusachs-shell-' + BASE.pathname + '-';
const CACHE = PREFIX + '__VERSION__';
const FILES = __FILES__;
const urls = FILES.map(file => new URL(file, BASE).href);
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urls)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
 event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
 const request=event.request, url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  // Online navigation must see the currently published HTML, not a pinned release.
  // Its hashed assets remain immutable; old tabs can still load their old chunks.
  if(request.mode==='navigate'){
   try {
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok)return response;
   } catch {}
   const html=await cache.match(new URL('index.html',BASE).href);
   if(html)return html;
   return fetch(request);
  }
  const cached=await cache.match(request);
  if(cached)return cached;
  const old=await caches.match(request);if(old)return old;
  return fetch(request);
 })());
});
