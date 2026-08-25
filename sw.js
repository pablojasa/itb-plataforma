const CACHE_NAME='itb-pwa-v0.46.8';
const SHELL=['./','./index.html','./manifest.webmanifest','./firebase-config.js','./assets/ted-app-icon-180-v0281.png','./assets/ted-app-icon-192-v0281.png','./assets/ted-app-icon-512-v0281.png','./assets/cert-diploma-template-v0390.jpg','./assets/cert-analitico-template-v0390.jpg'];

/* Firebase se inicializa sólo cuando firebase-config.js contiene datos reales.
 * Si todavía no fue configurado, la PWA sigue funcionando normalmente. */
try{
  importScripts('./firebase-config.js');
  const cfg=self.ITB_FIREBASE_CONFIG||{};
  if(cfg.apiKey&&cfg.projectId&&cfg.messagingSenderId&&cfg.appId){
    importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');
    firebase.initializeApp(cfg);
    const messaging=firebase.messaging();
    messaging.onBackgroundMessage(payload=>{
      const d=(payload&&payload.data)||{};
      const target=String(d.target||'');
      self.registration.showNotification(d.title||'Academia TED',{
        body:String(d.body||''),
        icon:'./assets/ted-app-icon-192-v0281.png',
        badge:'./assets/ted-app-icon-192-v0281.png',
        tag:d.tag||('itb-push-'+Date.now()),
        renotify:true,
        data:{target,reference_id:d.reference_id||'',url:'./?push='+(target||'home')}
      });
    });
  }
}catch(e){console.warn('Firebase Messaging no inicializado.',e);}

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy)).catch(()=>{});return res;}).catch(()=>caches.match('./index.html')));
    return;
  }
  if(url.pathname.endsWith('/firebase-config.js')){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});return res;}).catch(()=>caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});return res;})));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const data=event.notification.data||{},target=String(data.target||'');
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){
      if('focus' in client){client.postMessage({type:'ITB_NOTIFICATION_OPEN',target});return client.focus();}
    }
    if(self.clients.openWindow)return self.clients.openWindow(data.url||('./?push='+(target||'home')));
  }));
});
