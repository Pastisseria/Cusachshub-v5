const EVENTO = "cusachs:conexion";
export function estadoConexion(){ return typeof navigator === "undefined" ? true : navigator.onLine; }
export function iniciarOffline(){
  if (typeof window === "undefined") return;
  const emitir=()=>window.dispatchEvent(new CustomEvent(EVENTO,{detail:{online:navigator.onLine}}));
  window.addEventListener("online", emitir); window.addEventListener("offline", emitir);
  if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("/Cusachshub-v5/sw.js").catch(console.error),{once:true});
}
export const EVENTO_CONEXION=EVENTO;