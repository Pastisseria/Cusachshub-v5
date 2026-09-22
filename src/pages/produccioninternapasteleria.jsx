import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const PRODUCTOS = [
  "Croissants",
  "Ensaimadas",
  "Brioix",
  "Croissant de chocolate",
  "Croissants de mantega",
  "Coca crema",
  "Coca d'anís",
  "Cholita",
  "Xuixo",
];

const HOY = "2026-09-22";
const FIN = "2026-12-31";

function fechaValida(valor) {
  return valor >= HOY && valor <= FIN;
}

export default function ProduccionInternaPasteleria() {
  const [fecha, setFecha] = useState(HOY);
  const [cantidades, setCantidades] = useState({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const fechaBonita = useMemo(() => {
    const [y, m, d] = fecha.split("-");
    return `${d}/${m}/${y}`;
  }, [fecha]);

  useEffect(() => {
    cargarDia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  async function cargarDia() {
    setCargando(true);
    setMensaje("");
    const { data, error } = await supabase
      .from("produccion_interna_pasteleria")
      .select("*")
      .eq("fecha", fecha);

    if (error) {
      setMensaje(`No se pudo cargar el día: ${error.message}`);
      setCantidades({});
    } else {
      const nuevo = {};
      (data || []).forEach((fila) => {
        const nombre = fila.producto ?? fila.nombre_producto;
        const valor = fila.unidades ?? fila.cantidad ?? 0;
        if (nombre) nuevo[nombre] = valor;
      });
      setCantidades(nuevo);
    }
    setCargando(false);
  }

  function cambiarFecha(dias) {
    const actual = new Date(`${fecha}T12:00:00`);
    actual.setDate(actual.getDate() + dias);
    const siguiente = actual.toISOString().slice(0, 10);
    if (fechaValida(siguiente)) setFecha(siguiente);
  }

  async function guardar() {
    setGuardando(true);
    setMensaje("");

    const { error: errorBorrado } = await supabase
      .from("produccion_interna_pasteleria")
      .delete()
      .eq("fecha", fecha);

    if (errorBorrado) {
      setMensaje(`No se pudo guardar: ${errorBorrado.message}`);
      setGuardando(false);
      return;
    }

    const filas = PRODUCTOS.map((producto) => ({
      fecha,
      producto,
      unidades: Number(cantidades[producto] || 0),
    }));

    const { error } = await supabase
      .from("produccion_interna_pasteleria")
      .insert(filas);

    setMensaje(error ? `No se pudo guardar: ${error.message}` : "✓ Producción guardada correctamente");
    setGuardando(false);
  }

  return (
    <div className="produccion-interna-pasteleria">
      <div className="pip-cabecera no-print">
        <div>
          <h1>Producción interna Pastelería</h1>
          <p>Control diario de unidades producidas</p>
        </div>
        <button type="button" className="btn-secundario" onClick={() => window.print()}>🖨️ Imprimir A4</button>
      </div>

      <div className="pip-fecha no-print">
        <button type="button" onClick={() => cambiarFecha(-1)} disabled={fecha === HOY}>← Día anterior</button>
        <input type="date" min={HOY} max={FIN} value={fecha} onChange={(e) => fechaValida(e.target.value) && setFecha(e.target.value)} />
        <button type="button" onClick={() => cambiarFecha(1)} disabled={fecha === FIN}>Día siguiente →</button>
      </div>

      <section className="pip-hoja">
        <div className="pip-titulo-impresion">
          <h2>PASTISSERIA CUSACHS</h2>
          <h3>Producción interna Pastelería</h3>
          <strong>Fecha: {fechaBonita}</strong>
        </div>

        {cargando ? <p>Cargando…</p> : (
          <table className="pip-tabla">
            <thead><tr><th>Producto</th><th>Unidades</th></tr></thead>
            <tbody>
              {PRODUCTOS.map((producto) => (
                <tr key={producto}>
                  <td>{producto}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={cantidades[producto] ?? ""}
                      onChange={(e) => setCantidades((prev) => ({ ...prev, [producto]: e.target.value }))}
                      aria-label={`Unidades de ${producto}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="pip-firma"><span>Responsable: __________________________</span><span>Firma: __________________________</span></div>
      </section>

      <div className="pip-acciones no-print">
        <button type="button" className="btn-primario" onClick={guardar} disabled={guardando || cargando}>{guardando ? "Guardando…" : "Guardar día"}</button>
        {mensaje && <span className="pip-mensaje">{mensaje}</span>}
      </div>

      <style>{`
        .produccion-interna-pasteleria{max-width:1050px;margin:0 auto;padding:24px}.pip-cabecera,.pip-fecha,.pip-acciones{display:flex;align-items:center;justify-content:space-between;gap:14px}.pip-cabecera h1{margin:0}.pip-cabecera p{margin:6px 0 0;color:#666}.pip-fecha{justify-content:center;margin:24px 0}.pip-fecha button,.pip-fecha input,.pip-acciones button,.pip-cabecera button{padding:10px 14px;border:1px solid #bbb;border-radius:8px;background:#fff}.pip-hoja{background:#fff;border:1px solid #ddd;padding:28px}.pip-titulo-impresion{text-align:center;margin-bottom:22px}.pip-titulo-impresion h2{margin:0 0 5px;font-size:18px}.pip-titulo-impresion h3{margin:0 0 10px;font-size:22px}.pip-tabla{width:100%;border-collapse:collapse}.pip-tabla th,.pip-tabla td{border:1px solid #222;padding:11px 14px;text-align:left}.pip-tabla th:last-child,.pip-tabla td:last-child{width:160px;text-align:center}.pip-tabla input{width:100%;box-sizing:border-box;text-align:center;font-size:18px;padding:7px;border:1px solid #bbb;border-radius:5px}.pip-firma{display:flex;justify-content:space-between;gap:30px;margin-top:34px}.pip-acciones{margin-top:18px;justify-content:flex-start}.pip-acciones .btn-primario{background:#6d3b72;color:white;border-color:#6d3b72;font-weight:700}.pip-mensaje{font-weight:600}@media print{@page{size:A4 portrait;margin:14mm}.sidebar,.boton-menu-tablet,.fondo-menu-tablet,.no-print{display:none!important}.contenido{margin:0!important;padding:0!important}.produccion-interna-pasteleria{max-width:none;padding:0}.pip-hoja{border:0;padding:0}.pip-tabla input{border:0;font-size:16px}.pip-firma{margin-top:28px}body{background:#fff!important;color:#000!important}}
      `}</style>
    </div>
  );
}
