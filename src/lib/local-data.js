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
 const local=()=>{const saved=key&&readLocal(key);if(!saved)throw new Error('Sin conexión: estos datos aún no están guardados en este dispositivo.');window.dispatchEvent(new Event('cusachs:datos-locales'));return new Response(saved.body,{status:200,headers:saved.headers})};
 if(!navigator.onLine){if(method!=='GET')throw new Error('Sin conexión: no se ha enviado ni guardado este cambio.');return local()}
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
 const signal=init.signal?AbortSignal.any([init.signal,controller.signal]):controller.signal;
 try{const response=await network(input,{...init,signal});if(key&&response.ok&&owner===userId){const body=await response.clone().text();if(body.length<1500000)writeLocal(key,{body,headers:{'content-type':response.headers.get('content-type')||'application/json','content-range':response.headers.get('content-range')||''},savedAt:Date.now()})}return response}
 catch(error){if(key&&!init.signal?.aborted)return local();throw error}finally{clearTimeout(timer)}
}}
