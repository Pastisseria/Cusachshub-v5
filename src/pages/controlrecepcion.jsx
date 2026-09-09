import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase.js";
import { imagenAPdf } from "../services/imagenAPdf.js";
import "../styles/controlrecepcion.css";

const CONTROL_VACIO = { fecha_recepcion: new Date().toISOString().slice(0, 10), hora_recepcion: "", proveedor: "", temperatura: "", estado_revision: "pendiente", embalaje: "pendiente", etiquetado: "pendiente", caducidad: "pendiente", limpieza: "pendiente", transporte: "pendiente", observaciones: "" };
const CAMPOS_CONTROL = [["embalaje", "Envase / embalaje"], ["etiquetado", "Etiquetado"], ["caducidad", "Caducidad"], ["limpieza", "Limpieza"], ["transporte", "Transporte"]];

export default function ControlRecepcion() {
  const [registros, setRegistros] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(CONTROL_VACIO);
  const [mensaje, setMensaje] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const input = useRef(null);

  async function cargar() {
    const { data, error } = await supabase.from("higiene_control_recepcion").select("*").order("fecha_recepcion", { ascending: false }).order("created_at", { ascending: false });
    if (error) setMensaje(`No se pudo cargar el control: ${error.message}`); else setRegistros(data || []);
  }
  useEffect(() => { cargar(); }, []);

  async function subirTodos() {
    if (!archivos.length) return setMensaje("Selecciona una o varias fotos de albaranes.");
    setSubiendo(true);
    let guardados = 0;
    for (const archivo of archivos) {
      try {
        setMensaje(`Preparando ${guardados + 1} de ${archivos.length}: ${archivo.name}`);
        const pdf = await imagenAPdf(archivo);
        const seguro = pdf.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const ruta = `control-recepcion/${Date.now()}-${guardados}-${seguro}`;
        const subida = await supabase.storage.from("higiene-pdfs").upload(ruta, pdf, { contentType: "application/pdf" });
        if (subida.error) throw subida.error;
        const { error } = await supabase.from("higiene_control_recepcion").insert({ fecha_recepcion: new Date().toISOString().slice(0, 10), estado_revision: "pendiente", nombre_original: archivo.name, archivo_nombre: pdf.name, archivo_ruta: ruta, controles: {} });
        if (error) { await supabase.storage.from("higiene-pdfs").remove([ruta]); throw error; }
        guardados += 1;
      } catch (error) { setMensaje(`Se guardaron ${guardados}. Error en ${archivo.name}: ${error.message}`); setSubiendo(false); await cargar(); return; }
    }
    setArchivos([]); if (input.current) input.current.value = ""; setSubiendo(false); setMensaje(`${guardados} documentos guardados por separado como PDF.`); await cargar();
  }

  function revisar(registro) {
    const controles = registro.controles || {};
    setEditando(registro);
    setForm({ fecha_recepcion: registro.fecha_recepcion || CONTROL_VACIO.fecha_recepcion, hora_recepcion: registro.hora_recepcion?.slice(0, 5) || "", proveedor: registro.proveedor || "", temperatura: registro.temperatura ?? "", estado_revision: registro.estado_revision || "pendiente", observaciones: registro.observaciones || "", ...Object.fromEntries(CAMPOS_CONTROL.map(([clave]) => [clave, controles[clave] || "pendiente"])) });
  }

  async function guardarRevision(e) {
    e.preventDefault();
    const controles = Object.fromEntries(CAMPOS_CONTROL.map(([clave]) => [clave, form[clave]]));
    const { error } = await supabase.from("higiene_control_recepcion").update({ fecha_recepcion: form.fecha_recepcion, hora_recepcion: form.hora_recepcion || null, proveedor: form.proveedor.trim() || null, temperatura: form.temperatura === "" ? null : Number(form.temperatura), estado_revision: form.estado_revision, controles, observaciones: form.observaciones.trim() || null, revisado_at: new Date().toISOString() }).eq("id", editando.id);
    if (error) return setMensaje(`No se pudo guardar la revisión: ${error.message}`);
    setEditando(null); setMensaje("Control de recepción revisado y guardado."); await cargar();
  }

  async function abrir(registro) {
    const { data, error } = await supabase.storage.from("higiene-pdfs").createSignedUrl(registro.archivo_ruta, 120);
    if (error) setMensaje(error.message); else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  async function eliminar(registro) {
    if (!window.confirm(`¿Eliminar “${registro.archivo_nombre}”?`)) return;
    const { error } = await supabase.from("higiene_control_recepcion").delete().eq("id", registro.id);
    if (error) return setMensaje(error.message);
    await supabase.storage.from("higiene-pdfs").remove([registro.archivo_ruta]); setMensaje("Documento eliminado."); await cargar();
  }
  const pendientes = useMemo(() => registros.filter((registro) => registro.estado_revision === "pendiente").length, [registros]);

  return <main className="recepcion-page">
    <header><div><span>RECEPCIÓ DE MERCADERIES</span><h1>Control de recepción</h1><p>Cada foto se convierte en un PDF independiente para revisarlo y archivarlo.</p></div><strong>{pendientes} pendientes</strong></header>
    <section className="recepcion-upload"><label><input ref={input} type="file" multiple accept="image/*,application/pdf,.pdf" onChange={(e) => setArchivos([...e.target.files])} /><b>{archivos.length ? `${archivos.length} documentos seleccionados` : "Seleccionar fotos o PDF"}</b><small>Puedes marcar varias fotos; se guardarán una por una.</small></label>{archivos.length > 0 && <div className="recepcion-seleccion">{archivos.map((archivo) => <span key={`${archivo.name}-${archivo.lastModified}`}>📄 {archivo.name}</span>)}</div>}<button onClick={subirTodos} disabled={subiendo}>{subiendo ? "Convirtiendo y guardando…" : "Guardar cada documento como PDF"}</button></section>
    {mensaje && <p className="mensaje-control">{mensaje}</p>}
    {editando && <form className="recepcion-revision" onSubmit={guardarRevision}><div className="recepcion-form-title"><h2>Revisar documento</h2><button type="button" onClick={() => setEditando(null)}>×</button></div><div className="recepcion-grid"><label>Fecha<input type="date" value={form.fecha_recepcion} onChange={(e) => setForm({ ...form, fecha_recepcion: e.target.value })} /></label><label>Hora<input type="time" value={form.hora_recepcion} onChange={(e) => setForm({ ...form, hora_recepcion: e.target.value })} /></label><label>Proveedor<input value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} /></label><label>Temperatura °C<input type="number" step="0.1" value={form.temperatura} onChange={(e) => setForm({ ...form, temperatura: e.target.value })} /></label><label>Resultado<select value={form.estado_revision} onChange={(e) => setForm({ ...form, estado_revision: e.target.value })}><option value="pendiente">Pendiente</option><option value="conforme">Conforme</option><option value="incidencia">Incidencia</option></select></label></div><div className="recepcion-checks">{CAMPOS_CONTROL.map(([clave, etiqueta]) => <label key={clave}>{etiqueta}<select value={form[clave]} onChange={(e) => setForm({ ...form, [clave]: e.target.value })}><option value="pendiente">Pendiente</option><option value="conforme">Conforme</option><option value="no_conforme">No conforme</option></select></label>)}</div><label>Observaciones<textarea rows="3" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></label><button>Guardar revisión</button></form>}
    <section className="recepcion-lista"><h2>Documentos recibidos</h2>{registros.length === 0 ? <p>No hay documentos guardados.</p> : registros.map((registro) => <article key={registro.id}><div><span className={`recepcion-estado ${registro.estado_revision}`}>{registro.estado_revision}</span><strong>{registro.proveedor || "Proveedor pendiente"}</strong><small>{registro.fecha_recepcion} · {registro.archivo_nombre}</small></div><div className="recepcion-acciones"><button onClick={() => abrir(registro)}>Ver PDF</button><button onClick={() => revisar(registro)}>Revisar</button><button className="peligro" onClick={() => eliminar(registro)}>Eliminar</button></div></article>)}</section>
  </main>;
}
