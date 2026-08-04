import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../supabase.js";

function numero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return 0;
  }

  const resultado = Number(
    String(valor)
      .replace(/[€\s]/g, "")
      .replace(",", "."),
  );

  return Number.isFinite(resultado)
    ? resultado
    : 0;
}

function euros(valor) {
  return numero(valor).toLocaleString(
    "es-ES",
    {
      style: "currency",
      currency: "EUR",
    },
  );
}

function fechaAlbaran(valor) {
  if (!valor) {
    return "Sin fecha";
  }

  const texto = String(valor);

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [año, mes, dia] =
      texto.split("-");

    return `${dia}/${mes}/${año}`;
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return texto;
  }

  return fecha.toLocaleDateString(
    "es-ES",
  );
}

function fechaCompleta(valor) {
  if (!valor) {
    return "Sin fecha";
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return String(valor);
  }

  return fecha.toLocaleString(
    "es-ES",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function nombreEstado(estado) {
  const estados = {
    importado: "Importado",
    pendiente_revision:
      "Pendiente de revisión",
    revisado: "Revisado",
    error: "Con error",
  };

  return (
    estados[estado] ||
    estado ||
    "Importado"
  );
}

function obtenerLineas(albaran) {
  if (Array.isArray(albaran?.lineas)) {
    return albaran.lineas;
  }

  if (
    typeof albaran?.lineas === "string"
  ) {
    try {
      const resultado = JSON.parse(
        albaran.lineas,
      );

      return Array.isArray(resultado)
        ? resultado
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function obtenerDescripcion(linea) {
  return (
    linea?.descripcion ||
    linea?.producto ||
    linea?.nombre ||
    "Sin descripción"
  );
}

function normalizarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim();
}

function Albaranes() {
  const [
    albaranes,
    setAlbaranes,
  ] = useState([]);

  const [
    albaranSeleccionado,
    setAlbaranSeleccionado,
  ] = useState(null);

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    filtroEstado,
    setFiltroEstado,
  ] = useState("todos");

  const [
    filtroProveedor,
    setFiltroProveedor,
  ] = useState("todos");

  const [
    filtroDesde,
    setFiltroDesde,
  ] = useState("");

  const [
    filtroHasta,
    setFiltroHasta,
  ] = useState("");

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    actualizando,
    setActualizando,
  ] = useState(false);

  const [
    eliminando,
    setEliminando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  useEffect(() => {
    cargarAlbaranes();
  }, []);

  async function cargarAlbaranes() {
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const {
        data,
        error: errorConsulta,
      } = await supabase
        .from(
          "importaciones_albaran",
        )
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (errorConsulta) {
        throw errorConsulta;
      }

      setAlbaranes(data || []);
    } catch (errorCarga) {
      console.error(
        "Error cargando albaranes:",
        errorCarga,
      );

      setError(
        errorCarga.message ||
          "No se han podido cargar los albaranes guardados.",
      );
    } finally {
      setCargando(false);
    }
  }

  const proveedores = useMemo(() => {
    const nombres = albaranes
      .map(
        (albaran) =>
          albaran.proveedor_nombre,
      )
      .filter(Boolean);

    return [
      ...new Set(nombres),
    ].sort((a, b) =>
      a.localeCompare(
        b,
        "es",
        {
          sensitivity: "base",
        },
      ),
    );
  }, [albaranes]);

  const albaranesFiltrados =
    useMemo(() => {
      const textoBusqueda =
        normalizarTexto(busqueda);

      return albaranes.filter(
        (albaran) => {
          const estado =
            albaran.estado ||
            "importado";

          const coincideEstado =
            filtroEstado ===
              "todos" ||
            estado === filtroEstado;

          const coincideProveedor =
            filtroProveedor ===
              "todos" ||
            albaran.proveedor_nombre ===
              filtroProveedor;

          const fechaDocumento =
            albaran.fecha_albaran ||
            "";

          const coincideDesde =
            !filtroDesde ||
            fechaDocumento >=
              filtroDesde;

          const coincideHasta =
            !filtroHasta ||
            fechaDocumento <=
              filtroHasta;

          const lineas =
            obtenerLineas(
              albaran,
            );

          const textoLineas =
            lineas
              .map((linea) =>
                [
                  linea.codigo,
                  linea.descripcion,
                  linea.producto,
                  linea.nombre,
                ]
                  .filter(Boolean)
                  .join(" "),
              )
              .join(" ");

          const contenido =
            normalizarTexto(
              [
                albaran.proveedor_nombre,
                albaran.numero_albaran,
                albaran.fecha_albaran,
                albaran.archivo_nombre,
                textoLineas,
              ]
                .filter(Boolean)
                .join(" "),
            );

          const coincideBusqueda =
            !textoBusqueda ||
            contenido.includes(
              textoBusqueda,
            );

          return (
            coincideEstado &&
            coincideProveedor &&
            coincideDesde &&
            coincideHasta &&
            coincideBusqueda
          );
        },
      );
    }, [
      albaranes,
      busqueda,
      filtroEstado,
      filtroProveedor,
      filtroDesde,
      filtroHasta,
    ]);

  const resumen = useMemo(() => {
    const importados =
      albaranes.filter(
        (albaran) =>
          !albaran.estado ||
          albaran.estado ===
            "importado",
      ).length;

    const pendientes =
      albaranes.filter(
        (albaran) =>
          albaran.estado ===
          "pendiente_revision",
      ).length;

    const revisados =
      albaranes.filter(
        (albaran) =>
          albaran.estado ===
          "revisado",
      ).length;

    const totalImporte =
      albaranes.reduce(
        (
          acumulado,
          albaran,
        ) =>
          acumulado +
          numero(albaran.total),
        0,
      );

    return {
      total: albaranes.length,
      importados,
      pendientes,
      revisados,
      totalImporte,
    };
  }, [albaranes]);

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado("todos");
    setFiltroProveedor("todos");
    setFiltroDesde("");
    setFiltroHasta("");
  }

  async function cambiarEstado(
    albaran,
    nuevoEstado,
  ) {
    setActualizando(true);
    setError("");
    setMensaje("");

    try {
      const {
        error:
          errorActualizacion,
      } = await supabase
        .from(
          "importaciones_albaran",
        )
        .update({
          estado: nuevoEstado,
        })
        .eq("id", albaran.id);

      if (errorActualizacion) {
        throw errorActualizacion;
      }

      setAlbaranes(
        (anteriores) =>
          anteriores.map(
            (elemento) =>
              elemento.id ===
              albaran.id
                ? {
                    ...elemento,
                    estado:
                      nuevoEstado,
                  }
                : elemento,
          ),
      );

      setAlbaranSeleccionado(
        (anterior) =>
          anterior?.id ===
          albaran.id
            ? {
                ...anterior,
                estado:
                  nuevoEstado,
              }
            : anterior,
      );

      setMensaje(
        "Estado actualizado correctamente.",
      );
    } catch (errorCambio) {
      console.error(
        "Error cambiando estado:",
        errorCambio,
      );

      setError(
        errorCambio.message ||
          "No se ha podido cambiar el estado.",
      );
    } finally {
      setActualizando(false);
    }
  }

  async function abrirOriginal(
    albaran,
  ) {
    setError("");

    if (albaran.archivo_url) {
      window.open(
        albaran.archivo_url,
        "_blank",
        "noopener,noreferrer",
      );

      return;
    }

    if (
      albaran.archivo_ruta
    ) {
      try {
        const {
          data,
          error: errorUrl,
        } = await supabase.storage
          .from("albaranes")
          .createSignedUrl(
            albaran.archivo_ruta,
            3600,
          );

        if (errorUrl) {
          throw errorUrl;
        }

        if (
          data?.signedUrl
        ) {
          window.open(
            data.signedUrl,
            "_blank",
            "noopener,noreferrer",
          );

          return;
        }
      } catch (
        errorOriginal
      ) {
        console.error(
          "Error abriendo original:",
          errorOriginal,
        );

        setError(
          errorOriginal.message ||
            "No se ha podido abrir el archivo original.",
        );

        return;
      }
    }

    setError(
      "Este albarán no tiene una fotografía o PDF guardado.",
    );
  }

  async function eliminarAlbaran(
    albaran,
  ) {
    const confirmar =
      window.confirm(
        `¿Quieres eliminar el albarán ${
          albaran.numero_albaran ||
          ""
        } de ${
          albaran.proveedor_nombre ||
          "este proveedor"
        }?`,
      );

    if (!confirmar) {
      return;
    }

    setEliminando(true);
    setError("");
    setMensaje("");

    try {
      const {
        error:
          errorEliminacion,
      } = await supabase
        .from(
          "importaciones_albaran",
        )
        .delete()
        .eq("id", albaran.id);

      if (errorEliminacion) {
        throw errorEliminacion;
      }

      if (
        albaran.archivo_ruta
      ) {
        const {
          error:
            errorArchivo,
        } = await supabase.storage
          .from("albaranes")
          .remove([
            albaran.archivo_ruta,
          ]);

        if (errorArchivo) {
          console.warn(
            "No se pudo borrar el archivo original:",
            errorArchivo,
          );
        }
      }

      setAlbaranes(
        (anteriores) =>
          anteriores.filter(
            (elemento) =>
              elemento.id !==
              albaran.id,
          ),
      );

      setAlbaranSeleccionado(
        null,
      );

      setMensaje(
        "Albarán eliminado correctamente.",
      );
    } catch (
      errorBorrado
    ) {
      console.error(
        "Error eliminando albarán:",
        errorBorrado,
      );

      setError(
        errorBorrado.message ||
          "No se ha podido eliminar el albarán.",
      );
    } finally {
      setEliminando(false);
    }
  }

  if (cargando) {
    return (
      <section className="panel">
        <p>
          Cargando albaranes
          guardados...
        </p>
      </section>
    );
  }

  return (
    <section className="panel albaranes-archivo">
      <div className="cabecera-seccion">
        <div>
          <p className="etiqueta">
            COMPRAS
          </p>

          <h1>
            🗂️ Albaranes guardados
          </h1>

          <p className="texto-secundario">
            Consulta los albaranes que
            ya has importado y revisa
            su fotografía o PDF
            original.
          </p>
        </div>

        <button
          type="button"
          onClick={
            cargarAlbaranes
          }
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
          <span>
            Total guardados
          </span>

          <strong>
            {resumen.total}
          </strong>
        </article>

        <article>
          <span>
            Importados
          </span>

          <strong>
            {
              resumen.importados
            }
          </strong>
        </article>

        <article>
          <span>
            Pendientes
          </span>

          <strong>
            {
              resumen.pendientes
            }
          </strong>
        </article>

        <article>
          <span>
            Importe acumulado
          </span>

          <strong>
            {euros(
              resumen.totalImporte,
            )}
          </strong>
        </article>
      </div>

      <div className="albaranes-filtros">
        <label>
          Buscar

          <input
            type="search"
            value={busqueda}
            onChange={(
              evento,
            ) =>
              setBusqueda(
                evento.target
                  .value,
              )
            }
            placeholder="Proveedor, número, producto..."
          />
        </label>

        <label>
          Proveedor

          <select
            value={
              filtroProveedor
            }
            onChange={(
              evento,
            ) =>
              setFiltroProveedor(
                evento.target
                  .value,
              )
            }
          >
            <option value="todos">
              Todos
            </option>

            {proveedores.map(
              (proveedor) => (
                <option
                  key={
                    proveedor
                  }
                  value={
                    proveedor
                  }
                >
                  {proveedor}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Estado

          <select
            value={
              filtroEstado
            }
            onChange={(
              evento,
            ) =>
              setFiltroEstado(
                evento.target
                  .value,
              )
            }
          >
            <option value="todos">
              Todos
            </option>

            <option value="importado">
              Importados
            </option>

            <option value="pendiente_revision">
              Pendientes
            </option>

            <option value="revisado">
              Revisados
            </option>

            <option value="error">
              Con error
            </option>
          </select>
        </label>

        <label>
          Desde

          <input
            type="date"
            value={
              filtroDesde
            }
            onChange={(
              evento,
            ) =>
              setFiltroDesde(
                evento.target
                  .value,
              )
            }
          />
        </label>

        <label>
          Hasta

          <input
            type="date"
            value={
              filtroHasta
            }
            onChange={(
              evento,
            ) =>
              setFiltroHasta(
                evento.target
                  .value,
              )
            }
          />
        </label>

        <div className="albaranes-filtro-acciones">
          <button
            type="button"
            onClick={
              limpiarFiltros
            }
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <p className="texto-secundario">
        Mostrando{" "}
        <strong>
          {
            albaranesFiltrados.length
          }
        </strong>{" "}
        de{" "}
        <strong>
          {albaranes.length}
        </strong>{" "}
        albaranes.
      </p>

      <div className="tabla-responsive">
        <table className="tabla-albaranes">
          <thead>
            <tr>
              <th>Subido</th>
              <th>Proveedor</th>
              <th>
                N.º albarán
              </th>
              <th>
                Fecha albarán
              </th>
              <th>
                Productos
              </th>
              <th>Base</th>
              <th>IVA</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Original</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {albaranesFiltrados.length ===
              0 && (
              <tr>
                <td colSpan="11">
                  No hay albaranes
                  que coincidan con
                  los filtros.
                </td>
              </tr>
            )}

            {albaranesFiltrados.map(
              (albaran) => {
                const lineas =
                  obtenerLineas(
                    albaran,
                  );

                const tieneOriginal =
                  Boolean(
                    albaran.archivo_url ||
                      albaran.archivo_ruta,
                  );

                return (
                  <tr
                    key={
                      albaran.id
                    }
                  >
                    <td>
                      {fechaCompleta(
                        albaran.created_at,
                      )}
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
                      {fechaAlbaran(
                        albaran.fecha_albaran,
                      )}
                    </td>

                    <td>
                      {
                        lineas.length
                      }
                    </td>

                    <td>
                      {euros(
                        albaran.base_imponible,
                      )}
                    </td>

                    <td>
                      {euros(
                        albaran.total_iva,
                      )}
                    </td>

                    <td>
                      <strong>
                        {euros(
                          albaran.total,
                        )}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`estado-albaran estado-albaran--${
                          albaran.estado ||
                          "importado"
                        }`}
                      >
                        {nombreEstado(
                          albaran.estado,
                        )}
                      </span>
                    </td>

                    <td>
                      {tieneOriginal ? (
                        <button
                          type="button"
                          className="boton-secundario"
                          onClick={() =>
                            abrirOriginal(
                              albaran,
                            )
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
                          setAlbaranSeleccionado(
                            albaran,
                          )
                        }
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>

      {albaranSeleccionado && (
        <div
          className="modal-fondo"
          onClick={() =>
            setAlbaranSeleccionado(
              null,
            )
          }
        >
          <article
            className="modal-contenido modal-albaran"
            onClick={(
              evento,
            ) =>
              evento.stopPropagation()
            }
          >
            <div className="modal-cabecera">
              <div>
                <p className="etiqueta">
                  ALBARÁN
                </p>

                <h2>
                  {albaranSeleccionado.numero_albaran ||
                    "Sin número"}
                </h2>

                <p>
                  {albaranSeleccionado.proveedor_nombre ||
                    "Sin proveedor"}
                </p>
              </div>

              <button
                type="button"
                className="boton-cerrar-modal"
                onClick={() =>
                  setAlbaranSeleccionado(
                    null,
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="detalle-albaran-datos">
              <div>
                <span>
                  Fecha albarán
                </span>

                <strong>
                  {fechaAlbaran(
                    albaranSeleccionado.fecha_albaran,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Fecha de subida
                </span>

                <strong>
                  {fechaCompleta(
                    albaranSeleccionado.created_at,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Estado
                </span>

                <select
                  value={
                    albaranSeleccionado.estado ||
                    "importado"
                  }
                  disabled={
                    actualizando
                  }
                  onChange={(
                    evento,
                  ) =>
                    cambiarEstado(
                      albaranSeleccionado,
                      evento.target
                        .value,
                    )
                  }
                >
                  <option value="importado">
                    Importado
                  </option>

                  <option value="pendiente_revision">
                    Pendiente de
                    revisión
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
                    <th>
                      Código
                    </th>

                    <th>
                      Producto
                    </th>

                    <th>
                      Cantidad
                    </th>

                    <th>
                      Unidad
                    </th>

                    <th>
                      Precio
                    </th>

                    <th>
                      IVA
                    </th>

                    <th>
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {obtenerLineas(
                    albaranSeleccionado,
                  ).length ===
                    0 && (
                    <tr>
                      <td colSpan="7">
                        Este albarán
                        no tiene
                        productos
                        guardados.
                      </td>
                    </tr>
                  )}

                  {obtenerLineas(
                    albaranSeleccionado,
                  ).map(
                    (
                      linea,
                      indice,
                    ) => {
                      const totalLinea =
                        numero(
                          linea.total_linea,
                        ) ||
                        numero(
                          linea.cantidad,
                        ) *
                          numero(
                            linea.precio_unitario,
                          );

                      return (
                        <tr
                          key={`${albaranSeleccionado.id}-${indice}`}
                        >
                          <td>
                            {linea.codigo ||
                              "—"}
                          </td>

                          <td>
                            {obtenerDescripcion(
                              linea,
                            )}
                          </td>

                          <td>
                            {numero(
                              linea.cantidad,
                            )}
                          </td>

                          <td>
                            {linea.unidad ||
                              "unidad"}
                          </td>

                          <td>
                            {euros(
                              linea.precio_unitario,
                            )}
                          </td>

                          <td>
                            {numero(
                              linea.iva,
                            )}
                            %
                          </td>

                          <td>
                            <strong>
                              {euros(
                                totalLinea,
                              )}
                            </strong>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            <div className="totales-albaran">
              <span>
                Base:

                <strong>
                  {euros(
                    albaranSeleccionado.base_imponible,
                  )}
                </strong>
              </span>

              <span>
                IVA:

                <strong>
                  {euros(
                    albaranSeleccionado.total_iva,
                  )}
                </strong>
              </span>

              <span>
                Total:

                <strong>
                  {euros(
                    albaranSeleccionado.total,
                  )}
                </strong>
              </span>
            </div>

            {albaranSeleccionado.archivo_nombre && (
              <p className="texto-secundario">
                Archivo:{" "}
                <strong>
                  {
                    albaranSeleccionado.archivo_nombre
                  }
                </strong>
              </p>
            )}

            <div className="modal-acciones">
              {(albaranSeleccionado.archivo_url ||
                albaranSeleccionado.archivo_ruta) && (
                <button
                  type="button"
                  onClick={() =>
                    abrirOriginal(
                      albaranSeleccionado,
                    )
                  }
                >
                  👁 Ver original
                </button>
              )}

              <button
                type="button"
                className="boton-peligro"
                disabled={
                  eliminando
                }
                onClick={() =>
                  eliminarAlbaran(
                    albaranSeleccionado,
                  )
                }
              >
                {eliminando
                  ? "Eliminando..."
                  : "🗑 Eliminar"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setAlbaranSeleccionado(
                    null,
                  )
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