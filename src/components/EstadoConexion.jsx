import { useEffect, useState } from "react";
import { EVENTO_CONEXION, estadoConexion } from "../lib/offline.js";
export default function EstadoConexion(){
 const [online,setOnline]=useState(estadoConexion());
 useEffect(()=>{const f=(e)=>setOnline(e.detail.online);window.addEventListener(EVENTO_CONEXION,f);return()=>window.removeEventListener(EVENTO_CONEXION,f)},[]);
 return <div className={online?"estado-conexion online":"estado-conexion offline"} role="status">{online?"● Online":"● Sin conexión · modo offline"}</div>;
}