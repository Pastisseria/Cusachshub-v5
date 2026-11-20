import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { determinarZonaProduccion, normalizarTextoProduccion } from "../lib/zona-produccion.js";

const ZONAS = ["Cocina", "Obrador"];
const FORMATO_TOTAL = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 6 });

function sumarPorProducto(lineas) {
  const grupos = new Map(ZONAS.map(zona => [zona, new Map()]));
  for (const linea of lineas) {
    const nombre = String(linea.descripcion || linea.productos?.nombre || "").trim();
    const zona = determinarZonaProduccion(linea.productos, nombre, linea.departamento);
    const productos = grupos.get(zona);
    const cantidad = Number(linea.cantidad);
    if (!productos || !nombre || !Number.isFinite(cantidad) || cantidad <= 0) continue;

    const unidad = String(linea.unidad || linea.productos?.unidad || "").trim() || "unidades";
    const unidadNormalizada = normalizarTextoProduccion(unidad);
    const unidadAgrupada = ["u", "ud", "uds", "unidad", "unidades"].includes(unidadNormalizada) ? "unidades" : unidadNormalizada;
    const clave = JSON.stringify([normalizarTextoProduccion(nombre), unidadAgrupada]);
    const producto = productos.get(clave) || { clave, nombre, unidad: unidadAgrupada === "unidades" ? "unidades" : unidad, total: 0 };
    producto.total += cantidad;
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
        const lineas = [];
        const tamanoPagina = 500;
        while (vigente) {
          const { data, error, count } = await supabase
            .from("presupuesto_lineas")
            .select("id,descripcion,cantidad,unidad,departamento,productos(nombre,unidad,zona_produccion),presupuestos!inner(fecha,tipo_documento,estado,facturado_externamente,fecha_facturacion,factura_id)", { count: "exact" })
            .ilike("presupuestos.tipo_documento", "catering")
            .gte("presupuestos.fecha", `${mes}-01`)
            .lte("presupuestos.fecha", `${mes}-${ultimoDia}`)
            .order("id")
            .range(lineas.length, lineas.length + tamanoPagina - 1);
          if (error) throw error;
          lineas.push(...data);
          if (lineas.length >= count && count != null) break;
          if (!data.length && count != null) throw new Error("No se han podido cargar todas las líneas de presupuesto.");
          if (count == null && data.length < tamanoPagina) break;
        }
        if (vigente) setResultado({ mes, grupos: sumarPorProducto(lineas.filter(({ presupuestos: p }) => {
          const estado = normalizarTextoProduccion(p.estado);
          return estado !== "cancelado" && (["aceptado", "facturado", "facturada", "pagado", "pagada"].includes(estado) ||
            p.facturado_externamente || p.fecha_facturacion || p.factura_id);
        })) });
      } catch (error) {
        if (vigente) setResultado({ mes, error: error.message || "No se ha podido cargar la producción del mes." });
      }
    }
    cargar();
    return () => { vigente = false; };
  }, [mes]);

  return <section className="panel">
    <h1>Producción total</h1>
    <p>Cantidades de las líneas de los presupuestos de catering aceptados o facturados del mes, incluidas las introducidas a mano.</p>
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
            <thead><tr><th scope="col">Producto</th><th scope="col">Unidad</th><th scope="col">Total presupuestado</th></tr></thead>
            <tbody>{productos.map(producto => <tr key={producto.clave}>
              <td>{producto.nombre}</td>
              <td>{producto.unidad}</td>
              <td><strong>{FORMATO_TOTAL.format(producto.total)}</strong></td>
            </tr>)}</tbody>
          </table>
        </div> : <p>No hay productos de esta zona para este mes.</p>}
      </section>)}
  </section>;
}
