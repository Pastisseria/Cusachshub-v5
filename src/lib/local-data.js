// Read-only snapshots, separated by project and user. Never queue mutations.
let userId=null;
export function setLocalUser(id){userId=id||null}
export function readLocal(key){try{return JSON.parse(localStorage.getItem(key))}catch{return null}}
export function writeLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{/* Full/disabled storage must not break startup. */}}
export function offlineFetch(project,network=fetch){return async(input,init={})=>{
 const url=new URL(input instanceof Request?input.url:String(input));
 const method=(init.method||input.method||'GET').toUpperCase();
 const rest=url.origin===new URL(project).origin&&url.pathname.startsWith('/rest/v1/');
 const headers=new Headers(init.headers||input.headers);
 const owner=userId;
 const key=owner&&rest&&method==='GET'?'cusachs:data:'+url.origin+':'+owner+':'+url.href+':'+JSON.stringify([...headers].filter(([k])=>!['authorization','apikey','x-client-info'].includes(k)).sort()):null;
 const local=async()=>{const saved=key&&await readSnapshot(key);if(!saved)throw new Error('Sin conexión: estos datos aún no están guardados en este dispositivo.');window.dispatchEvent(new Event('cusachs:datos-locales'));return new Response(saved.body,{status:200,headers:saved.headers})};
 if(!navigator.onLine){if(method!=='GET')throw new Error('Sin conexión: no se ha enviado ni guardado este cambio.');return local()}
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
 const signal=init.signal?AbortSignal.any([init.signal,controller.signal]):controller.signal;
 try{const response=await network(input,{...init,signal});if(key&&response.ok&&owner===userId){const body=await response.clone().text();await writeSnapshot(key,{body,headers:{'content-type':response.headers.get('content-type')||'application/json','content-range':response.headers.get('content-range')||''},savedAt:Date.now()})}return response}
 catch(error){if(key&&!init.signal?.aborted)return local();throw error}finally{clearTimeout(timer)}
}}

// IndexedDB accommodates document lists larger than localStorage's small quota.
// Existing localStorage snapshots remain readable after upgrading.
async function snapshotStore(mode, key, value) {
 if(typeof indexedDB==='undefined')return null;
 return new Promise(resolve=>{
  let db, done=false;
  const finish=result=>{if(done)return;done=true;clearTimeout(timer);db?.close();resolve(result)};
  const timer=setTimeout(()=>finish(null),2000);
  let open;
  try {open=indexedDB.open('cusachs-offline-data',1)} catch {finish(null);return}
  open.onupgradeneeded=()=>{open.result.createObjectStore('snapshots')};
  open.onerror=()=>finish(null);
  open.onblocked=()=>finish(null);
  open.onsuccess=()=>{
   db=open.result;if(done){db.close();return}
   try {
    const transaction=db.transaction('snapshots',mode);
    const store=transaction.objectStore('snapshots');
    const request=mode==='readonly'?store.get(key):store.put(value,key);
    transaction.oncomplete=()=>finish(mode==='readonly'?request.result:true);
    transaction.onerror=()=>finish(null);transaction.onabort=()=>finish(null);
   } catch {finish(null)}
  };
 });
}
async function readSnapshot(key){
 const database=await snapshotStore('readonly',key),legacy=readLocal(key);
 return (legacy?.savedAt || 0) > (database?.savedAt || 0) ? legacy : database || legacy;
}
async function writeSnapshot(key,value){
 // Keep small snapshots compatible with the previously shipped version.
 if(value.body.length<1500000)writeLocal(key,value);
 await snapshotStore('readwrite',key,value);
}
