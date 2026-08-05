import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "../supabase.js";

import {
  leerDocumentoInteligenteV3,
} from "../services/lectorInteligenteV3.js";

import {
  analizarDocumentoIA,
  recalcularDocumentoIA,
} from "../ai/parserIA.js";

import {
  cargarCatalogoIA,
  compararLineasIA,
  ESTADOS_COMPARACION_IA,
  obtenerResumenComparacionIA,
  resolverCoincidenciaIA,
} from "../services/comparadorIA.js";

import {
  importarAlbaranCompletoIA,
} from "../services/actualizadorCatalogoIA.js";

import {
  aprenderDeAlbaran,
} from "../services/proveedorIA.js";

const RESULTADO_VACIO = {
  proveedor_id: "",
  proveedor_nombre: "",
  numero_albaran: "",
  fecha_albaran: "",
  lineas: [],
  base_imponible: 0,
  total_iva: 0,
  total: 0,
  confianza_media: 0,
  necesita_revision: true,
  diagnostico: null,
};

function crearIdTemporal() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;

  let limpio = String(valor)
    .trim()
    .replace(/[€%\s]/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!limpio) return 0;

  if (limpio.includes(",") && limpio.includes(".")) {
    if (limpio.lastIndexOf(",") > limpio.lastIndexOf(".")) {
      limpio = limpio.replace(/\./g, "").replace(",", ".");
    } else {
      limpio = limpio.replace(/,/g, "");
    }
  } else if (limpio.includes(",")) {
    limpio = limpio.replace(",", ".");
  }

  const resultado = Number(limpio);
  return Number.isFinite(resultado) ? resultado : 0;
}

function redondear(valor, decimales = 2) {
  return Number(numero(valor).toFixed(decimales));
}

function formatearEuros(valor) {
  return numero(valor).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function obtenerNombreProveedor(proveedor = {}) {
  return (
    proveedor.nombre ||
    proveedor.nombre_comercial ||
    proveedor.razon_social ||
    proveedor.empresa ||
    "Proveedor sin nombre"
  );
}

function prepararLinea(linea = {}) {
  return {
    temporalId: linea.temporalId || crearIdTemporal(),
    codigo: linea.codigo || "",
    descripcion: linea.descripcion || "",
    cantidad: linea.cantidad === undefined ? 1 : linea.cantidad,
    unidad: linea.unidad || "unidad",
    precio_unitario:
      linea.precio_unitario === undefined ? "" : linea.precio_unitario,
    iva: linea.iva === undefined ? 10 : linea.iva,
    total_linea: linea.total_linea === undefined ? 0 : linea.total_linea,
    confianza: linea.confianza || 0,
    texto_origen: linea.texto_origen || "",
    estado_ia: linea.estado_ia || ESTADOS_COMPARACION_IA.REVISAR,
    catalogo_id: linea.catalogo_id || null,
    articulo_catalogo: linea.articulo_catalogo || null,
    producto_catalogo: linea.producto_catalogo || "",
    codigo_catalogo: linea.codigo_catalogo || "",
    unidad_catalogo: linea.unidad_catalogo || "",
    precio_anterior: linea.precio_anterior || 0,
    precio_nuevo: linea.precio_nuevo ?? linea.precio_unitario ?? 0,
    diferencia_precio: linea.diferencia_precio || 0,
    porcentaje_cambio: linea.porcentaje_cambio || 0,
    puntuacion_coincidencia: linea.puntuacion_coincidencia || 0,
    similitud_nombre: linea.similitud_nombre || 0,
    similitud_unidad: linea.similitud_unidad || 0,
    similitud_formato: linea.similitud_formato || 0,
    motivo: linea.motivo || "",
    crear_articulo: Boolean(linea.crear_articulo),
    actualizar_precio: Boolean(linea.actualizar_precio),
    confirmado: linea.confirmado !== false,
    necesita_revision: Boolean(linea.necesita_revision),
  };
}

function textoEstado(estado) {
  switch (estado) {
    case ESTADOS_COMPARACION_IA.COINCIDENCIA_EXACTA:
      return "✅ Encontrado";
    case ESTADOS_COMPARACION_IA.PRECIO_DIFERENTE:
      return "🟠 Precio diferente";
    case ESTADOS_COMPARACION_IA.POSIBLE_COINCIDENCIA:
      return "⚠️ Posible coincidencia";
    case ESTADOS_COMPARACION_IA.ARTICULO_NUEVO:
      return "🆕 Artículo nuevo";
    default:
      return "🔎 Revisar";
  }
}

function claseEstado(estado) {
  switch (estado) {
    case ESTADOS_COMPARACION_IA.COINCIDENCIA_EXACTA:
      return "estado-catalogo estado-catalogo--encontrado";
    case ESTADOS_COMPARACION_IA.PRECIO_DIFERENTE:
      return "estado-catalogo estado-catalogo--precio";
    case ESTADOS_COMPARACION_IA.ARTICULO_NUEVO:
      return "estado-catalogo estado-catalogo--nuevo";
    case ESTADOS_COMPARACION_IA.POSIBLE_COINCIDENCIA:
      return "estado-catalogo estado-catalogo--posible";
    default:
      return "estado-catalogo estado-catalogo--revisar";
  }
}

function ImportadorAlbaranesV3() {
  const inputArchivoRef = useRef(null);

  const [proveedores, setProveedores] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [archivoActual, setArchivoActual] = useState(null);
  const [lectura, setLectura] = useState(null);
  const [resultado, setResultado] = useState(RESULTADO_VACIO);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [comparando, setComparando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aprendiendo, setAprendiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [progreso, setProgreso] = useState({ estado: "", progreso: 0 });

  useEffect(() => {
    cargarProveedores();
  }, []);

  async function cargarProveedores() {
    setCargando(true);
    setError("");

    try {
      const { data, error: errorConsulta } = await supabase
        .from("proveedores")
        .select("*")
        .order("nombre", { ascending: true });

      if (errorConsulta) throw errorConsulta;
      setProveedores(data || []);
    } catch (errorCarga) {
      setError(
        errorCarga.message || "No se han podido cargar los proveedores.",
      );
    } finally {
      setCargando(false);
    }
  }

  async function compararConCatalogo(proveedorId, lineasBase) {
    if (!proveedorId) {
      setCatalogo([]);
      setResultado((anterior) => ({
        ...anterior,
        lineas: anterior.lineas.map((linea) =>
          prepararLinea({
            ...linea,
            estado_ia: ESTADOS_COMPARACION_IA.REVISAR,
            confirmado: false,
            crear_articulo: false,
            actualizar_precio: false,
            motivo: "Selecciona el proveedor para comparar esta línea.",
          }),
        ),
      }));
      return;
    }

    setComparando(true);
    setError("");

    try {
      const catalogoProveedor = await cargarCatalogoIA(proveedorId);
      const lineasComparadas = compararLineasIA(
        lineasBase,
        catalogoProveedor,
      ).map(prepararLinea);

      setCatalogo(catalogoProveedor);
      setResultado((anterior) => ({ ...anterior, lineas: lineasComparadas }));
    } catch (errorComparacion) {
      setError(
        errorComparacion.message ||
          "No se ha podido comparar el documento con el catálogo.",
      );
    } finally {
      setComparando(false);
    }
  }

  async function procesarArchivo(archivo) {
    if (!archivo) return;

    setArchivoActual(archivo);
    setLectura(null);
    setCatalogo([]);
    setResultado(RESULTADO_VACIO);
    setProcesando(true);
    setError("");
    setMensaje("");
    setProgreso({ estado: "Preparando documento", progreso: 0 });

    try {
      const lecturaV3 = await leerDocumentoInteligenteV3(archivo, {
        proveedores,
        onProgreso: setProgreso,
      });

      const analisis = analizarDocumentoIA(lecturaV3);
      const proveedorId = analisis.proveedor_id || lecturaV3.proveedor_id || "";
      const proveedorEncontrado = proveedores.find(
        (proveedor) => String(proveedor.id) === String(proveedorId),
      );

      let lineas = (analisis.lineas || []).map(prepararLinea);
      let catalogoProveedor = [];

      if (proveedorId) {
        catalogoProveedor = await cargarCatalogoIA(proveedorId);
        lineas = compararLineasIA(lineas, catalogoProveedor).map(prepararLinea);
      }

      setLectura(lecturaV3);
      setCatalogo(catalogoProveedor);
      setResultado({
        ...RESULTADO_VACIO,
        ...analisis,
        proveedor_id: proveedorId,
        proveedor_nombre: proveedorEncontrado
          ? obtenerNombreProveedor(proveedorEncontrado)
          : analisis.proveedor_nombre ||
            lecturaV3.proveedor_detectado?.nombre ||
            "",
        lineas,
      });

      setMensaje(
        lineas.length
          ? `Documento leído. Se han detectado ${lineas.length} productos.`
          : "El documento se ha leído, pero no se han detectado productos.",
      );
    } catch (errorLectura) {
      console.error("Error procesando albarán V3:", errorLectura);
      setError(errorLectura.message || "No se ha podido leer el documento.");
      setArchivoActual(null);
    } finally {
      setProcesando(false);
      setProgreso((anterior) => ({
        estado: anterior.estado || "Documento procesado",
        progreso: 100,
      }));
    }
  }

  function seleccionarArchivo(evento) {
    procesarArchivo(evento.target.files?.[0]);
  }

  function soltarArchivo(evento) {
    evento.preventDefault();
    setArrastrando(false);
    procesarArchivo(evento.dataTransfer.files?.[0]);
  }

  async function seleccionarProveedor(proveedorId) {
    const proveedor = proveedores.find(
      (item) => String(item.id) === String(proveedorId),
    );

    setResultado((anterior) => ({
      ...anterior,
      proveedor_id: proveedorId,
      proveedor_nombre: proveedor ? obtenerNombreProveedor(proveedor) : "",
    }));

    await compararConCatalogo(proveedorId, resultado.lineas);
  }

  function actualizarCampo(campo, valor) {
    setResultado((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function actualizarLinea(temporalId, campo, valor) {
    setResultado((anterior) => ({
      ...anterior,
      lineas: anterior.lineas.map((linea) => {
        if (linea.temporalId !== temporalId) return linea;

        const actualizada = { ...linea, [campo]: valor };

        if (campo === "cantidad" || campo === "precio_unitario") {
          actualizada.total_linea = redondear(
            numero(actualizada.cantidad) * numero(actualizada.precio_unitario),
            2,
          );
        }

        if (["codigo", "descripcion", "precio_unitario", "unidad"].includes(campo)) {
          actualizada.estado_ia = ESTADOS_COMPARACION_IA.REVISAR;
          actualizada.confirmado = false;
          actualizada.crear_articulo = false;
          actualizada.actualizar_precio = false;
          actualizada.motivo =
            "La línea se ha modificado. Pulsa «Volver a comparar».";
        }

        return prepararLinea(actualizada);
      }),
    }));
  }

  function actualizarOpcion(temporalId, campo, valor) {
    setResultado((anterior) => ({
      ...anterior,
      lineas: anterior.lineas.map((linea) =>
        linea.temporalId === temporalId ? { ...linea, [campo]: valor } : linea,
      ),
    }));
  }

  function confirmarCoincidencia(temporalId, usarExistente) {
    setResultado((anterior) => ({
      ...anterior,
      lineas: anterior.lineas.map((linea) => {
        if (linea.temporalId !== temporalId) return linea;
        return prepararLinea(
          resolverCoincidenciaIA({
            linea,
            usarArticuloExistente: usarExistente,
          }),
        );
      }),
    }));
  }

  function añadirLinea() {
    const nueva = prepararLinea({
      descripcion: "",
      cantidad: 1,
      unidad: "unidad",
      precio_unitario: "",
      iva: 10,
      estado_ia: ESTADOS_COMPARACION_IA.REVISAR,
      confirmado: false,
      motivo: "Completa la línea y vuelve a comparar.",
    });

    setResultado((anterior) => ({
      ...anterior,
      lineas: [...anterior.lineas, nueva],
    }));
  }

  function eliminarLinea(temporalId) {
    setResultado((anterior) => ({
      ...anterior,
      lineas: anterior.lineas.filter(
        (linea) => linea.temporalId !== temporalId,
      ),
    }));
  }

  async function volverAComparar() {
    if (!resultado.proveedor_id) {
      setError("Selecciona primero el proveedor.");
      return;
    }

    await compararConCatalogo(resultado.proveedor_id, resultado.lineas);
    setMensaje("Los productos se han vuelto a comparar con el catálogo.");
  }

  function limpiarImportador() {
    setArchivoActual(null);
    setLectura(null);
    setCatalogo([]);
    setResultado(RESULTADO_VACIO);
    setError("");
    setMensaje("");
    setProgreso({ estado: "", progreso: 0 });
    if (inputArchivoRef.current) inputArchivoRef.current.value = "";
  }

  const totales = useMemo(
    () => recalcularDocumentoIA(resultado.lineas),
    [resultado.lineas],
  );

  const resumen = useMemo(
    () => obtenerResumenComparacionIA(resultado.lineas),
    [resultado.lineas],
  );

  function validarImportacion() {
    if (!resultado.proveedor_id) return "Selecciona el proveedor.";
    if (!resultado.fecha_albaran) return "Indica la fecha del albarán.";
    if (resultado.lineas.length === 0) return "No hay productos para importar.";

    const pendientes = resultado.lineas.filter(
      (linea) =>
        linea.estado_ia === ESTADOS_COMPARACION_IA.POSIBLE_COINCIDENCIA ||
        linea.estado_ia === ESTADOS_COMPARACION_IA.REVISAR ||
        linea.confirmado === false,
    );

    if (pendientes.length > 0) {
      return "Hay líneas pendientes de revisar o confirmar.";
    }

    return "";
  }

  async function guardarImportacion() {
    setError("");
    setMensaje("");

    const errorValidacion = validarImportacion();
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setGuardando(true);

    try {
      const resultadoImportacion = await importarAlbaranCompletoIA({
        archivo: archivoActual,
        proveedorId: resultado.proveedor_id,
        proveedorNombre: resultado.proveedor_nombre,
        lectura,
        analisis: { ...resultado, ...totales },
        lineas: resultado.lineas,
      });

      const resumenFinal = resultadoImportacion.resumen;

      if (resumenFinal.errores.length > 0) {
        setError(
          `El albarán se ha guardado con ${resumenFinal.errores.length} errores. Revisa las incidencias.`,
        );
      } else {
        setMensaje(
          `Importación terminada. Artículos creados: ${resumenFinal.articulos_creados}. Precios actualizados: ${resumenFinal.precios_actualizados}.`,
        );
      }
    } catch (errorGuardado) {
      console.error("Error guardando importación:", errorGuardado);
      setError(errorGuardado.message || "No se ha podido guardar el albarán.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarAprendizaje() {
    if (!resultado.proveedor_id) {
      setError("Selecciona el proveedor antes de guardar el aprendizaje.");
      return;
    }

    if (!lectura) {
      setError("Primero debes leer un documento.");
      return;
    }

    setAprendiendo(true);
    setError("");
    setMensaje("");

    try {
      const aprendizaje = await aprenderDeAlbaran({
        proveedorId: resultado.proveedor_id,
        proveedorNombre: resultado.proveedor_nombre,
        lectura,
        analisis: { ...resultado, ...totales },
        lineas: resultado.lineas,
      });

      if (aprendizaje.errores.length > 0) {
        setError(
          `Aprendizaje guardado parcialmente. Errores: ${aprendizaje.errores.length}.`,
        );
      } else {
        setMensaje(
          `Aprendizaje guardado. Artículos aprendidos: ${aprendizaje.diccionario_guardado}. Correcciones: ${aprendizaje.correcciones_guardadas}.`,
        );
      }
    } catch (errorAprendizaje) {
      setError(
        errorAprendizaje.message || "No se ha podido guardar el aprendizaje.",
      );
    } finally {
      setAprendiendo(false);
    }
  }

  if (cargando) {
    return (
      <section className="panel">
        <p>Cargando Lector Inteligente V3...</p>
      </section>
    );
  }

  const documentoLeido = Boolean(lectura) || resultado.lineas.length > 0;

  return (
    <section className="panel importador-emails">
      <div className="cabecera-seccion">
        <div>
          <p className="etiqueta">COMPRAS</p>
          <h1>🧠 Lector Inteligente V3</h1>
          <p className="texto-secundario">
            Lee el albarán, compara los artículos, crea los nuevos, actualiza
            precios y aprende del proveedor.
          </p>
        </div>

        {documentoLeido && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={volverAComparar}
              disabled={procesando || comparando || guardando || aprendiendo}
            >
              {comparando ? "Comparando..." : "🔄 Volver a comparar"}
            </button>

            <button
              type="button"
              onClick={guardarAprendizaje}
              disabled={guardando || procesando || aprendiendo}
            >
              {aprendiendo ? "Aprendiendo..." : "🧠 Aprender de este albarán"}
            </button>

            <button
              type="button"
              onClick={limpiarImportador}
              disabled={procesando || guardando || aprendiendo}
            >
              Leer otro albarán
            </button>
          </div>
        )}
      </div>

      {error && <div className="mensaje-error">{error}</div>}
      {mensaje && <div className="mensaje-exito">{mensaje}</div>}

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
              arrastrando ? "email-dropzone--active" : ""
            }`}
            role="button"
            tabIndex="0"
            onClick={() => inputArchivoRef.current?.click()}
            onKeyDown={(evento) => {
              if (evento.key === "Enter" || evento.key === " ") {
                inputArchivoRef.current?.click();
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
            <div className="email-dropzone__icon">🧠</div>
            <h3>Arrastra aquí el albarán</h3>
            <p>También puedes pulsar para seleccionar el PDF o la fotografía.</p>
            <small>PDF, JPG, PNG o WEBP</small>
          </div>
        </>
      )}

      {procesando && (
        <div className="email-import-card">
          <div className="email-import-card__header">
            <div>
              <span className="import-status">Procesando</span>
              <h3>{archivoActual?.name || "Documento"}</h3>
              <p>{progreso.estado || "Analizando documento..."}</p>
            </div>
            <strong>{Math.round(numero(progreso.progreso))}%</strong>
          </div>

          <progress
            value={numero(progreso.progreso)}
            max="100"
            style={{ width: "100%", height: "18px" }}
          />
        </div>
      )}

      {documentoLeido && !procesando && (
        <>
          <div className="email-import-card" style={{ marginBottom: "18px" }}>
            <div className="import-grid">
              <label className="import-grid__wide">
                Proveedor
                <select
                  value={resultado.proveedor_id}
                  onChange={(evento) => seleccionarProveedor(evento.target.value)}
                  disabled={comparando || guardando}
                >
                  <option value="">Seleccionar proveedor</option>
                  {proveedores.map((proveedor) => (
                    <option key={proveedor.id} value={proveedor.id}>
                      {obtenerNombreProveedor(proveedor)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Número de albarán
                <input
                  type="text"
                  value={resultado.numero_albaran}
                  onChange={(evento) =>
                    actualizarCampo("numero_albaran", evento.target.value)
                  }
                />
              </label>

              <label>
                Fecha
                <input
                  type="date"
                  value={resultado.fecha_albaran}
                  onChange={(evento) =>
                    actualizarCampo("fecha_albaran", evento.target.value)
                  }
                />
              </label>
            </div>
          </div>

          <div className="email-import-card" style={{ marginBottom: "18px" }}>
            <h3>Resumen de comparación</h3>
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginTop: "12px",
              }}
            >
              <span
                className={claseEstado(
                  ESTADOS_COMPARACION_IA.COINCIDENCIA_EXACTA,
                )}
              >
                ✅ Encontrados: {resumen.coincidencias_exactas}
              </span>

              <span
                className={claseEstado(
                  ESTADOS_COMPARACION_IA.PRECIO_DIFERENTE,
                )}
              >
                🟠 Precios distintos: {resumen.precios_diferentes}
              </span>

              <span
                className={claseEstado(
                  ESTADOS_COMPARACION_IA.ARTICULO_NUEVO,
                )}
              >
                🆕 Nuevos: {resumen.articulos_nuevos}
              </span>

              <span
                className={claseEstado(
                  ESTADOS_COMPARACION_IA.POSIBLE_COINCIDENCIA,
                )}
              >
                ⚠️ Coincidencias: {resumen.posibles_coincidencias}
              </span>

              <span className={claseEstado(ESTADOS_COMPARACION_IA.REVISAR)}>
                🔎 Revisar: {resumen.revisar}
              </span>
            </div>
          </div>

          <div className="email-import-card">
            <div className="import-lines-header">
              <div>
                <h3>Productos detectados</h3>
                <p className="texto-secundario">
                  Revisa los artículos nuevos, las coincidencias y los cambios
                  de precio.
                </p>
              </div>

              <button type="button" onClick={añadirLinea} disabled={guardando}>
                + Añadir producto
              </button>
            </div>

            <div className="tabla-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Precio</th>
                    <th>IVA</th>
                    <th>Total</th>
                    <th>Acción</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {resultado.lineas.length === 0 && (
                    <tr>
                      <td colSpan="10">No se han detectado productos.</td>
                    </tr>
                  )}

                  {resultado.lineas.map((linea) => (
                    <tr key={linea.temporalId}>
                      <td>
                        <span className={claseEstado(linea.estado_ia)}>
                          {textoEstado(linea.estado_ia)}
                        </span>
                      </td>

                      <td>
                        <input
                          value={linea.codigo || ""}
                          onChange={(evento) =>
                            actualizarLinea(
                              linea.temporalId,
                              "codigo",
                              evento.target.value,
                            )
                          }
                        />
                      </td>

                      <td style={{ minWidth: "260px" }}>
                        <input
                          value={linea.descripcion || ""}
                          onChange={(evento) =>
                            actualizarLinea(
                              linea.temporalId,
                              "descripcion",
                              evento.target.value,
                            )
                          }
                        />

                        {linea.producto_catalogo && (
                          <small style={{ display: "block", marginTop: "5px" }}>
                            Catálogo: <strong>{linea.producto_catalogo}</strong>
                          </small>
                        )}

                        {linea.motivo && (
                          <small style={{ display: "block", marginTop: "5px" }}>
                            {linea.motivo}
                          </small>
                        )}
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={linea.cantidad}
                          onChange={(evento) =>
                            actualizarLinea(
                              linea.temporalId,
                              "cantidad",
                              evento.target.value,
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          value={linea.unidad || ""}
                          onChange={(evento) =>
                            actualizarLinea(
                              linea.temporalId,
                              "unidad",
                              evento.target.value,
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={linea.precio_unitario}
                          onChange={(evento) =>
                            actualizarLinea(
                              linea.temporalId,
                              "precio_unitario",
                              evento.target.value,
                            )
                          }
                        />

                        {linea.estado_ia ===
                          ESTADOS_COMPARACION_IA.PRECIO_DIFERENTE && (
                          <small style={{ display: "block", marginTop: "5px" }}>
                            Anterior: {formatearEuros(linea.precio_anterior)}
                            <br />
                            Cambio: {linea.porcentaje_cambio}%
                          </small>
                        )}
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={linea.iva}
                          onChange={(evento) =>
                            actualizarLinea(
                              linea.temporalId,
                              "iva",
                              evento.target.value,
                            )
                          }
                        />
                      </td>

                      <td>
                        <strong>
                          {formatearEuros(
                            numero(linea.cantidad) * numero(linea.precio_unitario),
                          )}
                        </strong>
                      </td>

                      <td style={{ minWidth: "190px" }}>
                        {linea.estado_ia ===
                          ESTADOS_COMPARACION_IA.ARTICULO_NUEVO && (
                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(linea.crear_articulo)}
                              onChange={(evento) =>
                                actualizarOpcion(
                                  linea.temporalId,
                                  "crear_articulo",
                                  evento.target.checked,
                                )
                              }
                            />{" "}
                            Crear artículo
                          </label>
                        )}

                        {linea.estado_ia ===
                          ESTADOS_COMPARACION_IA.PRECIO_DIFERENTE && (
                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(linea.actualizar_precio)}
                              onChange={(evento) =>
                                actualizarOpcion(
                                  linea.temporalId,
                                  "actualizar_precio",
                                  evento.target.checked,
                                )
                              }
                            />{" "}
                            Actualizar precio
                          </label>
                        )}

                        {linea.estado_ia ===
                          ESTADOS_COMPARACION_IA.COINCIDENCIA_EXACTA && (
                          <span>Sin cambios</span>
                        )}

                        {linea.estado_ia ===
                          ESTADOS_COMPARACION_IA.POSIBLE_COINCIDENCIA && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                confirmarCoincidencia(linea.temporalId, true)
                              }
                            >
                              Es el mismo
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                confirmarCoincidencia(linea.temporalId, false)
                              }
                            >
                              Es nuevo
                            </button>
                          </div>
                        )}

                        {linea.estado_ia === ESTADOS_COMPARACION_IA.REVISAR && (
                          <small>Corrige y vuelve a comparar.</small>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="boton-peligro"
                          onClick={() => eliminarLinea(linea.temporalId)}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <details className="email-original">
              <summary>Ver texto original detectado</summary>
              <pre>{lectura?.texto_original}</pre>
            </details>

            <div className="import-card-footer">
              <div className="import-total">
                <span>
                  Base: <strong>{formatearEuros(totales.base_imponible)}</strong>
                </span>
                <span>
                  IVA: <strong>{formatearEuros(totales.total_iva)}</strong>
                </span>
                <span>
                  Total: <strong>{formatearEuros(totales.total)}</strong>
                </span>
              </div>

              <button
                type="button"
                className="boton-principal"
                onClick={guardarImportacion}
                disabled={
                  guardando ||
                  comparando ||
                  aprendiendo ||
                  resultado.lineas.length === 0
                }
              >
                {guardando ? "Importando..." : "✅ Confirmar importación"}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default ImportadorAlbaranesV3;