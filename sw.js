// ═══════════════════════════════════════════════════════════
// SERVICE WORKER — precaches this app's own pages/assets so browsing the
// exercise library, dashboard, hospitals/research/about pages, and the AI
// coach still works with no connection after a first successful visit, and
// makes the app installable (manifest.webmanifest).
//
// Deliberately NOT claiming full offline coverage: the live camera pose
// tracking loads MediaPipe from a CDN, and the 3D anatomy panel is a live
// Sketchfab embed — both genuinely need a network connection, and this file
// doesn't pretend otherwise. What it DOES do for those is opportunistically
// cache whatever cross-origin requests succeed (see the fetch handler), so a
// second visit that was online at least once has a real chance of working.
//
// Bump SW_VERSION whenever a precached file's content changes so clients
// pick up the new copy instead of serving a stale cached one forever.
// ═══════════════════════════════════════════════════════════
const SW_VERSION='physiosync-v2';

// Only real, currently-linked local files — no point precaching dead assets
// nothing on the site actually loads (e.g. the unused self-hosted 3D model,
// which the site currently embeds via a live Sketchfab iframe instead).
const PRECACHE=[
  './',
  'index.html','exercises.html','account.html','hospitals.html','research.html','about.html',
  'styles.css','reveal.js','manifest.webmanifest',
  'favicon.png','physiosync-icon.png','physiosync-icon-white.png','physiosync-text-dark.png','physiosync-text-light.png',
  'hospitallogos/aga_khan.png','hospitallogos/indus_hospital.webp','hospitallogos/liaquat_national.png',
  'hospitallogos/south_city.png','hospitallogos/ziauddin.png'
];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(SW_VERSION).then(cache=>cache.addAll(PRECACHE)));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==SW_VERSION).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

// This app's own pages/scripts/styles use NETWORK-FIRST: a bug fix pushed to
// the live site must reach a returning user's browser on their very next
// visit, not "eventually, after however many visits it takes the old
// cache-first background-refresh to catch up." Cache is purely an offline
// fallback here, never the thing served by default while online.
function isAppShell(req){
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return false;
  return req.mode==='navigate'||/\.(html|js|css)$/.test(url.pathname)||url.pathname==='/'||url.pathname.endsWith('/');
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(isAppShell(e.request)){
    e.respondWith(
      fetch(e.request).then(res=>{
        if(res&&res.ok){
          const copy=res.clone();
          caches.open(SW_VERSION).then(cache=>cache.put(e.request,copy));
        }
        return res;
      }).catch(()=>caches.match(e.request)) // offline — fall back to whatever was last cached
    );
    return;
  }
  // Cross-origin CDN assets (MediaPipe, fonts, hospital logos) and other
  // static files genuinely don't change often, so cache-first with a
  // background refresh is still the right tradeoff for those.
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const network=fetch(e.request).then(res=>{
        // Cross-origin <script>/<link> loads normally come back as opaque
        // responses (status 0, ok:false) even on success — still safe and
        // useful to cache, just can't be inspected before storing.
        if(res&&(res.ok||res.type==='opaque')){
          const copy=res.clone();
          caches.open(SW_VERSION).then(cache=>cache.put(e.request,copy));
        }
        return res;
      }).catch(()=>cached); // offline and never cached — nothing more to do
      return cached||network;
    })
  );
});
