import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { Pagina, Tabla, Campo } from "./limpieza.jsx";

const hoy = () => new Date().toISOString().slice(0, 10);
const inicial = { fecha: hoy(), hora_incidencia: "", area: "Temperaturas", descripcion: "", firma_incidencia: "", medida_correctora: "", fecha_correccion: hoy(), hora_correccion: "", firma_correccion: "", hay_albaran: false, numero_albaran: "", responsable: "", estado: "Abierta" };

export default function Incidencias() {
  const [datos, setDatos] = useState([]), [form, setForm] = useState(inicial), [mensaje, setMensaje] = useState("");
  async function cargar() { const { data, error } = await supabase.from("higiene_incidencias").select("*").order("fecha", { ascending: false }); if (!error) setDatos(data || []); }
  useEffect(() => { cargar(); }, []);
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
    };
    const { error } = await supabase.from("higiene_incidencias").insert(payload);
    setMensaje(error ? `No se pudo guardar: ${error.message}` : "Incidencia guardada correctamente.");
    if (!error) {
      setForm({ ...inicial, fecha: hoy(), fecha_correccion: hoy() });
      cargar();
    }
  }
  async function cambiar(id, estado) { await supabase.from("higiene_incidencias").update({ estado, cerrada_at: estado === "Cerrada" ? new Date().toISOString() : null }).eq("id", id); cargar(); }
  return <Pagina icono="⚠️" titulo="Registro de incidencias" texto="Versión digital del registro de incidencias y medidas correctoras.">
    <form className="control-form" onSubmit={guardar}>
      <div className="incidencia-bloques">
        <section className="incidencia-bloque"><h2>Incidencia</h2><label>Descripción *<textarea required rows="5" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}/></label><div className="control-grid"><label>Área<select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}><option>Temperaturas</option><option>Limpieza</option><option>Trazabilidad</option><option>Recepción</option><option>Instalaciones</option><option>Otro</option></select></label><label>Fecha *<input required type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}/></label><label>Hora<input type="time" value={form.hora_incidencia} onChange={e => setForm({ ...form, hora_incidencia: e.target.value })}/></label><Campo n="Firma / persona que detecta" v={form.firma_incidencia} c={v => setForm({ ...form, firma_incidencia: v })}/></div></section>
        <section className="incidencia-bloque"><h2>Medida correctora</h2><label>Medida adoptada *<textarea required rows="5" value={form.medida_correctora} onChange={e => setForm({ ...form, medida_correctora: e.target.value })}/></label><div className="control-grid"><label>Fecha<input type="date" value={form.fecha_correccion} onChange={e => setForm({ ...form, fecha_correccion: e.target.value })}/></label><label>Hora<input type="time" value={form.hora_correccion} onChange={e => setForm({ ...form, hora_correccion: e.target.value })}/></label><Campo n="Firma / responsable" v={form.firma_correccion} c={v => setForm({ ...form, firma_correccion: v, responsable: v })}/><label>¿Hay albarán?<select value={form.hay_albaran ? "si" : "no"} onChange={e => setForm({ ...form, hay_albaran: e.target.value === "si" })}><option value="no">No</option><option value="si">Sí</option></select></label>{form.hay_albaran && <label>Número de albarán<input value={form.numero_albaran} onChange={e => setForm({ ...form, numero_albaran: e.target.value })}/></label>}</div></section>
      </div><button type="submit" className="boton-control">Guardar registro de incidencia</button>
    </form>{mensaje && <p className="mensaje-control">{mensaje}</p>}
    <Tabla cab={["Incidencia", "Medida correctora", "Albarán", "Firmas", "Estado"]} datos={datos} fila={r => <tr key={r.id}><td><strong>{r.descripcion}</strong><small>{r.fecha} {r.hora_incidencia || ""} · {r.area}</small></td><td>{r.medida_correctora}<small>{r.fecha_correccion || ""} {r.hora_correccion || ""}</small></td><td>{r.hay_albaran ? (r.numero_albaran || "Sí") : "No"}</td><td>{r.firma_incidencia}<small>{r.firma_correccion}</small></td><td><select value={r.estado} onChange={e => cambiar(r.id, e.target.value)}><option>Abierta</option><option>En seguimiento</option><option>Cerrada</option></select></td></tr>}/>
  </Pagina>;
}
