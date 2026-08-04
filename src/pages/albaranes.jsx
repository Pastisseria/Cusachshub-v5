import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

function numero(valor) {
  const resultado = Number(valor || 0);
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

  const partes = String(valor).split("-");

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  return valor;
}

function fechaCompleta(valor) {
  if (!valor) return "Sin fecha";

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }

  return fecha.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function estadoVisible(estado) {
  const estados = {
    importado: "Importado",
    pendiente_revision: "Pendiente de revisión",
    revisado: "Revisado",
    error: "Con error",
  };

  return estados[estado] || estado || "Importado";
}

function obtenerLineas(albaran) {
  return Array.isArray(albaran?.lineas)
    ? albaran.lineas
    : [];
}

function Albaranes() {
  const [albaranes, setAlbaranes] = useState([]);
  const [albaranAbierto, setAlbaranAbierto] = useState(null);

  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
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
        .select(`
          id,
          created_at,
          proveedor_id,
          proveedor_nombre,
          numero_albaran,
          fecha_albaran,
          lineas,
          base_imponible,
          total_iva,
          total,
          estado,
          archivo_url,
          archivo_nombre,
          archivo_tipo,
          texto_original
        `)
        .order("created_at", {
          ascending: false,
        });

      if (errorConsulta) {
        throw errorConsulta;
      }

      setAlbaranes(data || []);
    } catch (errorCarga) {
      console.error("Error cargando albaranes:", errorCarga);

      setError(
        errorCarga.message ||
          "No se han podido cargar los albaranes guardados.",
      );
    } finally {
      setCargando(false);
    }
  }

  const albaranesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return albaranes.filter((albaran) => {
      const coincideEstado =
        estadoFiltro === "todos" ||
        albaran.estado === estadoFiltro;

      const contenido = [
        albaran.proveedor_nombre,
        albaran.numero_albaran,
        albaran.fecha_albaran,
        albaran.archivo_nombre,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const coincideBusqueda =
        !texto || contenido.includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [albaranes, busqueda, estadoFiltro]);

  const resumen = useMemo(() => {
    return {
      total: albaranes.length,

      importados: albaranes.filter(
        (albaran) =>
          !albaran.estado ||
          albaran.estado === "importado",
      ).length,

      pendientes: albaranes.filter(
        (albaran) =>
          albaran.estado === "pendiente_revision",
      ).length,

      importe: albaranes.reduce(
        (acumulado, albaran) =>
          acumulado + numero(albaran.total),
        0,
      ),
    };
  }, [albaranes]);

  async function cambiarEstado(albaran, nuevoEstado) {
    setActualizando(true);
    setError("");
    setMensaje("");

    try {
      const { error: errorActualizacion } = await supabase
        .from("importaciones_albaran")
        .update({
          estado: nuevoEstado,
        })
        .eq("id", albaran.id);

      if (errorActualizacion) {
        throw errorActualizacion;
      }

      setAlbaranes((anteriores) =>
        anteriores.map((elemento) =>
          elemento.id === albaran.id
            ? {
                ...elemento,
                estado: nuevoEstado,
              }
            : elemento,
        ),
      );

      setAlbaranAbierto((anterior) =>
        anterior?.id === albaran.id
          ? {
              ...anterior,
              estado: nuevoEstado,
            }
          : anterior,
      );

      setMensaje("Estado actualizado correctamente.");
    } catch (errorCambio) {
      console.error(
        "Error actualizando albarán:",
        errorCambio,
      );

      setError(
        errorCambio.message ||
          "No se ha podido actualizar el estado.",
      );
    } finally {
      setActualizando(false);
    }
  }

  function abrirOriginal(albaran) {
    if (!albaran.archivo_url) {
      setError(
        "Este albarán no tiene una fotografía o PDF guardado.",
      );
      return;
    }

    window.open(
      albaran.archivo_url,
      "_blank",
      "noopener,noreferrer",
    );
  }

  if (cargando) {
    return (
      <section className="panel">
        <p>Cargando albaranes guardados...</p>
      </section>
    );
  }

  return (
    <section className="panel albaranes-archivo">
      <div className="cabecera-seccion">
        <div>
          <p className="etiqueta">COMPRAS</p>

          <h1>🗂️ Albaranes guardados</h1>

          <p className="texto-secundario">
            Consulta los albaranes que ya has subido y
            revisa su fotografía o PDF original.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarAlbaranes}
          disabled={cargando}
        >
          🔄 Actualizar
        </button>
      </div>

      {error && (
        <div className="mensaje-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mensaje-exito">
          {mensaje}
        </div>
      )}

      <div className="albaranes-resumen">
        <article>
          <span>Total guardados</span>
          <strong>{resumen.total}</strong>
        </article>

        <article>
          <span>Importados</span>
          <strong>{resumen.importados}</strong>
        </article>

        <article>
          <span>Pendientes</span>
          <strong>{resumen.pendientes}</strong>
        </article>

        <article>
          <span>Importe acumulado</span>
          <strong>{euros(resumen.importe)}</strong>
        </article>
      </div>

      <div className="albaranes-filtros">
        <label>
          Buscar albarán

          <input
            type="search"
            value={busqueda}
            onChange={(evento) =>
              setBusqueda(evento.target.value)
            }
            placeholder="Proveedor, número, fecha..."
          />
        </label>

        <label>
          Estado

          <select
            value={estadoFiltro}
            onChange={(evento) =>
              setEstadoFiltro(evento.target.value)
            }
          >
            <option value="todos">
              Todos
            </option>

            <option value="importado">
              Importados
            </option>

            <option value="pendiente_revision">
              Pendientes de revisión
            </option>

            <option value="revisado">
              Revisados
            </option>

            <option value="error">
              Con error
            </option>
          </select>
        </label>
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
            {albaranesFiltrados.length === 0 && (
              <tr>
                <td colSpan="9">
                  No hay albaranes que coincidan con la
                  búsqueda.
                </td>
              </tr>
            )}

            {albaranesFiltrados.map((albaran) => {
              const lineas = obtenerLineas(albaran);

              return (
                <tr key={albaran.id}>
                  <td>
                    {fechaCompleta(albaran.created_at)}
                  </td>

                  <td>
                    <strong>
                      {albaran.proveedor_nombre ||
                        "Sin proveedor"}
                    </strong>
                  </td>

                  <td>
                    {albaran.numero_albaran ||
                      "Sin número"}
                  </td>

                  <td>
                    {fechaCorta(
                      albaran.fecha_albaran,
                    )}
                  </td>

                  <td>{lineas.length}</td>

                  <td>
                    <strong>
                      {euros(albaran.total)}
                    </strong>
                  </td>

                  <td>
                    <span
                      className={`estado-albaran estado-albaran--${
                        albaran.estado || "importado"
                      }`}
                    >
                      {estadoVisible(
                        albaran.estado,
                      )}
                    </span>
                  </td>

                  <td>
                    {albaran.archivo_url ? (
                      <button
                        type="button"
                        className="boton-secundario"
                        onClick={() =>
                          abrirOriginal(albaran)
                        }
                      >
                        👁 Ver
                      </button>
                    ) : (
                      <span className="sin-original">
                        Sin archivo
                      </span>
                    )}
                  </td>

                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        setAlbaranAbierto(albaran)
                      }
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {albaranAbierto && (
        <div
          className="modal-fondo"
          onClick={() =>
            setAlbaranAbierto(null)
          }
        >
          <article
            className="modal-contenido modal-albaran"
            onClick={(evento) =>
              evento.stopPropagation()
            }
          >
            <div className="modal-cabecera">
              <div>
                <p className="etiqueta">
                  ALBARÁN
                </p>

                <h2>
                  {albaranAbierto.numero_albaran ||
                    "Sin número"}
                </h2>

                <p>
                  {albaranAbierto.proveedor_nombre ||
                    "Sin proveedor"}
                </p>
              </div>

              <button
                type="button"
                className="boton-cerrar-modal"
                onClick={() =>
                  setAlbaranAbierto(null)
                }
              >
                ×
              </button>
            </div>

            <div className="detalle-albaran-datos">
              <div>
                <span>Fecha albarán</span>
                <strong>
                  {fechaCorta(
                    albaranAbierto.fecha_albaran,
                  )}
                </strong>
              </div>

              <div>
                <span>Fecha de subida</span>
                <strong>
                  {fechaCompleta(
                    albaranAbierto.created_at,
                  )}
                </strong>
              </div>

              <div>
                <span>Estado</span>
                <select
                  value={
                    albaranAbierto.estado ||
                    "importado"
                  }
                  disabled={actualizando}
                  onChange={(evento) =>
                    cambiarEstado(
                      albaranAbierto,
                      evento.target.value,
                    )
                  }
                >
                  <option value="importado">
                    Importado
                  </option>

                  <option value="pendiente_revision">
                    Pendiente de revisión
                  </option>

                  <option value="revisado">
                    Revisado
                  </option>

                  <option value="error">
                    Con error
                  </option>
                </select>
              </div>
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
                  {obtenerLineas(
                    albaranAbierto,
                  ).length === 0 && (
                    <tr>
                      <td colSpan="7">
                        Este albarán no tiene líneas
                        guardadas.
                      </td>
                    </tr>
                  )}

                  {obtenerLineas(
                    albaranAbierto,
                  ).map((linea, indice) => (
                    <tr
                      key={`${albaranAbierto.id}-${indice}`}
                    >
                      <td>
                        {linea.codigo || "—"}
                      </td>

                      <td>
                        {linea.descripcion ||
                          linea.producto ||
                          "Sin descripción"}
                      </td>

                      <td>
                        {numero(linea.cantidad)}
                      </td>

                      <td>
                        {linea.unidad || "unidad"}
                      </td>

                      <td>
                        {euros(
                          linea.precio_unitario,
                        )}
                      </td>

                      <td>
                        {numero(linea.iva)} %
                      </td>

                      <td>
                        <strong>
                          {euros(
                            linea.total_linea,
                          )}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="totales-albaran">
              <span>
                Base:
                <strong>
                  {euros(
                    albaranAbierto.base_imponible,
                  )}
                </strong>
              </span>

              <span>
                IVA:
                <strong>
                  {euros(
                    albaranAbierto.total_iva,
                  )}
                </strong>
              </span>

              <span>
                Total:
                <strong>
                  {euros(albaranAbierto.total)}
                </strong>
              </span>
            </div>

            <div className="modal-acciones">
              {albaranAbierto.archivo_url && (
                <button
                  type="button"
                  onClick={() =>
                    abrirOriginal(
                      albaranAbierto,
                    )
                  }
                >
                  👁 Ver albarán original
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setAlbaranAbierto(null)
                }
              >
                Cerrar
              </button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

export default Albaranes;