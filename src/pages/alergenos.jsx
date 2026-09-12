import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";
import "../styles/alergenos.css";

const ALERGENOS = ["Gluten","Ous","Llet","Soja","Fruits amb closca","Sèsam","Cacauets","Crustacis","Mol·luscs","Peix","Api","Mostassa","Diòxids de sofre i sulfits","Tramussos"];
const VACIO = { producto: "", alergenos: [], trazas: [] };

export default function Alergenos() {
  const [filas,setFilas]=useState([]); const [busca,setBusca]=useState(""); const [filtro,setFiltro]=useState("");
  const [editando,setEditando]=useState(null); const [form,setForm]=useState(VACIO); const [mensaje,setMensaje]=useState("");
  async function cargar(){ const {data,error}=await supabase.from("higiene_alergenos").select("*").eq("activo",true).order("orden").order("producto"); if(error)setMensaje("No se ha podido cargar la lista."); else setFilas(data||[]); }
  useEffect(()=>{cargar();},[]);
  const visibles=useMemo(()=>filas.filter(f=>f.producto.toLowerCase().includes(busca.toLowerCase())&&(!filtro||(f.alergenos||[]).includes(filtro)||(f.trazas||[]).includes(filtro))),[filas,busca,filtro]);
  function toggle(campo,a){setForm(v=>({...v,[campo]:(v[campo]||[]).includes(a)?v[campo].filter(x=>x!==a):[...(v[campo]||[]),a]}));}
  function nuevo(){setEditando("nuevo");setForm(VACIO);}
  function editar(f){setEditando(f.id);setForm({producto:f.producto,alergenos:f.alergenos||[],trazas:f.trazas||[]});}
  async function guardar(){ if(!form.producto.trim())return setMensaje("Escribe el nombre del producto."); setMensaje("Guardando…"); let q; if(editando==="nuevo") q=await supabase.from("higiene_alergenos").insert({...form,producto:form.producto.trim(),orden:filas.length+1}); else q=await supabase.from("higiene_alergenos").update({...form,producto:form.producto.trim(),updated_at:new Date().toISOString()}).eq("id",editando); if(q.error)return setMensaje("No se ha podido guardar."); setEditando(null);setForm(VACIO);setMensaje("Guardado correctamente.");cargar(); }
  async function eliminar(id){if(!confirm("¿Eliminar este producto de la lista de alérgenos?"))return; await supabase.from("higiene_alergenos").update({activo:false,updated_at:new Date().toISOString()}).eq("id",id); cargar();}
  return <div className="alerg-page">
    <div className="alerg-head"><div><span className="alerg-kicker">FORMATO 12 · SANIDAD</span><h1>🌾 Lista de alérgenos</h1><p>Productos acabados, alérgenos y posibles trazas. Datos basados en la lista oficial de Pastisseria Cusachs.</p></div><div className="alerg-actions"><button onClick={nuevo}>＋ Añadir producto</button><button className="secondary" onClick={()=>window.print()}>🖨 Imprimir / PDF</button></div></div>
    {mensaje&&<div className="alerg-msg">{mensaje}</div>}
    <div className="alerg-tools"><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔎 Buscar producto…"/><select value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="">Todos los alérgenos</option>{ALERGENOS.map(a=><option key={a}>{a}</option>)}</select><strong>{visibles.length} productos</strong></div>
    <div className="alerg-legend"><b>● CONTIENE</b><span>○ No indicado</span><em>△ TRAZAS</em></div>
    <div className="alerg-table-wrap"><table className="alerg-table"><thead><tr><th className="prod">PRODUCTO ACABADO</th>{ALERGENOS.map(a=><th key={a}>{a}</th>)}<th className="no-print">Acciones</th></tr></thead><tbody>{visibles.map(f=><tr key={f.id}><td className="prod">{f.producto}</td>{ALERGENOS.map(a=><td key={a} className={(f.alergenos||[]).includes(a)?"si":(f.trazas||[]).includes(a)?"traza":""}>{(f.alergenos||[]).includes(a)?"●":(f.trazas||[]).includes(a)?"△":""}</td>)}<td className="row-actions no-print"><button onClick={()=>editar(f)}>Editar</button><button className="danger" onClick={()=>eliminar(f.id)}>Eliminar</button></td></tr>)}</tbody></table></div>
    {editando&&<div className="alerg-modal"><div className="alerg-card"><h2>{editando==="nuevo"?"Nuevo producto":"Editar producto"}</h2><label>Producto<input value={form.producto} onChange={e=>setForm({...form,producto:e.target.value})}/></label><h3>Contiene</h3><div className="checks">{ALERGENOS.map(a=><label key={a}><input type="checkbox" checked={form.alergenos.includes(a)} onChange={()=>toggle("alergenos",a)}/>{a}</label>)}</div><h3>Trazas</h3><div className="checks traces">{ALERGENOS.map(a=><label key={a}><input type="checkbox" checked={form.trazas.includes(a)} onChange={()=>toggle("trazas",a)}/>{a}</label>)}</div><div className="modal-actions"><button onClick={guardar}>Guardar</button><button className="secondary" onClick={()=>setEditando(null)}>Cancelar</button></div></div></div>}
  </div>;
}
