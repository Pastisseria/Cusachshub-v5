import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, Save, Download } from "lucide-react";
import PageHeader from "./PageHeader.jsx";
import { supabase, supabaseConfigurado } from "../supabase.js";
import { loadLocal, makeId, saveLocal } from "../lib/storage.js";

export default function CrudPage({ title, description, table, fields, initialRows=[] }) {
  const [rows,setRows]=useState([]), [query,setQuery]=useState(""), [open,setOpen]=useState(false);
  const [editing,setEditing]=useState(null), [form,setForm]=useState({}), [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");

  const emptyForm=()=>Object.fromEntries(fields.map(f=>[f.name,f.default ?? (f.type==="checkbox" ? true : "")]));

  async function load(){
    setLoading(true); setMessage("");
    if(supabaseConfigurado){
      const {data,error}=await supabase.from(table).select("*").order("created_at",{ascending:false});
      if(error){ setMessage(`Supabase: ${error.message}. Se muestran datos locales.`); setRows(loadLocal(table,initialRows)); }
      else setRows(data || []);
    } else setRows(loadLocal(table,initialRows));
    setLoading(false);
  }
  useEffect(()=>{load()},[table]);

  function startNew(){ setEditing(null); setForm(emptyForm()); setOpen(true); }
  function startEdit(row){ setEditing(row.id); setForm({...row}); setOpen(true); }
  async function save(e){
    e.preventDefault();
    const payload={...form};
    fields.forEach(f=>{ if(f.type==="number" && payload[f.name]!=="") payload[f.name]=Number(payload[f.name]); });
    if(supabaseConfigurado){
      const result=editing ? await supabase.from(table).update(payload).eq("id",editing).select().single() : await supabase.from(table).insert(payload).select().single();
      if(result.error){setMessage(result.error.message);return;}
    } else {
      const next=editing ? rows.map(r=>r.id===editing?{...r,...payload}:r) : [{id:makeId(),created_at:new Date().toISOString(),...payload},...rows];
      setRows(next); saveLocal(table,next);
    }
    setOpen(false); setMessage("Guardado correctamente."); if(supabaseConfigurado) load();
  }
  async function remove(row){
    if(!confirm(`¿Eliminar “${row.nombre || row.cliente || row.producto || "este registro"}”?`)) return;
    if(supabaseConfigurado){ const {error}=await supabase.from(table).delete().eq("id",row.id); if(error){setMessage(error.message);return;} load(); }
    else { const next=rows.filter(r=>r.id!==row.id);setRows(next);saveLocal(table,next); }
  }
  function exportCsv(){
    const headers=fields.map(f=>f.label); const names=fields.map(f=>f.name);
    const csv=[headers,...rows.map(r=>names.map(n=>String(r[n]??"").replaceAll('"','""')))].map(a=>a.map(v=>`"${v}"`).join(";")).join("
");
    const blob=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${table}.csv`;a.click();URL.revokeObjectURL(a.href);
  }
  const filtered=useMemo(()=>rows.filter(r=>JSON.stringify(r).toLowerCase().includes(query.toLowerCase())),[rows,query]);
  return <>
    <PageHeader title={title} description={description} actions={<><button className="btn secondary" onClick={exportCsv}><Download size={17}/>Exportar</button><button className="btn" onClick={startNew}><Plus size={17}/>Nuevo</button></>}/>
    {!supabaseConfigurado && <div className="notice">Modo demostración: los datos se guardan en este navegador. Configura <code>.env</code> para usar Supabase.</div>}
    {message && <div className="message">{message}</div>}
    <section className="panel">
      <div className="toolbar"><div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar..."/></div><span>{filtered.length} registros</span></div>
      <div className="table-wrap"><table><thead><tr>{fields.slice(0,6).map(f=><th key={f.name}>{f.label}</th>)}<th>Acciones</th></tr></thead>
      <tbody>{loading?<tr><td colSpan="99">Cargando...</td></tr>:filtered.length===0?<tr><td colSpan="99" className="empty">No hay registros todavía.</td></tr>:filtered.map(row=><tr key={row.id}>{fields.slice(0,6).map(f=><td key={f.name}>{f.type==="checkbox"?(row[f.name]?"Sí":"No"):(row[f.name]??"—")}</td>)}<td className="actions"><button onClick={()=>startEdit(row)}><Pencil size={16}/></button><button onClick={()=>remove(row)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>
    </section>
    {open && <div className="modal-backdrop" onMouseDown={()=>setOpen(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>{editing?"Editar":"Nuevo registro"}</h2><button onClick={()=>setOpen(false)}><X/></button></div><form onSubmit={save}><div className="form-grid">{fields.map(f=><label key={f.name} className={f.full?"full":""}>{f.type!=="checkbox"&&<span>{f.label}{f.required?" *":""}</span>}{f.type==="textarea"?<textarea required={f.required} value={form[f.name]??""} onChange={e=>setForm({...form,[f.name]:e.target.value})}/>:f.type==="select"?<select required={f.required} value={form[f.name]??""} onChange={e=>setForm({...form,[f.name]:e.target.value})}><option value="">Selecciona...</option>{f.options.map(o=><option key={o} value={o}>{o}</option>)}</select>:f.type==="checkbox"?<span className="check"><input type="checkbox" checked={Boolean(form[f.name])} onChange={e=>setForm({...form,[f.name]:e.target.checked})}/>{f.label}</span>:<input type={f.type||"text"} required={f.required} step={f.step} value={form[f.name]??""} onChange={e=>setForm({...form,[f.name]:e.target.value})}/>}</label>)}</div><div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setOpen(false)}>Cancelar</button><button className="btn"><Save size={17}/>Guardar</button></div></form></div></div>}
  </>;
}
