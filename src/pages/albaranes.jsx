import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

function numero(valor) {
  const resultado = Number(String(valor ?? 0).replace(/[€\s]/g, "").replace(",", "."));
  return Number.isFinite(resultado) ? resultado : 0;
}

function euros(valor) {
  return numero(valor).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function fechaCorta(valor) {
  if (!valor) return "Sin fecha";
  const texto = String(valor);

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [anio, mes, dia] = texto.split("-");
    return `${dia}/${mes}/${anio}`;
  }

  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? texto : fecha.toLocaleDateString("es-ES");
}

function fechaCompleta(valor) {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime())
    ? String(valor)
    : fecha.toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function obtenerLineas(albaran) {
  if (Array.isArray(albaran?.lineas)) return albaran.lineas;

  if (typeof albaran?.lineas === "string") {
    try {
      const lineas = JSON.parse(albaran.lineas);
      return Array.isArray(lineas) ? lineas : [];
    } catch {
      return [];
    }
  }

  return [];
}

function nombreEstado(estado) {
  return {
    importado: "Importado",
    pendiente_revision: "Pendiente",
    revisado: "Revisado",
    error: "Con error",
  }[estado] || estado || "Importado";
}

function Albaranes() {
  const [albaranes, setAlbaranes] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarAlbaranes();
  }, []);

  async function cargarAlbaranes() {
    setCargando(true);
    setError("");

    try {
      const { data, error: errorConsulta } = await supabase
        .from("importaciones_albaran")
        .select("*")
        .order("created_at", { ascending: false });

      if (errorConsulta) throw errorConsulta;
      setAlbaranes(data || []);
    } catch (errorCarga) {
      setError(errorCarga.message || "No se han podido cargar los albaranes.");
    } finally {
      setCargando(false);
    }
  }

  const proveedores = useMemo(
    () =>
      [...new Set(albaranes.map((a) => a.proveedor_nombre).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "es")),
    [albaranes],
  );

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return albaranes.filter((albaran) => {
      const coincideProveedor =
        filtroProveedor === "todos" ||
        albaran.proveedor_nombre === filtroProveedor;

      const coincideEstado =
        filtroEstado === "todos" ||
        (albaran.estado || "importado") === filtroEstado;

      const contenido = [
        albaran.proveedor_nombre,
        albaran.numero_albaran,
        albaran.fecha_albaran,
        albaran.archivo_nombre,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return coincideProveedor && coincideEstado && (!texto || contenido.includes(texto));
    });
  }, [albaranes, busqueda, filtroProveedor, filtroEstado]);

  const resumen = useMemo(
    () => ({
      total: albaranes.length,
      importados: albaranes.filter((a) => !a.estado || a.estado === "importado").length,
      pendientes: albaranes.filter((a) => a.estado === "pendiente_revision").length,
      importe: albaranes.reduce((suma, a) => suma + numero(a.total), 0),
    }),
    [albaranes],
  );

  async function abrirOriginal(albaran) {
    setError("");

    if (albaran.archivo_url) {
      window.open(albaran.archivo_url, "_blank", "noopener,noreferrer");
      return;
    }

    if (albaran.archivo_ruta) {
      const { data, error: errorUrl } = await supabase.storage
        .from("albaranes")
        .createSignedUrl(albaran.archivo_ruta, 3600);

      if (errorUrl) {
        setError(errorUrl.message);
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setError("Este albarán no tiene foto o PDF guardado.");
  }

  async function eliminarAlbaran(albaran) {
    if (!window.confirm(`¿Eliminar el albarán ${albaran.numero_albaran || ""}?`)) return;

    const { error: errorEliminar } = await supabase
      .from("importaciones_albaran")
      .delete()
      .eq("id", albaran.id);

    if (errorEliminar) {
      setError(errorEliminar.message);
      return;
    }

    setAlbaranes((anteriores) => anteriores.filter((a) => a.id !== albaran.id));
    setSeleccionado(null);
    setMensaje("Albarán eliminado.");
  }

  if (cargando) {
    return <section className="panel"><p>Cargando albaranes guardados...</p></section>;
  }

  return (
    <section className="panel albaranes-archivo">
      <div className="cabecera-seccion">
        <div>
          <p className="etiqueta">COMPRAS</p>
          <h1>🗂️ Albaranes guardados</h1>
          <p className="texto-secundario">Consulta qué albaranes ya has subido.</p>
        </div>

        <button type="button" onClick={cargarAlbaranes}>🔄 Actualizar</button>
      </div>

      {error && <div className="mensaje-error">{error}</div>}
      {mensaje && <div className="mensaje-exito">{mensaje}</div>}

      <div className="albaranes-resumen">
        <article><span>Total guardados</span><strong>{resumen.total}</strong></article>
        <article><span>Importados</span><strong>{resumen.importados}</strong></article>
        <article><span>Pendientes</span><strong>{resumen.pendientes}</strong></article>
        <article><span>Importe acumulado</span><strong>{euros(resumen.importe)}</strong></article>
      </div>

      <div className="albaranes-filtros">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Proveedor o número..."
        />

        <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}>
          <option value="todos">Todos los proveedores</option>
          {proveedores.map((proveedor) => (
            <option key={proveedor} value={proveedor}>{proveedor}</option>
          ))}
        </select>

        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          <option value="importado">Importados</option>
          <option value="pendiente_revision">Pendientes</option>
          <option value="revisado">Revisados</option>
          <option value="error">Con error</option>
        </select>
      </div>

      <div className="tabla-responsive">
        <table className="tabla-albaranes">
          <thead>
            <tr>
              <th>Subido</th>
              <th>Proveedor</th>
              <th>N.º albarán</th>
              <th>Fecha</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Original</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan="9">No hay albaranes guardados.</td></tr>
            )}

            {filtrados.map((albaran) => (
              <tr key={albaran.id}>
                <td>{fechaCompleta(albaran.created_at)}</td>
                <td><strong>{albaran.proveedor_nombre || "Sin proveedor"}</strong></td>
                <td>{albaran.numero_albaran || "Sin número"}</td>
                <td>{fechaCorta(albaran.fecha_albaran)}</td>
                <td>{obtenerLineas(albaran).length}</td>
                <td><strong>{euros(albaran.total)}</strong></td>
                <td>{nombreEstado(albaran.estado)}</td>
                <td>
                  {albaran.archivo_url || albaran.archivo_ruta ? (
                    <button type="button" onClick={() => abrirOriginal(albaran)}>👁 Ver</button>
                  ) : "Sin archivo"}
                </td>
                <td>
                  <button type="button" onClick={() => setSeleccionado(albaran)}>Ver detalle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {seleccionado && (
        <div className="modal-fondo" onClick={() => setSeleccionado(null)}>
          <article className="modal-contenido modal-albaran" onClick={(e) => e.stopPropagation()}>
            <div className="modal-cabecera">
              <div>
                <p className="etiqueta">ALBARÁN</p>
                <h2>{seleccionado.numero_albaran || "Sin número"}</h2>
                <p>{seleccionado.proveedor_nombre || "Sin proveedor"}</p>
              </div>
              <button type="button" onClick={() => setSeleccionado(null)}>×</button>
            </div>

            <div className="tabla-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Precio</th>
                    <th>IVA</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {obtenerLineas(seleccionado).map((linea, indice) => (
                    <tr key={`${seleccionado.id}-${indice}`}>
                      <td>{linea.codigo || "—"}</td>
                      <td>{linea.descripcion || linea.producto || linea.nombre || "Sin descripción"}</td>
                      <td>{numero(linea.cantidad)}</td>
                      <td>{linea.unidad || "unidad"}</td>
                      <td>{euros(linea.precio_unitario)}</td>
                      <td>{numero(linea.iva)} %</td>
                      <td>{euros(linea.total_linea || numero(linea.cantidad) * numero(linea.precio_unitario))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-acciones">
              {(seleccionado.archivo_url || seleccionado.archivo_ruta) && (
                <button type="button" onClick={() => abrirOriginal(seleccionado)}>👁 Ver original</button>
              )}
              <button type="button" className="boton-peligro" onClick={() => eliminarAlbaran(seleccionado)}>🗑 Eliminar</button>
              <button type="button" onClick={() => setSeleccionado(null)}>Cerrar</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

export default Albaranes;
