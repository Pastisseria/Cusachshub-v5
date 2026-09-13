import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase.js";
import "../styles/modelosetiquetas.css";

const STORAGE_KEY = "cusachs_formato13_etiquetas_v1";
const TIPOS = [
  { id: "materia_prima", icono: "🧺", titulo: "Materia prima abierta", texto: "Envases y materias primas una vez abiertos." },
  { id: "intermedio", icono: "🥣", titulo: "Producto intermedio", texto: "Cremas, rellenos, masas y preparaciones." },
  { id: "elaborado", icono: "🍰", titulo: "Producto elaborado", texto: "Producto terminado preparado para conservar o vender." },
];

const hoy = () => new Date().toISOString().slice(0, 10);
const horaAhora = () => new Date().toTimeString().slice(0, 5);

function loteAutomatico(historial) {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const prefijo = `${dd}${mm}${yy}`;
  const usados = historial.filter((x) => (x.lote || "").startsWith(prefijo)).length + 1;
  return `${prefijo}-${String(usados).padStart(2, "0")}`;
}

function leerHistorial() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

export default function ModelosEtiquetas() {
  const [tipo, setTipo] = useState("intermedio");
  const [productos, setProductos] = useState([]);
  const [historial, setHistorial] = useState(leerHistorial);
  const [mensaje, setMensaje] = useState("");
  const [form, setForm] = useState({
    producto: "", fecha: hoy(), hora: horaAhora(), caducidad: "", lote: "",
    conservacion: "Refrigerado 0–4 °C", responsable: "", alergenos: [], trazas: [], observaciones: "",
  });

  useEffect(() => {
    let activo = true;
    supabase.from("higiene_alergenos").select("id,producto,alergenos,trazas,categoria").eq("activo", true).order("producto")
      .then(({ data }) => { if (activo) setProductos(data || []); });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!form.lote) setForm((v) => ({ ...v, lote: loteAutomatico(historial) }));
  }, [historial]);

  const tipoActual = useMemo(() => TIPOS.find((t) => t.id === tipo), [tipo]);
  const etiquetasHoy = useMemo(() => historial.filter((x) => x.fecha === hoy()).length, [historial]);
  const caducadas = useMemo(() => historial.filter((x) => x.caducidad && x.caducidad < hoy()).length, [historial]);
  const proximas = useMemo(() => {
    const manana = new Date(); manana.setDate(manana.getDate() + 1);
    const f = manana.toISOString().slice(0, 10);
    return historial.filter((x) => x.caducidad === f).length;
  }, [historial]);

  function seleccionarProducto(nombre) {
    const p = productos.find((x) => x.producto === nombre);
    setForm((v) => ({ ...v, producto: nombre, alergenos: p?.alergenos || [], trazas: p?.trazas || [] }));
  }

  function limpiar() {
    setForm({ producto: "", fecha: hoy(), hora: horaAhora(), caducidad: "", lote: loteAutomatico(historial), conservacion: "Refrigerado 0–4 °C", responsable: "", alergenos: [], trazas: [], observaciones: "" });
    setMensaje("");
  }

  function guardar() {
    if (!form.producto.trim()) return setMensaje("Escribe o selecciona el producto.");
    if (!form.fecha) return setMensaje("Indica la fecha de elaboración o apertura.");
    if (!form.caducidad) return setMensaje("Indica la fecha de caducidad o consumo.");
    const registro = { id: crypto.randomUUID?.() || String(Date.now()), tipo, ...form, creado_en: new Date().toISOString() };
    const nuevo = [registro, ...historial];
    setHistorial(nuevo);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevo));
    setMensaje("Etiqueta guardada. Ya puedes imprimirla.");
  }

  function cargarEtiqueta(item) {
    setTipo(item.tipo);
    setForm({ producto: item.producto, fecha: item.fecha, hora: item.hora || "", caducidad: item.caducidad || "", lote: item.lote || "", conservacion: item.conservacion || "", responsable: item.responsable || "", alergenos: item.alergenos || [], trazas: item.trazas || [], observaciones: item.observaciones || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function eliminar(id) {
    if (!confirm("¿Eliminar esta etiqueta del histórico de este dispositivo?")) return;
    const nuevo = historial.filter((x) => x.id !== id);
    setHistorial(nuevo);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevo));
  }

  return (
    <div className="etiq-page">
      <div className="etiq-head no-print">
        <div>
          <Link to="/higiene/preparacion-sanidad">← Preparación Sanidad</Link>
          <span className="etiq-kicker">FORMATO 13 · SANIDAD</span>
          <h1>🏷️ Modelos de etiquetas</h1>
          <p>Genera, imprime y consulta etiquetas para materias primas, productos intermedios y productos elaborados.</p>
        </div>
        <button className="etiq-secondary" onClick={limpiar}>＋ Nueva etiqueta</button>
      </div>

      <div className="etiq-stats no-print">
        <div><strong>{etiquetasHoy}</strong><span>Etiquetas hoy</span></div>
        <div><strong>{proximas}</strong><span>Caducan mañana</span></div>
        <div className={caducadas ? "danger" : ""}><strong>{caducadas}</strong><span>Caducadas</span></div>
      </div>

      <div className="etiq-tipos no-print">
        {TIPOS.map((t) => <button key={t.id} className={tipo === t.id ? "active" : ""} onClick={() => setTipo(t.id)}><span>{t.icono}</span><b>{t.titulo}</b><small>{t.texto}</small></button>)}
      </div>

      <div className="etiq-grid">
        <section className="etiq-form no-print">
          <h2>{tipoActual.icono} {tipoActual.titulo}</h2>
          <label>Producto
            <input list="productos-etiqueta" value={form.producto} onChange={(e) => seleccionarProducto(e.target.value)} placeholder="Selecciona o escribe un producto" />
            <datalist id="productos-etiqueta">{productos.map((p) => <option key={p.id} value={p.producto} />)}</datalist>
          </label>
          <div className="etiq-dos">
            <label>Fecha elaboración / apertura<input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></label>
            <label>Hora<input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></label>
          </div>
          <div className="etiq-dos">
            <label>Consumir antes de / caducidad<input type="date" value={form.caducidad} onChange={(e) => setForm({ ...form, caducidad: e.target.value })} /></label>
            <label>Lote<input value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} /></label>
          </div>
          <label>Conservación<select value={form.conservacion} onChange={(e) => setForm({ ...form, conservacion: e.target.value })}><option>Refrigerado 0–4 °C</option><option>Congelado ≤ -18 °C</option><option>Temperatura ambiente</option><option>Otro</option></select></label>
          <label>Responsable<input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} placeholder="Nombre o iniciales" /></label>
          <label>Observaciones<input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} placeholder="Opcional" /></label>

          <div className="etiq-alergenos">
            <b>⚠️ ALÉRGENOS</b>
            {form.alergenos.length ? <p>{form.alergenos.join(" · ")}</p> : <p className="muted">No hay alérgenos marcados para este producto.</p>}
            {form.trazas.length > 0 && <small>Puede contener trazas de: {form.trazas.join(" · ")}</small>}
          </div>

          {mensaje && <div className="etiq-msg">{mensaje}</div>}
          <div className="etiq-actions"><button onClick={guardar}>💾 Guardar</button><button className="etiq-secondary" onClick={() => window.print()}>🖨️ Imprimir etiqueta</button></div>
          <small className="etiq-note">Durante esta prueba el histórico se guarda en este navegador. No se modifica ninguna tabla de Supabase.</small>
        </section>

        <section className="etiq-preview-wrap">
          <h2 className="no-print">Vista previa</h2>
          <div className="etiq-preview">
            <div className="etiq-brand">PASTISSERIA CUSACHS</div>
            <div className="etiq-producto">{form.producto || "NOMBRE DEL PRODUCTO"}</div>
            <div className="etiq-linea"><span>{tipoActual.titulo}</span></div>
            <div className="etiq-datos">
              <p><b>{tipo === "materia_prima" ? "Apertura" : "Elaboración"}:</b> {form.fecha || "—"}{form.hora ? ` · ${form.hora}` : ""}</p>
              <p><b>Consumir antes de:</b> {form.caducidad || "—"}</p>
              <p><b>Lote:</b> {form.lote || "—"}</p>
              <p><b>Conservación:</b> {form.conservacion || "—"}</p>
              {form.responsable && <p><b>Responsable:</b> {form.responsable}</p>}
            </div>
            {(form.alergenos.length > 0 || form.trazas.length > 0) && <div className="etiq-preview-alerg"><b>ALÉRGENOS:</b> {form.alergenos.join(" · ") || "—"}{form.trazas.length > 0 && <small>TRAZAS: {form.trazas.join(" · ")}</small>}</div>}
            {form.observaciones && <div className="etiq-observaciones">{form.observaciones}</div>}
          </div>
        </section>
      </div>

      <section className="etiq-historial no-print">
        <div className="etiq-hist-head"><div><h2>Histórico de etiquetas</h2><p>Etiquetas guardadas en este dispositivo.</p></div><strong>{historial.length} registros</strong></div>
        {historial.length === 0 ? <div className="etiq-vacio">Todavía no has guardado ninguna etiqueta.</div> : <div className="etiq-table-wrap"><table><thead><tr><th>Producto</th><th>Tipo</th><th>Fecha</th><th>Caducidad</th><th>Lote</th><th>Acciones</th></tr></thead><tbody>{historial.map((x) => <tr key={x.id}><td><b>{x.producto}</b></td><td>{TIPOS.find((t) => t.id === x.tipo)?.titulo || x.tipo}</td><td>{x.fecha}</td><td className={x.caducidad && x.caducidad < hoy() ? "caducada" : ""}>{x.caducidad || "—"}</td><td>{x.lote}</td><td><button onClick={() => cargarEtiqueta(x)}>🖨️ Reimprimir</button><button className="delete" onClick={() => eliminar(x.id)}>Eliminar</button></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
