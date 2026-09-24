import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { Pagina, Tabla, Campo } from "./limpieza.jsx";

const hoy = () => new Date().toISOString().slice(0, 10);
const inicial = { fecha: hoy(), hora_incidencia: "", area: "Temperaturas", descripcion: "", firma_incidencia: "", medida_correctora: "", fecha_correccion: hoy(), hora_correccion: "", firma_correccion: "", hay_albaran: false, numero_albaran: "", responsable: "", estado: "Abierta" };

export default function Incidencias() {
  const [datos, setDatos] = useState([]), [form, setForm] = useState(inicial), [mensaje, setMensaje] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  async function cargar() {
    const { data, error } = await supabase.from("higiene_incidencias").select("*").order("fecha", { ascending: false });
    if (!error) setDatos(data || []);
  }

  useEffect(() => { cargar(); }, []);

  function limpiarFormulario() {
    setForm({ ...inicial, fecha: hoy(), fecha_correccion: hoy() });
    setEditandoId(null);
  }

  function editar(registro) {
    setEditandoId(registro.id);
    setForm({
      fecha: registro.fecha || hoy(),
      hora_incidencia: registro.hora_incidencia?.slice(0, 5) || "",
      area: registro.area || "Temperaturas",
      descripcion: registro.descripcion || "",
      firma_incidencia: registro.firma_incidencia || "",
      medida_correctora: registro.medida_correctora || "",
      fecha_correccion: registro.fecha_correccion || hoy(),
      hora_correccion: registro.hora_correccion?.slice(0, 5) || "",
      firma_correccion: registro.firma_correccion || "",
      hay_albaran: Boolean(registro.hay_albaran),
      numero_albaran: registro.numero_albaran || "",
      responsable: registro.responsable || "",
      estado: registro.estado || "Abierta",
    });
    setMensaje("Editando incidencia. Modifica los datos y pulsa Guardar cambios.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardar(e) {
    e.preventDefault();
    setMensaje("");
    const responsable = (form.firma_correccion || form.firma_incidencia || "").trim();
    if (!form.descripcion.trim() || !form.medida_correctora.trim() || !responsable) {
      setMensaje("Completa la incidencia, la medida correctora y las firmas obligatorias.");
      return;
    }
    if (form.hay_albaran && !form.numero_albaran.trim()) {
      setMensaje("Indica el número de albarán o selecciona No.");
      return;
    }
    const payload = {
      ...form,
      descripcion: form.descripcion.trim(),
      medida_correctora: form.medida_correctora.trim(),
      firma_incidencia: form.firma_incidencia.trim(),
      firma_correccion: form.firma_correccion.trim(),
      responsable,
      hora_incidencia: form.hora_incidencia || null,
      fecha_correccion: form.fecha_correccion || null,
      hora_correccion: form.hora_correccion || null,
      numero_albaran: form.hay_albaran ? form.numero_albaran.trim() : null,
      cerrada_at: form.estado === "Cerrada" ? new Date().toISOString() : null,
    };

    const consulta = editandoId
      ? supabase.from("higiene_incidencias").update(payload).eq("id", editandoId)
      : supabase.from("higiene_incidencias").insert(payload);
    const { error } = await consulta;

    setMensaje(error ? `No se pudo guardar: ${error.message}` : editandoId ? "Incidencia actualizada correctamente." : "Incidencia guardada correctamente.");
    if (!error) {
      limpiarFormulario();
      cargar();
    }
  }

  async function cambiar(id, estado) {
    await supabase.from("higiene_incidencias").update({ estado, cerrada_at: estado === "Cerrada" ? new Date().toISOString() : null }).eq("id", id);
    cargar();
  }

  return <Pagina icono="⚠️" titulo="Registro de incidencias" texto="Versión digital del registro de incidencias y medidas correctoras.">
    <form className="control-form" onSubmit={guardar}>
      <div className="incidencia-bloques">
        <section className="incidencia-bloque"><h2>Incidencia</h2><label>Descripción *<textarea required rows="5" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}/></label><div className="control-grid"><label>Área<select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}><option>Temperaturas</option><option>Limpieza</option><option>Trazabilidad</option><option>Recepción</option><option>Instalaciones</option><option>Otro</option></select></label><label>Fecha *<input required type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}/></label><label>Hora<input type="time" value={form.hora_incidencia} onChange={e => setForm({ ...form, hora_incidencia: e.target.value })}/></label><Campo n="Firma / persona que detecta" v={form.firma_incidencia} c={v => setForm({ ...form, firma_incidencia: v })}/></div></section>
        <section className="incidencia-bloque"><h2>Medida correctora</h2><label>Medida adoptada *<textarea required rows="5" value={form.medida_correctora} onChange={e => setForm({ ...form, medida_correctora: e.target.value })}/></label><div className="control-grid"><label>Fecha<input type="date" value={form.fecha_correccion} onChange={e => setForm({ ...form, fecha_correccion: e.target.value })}/></label><label>Hora<input type="time" value={form.hora_correccion} onChange={e => setForm({ ...form, hora_correccion: e.target.value })}/></label><Campo n="Firma / responsable" v={form.firma_correccion} c={v => setForm({ ...form, firma_correccion: v, responsable: v })}/><label>¿Hay albarán?<select value={form.hay_albaran ? "si" : "no"} onChange={e => setForm({ ...form, hay_albaran: e.target.value === "si" })}><option value="no">No</option><option value="si">Sí</option></select></label>{form.hay_albaran && <label>Número de albarán<input value={form.numero_albaran} onChange={e => setForm({ ...form, numero_albaran: e.target.value })}/></label>} {editandoId && <label>Estado<select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}><option>Abierta</option><option>En seguimiento</option><option>Cerrada</option></select></label>}</div></section>
      </div>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button type="submit" className="boton-control">{editandoId ? "Guardar cambios" : "Guardar registro de incidencia"}</button>
        {editandoId && <button type="button" className="boton-control" onClick={() => { limpiarFormulario(); setMensaje("Edición cancelada."); }}>Cancelar edición</button>}
      </div>
    </form>{mensaje && <p className="mensaje-control">{mensaje}</p>}
    <Tabla cab={["Incidencia", "Medida correctora", "Albarán", "Firmas", "Estado", "Acciones"]} datos={datos} fila={r => <tr key={r.id}><td><strong>{r.descripcion}</strong><small>{r.fecha} {r.hora_incidencia || ""} · {r.area}</small></td><td>{r.medida_correctora}<small>{r.fecha_correccion || ""} {r.hora_correccion || ""}</small></td><td>{r.hay_albaran ? (r.numero_albaran || "Sí") : "No"}</td><td>{r.firma_incidencia}<small>{r.firma_correccion}</small></td><td><select value={r.estado} onChange={e => cambiar(r.id, e.target.value)}><option>Abierta</option><option>En seguimiento</option><option>Cerrada</option></select></td><td><button type="button" className="boton-control" onClick={() => editar(r)}>Editar</button></td></tr>}/>
  </Pagina>;
}
