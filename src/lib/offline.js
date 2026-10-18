export const EVENTO_CONEXION='cusachs:conexion';
export function estadoConexion(){return navigator.onLine}
export function iniciarOffline(){
 const emitir=()=>window.dispatchEvent(new CustomEvent(EVENTO_CONEXION,{detail:{online:navigator.onLine}}));
 window.addEventListener('online',emitir);window.addEventListener('offline',emitir);
 // Capacitor loads dist locally; it must not depend on a web service worker.
 if(window.Capacitor?.isNativePlatform?.()||!('serviceWorker' in navigator)||!import.meta.env.PROD)return;
 const registrar=()=>navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js').catch(console.error);
 if(document.readyState==='complete')registrar();else window.addEventListener('load',registrar,{once:true});
}
