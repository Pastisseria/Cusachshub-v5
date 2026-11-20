import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { cargarProduccionesCompletas } from "../lib/cargar-producciones.js";

const ZONAS = ["Cocina", "Obrador"];
const FORMATO_TOTAL = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 6 });

function sumarPorProducto(lineas) {
  const grupos = new Map(ZONAS.map(zona => [zona, new Map()]));
  for (const linea of lineas) {
    const productos = grupos.get(linea.zona);
    const cantidad = Number(linea.cantidad);
    if (!productos || String(linea.estado || "").trim().toLowerCase() === "cancelado" || !Number.isFinite(cantidad)) continue;

    const nombre = String(linea.producto_nombre || "").trim() || "Producto sin nombre";
    const unidad = String(linea.unidad || "").trim() || "unidades";
    const clave = JSON.stringify([linea.producto_id || nombre.toLowerCase().replace(/\s+/g, " "), unidad.toLowerCase()]);
    const producto = productos.get(clave) || { clave, nombre, unidad, total: 0, terminado: 0 };
    producto.total += cantidad;
    if (String(linea.estado || "").trim().toLowerCase() === "terminado") producto.terminado += cantidad;
    productos.set(clave, producto);
  }
  return ZONAS.map(zona => ({
    zona,
    productos: [...grupos.get(zona).values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es") || a.unidad.localeCompare(b.unidad, "es")
    ),
  }));
}

function mesActual() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
}

export default function ProduccionTotal() {
  const [mes, setMes] = useState(mesActual);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    let vigente = true;
    const [anio, numeroMes] = mes.split("-").map(Number);
    const ultimoDia = new Date(anio, numeroMes, 0).getDate();

    async function cargar() {
      try {
        const { data, error } = await cargarProduccionesCompletas(supabase, {
          desde: `${mes}-01`,
          hasta: `${mes}-${ultimoDia}`,
        });
        if (error) throw error;
        if (vigente) setResultado({ mes, grupos: sumarPorProducto(data) });
      } catch (error) {
        if (vigente) setResultado({ mes, error: error.message || "No se ha podido cargar la producción del mes." });
      }
    }
    cargar();
    return () => { vigente = false; };
  }, [mes]);

  return <section className="panel">
    <h1>Producción total</h1>
    <p>Cantidades registradas en Producción para el mes seleccionado. La columna «Terminado» suma las cantidades marcadas como terminadas.</p>
    <label>Mes <input type="month" value={mes} onChange={event => {
      if (event.target.value && event.target.value !== mes) {
        setResultado(null);
        setMes(event.target.value);
      }
    }}/></label>

    {resultado?.mes !== mes ? <p role="status">Cargando producción del mes…</p> :
      resultado.error ? <p role="alert">{resultado.error}</p> :
      resultado.grupos.map(({ zona, productos }) => <section key={zona}>
        <h2>{zona}</h2>
        {productos.length ? <div className="tabla-responsive">
          <table>
            <thead><tr><th scope="col">Producto</th><th scope="col">Unidad</th><th scope="col">Total registrado</th><th scope="col">Terminado</th></tr></thead>
            <tbody>{productos.map(producto => <tr key={producto.clave}>
              <td>{producto.nombre}</td>
              <td>{producto.unidad}</td>
              <td><strong>{FORMATO_TOTAL.format(producto.total)}</strong></td>
              <td>{FORMATO_TOTAL.format(producto.terminado)}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p>No hay líneas de producción para este mes.</p>}
      </section>)}
  </section>;
}
