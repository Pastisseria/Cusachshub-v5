import { useState } from "react";
import { supabase } from "../supabase.js";
import "./CateringChecklist.css";

const FECHA_ENVIO = "control_envio_facturar_at";
const FECHA_FACTURA = "control_facturado_at";
const fecha = value => value ? String(value).slice(0, 10).split("-").reverse().join("/") : "—";

export default function CateringChecklist({ caterings, presupuestos, clientes, mes, onActualizar }) {
  const [filtro, setFiltro] = useState("todos");
  const [guardando, setGuardando] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const filas = caterings.map(c => {
    const p = presupuestos.find(p => String(p.id) === String(c.presupuesto_id));
    const cliente = clientes.find(cliente => String(cliente.id) === String(c.cliente_id));
    return { ...c, numero: p?.numero || "Sin presupuesto", cliente: cliente?.empresa || cliente?.nombre || c.titulo || "Sin cliente", previo: Boolean(p?.facturado_externamente || p?.fecha_facturacion || p?.factura_id || /^(facturado|facturada|pagado|pagada)$/i.test(p?.estado || "")) };
  }).sort((a,b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora_inicio || "").localeCompare(String(b.hora_inicio || "")));
  const visibles = filas.filter(c => filtro === "todos" || (filtro === "envio" && !c[FECHA_ENVIO]) || (filtro === "factura" && !c[FECHA_FACTURA]));
  const enviados = filas.filter(c => c[FECHA_ENVIO]).length;
  const facturados = filas.filter(c => c[FECHA_FACTURA]).length;
  const preparado = filas.every(c => FECHA_ENVIO in c && FECHA_FACTURA in c);

  async function cambiar(c, campo, checked) {
    if (guardando) return;
    setGuardando(c.id); setError(""); setAviso("");
    try {
      if (!navigator.onLine) throw new Error("Conecta a Internet para guardar la confirmación.");
      const anterior = c[campo] || null;
      let consulta = supabase.from("caterings").update({ [campo]: checked ? new Date().toISOString() : null }).eq("id", c.id);
      consulta = anterior ? consulta.eq(campo, anterior) : consulta.is(campo, null);
      const { data, error: fallo } = await consulta.select(`id,${FECHA_ENVIO},${FECHA_FACTURA}`).single();
      if (fallo) throw fallo;
      if (!data || Boolean(data[campo]) !== checked) throw new Error("No se ha confirmado el guardado. Actualiza el listado y revisa el estado.");
      onActualizar(data);
      setAviso("Confirmación guardada.");
    } catch (e) { setError(e.message || "No se ha podido guardar. Actualiza el listado antes de intentarlo otra vez."); }
    finally { setGuardando(null); }
  }

  function descargar() {
    const celda = value => '"' + String(value ?? "").replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
    const csv = [["Fecha", "Cliente", "Presupuesto", "Envío confirmado", "Fecha confirmación envío", "Facturado confirmado", "Fecha confirmación factura", "Registro previo"], ...visibles.map(c => [fecha(c.fecha), c.cliente, c.numero, c[FECHA_ENVIO] ? "Sí" : "No", fecha(c[FECHA_ENVIO]), c[FECHA_FACTURA] ? "Sí" : "No", fecha(c[FECHA_FACTURA]), c.previo ? "Facturación registrada" : "Sin marca previa"])].map(row => row.map(celda).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `control-caterings-${mes}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="cc-listado" aria-label="Control de facturación de caterings">
    <h3>Checklist de facturación · {mes}</h3>
    <p>Comprueba el envío y la factura de cada servicio. Las casillas registran tu revisión manual; puedes desmarcarlas para corregirla.</p>
    <p className="cc-resumen">{filas.length} caterings · {enviados} envíos confirmados · {facturados} facturados confirmados · {filas.length - facturados} por revisar</p>
    <p>Una marca previa de facturación se muestra como referencia. La confirmación manual empieza sin marcar.</p>
    <div className="cc-herramientas no-imprimir"><label>Mostrar <select value={filtro} onChange={e => setFiltro(e.target.value)}><option value="todos">Todos</option><option value="envio">Sin envío confirmado</option><option value="factura">Sin factura confirmada</option></select></label><button type="button" onClick={descargar} disabled={!preparado}>Descargar listado CSV</button><button type="button" onClick={() => { document.body.classList.add("imprimiendo-checklist"); window.print(); document.body.classList.remove("imprimiendo-checklist"); }}>Imprimir listado / PDF</button></div>
    {!preparado && <p role="alert">El checklist está pendiente de activación en la base de datos. Todavía no se pueden guardar las casillas.</p>}
    {error && <p role="alert">{error}</p>}{aviso && <p role="status">{aviso}</p>}
    <div className="cc-tabla"><table><thead><tr><th>Fecha</th><th>Cliente / catering</th><th>Presupuesto</th><th>Registro previo</th><th>Enviado a facturar</th><th>Facturado confirmado</th></tr></thead><tbody>{visibles.map(c => <tr key={c.id}><td>{fecha(c.fecha)}</td><td>{c.cliente}<small>{c.titulo}</small></td><td>{c.numero}</td><td>{c.previo ? "Facturación registrada" : "Sin marca previa"}</td>{[FECHA_ENVIO, FECHA_FACTURA].map(campo => <td key={campo}><label><input type="checkbox" checked={Boolean(c[campo])} disabled={!preparado || guardando !== null} aria-label={`${campo === FECHA_ENVIO ? "Enviado a facturar" : "Facturado confirmado"}: ${c.titulo || c.numero}`} onChange={e => cambiar(c, campo, e.target.checked)} /> {c[campo] ? "Confirmado" : "Por revisar"}</label><small>{c[campo] ? fecha(c[campo]) : ""}</small></td>)}</tr>)}</tbody></table></div>
    {visibles.length === 0 && <p>No hay caterings para este filtro.</p>}
    <p className="cc-pie">Listado: {visibles.length} de {filas.length} caterings activos del mes. No incluye cancelados.</p>
  </section>;
}
