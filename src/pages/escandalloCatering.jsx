import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabase.js";

const money = n => new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(Number(n)||0);
const number = n => Number(n)||0;
const defaultGastos = {personal:0,packaging:0,transporte_coste:0,otros:0,indirectos_pct:8};

export default function EscandalloCatering(){
 const navigate=useNavigate();
 const [params,setParams]=useSearchParams();
 const id=params.get("presupuesto_id");
 const [presupuestos,setPresupuestos]=useState([]);
 const [lineas,setLineas]=useState([]);
 const [costes,setCostes]=useState({});
 const [gastos,setGastos]=useState(defaultGastos);
 const [productos,setProductos]=useState({});
 const [escandallos,setEscandallos]=useState({});
 const [filtro,setFiltro]=useState("");
 const [error,setError]=useState("");
 const [mensaje,setMensaje]=useState("");
 const [cargando,setCargando]=useState(true);
 const [guardando,setGuardando]=useState(false);
 useEffect(()=>{let activo=true;(async()=>{try{
  const [p,pro,esc]=await Promise.all([
   supabase.from("presupuestos").select("id,numero,fecha,estado,cliente,numero_personas,base_imponible,subtotal,total,tipo_documento,clientes(nombre,empresa)").order("fecha",{ascending:false}).limit(1000),
   supabase.from("productos").select("id,coste,coste_estimado"),
   supabase.from("escandallos").select("producto_id,coste_total,rendimiento,unidades_producidas")
  ]);
  if(p.error)throw p.error;if(pro.error)throw pro.error;if(esc.error)throw esc.error;
  if(activo){setPresupuestos(p.data||[]);setProductos(Object.fromEntries((pro.data||[]).map(x=>[x.id,x])));setEscandallos(Object.fromEntries((esc.data||[]).filter(x=>x.producto_id).map(x=>[x.producto_id,x])));}
 }catch(e){if(activo)setError(e.message)}finally{if(activo)setCargando(false)}})();return()=>{activo=false}},[]);
 useEffect(()=>{let activo=true;setLineas([]);setCostes({});setGastos(defaultGastos);setMensaje("");if(!id)return;
 (async()=>{try{setCargando(true);setError("");
 const [l,c,g]=await Promise.all([
  supabase.from("presupuesto_lineas").select("id,producto_id,descripcion,cantidad,precio_unitario,subtotal,total_linea,descuento_porcentaje").eq("presupuesto_id",id).order("orden"),
  supabase.from("catering_escandallo_costes").select("presupuesto_linea_id,coste_unitario,origen").eq("presupuesto_id",id),
  supabase.from("catering_escandallo_gastos").select("*").eq("presupuesto_id",id).maybeSingle()
 ]);
 if(l.error)throw l.error;if(c.error)throw c.error;if(g.error)throw g.error;
 if(activo){setLineas(l.data||[]);setCostes(Object.fromEntries((c.data||[]).map(x=>[x.presupuesto_linea_id,x.coste_unitario===null?"":String(x.coste_unitario)])));setGastos(g.data||defaultGastos);}
 }catch(e){if(activo)setError(e.message)}finally{if(activo)setCargando(false)}})();return()=>{activo=false}},[id]);
 const actual=presupuestos.find(p=>p.id===id);
 const sugerencias=useMemo(()=>Object.fromEntries(lineas.map(l=>{const p=productos[l.producto_id];const e=escandallos[l.producto_id];const divisor=Number(e?.unidades_producidas||e?.rendimiento||0);const costeEsc=Number(e?.coste_total);if(e?.coste_total!=null&&divisor>0&&Number.isFinite(costeEsc))return [l.id,{coste:costeEsc/divisor,fuente:"Escandallo"}];const cp=p?.coste??p?.coste_estimado;if(cp!=null&&Number.isFinite(Number(cp)))return [l.id,{coste:Number(cp),fuente:"Producto"}];return [l.id,null]})),[lineas,productos,escandallos]);
 const efectivo=l=>costes[l.id]!==undefined&&costes[l.id]!==""?Number(costes[l.id]):sugerencias[l.id]?.coste;
 const resumen=useMemo(()=>{
  const faltantes=lineas.filter(l=>efectivo(l)==null);
  const costeProductos=lineas.reduce((s,l)=>s+(efectivo(l)!=null?efectivo(l)*number(l.cantidad):0),0);
  const extras=number(gastos.personal)+number(gastos.packaging)+number(gastos.transporte_coste)+number(gastos.otros);
  const indirectos=(costeProductos+extras)*number(gastos.indirectos_pct)/100;
  const coste=costeProductos+extras+indirectos;
  const venta=number(actual?.base_imponible??actual?.subtotal);
  return {faltantes,costeProductos,indirectos,coste,venta,beneficio:venta-coste,margen:venta>0?(venta-coste)/venta*100:null};
 },[lineas,costes,gastos,actual,sugerencias]);
 const opciones=presupuestos.filter(p=>!filtro||[p.numero,p.cliente,p.clientes?.nombre,p.clientes?.empresa,p.fecha].join(" ").toLowerCase().includes(filtro.toLowerCase()));
 async function guardar(){
  if(!actual)return;setGuardando(true);setError("");setMensaje("");
  try{
   const rows=lineas.filter(l=>costes[l.id]!==undefined&&costes[l.id]!=="").map(l=>({presupuesto_id:id,presupuesto_linea_id:l.id,coste_unitario:Number(costes[l.id]),origen:"manual",updated_at:new Date().toISOString()}));
   if(rows.some(x=>!Number.isFinite(x.coste_unitario)||x.coste_unitario<0))throw Error("Revisa los costes unitarios.");
   const {error:ge}=await supabase.from("catering_escandallo_gastos").upsert({presupuesto_id:id,...Object.fromEntries(Object.keys(defaultGastos).map(k=>[k,Number(gastos[k])])),updated_at:new Date().toISOString()},{onConflict:"presupuesto_id"});
   if(ge)throw ge;
   if(rows.length){const {error:ce}=await supabase.from("catering_escandallo_costes").upsert(rows,{onConflict:"presupuesto_linea_id"});if(ce)throw ce;}
   const {data:confirmacion,error:re}=await supabase.from("catering_escandallo_gastos").select("presupuesto_id").eq("presupuesto_id",id).maybeSingle();if(re)throw re;if(!confirmacion)throw Error("Supabase no confirmó el guardado. Comprueba permisos de administrador.");
   setMensaje("Costes guardados y verificados en Supabase.");
  }catch(e){setError(e.message)}finally{setGuardando(false)}
 }
 const inputStyle={width:"100%",maxWidth:140,padding:8};
 return <section style={{padding:20,maxWidth:1200,margin:"auto"}}>
  <h1>📊 Escandallos de Catering</h1>
  <p>Control interno de costes y rentabilidad. Los importes no aparecen en el presupuesto del cliente. Se propone el coste de producto o escandallo cuando existe una vinculación por ID; el coste manual tiene prioridad.</p>
  {error&&<p role="alert" style={{color:"#a32238"}}>{error}</p>}{mensaje&&<p role="status" style={{color:"#176b3a"}}>{mensaje}</p>}
  <label>Buscar presupuesto <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Cliente, número o fecha" style={{padding:8,margin:8}}/></label>
  <label>Seleccionar presupuesto <select value={id||""} onChange={e=>setParams(e.target.value?{presupuesto_id:e.target.value}:{})} style={{padding:8,maxWidth:"100%"}}>
   <option value="">Selecciona uno</option>{opciones.map(p=><option key={p.id} value={p.id}>{p.fecha} · {p.numero||"Sin número"} · {p.clientes?.empresa||p.clientes?.nombre||p.cliente||"Cliente"}</option>)}
  </select></label>
  {cargando&&<p>Cargando…</p>}
  {actual&&!cargando&&<>
   <h2>{actual.numero} · {actual.clientes?.empresa||actual.clientes?.nombre||actual.cliente}</h2>
   <p>Fecha: {actual.fecha} · Personas: {actual.numero_personas||"Sin indicar"}</p>
   <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
    <thead><tr><th>Producto</th><th>Cantidad</th><th>Coste unitario (€)</th><th>Coste total</th></tr></thead>
    <tbody>{lineas.map(l=><tr key={l.id}>
     <td>{l.descripcion||"Producto sin descripción"}</td><td>{l.cantidad}</td>
     <td><input type="number" min="0" step="0.0001" placeholder={sugerencias[l.id]?String(sugerencias[l.id].coste.toFixed(4)):"Pendiente"} style={inputStyle} value={costes[l.id]??""} onChange={e=>setCostes(v=>({...v,[l.id]:e.target.value}))}/>{sugerencias[l.id]&&<small style={{display:"block"}}>Automático: {sugerencias[l.id].fuente} · {money(sugerencias[l.id].coste)}</small>}</td>
     <td>{efectivo(l)!=null?money(efectivo(l)*number(l.cantidad)):"Pendiente"}</td>
    </tr>)}</tbody>
   </table></div>
   <h3>Otros gastos del catering</h3>
   <div style={{display:"flex",gap:15,flexWrap:"wrap"}}>{[["personal","Personal (€)"],["packaging","Packaging (€)"],["transporte_coste","Transporte: coste real (€)"],["otros","Otros gastos (€)"],["indirectos_pct","Indirectos (%)"]].map(([key,label])=><label key={key}>{label}<input type="number" min="0" step="0.01" style={{...inputStyle,display:"block"}} value={gastos[key]} onChange={e=>setGastos(v=>({...v,[key]:e.target.value}))}/></label>)}</div>
   <h3>Rentabilidad {resumen.faltantes.length?"(provisional)":""}</h3>
   <p>Venta sin IVA: <strong>{money(resumen.venta)}</strong> · Productos: {money(resumen.costeProductos)} · Indirectos: {money(resumen.indirectos)}</p>
   <p>Coste total registrado: <strong>{money(resumen.coste)}</strong> · Beneficio provisional: <strong>{money(resumen.beneficio)}</strong> · Margen provisional: <strong>{resumen.margen===null?"No calculable":resumen.margen.toFixed(1)+" %"}</strong></p>
   {resumen.faltantes.length>0&&<p role="alert" style={{color:"#9b5a00"}}>⚠ Faltan costes en {resumen.faltantes.length} líneas. El coste total y el margen no son definitivos.</p>}
   {resumen.margen!==null&&resumen.margen<55&&<p style={{color:"#a32238"}}>⚠ Margen inferior al objetivo del 55 %.</p>}
   {actual.numero_personas>0&&<p>Coste registrado por persona: {money(resumen.coste/actual.numero_personas)}</p>}
   <button type="button" onClick={guardar} disabled={guardando} style={{padding:12,background:"#bb4385",color:"white",border:0,borderRadius:6}}>{guardando?"Guardando…":"💾 Guardar costes"}</button>{" "}<button type="button" onClick={()=>navigate("/presupuestos")}>Volver a presupuestos</button>
  </>}
 </section>;
}
