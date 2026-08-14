// 甜了么 Service Worker：页面走网络优先（保证每次拿到最新版），静态资源缓存优先，跨域（Supabase）只走网络
const CACHE = 'tianliaole-v3';
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
  // 只处理同源请求；Supabase 等跨域接口直接走网络
  if (url.origin !== self.location.origin) return;

  // 页面本身（导航请求）：网络优先，拿最新；失败再回退缓存
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const cp = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 其他静态资源：缓存优先，后台静默更新
  e.respondWith(
    caches.match(e.request).then(r => {
      const bg = fetch(e.request)
        .then(res => {
          const cp = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {});
          return res;
        })
        .catch(() => r);
      return r || bg;
    })
  );
});
