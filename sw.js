const CACHE_NAME='itb-pwa-v0.47.0-chat-push';
const SHELL=['./','./index.html','./manifest.webmanifest','./assets/ted-app-icon-180-v0281.png','./assets/ted-app-icon-192-v0281.png','./assets/ted-app-icon-512-v0281.png','./assets/cert-diploma-template-v0390.jpg','./assets/cert-analitico-template-v0390.jpg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy)).catch(()=>{});
        return res;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>cached||fetch(req).then(res=>{
      const copy=res.clone();
      caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});
      return res;
    }))
  );
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const destination=new URL(event.notification.data?.url||'./',self.registration.scope);
  if(destination.origin!==self.location.origin)return;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{
    for(const client of list){
      if(!client.url.startsWith(self.registration.scope))continue;
      if('navigate' in client)await client.navigate(destination.href);
      return client.focus();
    }
    if(clients.openWindow)return clients.openWindow(destination.href);
  }));
});
// El click se registra antes de Firebase para conservar la navegación de la app.
try{
  importScripts('./firebase-config.js','https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js','https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging-compat.js');
  firebase.initializeApp(self.ITB_FIREBASE_CONFIG);
  firebase.messaging().onBackgroundMessage(payload=>{
    const d=payload.data||{};
    return self.registration.showNotification(d.title||'Academia TED',{
      body:d.body||'Tenés un nuevo aviso.',icon:'assets/ted-app-icon-192-v0281.png',badge:'assets/ted-app-icon-192-v0281.png',
      tag:d.tag||undefined,data:{url:d.target==='chatPage'?'./?open=chat':'./'}
    });
  });
}catch(e){console.warn('Notificaciones push no disponibles.',e);}
