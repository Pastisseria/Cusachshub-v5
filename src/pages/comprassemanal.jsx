import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";
import { ESTILOS_PRODUCCION, determinarZonaProduccion } from "./produccion.jsx";
import PedidosCompra from "./compras.jsx";

const normalizar = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const iso = (fecha) => [fecha.getFullYear(), String(fecha.getMonth()+1).padStart(2,"0"), String(fecha.getDate()).padStart(2,"0")].join("-");
function semana(fecha) {
  const lunes = new Date(fecha + "T12:00:00");
  lunes.setDate(lunes.getDate() - (lunes.getDay()+6)%7);
  return Array.from({length:7}, (_, i) => { const dia = new Date(lunes); dia.setDate(lunes.getDate()+i); return iso(dia); });
}

// Read every page: Supabase's default row limit must not silently truncate needs.
async function leerTodo(consulta) {
  const filas = [];
  for (let inicio = 0; ; inicio += 500) {
    const {data, error} = await consulta().range(inicio, inicio+499);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < 500) return filas;
  }
}

export default function ComprasSemanal() {
  const [fecha, setFecha] = useState(() => iso(new Date()));
  const [zona, setZona] = useState("Obrador");
  const [tipo, setTipo] = useState("confirmados");
  const [vista, setVista] = useState("semana");
  const [revision, setRevision] = useState(0);
  const [datos, setDatos] = useState({caterings:[], lineas:[]});
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const dias = useMemo(() => semana(fecha), [fecha]);
  const inicio = dias[0], fin = dias[6];

  useEffect(() => {
    let activo = true;
    async function cargar() {
      setCargando(true); setError(""); setDatos({caterings:[], lineas:[]});
      try {
        const caterings = await leerTodo(() => supabase.from("caterings")
          .select("id, titulo, fecha, hora_inicio, presupuesto_id, estado")
          .gte("fecha", inicio).lte("fecha", fin).order("id"));
        const ids = [...new Set(caterings.filter(c => normalizar(c.estado) !== "cancelado").map(c => c.presupuesto_id).filter(Boolean))];
        const lineas = [];
        for (let i=0; i<ids.length; i+=100) {
          const lote = ids.slice(i,i+100);
          lineas.push(...await leerTodo(() => supabase.from("presupuesto_lineas")
            .select("id, presupuesto_id, producto_id, descripcion, cantidad, productos(id, nombre, unidad, unidad_medida, zona_produccion, zona, seccion)")
            .in("presupuesto_id", lote).order("id")));
        }
        if (activo) setDatos({caterings, lineas});
      } catch (err) {
        if (activo) setError(err.message || "No se pudieron cargar las necesidades de compra.");
      } finally { if (activo) setCargando(false); }
    }
    cargar();
    return () => { activo = false; };
  }, [inicio, fin, revision]);

  const resumen = useMemo(() => {
    const porPresupuesto = new Map();
    const vistas = new Set();
    datos.lineas.forEach(linea => {
      if (vistas.has(String(linea.id))) return;
      vistas.add(String(linea.id));
      const clave = String(linea.presupuesto_id);
      if (!porPresupuesto.has(clave)) porPresupuesto.set(clave, []);
      porPresupuesto.get(clave).push(linea);
    });
    const grupos = {confirmados:new Map(), previsiones:new Map()};
    const caterings = new Set();
    datos.caterings.forEach(catering => {
      if (caterings.has(String(catering.id))) return;
      caterings.add(String(catering.id));
      const estado = normalizar(catering.estado);
      if (estado === "cancelado") return;
      const tipo = ["aceptado","confirmado"].includes(estado) ? "confirmados" : "previsiones";
      (porPresupuesto.get(String(catering.presupuesto_id)) || []).forEach(linea => {
        const cantidad = Number(linea.cantidad);
        if (!Number.isFinite(cantidad) || cantidad <= 0) return;
        const producto = linea.productos;
        const nombre = producto?.nombre || linea.descripcion || "Producto sin nombre";
        const unidad = producto?.unidad || producto?.unidad_medida || "unidades";
        const zona = determinarZonaProduccion(producto, nombre);
        const clave = JSON.stringify([zona, linea.producto_id || normalizar(nombre), normalizar(unidad)]);
        if (!grupos[tipo].has(clave)) grupos[tipo].set(clave, {clave, zona, nombre, unidad, total:0, dias:{}, origenes:new Set()});
        const fila = grupos[tipo].get(clave);
        fila.total += cantidad;
        fila.dias[catering.fecha] = (fila.dias[catering.fecha] || 0) + cantidad;
        fila.origenes.add(catering.titulo || "Catering");
      });
    });
    return Object.fromEntries(Object.entries(grupos).map(([tipo, mapa]) => [tipo, [...mapa.values()].sort((a,b) => a.nombre.localeCompare(b.nombre,"es"))]));
  }, [datos]);
  const filas = resumen[tipo].filter(fila => fila.zona === zona);
  const sinPresupuesto = datos.caterings.filter(c => normalizar(c.estado)!=="cancelado" && !c.presupuesto_id);
  function cambiarSemana(delta) {
    const dia = new Date(fecha+"T12:00:00"); dia.setDate(dia.getDate()+delta*7); setFecha(iso(dia));
  }
  const numero = valor => new Intl.NumberFormat("es-ES", {maximumFractionDigits:3}).format(valor);
  return <>
    <style>{ESTILOS_PRODUCCION}</style>
    <section className="panel produccion-panel">
      <div className="produccion-cabecera">
        <div><p className="produccion-etiqueta">Planificación semanal</p><h2>COMPRAS</h2>
          <p>Necesidades por producto de catering. Cantidades brutas, sin descontar existencias ni desglosar recetas.</p></div>
        <div className="produccion-acciones-cabecera">
          <button onClick={() => setVista(vista === "semana" ? "pedidos" : "semana")}>{vista === "semana" ? "Pedidos a proveedores" : "Volver a la semana"}</button>
          {vista === "semana" && <button disabled={cargando} onClick={() => setRevision(r => r+1)}>Actualizar</button>}
        </div>
      </div>
      {vista === "semana" && <>
        <div className="produccion-fecha-barra">
          <button onClick={() => cambiarSemana(-1)}>← Semana anterior</button>
          <label>Semana de <input aria-label="Fecha de la semana" type="date" value={fecha} onChange={e => { if(e.target.value) setFecha(e.target.value); }}/></label>
          <button onClick={() => setFecha(iso(new Date()))}>Hoy</button>
          <button onClick={() => cambiarSemana(1)}>Semana siguiente →</button>
        </div>
        <div className="produccion-acciones-cabecera" role="tablist" aria-label="Zona de compras">
          {["Obrador","Cocina","Barra"].map(z => <button role="tab" aria-selected={zona===z} key={z} onClick={() => setZona(z)}>{z}</button>)}
        </div>
        <div className="produccion-fecha-barra">
          <button aria-pressed={tipo==="confirmados"} onClick={() => setTipo("confirmados")}>Necesidades confirmadas</button>
          <button aria-pressed={tipo==="previsiones"} onClick={() => setTipo("previsiones")}>Previsiones (sin confirmar)</button>
        </div>
        {error && <p role="alert">{error}</p>}
        {cargando ? <p role="status">Calculando necesidades…</p> : !error && <>
          <h3>{zona} · {tipo === "confirmados" ? "Caterings aceptados y confirmados" : "Previsiones separadas"} · {inicio} — {fin}</h3>
          {sinPresupuesto.length > 0 && <p role="status">{sinPresupuesto.length} catering(s) sin presupuesto vinculado: sus necesidades no se pueden calcular.</p>}
          {filas.length === 0 ? <p>No hay necesidades para esta zona y semana.</p> :
          <div className="produccion-totales-tabla-contenedor" style={{overflowX:"auto"}}>
            <table className="produccion-totales-tabla">
              <thead><tr><th>Producto / unidad</th>{dias.map(d => <th key={d}>{new Intl.DateTimeFormat("es-ES", {weekday:"short", day:"2-digit", month:"2-digit"}).format(new Date(d+"T12:00:00"))}</th>)}<th>Total semanal</th></tr></thead>
              <tbody>{filas.map(fila => <tr key={fila.clave}><th scope="row">{fila.nombre}<small style={{display:"block"}}>{fila.unidad} · {Array.from(fila.origenes).join(", ")}</small></th>{dias.map(d => <td key={d}>{fila.dias[d] ? numero(fila.dias[d]) : "—"}</td>)}<td><strong>{numero(fila.total)} {fila.unidad}</strong></td></tr>)}</tbody>
            </table>
          </div>}
        </>}
      </>}
    </section>
    {vista === "pedidos" && <PedidosCompra/>}
  </>;
}
