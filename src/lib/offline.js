export const EVENTO_CONEXION='cusachs:conexion';
export function estadoConexion(){return navigator.onLine}
export function iniciarOffline(){
 const emitir=()=>window.dispatchEvent(new CustomEvent(EVENTO_CONEXION,{detail:{online:navigator.onLine}}));
 window.addEventListener('online',emitir);window.addEventListener('offline',emitir);
 if(window.Capacitor?.isNativePlatform?.()||!('serviceWorker' in navigator)||!import.meta.env.PROD)return;
 let controlado=Boolean(navigator.serviceWorker.controller);
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(!controlado){controlado=true;return;}
  if(document.getElementById('cusachs-aviso-version'))return;
  const aviso=document.createElement('div');
  aviso.id='cusachs-aviso-version';aviso.setAttribute('role','status');
  Object.assign(aviso.style,{position:'fixed',bottom:'20px',left:'20px',zIndex:'20000',padding:'16px',borderRadius:'12px',background:'#fff',color:'#302038',boxShadow:'0 4px 24px #0004'});
  aviso.append(document.createTextNode('Nueva versión disponible. '));
  const boton=document.createElement('button');boton.type='button';boton.textContent='Actualizar aplicación';
  boton.onclick=()=>window.location.reload();aviso.append(boton);document.body.append(aviso);
 });
 const registrar=async()=>{
  try{
   const registro=await navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js',{updateViaCache:'none'});
   const comprobar=()=>{if(navigator.onLine)registro.update().catch(console.error)};
   comprobar();window.addEventListener('online',comprobar);
   document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')comprobar()});
  }catch(error){console.error(error)}
 };
 if(document.readyState==='complete')registrar();else window.addEventListener('load',registrar,{once:true});
}
