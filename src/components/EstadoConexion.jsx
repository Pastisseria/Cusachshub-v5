import { useEffect, useState } from 'react';
export default function EstadoConexion(){
 const [online,setOnline]=useState(navigator.onLine),[local,setLocal]=useState(false);
 useEffect(()=>{const update=()=>{setOnline(navigator.onLine);setLocal(false)},cached=()=>setLocal(true);window.addEventListener('online',update);window.addEventListener('offline',update);window.addEventListener('cusachs:datos-locales',cached);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);window.removeEventListener('cusachs:datos-locales',cached)}},[]);
 return !online||local?<div role="status" style={{position:'sticky',top:0,zIndex:10000,padding:10,background:'#fff0bf',color:'#382b00'}}>Modo de consulta local · Solo datos guardados en este dispositivo, que pueden estar desactualizados. Los cambios requieren Internet; no hay sincronización automática.</div>:<div className="estado-conexion online" role="status">● Online</div>;
}
