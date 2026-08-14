// 甜了么 Service Worker：缓存应用壳，支持离线打开；跨域请求（Supabase）只走网络
const CACHE = 'tianliaole-v2';
const ASSETS = ['./', './index.html', './supabase-js.min.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // 只拦截同域请求（本 App 的静态资源）；Supabase 等跨域接口直接走网络
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(res => {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
