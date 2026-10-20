import { useEffect, useState } from 'react';
export default function EstadoConexion(){
 const [online,setOnline]=useState(navigator.onLine),[local,setLocal]=useState(false);
 useEffect(()=>{const update=()=>{setOnline(navigator.onLine);setLocal(false)},cached=()=>setLocal(true);window.addEventListener('online',update);window.addEventListener('offline',update);window.addEventListener('cusachs:datos-locales',cached);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);window.removeEventListener('cusachs:datos-locales',cached)}},[]);
 return !online||local?<div role="status" style={{position:'sticky',top:0,zIndex:10000,padding:10,background:'#fff0bf',color:'#382b00'}}>Modo local · Puedes consultar datos guardados y guardar copias de presupuestos en este dispositivo. No se envían a Supabase ni se sincronizan automáticamente.</div>:<div className="estado-conexion online" role="status">● Online</div>;
}
