import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

function numero(valor) {
  const resultado = Number(String(valor ?? 0).replace(/[€\s]/g, "").replace(",", "."));
  return Number.isFinite(resultado) ? resultado : 0;
}
function euros(valor) { return numero(valor).toLocaleString("es-ES", { style: "currency", currency: "EUR" }); }
function fechaCorta(valor) { if (!valor) return "Sin fecha"; const texto=String(valor); if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) { const [a,m,d]=texto.split("-"); return `${d}/${m}/${a}`; } const f=new Date(valor); return Number.isNaN(f.getTime())?texto:f.toLocaleDateString("es-ES"); }
function fechaCompleta(valor) { if (!valor) return "Sin fecha"; const f=new Date(valor); return Number.isNaN(f.getTime())?String(valor):f.toLocaleString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}); }
function obtenerLineas(a) { const valor=a?.lineas ?? a?.lineas_confirmadas ?? a?.lineas_detectadas; if(Array.isArray(valor)) return valor; if(typeof valor==="string"){try{const x=JSON.parse(valor);return Array.isArray(x)?x:[];}catch{return [];}} return []; }
function nombreEstado(e){return {importado:"Importado",importado_con_errores:"Con errores",importado_pendiente_revision:"Pendiente",procesando_catalogo:"Procesando",pendiente_revision:"Pendiente",revisado:"Revisado",error:"Con error"}[e]||e||"Importado";}
function normalizar(a,origen){return {...a,_origen:origen,_key:`${origen}-${a.id}`,lineas:obtenerLineas(a)};}

function Albaranes(){
 const [albaranes,setAlbaranes]=useState([]),[seleccionado,setSeleccionado]=useState(null),[busqueda,setBusqueda]=useState(""),[filtroProveedor,setFiltroProveedor]=useState("todos"),[filtroEstado,setFiltroEstado]=useState("todos"),[cargando,setCargando]=useState(true),[error,setError]=useState(""),[mensaje,setMensaje]=useState("");
 useEffect(()=>{cargarAlbaranes();},[]);
 async function cargarAlbaranes(){
  setCargando(true);setError("");
  try{
   const [clasicos,v3]=await Promise.all([
    supabase.from("importaciones_albaran").select("*").order("created_at",{ascending:false}),
    supabase.from("importaciones_albaran_v3").select("*").order("created_at",{ascending:false}),
   ]);
   if(clasicos.error) throw clasicos.error;
   if(v3.error) throw v3.error;
   const todos=[...(clasicos.data||[]).map(a=>normalizar(a,"clasico")),...(v3.data||[]).map(a=>normalizar(a,"v3"))].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
   setAlbaranes(todos);
  }catch(e){setError(e.message||"No se han podido cargar los albaranes.");}finally{setCargando(false);}
 }
 const proveedores=useMemo(()=>[...new Set(albaranes.map(a=>a.proveedor_nombre).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es")),[albaranes]);
 const filtrados=useMemo(()=>{const t=busqueda.trim().toLowerCase();return albaranes.filter(a=>{const cp=filtroProveedor==="todos"||a.proveedor_nombre===filtroProveedor;const ce=filtroEstado==="todos"||(a.estado||"importado")===filtroEstado;const c=[a.proveedor_nombre,a.numero_albaran,a.fecha_albaran,a.archivo_nombre].filter(Boolean).join(" ").toLowerCase();return cp&&ce&&(!t||c.includes(t));});},[albaranes,busqueda,filtroProveedor,filtroEstado]);
 const resumen=useMemo(()=>({total:albaranes.length,importados:albaranes.filter(a=>!a.estado||a.estado==="importado").length,pendientes:albaranes.filter(a=>String(a.estado||"").includes("pendiente")||a.estado==="procesando_catalogo").length,importe:albaranes.reduce((s,a)=>s+numero(a.total),0)}),[albaranes]);
 async function abrirOriginal(a){setError("");if(a.archivo_url){window.open(a.archivo_url,"_blank","noopener,noreferrer");return;}if(a.archivo_ruta){const {data,error:e}=await supabase.storage.from("albaranes").createSignedUrl(a.archivo_ruta,3600);if(e){setError(e.message);return;}window.open(data.signedUrl,"_blank","noopener,noreferrer");return;}setError("Este albarán no tiene foto o PDF guardado.");}
 async function eliminarAlbaran(a){if(!window.confirm(`¿Eliminar el albarán ${a.numero_albaran||""}?`))return;const tabla=a._origen==="v3"?"importaciones_albaran_v3":"importaciones_albaran";const {error:e}=await supabase.from(tabla).delete().eq("id",a.id);if(e){setError(e.message);return;}setAlbaranes(x=>x.filter(i=>i._key!==a._key));setSeleccionado(null);setMensaje("Albarán eliminado.");}
 if(cargando)return <section className="panel"><p>Cargando albaranes guardados...</p></section>;
 return <section className="panel albaranes-archivo">
  <div className="cabecera-seccion"><div><p className="etiqueta">COMPRAS</p><h1>🗂️ Albaranes guardados</h1><p className="texto-secundario">Consulta todos los albaranes guardados, incluidos los del Lector Inteligente V3.</p></div><button type="button" onClick={cargarAlbaranes}>🔄 Actualizar</button></div>
  {error&&<div className="mensaje-error">{error}</div>}{mensaje&&<div className="mensaje-exito">{mensaje}</div>}
  <div className="albaranes-resumen"><article><span>Total guardados</span><strong>{resumen.total}</strong></article><article><span>Importados</span><strong>{resumen.importados}</strong></article><article><span>Pendientes</span><strong>{resumen.pendientes}</strong></article><article><span>Importe acumulado</span><strong>{euros(resumen.importe)}</strong></article></div>
  <div className="albaranes-filtros"><input type="search" value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Proveedor o número..."/><select value={filtroProveedor} onChange={e=>setFiltroProveedor(e.target.value)}><option value="todos">Todos los proveedores</option>{proveedores.map(p=><option key={p} value={p}>{p}</option>)}</select><select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}><option value="todos">Todos los estados</option><option value="importado">Importados</option><option value="importado_pendiente_revision">Pendientes V3</option><option value="importado_con_errores">Con errores V3</option><option value="procesando_catalogo">Procesando V3</option><option value="pendiente_revision">Pendientes</option><option value="revisado">Revisados</option><option value="error">Con error</option></select></div>
  <div className="tabla-responsive"><table className="tabla-albaranes"><thead><tr><th>Subido</th><th>Proveedor</th><th>N.º albarán</th><th>Fecha</th><th>Productos</th><th>Total</th><th>Estado</th><th>Original</th><th></th></tr></thead><tbody>{filtrados.length===0&&<tr><td colSpan="9">No hay albaranes guardados.</td></tr>}{filtrados.map(a=><tr key={a._key}><td>{fechaCompleta(a.created_at)}</td><td><strong>{a.proveedor_nombre||"Sin proveedor"}</strong></td><td>{a.numero_albaran||"Sin número"}</td><td>{fechaCorta(a.fecha_albaran)}</td><td>{obtenerLineas(a).length}</td><td><strong>{euros(a.total)}</strong></td><td>{nombreEstado(a.estado)}</td><td>{a.archivo_url||a.archivo_ruta?<button type="button" onClick={()=>abrirOriginal(a)}>👁 Ver</button>:"Sin archivo"}</td><td><button type="button" onClick={()=>setSeleccionado(a)}>Ver detalle</button></td></tr>)}</tbody></table></div>
  {seleccionado&&<div className="modal-fondo" onClick={()=>setSeleccionado(null)}><article className="modal-contenido modal-albaran" onClick={e=>e.stopPropagation()}><div className="modal-cabecera"><div><p className="etiqueta">ALBARÁN {seleccionado._origen==="v3"?"· LECTOR V3":""}</p><h2>{seleccionado.numero_albaran||"Sin número"}</h2><p>{seleccionado.proveedor_nombre||"Sin proveedor"}</p></div><button type="button" onClick={()=>setSeleccionado(null)}>×</button></div><div className="tabla-responsive"><table><thead><tr><th>Código</th><th>Producto</th><th>Cantidad</th><th>Unidad</th><th>Precio</th><th>IVA</th><th>Total</th></tr></thead><tbody>{obtenerLineas(seleccionado).map((l,i)=><tr key={`${seleccionado._key}-${i}`}><td>{l.codigo||"—"}</td><td>{l.descripcion||l.producto||l.nombre||"Sin descripción"}</td><td>{numero(l.cantidad)}</td><td>{l.unidad||"unidad"}</td><td>{euros(l.precio_unitario)}</td><td>{numero(l.iva)} %</td><td>{euros(l.total_linea||numero(l.cantidad)*numero(l.precio_unitario))}</td></tr>)}</tbody></table></div><div className="modal-acciones">{(seleccionado.archivo_url||seleccionado.archivo_ruta)&&<button type="button" onClick={()=>abrirOriginal(seleccionado)}>👁 Ver original</button>}<button type="button" className="boton-peligro" onClick={()=>eliminarAlbaran(seleccionado)}>🗑 Eliminar</button><button type="button" onClick={()=>setSeleccionado(null)}>Cerrar</button></div></article></div>}
 </section>;
}
export default Albaranes;
