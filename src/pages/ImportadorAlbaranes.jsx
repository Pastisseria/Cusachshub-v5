import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "../supabase.js";

import {
  analizarAlbaran,
  recalcularAlbaran,
} from "../ai/parserAlbaranes.js";

import { leerDocumento } from "../services/lectordocumentos.js";

function crearIdTemporal() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function nuevaLinea(datos = {}) {
  return {
    temporalId:
      datos.temporalId || crearIdTemporal(),

    codigo: datos.codigo || "",
    descripcion: datos.descripcion || "",
    cantidad:
      datos.cantidad === undefined
        ? 1
        : datos.cantidad,

    unidad: datos.unidad || "unidad",

    precio_unitario:
      datos.precio_unitario === undefined
        ? ""
        : datos.precio_unitario,

    iva:
      datos.iva === undefined
        ? 10
        : datos.iva,

    total_linea:
      datos.total_linea === undefined
        ? 0
        : datos.total_linea,
  };
}

const RESULTADO_VACIO = {
  numero_albaran: "",
  fecha_albaran: "",
  proveedor_id: "",
  proveedor_nombre: "",
  lineas: [],
  base_imponible: 0,
  total_iva: 0,
  total: 0,
  texto_original: "",
};

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
      .trim()
      .replace(/[€\s]/g, "")
      .replace(",", "."),
  );

  return Number.isFinite(resultado)
    ? resultado
    : 0;
}

function redondear(valor) {
  return Number(numero(valor).toFixed(2));
}

function normalizarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function formatearEuros(valor) {
  return numero(valor).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function obtenerNombreProveedor(proveedor) {
  return (
    proveedor?.nombre ||
    proveedor?.nombre_comercial ||
    proveedor?.razon_social ||
    "Proveedor sin nombre"
  );
}

function ImportadorAlbaranes() {
  const inputArchivoRef = useRef(null);

  const [proveedores, setProveedores] =
    useState([]);

  const [resultado, setResultado] =
    useState(RESULTADO_VACIO);

  const [archivoActual, setArchivoActual] =
    useState(null);

  const [arrastrando, setArrastrando] =
    useState(false);

  const [cargando, setCargando] =
    useState(true);

  const [procesando, setProcesando] =
    useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [progresoOCR, setProgresoOCR] =
    useState({
      estado: "",
      progreso: 0,
    });

  useEffect(() => {
    cargarProveedores();
  }, []);

  async function cargarProveedores() {
    setCargando(true);
    setError("");

    try {
      const { data, error: errorProveedores } =
        await supabase
          .from("proveedores")
          .select("*")
          .order("nombre", {
            ascending: true,
          });

      if (errorProveedores) {
        throw errorProveedores;
      }

      setProveedores(data || []);
    } catch (errorCarga) {
      console.error(
        "Error cargando proveedores:",
        errorCarga,
      );

      setError(
        errorCarga.message ||
          "No se han podido cargar los proveedores.",
      );
    } finally {
      setCargando(false);
    }
  }

  function buscarProveedorAutomaticamente(
    analisis,
    textoDocumento,
  ) {
    const textoNormalizado =
      normalizarTexto(textoDocumento);

    const nombreAnalizado =
      normalizarTexto(
        analisis.proveedor_nombre || "",
      );

    let proveedorEncontrado = null;

    if (nombreAnalizado) {
      proveedorEncontrado =
        proveedores.find((proveedor) => {
          const nombre =
            normalizarTexto(
              obtenerNombreProveedor(proveedor),
            );

          return (
            nombre.includes(nombreAnalizado) ||
            nombreAnalizado.includes(nombre)
          );
        });
    }

    if (!proveedorEncontrado) {
      proveedorEncontrado =
        proveedores.find((proveedor) => {
          const nombre =
            normalizarTexto(
              obtenerNombreProveedor(proveedor),
            );

          return (
            nombre.length >= 4 &&
            textoNormalizado.includes(nombre)
          );
        });
    }

    if (!proveedorEncontrado) {
      proveedorEncontrado =
        proveedores.find((proveedor) => {
          const cif =
            normalizarTexto(
              proveedor.nif_cif ||
                proveedor.cif ||
                proveedor.nif ||
                "",
            );

          return (
            cif.length >= 6 &&
            textoNormalizado.includes(cif)
          );
        });
    }

    return proveedorEncontrado || null;
  }

  async function procesarArchivo(archivo) {
    if (!archivo) return;

    setError("");
    setMensaje("");
    setProcesando(true);
    setArchivoActual(archivo);

    setResultado(RESULTADO_VACIO);

    setProgresoOCR({
      estado: "Preparando documento",
      progreso: 0,
    });

    try {
      const textoExtraido =
        await leerDocumento(
          archivo,
          setProgresoOCR,
        );

      if (!textoExtraido?.trim()) {
        throw new Error(
          "No se ha detectado texto en el documento.",
        );
      }

      const analisis =
        analizarAlbaran(textoExtraido);

      const proveedorDetectado =
        buscarProveedorAutomaticamente(
          analisis,
          textoExtraido,
        );

      const lineasDetectadas =
        Array.isArray(analisis.lineas)
          ? analisis.lineas.map((linea) =>
              nuevaLinea(linea),
            )
          : [];

      setResultado({
        ...RESULTADO_VACIO,
        ...analisis,

        proveedor_id:
          proveedorDetectado?.id || "",

        proveedor_nombre:
          proveedorDetectado
            ? obtenerNombreProveedor(
                proveedorDetectado,
              )
            : analisis.proveedor_nombre || "",

        lineas: lineasDetectadas,
        texto_original: textoExtraido,
      });

      if (lineasDetectadas.length > 0) {
        setMensaje(
          `Albarán leído correctamente. Se han detectado ${lineasDetectadas.length} productos.`,
        );
      } else {
        setMensaje(
          "El documento se ha leído, pero no se han reconocido productos. Puedes añadirlos manualmente.",
        );
      }
    } catch (errorLectura) {
      console.error(
        "Error leyendo albarán:",
        errorLectura,
      );

      setError(
        errorLectura.message ||
          "No se ha podido leer el albarán.",
      );

      setArchivoActual(null);
    } finally {
      setProcesando(false);

      setProgresoOCR((anterior) => ({
        estado:
          anterior.estado ||
          "Documento procesado",

        progreso: 100,
      }));
    }
  }

  function seleccionarArchivo(evento) {
    const archivo =
      evento.target.files?.[0];

    procesarArchivo(archivo);
  }

  function soltarArchivo(evento) {
    evento.preventDefault();
    setArrastrando(false);

    const archivo =
      evento.dataTransfer.files?.[0];

    procesarArchivo(archivo);
  }

  function abrirSelectorArchivo() {
    inputArchivoRef.current?.click();
  }

  function actualizarCampo(campo, valor) {
    setResultado((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function seleccionarProveedor(valor) {
    const proveedorSeleccionado =
      proveedores.find(
        (proveedor) =>
          String(proveedor.id) ===
          String(valor),
      );

    setResultado((anterior) => ({
      ...anterior,

      proveedor_id: valor,

      proveedor_nombre:
        proveedorSeleccionado
          ? obtenerNombreProveedor(
              proveedorSeleccionado,
            )
          : "",
    }));
  }

  function actualizarLinea(
    temporalId,
    campo,
    valor,
  ) {
    setResultado((anterior) => ({
      ...anterior,

      lineas: anterior.lineas.map(
        (linea) => {
          if (
            linea.temporalId !==
            temporalId
          ) {
            return linea;
          }

          const lineaActualizada = {
            ...linea,
            [campo]: valor,
          };

          if (
            campo === "cantidad" ||
            campo === "precio_unitario"
          ) {
            lineaActualizada.total_linea =
              redondear(
                numero(
                  lineaActualizada.cantidad,
                ) *
                  numero(
                    lineaActualizada
                      .precio_unitario,
                  ),
              );
          }

          return lineaActualizada;
        },
      ),
    }));
  }

  function añadirLinea() {
    setResultado((anterior) => ({
      ...anterior,

      lineas: [
        ...anterior.lineas,
        nuevaLinea(),
      ],
    }));
  }

  function eliminarLinea(temporalId) {
    setResultado((anterior) => ({
      ...anterior,

      lineas: anterior.lineas.filter(
        (linea) =>
          linea.temporalId !==
          temporalId,
      ),
    }));
  }

  function limpiarImportador() {
    setResultado(RESULTADO_VACIO);
    setArchivoActual(null);
    setError("");
    setMensaje("");

    setProgresoOCR({
      estado: "",
      progreso: 0,
    });

    if (inputArchivoRef.current) {
      inputArchivoRef.current.value = "";
    }
  }

  const totalesCalculados =
    useMemo(() => {
      return recalcularAlbaran(
        resultado.lineas,
      );
    }, [resultado.lineas]);

  async function comprobarDuplicado() {
    if (
      !resultado.proveedor_id ||
      !resultado.numero_albaran?.trim()
    ) {
      return false;
    }

    const { data, error: errorConsulta } =
      await supabase
        .from("importaciones_albaran")
        .select("id")
        .eq(
          "proveedor_id",
          resultado.proveedor_id,
        )
        .eq(
          "numero_albaran",
          resultado.numero_albaran.trim(),
        )
        .limit(1);

    if (errorConsulta) {
      throw errorConsulta;
    }

    return Boolean(data?.length);
  }

  async function guardarAlbaran() {
    setError("");
    setMensaje("");

    if (!resultado.proveedor_id) {
      setError(
        "Selecciona el proveedor del albarán.",
      );
      return;
    }

    if (!resultado.fecha_albaran) {
      setError(
        "Indica la fecha del albarán.",
      );
      return;
    }

    const lineasValidas =
      resultado.lineas.filter(
        (linea) =>
          linea.descripcion?.trim() &&
          numero(linea.cantidad) > 0,
      );

    if (lineasValidas.length === 0) {
      setError(
        "El albarán debe tener al menos un producto.",
      );
      return;
    }

    setGuardando(true);

    try {
      const duplicado =
        await comprobarDuplicado();

      if (duplicado) {
        throw new Error(
          "Este albarán ya está importado. Revisa el proveedor y el número de albarán.",
        );
      }

      const proveedorSeleccionado =
        proveedores.find(
          (proveedor) =>
            String(proveedor.id) ===
            String(
              resultado.proveedor_id,
            ),
        );

      const lineasParaGuardar =
        lineasValidas.map((linea) => {
          const cantidad =
            numero(linea.cantidad);

          const precioUnitario =
            numero(
              linea.precio_unitario,
            );

          const totalLinea =
            redondear(
              cantidad * precioUnitario,
            );

          return {
            codigo:
              linea.codigo?.trim() || "",

            descripcion:
              linea.descripcion?.trim() ||
              "",

            cantidad,
            unidad:
              linea.unidad?.trim() ||
              "unidad",

            precio_unitario:
              precioUnitario,

            iva: numero(linea.iva),

            total_linea: totalLinea,
          };
        });

      const payload = {
        proveedor_id:
          resultado.proveedor_id,

        proveedor_nombre:
          proveedorSeleccionado
            ? obtenerNombreProveedor(
                proveedorSeleccionado,
              )
            : resultado.proveedor_nombre ||
              null,

        numero_albaran:
          resultado.numero_albaran
            ?.trim() || null,

        fecha_albaran:
          resultado.fecha_albaran,

        lineas: lineasParaGuardar,

        base_imponible:
          totalesCalculados.base_imponible,

        total_iva:
          totalesCalculados.total_iva,

        total:
          totalesCalculados.total,

        texto_original:
          resultado.texto_original ||
          null,

        estado: "importado",
      };

      const {
        data: albaranGuardado,
        error: errorGuardado,
      } = await supabase
        .from("importaciones_albaran")
        .insert(payload)
        .select()
        .single();

      if (errorGuardado) {
        throw errorGuardado;
      }

      setMensaje(
        `Albarán ${
          resultado.numero_albaran ||
          albaranGuardado?.id ||
          ""
        } importado correctamente.`,
      );

      setResultado((anterior) => ({
        ...anterior,
        estado: "importado",
      }));
    } catch (errorGuardado) {
      console.error(
        "Error guardando albarán:",
        errorGuardado,
      );

      setError(
        errorGuardado.message ||
          "No se ha podido importar el albarán.",
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <section className="panel">
        <p>
          Cargando lector de albaranes...
        </p>
      </section>
    );
  }

  const documentoLeido =
    Boolean(resultado.texto_original) ||
    resultado.lineas.length > 0;

  return (
    <section className="panel importador-emails">
      <div className="cabecera-seccion">
        <div>
          <p className="etiqueta">
            COMPRAS
          </p>

          <h1>
            📄 Leer albaranes
          </h1>

          <p className="texto-secundario">
            Arrastra un PDF o una fotografía.
            Los datos aparecerán directamente
            preparados para importar.
          </p>
        </div>

        {documentoLeido && (
          <button
            type="button"
            onClick={limpiarImportador}
            disabled={
              procesando || guardando
            }
          >
            Leer otro albarán
          </button>
        )}
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

      {!documentoLeido && (
        <>
          <input
            ref={inputArchivoRef}
            className="email-file-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={seleccionarArchivo}
            disabled={procesando}
          />

          <div
            className={`email-dropzone ${
              arrastrando
                ? "email-dropzone--active"
                : ""
            }`}
            role="button"
            tabIndex="0"
            onClick={abrirSelectorArchivo}
            onKeyDown={(evento) => {
              if (
                evento.key === "Enter" ||
                evento.key === " "
              ) {
                abrirSelectorArchivo();
              }
            }}
            onDragEnter={(evento) => {
              evento.preventDefault();
              setArrastrando(true);
            }}
            onDragOver={(evento) => {
              evento.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={(evento) => {
              evento.preventDefault();
              setArrastrando(false);
            }}
            onDrop={soltarArchivo}
          >
            <div className="email-dropzone__icon">
              📄
            </div>

            <h3>
              Arrastra aquí el albarán
            </h3>

            <p>
              También puedes pulsar para
              seleccionar el PDF o la foto.
            </p>

            <small>
              Formatos admitidos: PDF, JPG,
              PNG y WEBP
            </small>
          </div>
        </>
      )}

      {procesando && (
        <div className="email-import-card">
          <div className="email-import-card__header">
            <div>
              <span className="import-status">
                Leyendo
              </span>

              <h3>
                {archivoActual?.name ||
                  "Albarán"}
              </h3>

              <p>
                {progresoOCR.estado ||
                  "Leyendo el documento..."}
              </p>
            </div>

            <strong>
              {Math.round(
                numero(
                  progresoOCR.progreso,
                ),
              )}
              %
            </strong>
          </div>

          <progress
            value={numero(
              progresoOCR.progreso,
            )}
            max="100"
            style={{
              width: "100%",
              height: "18px",
            }}
          />
        </div>
      )}

      {documentoLeido && !procesando && (
        <div className="email-import-list">
          <article className="email-import-card">
            <div className="email-import-card__header">
              <div>
                <span className="import-status">
                  Datos detectados
                </span>

                <h3>
                  {archivoActual?.name ||
                    "Albarán leído"}
                </h3>

                <p>
                  Revisa los campos y pulsa
                  “Importar albarán”.
                </p>
              </div>

              <span className="import-status">
                {
                  resultado.lineas.length
                }{" "}
                productos
              </span>
            </div>

            <div className="import-grid">
              <label className="import-grid__wide">
                Proveedor

                <select
                  value={
                    resultado.proveedor_id
                  }
                  onChange={(evento) =>
                    seleccionarProveedor(
                      evento.target.value,
                    )
                  }
                >
                  <option value="">
                    Seleccionar proveedor
                  </option>

                  {proveedores.map(
                    (proveedor) => (
                      <option
                        key={proveedor.id}
                        value={proveedor.id}
                      >
                        {obtenerNombreProveedor(
                          proveedor,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Número de albarán

                <input
                  type="text"
                  value={
                    resultado.numero_albaran
                  }
                  onChange={(evento) =>
                    actualizarCampo(
                      "numero_albaran",
                      evento.target.value,
                    )
                  }
                  placeholder="Número"
                />
              </label>

              <label>
                Fecha

                <input
                  type="date"
                  value={
                    resultado.fecha_albaran
                  }
                  onChange={(evento) =>
                    actualizarCampo(
                      "fecha_albaran",
                      evento.target.value,
                    )
                  }
                />
              </label>
            </div>

            <div className="import-lines-header">
              <h4>
                Productos detectados
              </h4>

              <button
                type="button"
                onClick={añadirLinea}
                disabled={guardando}
              >
                + Añadir producto
              </button>
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
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {resultado.lineas.length ===
                    0 && (
                    <tr>
                      <td colSpan="8">
                        No se han detectado
                        productos. Pulsa
                        “Añadir producto”.
                      </td>
                    </tr>
                  )}

                  {resultado.lineas.map(
                    (linea) => {
                      const totalLinea =
                        redondear(
                          numero(
                            linea.cantidad,
                          ) *
                            numero(
                              linea.precio_unitario,
                            ),
                        );

                      return (
                        <tr
                          key={
                            linea.temporalId
                          }
                        >
                          <td>
                            <input
                              type="text"
                              value={
                                linea.codigo ||
                                ""
                              }
                              onChange={(
                                evento,
                              ) =>
                                actualizarLinea(
                                  linea.temporalId,
                                  "codigo",
                                  evento.target
                                    .value,
                                )
                              }
                              placeholder="Código"
                            />
                          </td>

                          <td>
                            <input
                              type="text"
                              value={
                                linea.descripcion ||
                                ""
                              }
                              onChange={(
                                evento,
                              ) =>
                                actualizarLinea(
                                  linea.temporalId,
                                  "descripcion",
                                  evento.target
                                    .value,
                                )
                              }
                              placeholder="Descripción"
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={
                                linea.cantidad
                              }
                              onChange={(
                                evento,
                              ) =>
                                actualizarLinea(
                                  linea.temporalId,
                                  "cantidad",
                                  evento.target
                                    .value,
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="text"
                              value={
                                linea.unidad ||
                                ""
                              }
                              onChange={(
                                evento,
                              ) =>
                                actualizarLinea(
                                  linea.temporalId,
                                  "unidad",
                                  evento.target
                                    .value,
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={
                                linea.precio_unitario
                              }
                              onChange={(
                                evento,
                              ) =>
                                actualizarLinea(
                                  linea.temporalId,
                                  "precio_unitario",
                                  evento.target
                                    .value,
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                linea.iva
                              }
                              onChange={(
                                evento,
                              ) =>
                                actualizarLinea(
                                  linea.temporalId,
                                  "iva",
                                  evento.target
                                    .value,
                                )
                              }
                            />
                          </td>

                          <td>
                            <strong>
                              {formatearEuros(
                                totalLinea,
                              )}
                            </strong>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="boton-peligro"
                              onClick={() =>
                                eliminarLinea(
                                  linea.temporalId,
                                )
                              }
                              disabled={
                                guardando
                              }
                              title="Eliminar producto"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            <details className="email-original">
              <summary>
                Ver texto original detectado
              </summary>

              <pre>
                {resultado.texto_original}
              </pre>
            </details>

            <div className="import-card-footer">
              <div className="import-total">
                <span>
                  Base:{" "}
                  <strong>
                    {formatearEuros(
                      totalesCalculados
                        .base_imponible,
                    )}
                  </strong>
                </span>

                <span>
                  IVA:{" "}
                  <strong>
                    {formatearEuros(
                      totalesCalculados
                        .total_iva,
                    )}
                  </strong>
                </span>

                <span>
                  Total:{" "}
                  <strong>
                    {formatearEuros(
                      totalesCalculados.total,
                    )}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                className="boton-principal"
                onClick={guardarAlbaran}
                disabled={
                  guardando ||
                  procesando ||
                  resultado.lineas.length ===
                    0
                }
              >
                {guardando
                  ? "Importando..."
                  : "✅ Importar albarán"}
              </button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

export default ImportadorAlbaranes;