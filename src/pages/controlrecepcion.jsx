import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase.js";
import { imagenAPdf } from "../services/imagenAPdf.js";
import { crearPdfConSello } from "../services/selloRecepcionPdf.js";
import { leerControlRecepcion } from "../services/lectorControlRecepcion.js";
import "../styles/controlrecepcion.css";

const HOY = new Date().toISOString().slice(0, 10);
const CONTROL_VACIO = { fecha_recepcion: HOY, hora_recepcion: "", proveedor: "", responsable_recepcion: "", temperatura: "", temperatura_estado: "conforme", estado_revision: "pendiente", embalaje: "pendiente", caducidad_etiquetado: "pendiente", lote_etiquetado: "pendiente", aspecto_producto: "pendiente", transporte: "pendiente", posicion_sello: "abajo_izquierda", observaciones: "" };
const CAMPOS_CONTROL = [["embalaje", "Envase / embalaje"], ["caducidad_etiquetado", "Caducidad / etiquetado"], ["lote_etiquetado", "Lote / etiquetado"], ["aspecto_producto", "Aspecto del producto"], ["transporte", "Estado del transporte"]];

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
  useEffect(() => {
    function pegar(evento) {
      const pegados = [...(evento.clipboardData?.files || [])].filter((archivo) => archivo.type === "application/pdf" || archivo.type.startsWith("image/"));
      if (!pegados.length) return;
      evento.preventDefault();
      setArchivos((actuales) => [...actuales, ...pegados]);
      setMensaje(`${pegados.length} documento(s) pegado(s).`);
    }
    window.addEventListener("paste", pegar);
    return () => window.removeEventListener("paste", pegar);
  }, []);

  async function subirTodos() {
    if (!archivos.length) return setMensaje("Selecciona, arrastra o pega una foto o un PDF.");
    setSubiendo(true);
    let guardados = 0;
    for (const archivo of archivos) {
      try {
        setMensaje(`Leyendo ${guardados + 1} de ${archivos.length}: ${archivo.name}`);
        const lectura = await leerControlRecepcion(archivo, ({ estado, progreso }) => setMensaje(`${estado} · ${Math.round(progreso)}%`));
        const pdf = await imagenAPdf(archivo);
        const seguro = pdf.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const ruta = `control-recepcion/${Date.now()}-${guardados}-${seguro}`;
        const subida = await supabase.storage.from("higiene-pdfs").upload(ruta, pdf, { contentType: "application/pdf" });
        if (subida.error) throw subida.error;
        const { error } = await supabase.from("higiene_control_recepcion").insert({ fecha_recepcion: lectura.fecha_recepcion || HOY, hora_recepcion: lectura.hora_recepcion || null, proveedor: lectura.proveedor || null, responsable_recepcion: lectura.responsable_recepcion || null, temperatura: lectura.temperatura, estado_revision: lectura.estado_revision, nombre_original: archivo.name, archivo_nombre: pdf.name, archivo_ruta: ruta, controles: lectura.controles, sello_detectado: lectura.sello_detectado, lectura_automatica: lectura });
        if (error) { await supabase.storage.from("higiene-pdfs").remove([ruta]); throw error; }
        guardados += 1;
      } catch (error) { setMensaje(`Se guardaron ${guardados}. Error en ${archivo.name}: ${error.message}`); setSubiendo(false); await cargar(); return; }
    }
    setArchivos([]);
    if (input.current) input.current.value = "";
    setSubiendo(false);
    setMensaje(`${guardados} documento(s) leído(s) y guardado(s). Los que ya tenían sello no se volverán a sellar.`);
    await cargar();
  }

  function revisar(registro) {
    const controles = registro.controles || {};
    setEditando(registro);
    setForm({ ...CONTROL_VACIO, fecha_recepcion: registro.fecha_recepcion || HOY, hora_recepcion: registro.hora_recepcion?.slice(0, 5) || "", proveedor: registro.proveedor || "", responsable_recepcion: registro.responsable_recepcion || "", temperatura: registro.temperatura ?? "", temperatura_estado: controles.temperatura_estado || "conforme", estado_revision: registro.estado_revision || "pendiente", posicion_sello: registro.posicion_sello || "abajo_izquierda", observaciones: registro.observaciones || "", ...Object.fromEntries(CAMPOS_CONTROL.map(([clave]) => [clave, controles[clave] || "pendiente"])) });
  }
  function todoConforme() {
    setForm((actual) => ({ ...actual, estado_revision: "conforme", temperatura_estado: "conforme", ...Object.fromEntries(CAMPOS_CONTROL.map(([clave]) => [clave, "conforme"])) }));
  }

  async function guardarRevision(evento) {
    evento.preventDefault();
    if (form.estado_revision === "incidencia" && !form.observaciones.trim()) return setMensaje("Escribe una observación para guardar una incidencia.");
    setSubiendo(true);
    const controles = { temperatura_estado: form.temperatura_estado, ...Object.fromEntries(CAMPOS_CONTROL.map(([clave]) => [clave, form[clave]])) };
    try {
      let rutaSellada = editando.archivo_sellado_ruta;
      let nombreSellado = editando.archivo_sellado_nombre;
      if (!editando.sello_detectado) {
        const descarga = await supabase.storage.from("higiene-pdfs").download(editando.archivo_ruta);
        if (descarga.error) throw descarga.error;
        const original = new File([descarga.data], editando.archivo_nombre, { type: "application/pdf" });
        const sellado = await crearPdfConSello(original, { ...form, controles });
        rutaSellada = `control-recepcion/sellados/${editando.id}-${Date.now()}.pdf`;
        nombreSellado = sellado.name;
        const subida = await supabase.storage.from("higiene-pdfs").upload(rutaSellada, sellado, { contentType: "application/pdf" });
        if (subida.error) throw subida.error;
      }
      const { error } = await supabase.from("higiene_control_recepcion").update({ fecha_recepcion: form.fecha_recepcion, hora_recepcion: form.hora_recepcion || null, proveedor: form.proveedor.trim() || null, responsable_recepcion: form.responsable_recepcion.trim() || null, temperatura: form.temperatura === "" ? null : Number(form.temperatura), estado_revision: form.estado_revision, controles, posicion_sello: form.posicion_sello, observaciones: form.observaciones.trim() || null, archivo_sellado_nombre: nombreSellado, archivo_sellado_ruta: rutaSellada, revisado_at: new Date().toISOString() }).eq("id", editando.id);
      if (error) throw error;
    } catch (error) { setSubiendo(false); return setMensaje(`No se pudo guardar el control: ${error.message}`); }
    setSubiendo(false);
    setEditando(null);
    setMensaje(editando.sello_detectado ? "Lectura del sello confirmada y guardada." : "Control guardado y sello añadido al PDF.");
    await cargar();
  }

  async function abrir(registro, original = false) {
    const ruta = original ? registro.archivo_ruta : (registro.archivo_sellado_ruta || registro.archivo_ruta);
    const { data, error } = await supabase.storage.from("higiene-pdfs").createSignedUrl(ruta, 120);
    if (error) setMensaje(error.message); else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  async function eliminar(registro) {
    if (!window.confirm(`¿Eliminar “${registro.archivo_nombre}”?`)) return;
    const { error } = await supabase.from("higiene_control_recepcion").delete().eq("id", registro.id);
    if (error) return setMensaje(error.message);
    await supabase.storage.from("higiene-pdfs").remove([registro.archivo_ruta, registro.archivo_sellado_ruta].filter(Boolean));
    setMensaje("Documento eliminado.");
    await cargar();
  }
  const pendientes = useMemo(() => registros.filter((registro) => registro.estado_revision === "pendiente").length, [registros]);

  return <main className="recepcion-page">
    <header><div><span>RECEPCIÓ DE MERCADERIES</span><h1>Control de recepción</h1><p>Pega, sube o arrastra un albarán y añade el sello de recepción al propio PDF.</p></div><strong>{pendientes} pendientes</strong></header>
    <section className="recepcion-upload"><label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setArchivos((actuales) => [...actuales, ...e.dataTransfer.files]); }}><input ref={input} type="file" multiple accept="image/*,application/pdf,.pdf" onChange={(e) => setArchivos([...e.target.files])} /><b>{archivos.length ? `${archivos.length} documentos seleccionados` : "Pegar, arrastrar o seleccionar fotos y PDF"}</b><small>Copia un adjunto del correo y pulsa Ctrl + V en esta pantalla.</small></label>{archivos.length > 0 && <div className="recepcion-seleccion">{archivos.map((archivo) => <span key={`${archivo.name}-${archivo.lastModified}`}>📄 {archivo.name}</span>)}</div>}<button onClick={subirTodos} disabled={subiendo}>{subiendo ? "Convirtiendo y guardando…" : "Guardar documentos"}</button></section>
    {mensaje && <p className="mensaje-control">{mensaje}</p>}
    {editando && <form className="recepcion-revision" onSubmit={guardarRevision}><div className="recepcion-form-title"><h2>Completar y pegar sello</h2><button type="button" onClick={() => setEditando(null)}>×</button></div><div className="recepcion-toolbar"><button type="button" onClick={todoConforme}>✓ Todo conforme</button><button type="button" onClick={() => abrir(editando, true)}>Ver albarán original</button></div><div className="recepcion-grid"><label>Fecha<input required type="date" value={form.fecha_recepcion} onChange={(e) => setForm({ ...form, fecha_recepcion: e.target.value })} /></label><label>Hora<input required type="time" value={form.hora_recepcion} onChange={(e) => setForm({ ...form, hora_recepcion: e.target.value })} /></label><label>Proveedor<input required value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} /></label><label>Responsable<input required value={form.responsable_recepcion} onChange={(e) => setForm({ ...form, responsable_recepcion: e.target.value })} /></label><label>Temperatura °C<input type="number" step="0.1" value={form.temperatura} onChange={(e) => setForm({ ...form, temperatura: e.target.value })} /></label><label>Control temperatura<select value={form.temperatura_estado} onChange={(e) => setForm({ ...form, temperatura_estado: e.target.value })}><option value="conforme">Conforme</option><option value="no_conforme">No conforme</option></select></label><label>Resultado<select value={form.estado_revision} onChange={(e) => setForm({ ...form, estado_revision: e.target.value })}><option value="pendiente">Pendiente</option><option value="conforme">Aceptación</option><option value="incidencia">Devolución / incidencia</option></select></label><label>Posición del sello<select value={form.posicion_sello} onChange={(e) => setForm({ ...form, posicion_sello: e.target.value })}><option value="abajo_izquierda">Abajo izquierda</option><option value="abajo_derecha">Abajo derecha</option><option value="arriba_izquierda">Arriba izquierda</option><option value="arriba_derecha">Arriba derecha</option></select></label></div><div className="recepcion-checks">{CAMPOS_CONTROL.map(([clave, etiqueta]) => <label key={clave}>{etiqueta}<select value={form[clave]} onChange={(e) => setForm({ ...form, [clave]: e.target.value })}><option value="pendiente">Pendiente</option><option value="conforme">Conforme</option><option value="no_conforme">No conforme</option></select></label>)}</div><label>Observaciones<textarea rows="3" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></label><button disabled={subiendo}>{subiendo ? "Creando PDF sellado…" : "Guardar control y PDF sellado"}</button></form>}
    <section className="recepcion-lista"><h2>Documentos recibidos</h2>{registros.length === 0 ? <p>No hay documentos guardados.</p> : registros.map((registro) => <article key={registro.id}><div><span className={`recepcion-estado ${registro.estado_revision}`}>{registro.estado_revision}</span><strong>{registro.proveedor || "Proveedor pendiente"}</strong><small>{registro.fecha_recepcion} · {registro.archivo_sellado_nombre || registro.archivo_nombre}</small></div><div className="recepcion-acciones"><button onClick={() => abrir(registro)}>{registro.archivo_sellado_ruta ? "Ver PDF sellado" : "Ver PDF"}</button><button onClick={() => revisar(registro)}>{registro.archivo_sellado_ruta ? "Modificar sello" : "Completar sello"}</button><button className="peligro" onClick={() => eliminar(registro)}>Eliminar</button></div></article>)}</section>
  </main>;
}
