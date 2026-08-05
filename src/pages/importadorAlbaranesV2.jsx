import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "../supabase.js";

import {
  leerDocumentoInteligente,
} from "../services/lectorInteligenteV2.js";

import {
  analizarAlbaranV2,
  recalcularAlbaranV2,
} from "../ai/parserAlbaranesV2.js";

import {
  aplicarCambiosCatalogo,
  cargarCatalogoProveedor,
  compararLineasConCatalogo,
  ESTADOS_CATALOGO,
  resolverPosibleCoincidencia,
} from "../services/catalogoProveedoresV2.js";

const RESULTADO_VACIO = {
  proveedor_id: "",
  proveedor_nombre: "",
  numero_albaran: "",
  fecha_albaran: "",
  lineas: [],
  base_imponible: 0,
  total_iva: 0,
  total: 0,
  texto_original: "",
  confianza_media: 0,
  necesita_revision: false,
  diagnostico: null,
  calidad_lectura: null,
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
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return 0;
  }

  let limpio = String(valor)
    .trim()
    .replace(/[€%\s]/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!limpio) {
    return 0;
  }

  const tieneComa = limpio.includes(",");
  const tienePunto = limpio.includes(".");

  if (tieneComa && tienePunto) {
    if (
      limpio.lastIndexOf(",") >
      limpio.lastIndexOf(".")
    ) {
      limpio = limpio
        .replace(/\./g, "")
        .replace(",", ".");
    } else {
      limpio = limpio.replace(/,/g, "");
    }
  } else if (tieneComa) {
    limpio = limpio.replace(",", ".");
  }

  const resultado = Number(limpio);

  return Number.isFinite(resultado)
    ? resultado
    : 0;
}

function redondear(valor, decimales = 2) {
  return Number(
    numero(valor).toFixed(decimales),
  );
}

function formatearEuros(valor) {
  return numero(valor).toLocaleString(
    "es-ES",
    {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    },
  );
}

function obtenerNombreProveedor(proveedor) {
  return (
    proveedor?.nombre ||
    proveedor?.nombre_comercial ||
    proveedor?.razon_social ||
    proveedor?.empresa ||
    "Proveedor sin nombre"
  );
}

function normalizarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function prepararLinea(linea = {}) {
  return {
    temporalId:
      linea.temporalId ||
      crearIdTemporal(),

    codigo:
      linea.codigo || "",

    descripcion:
      linea.descripcion || "",

    cantidad:
      linea.cantidad === undefined
        ? 1
        : linea.cantidad,

    unidad:
      linea.unidad || "unidad",

    precio_unitario:
      linea.precio_unitario === undefined
        ? ""
        : linea.precio_unitario,

    iva:
      linea.iva === undefined
        ? 10
        : linea.iva,

    total_linea:
      linea.total_linea === undefined
        ? 0
        : linea.total_linea,

    confianza:
      linea.confianza || 0,

    texto_origen:
      linea.texto_origen || "",

    necesita_revision:
      Boolean(
        linea.necesita_revision,
      ),

    estado_catalogo:
      linea.estado_catalogo ||
      ESTADOS_CATALOGO.REVISAR,

    catalogo_id:
      linea.catalogo_id || null,

    articulo_catalogo:
      linea.articulo_catalogo || null,

    nombre_catalogo:
      linea.nombre_catalogo || "",

    codigo_catalogo:
      linea.codigo_catalogo || "",

    precio_anterior:
      linea.precio_anterior || 0,

    precio_nuevo:
      linea.precio_nuevo ??
      linea.precio_unitario ??
      0,

    diferencia_precio:
      linea.diferencia_precio || 0,

    porcentaje_cambio:
      linea.porcentaje_cambio || 0,

    similitud:
      linea.similitud || 0,

    motivo:
      linea.motivo || "",

    crear_articulo:
      Boolean(
        linea.crear_articulo,
      ),

    actualizar_precio:
      Boolean(
        linea.actualizar_precio,
      ),

    confirmado:
      linea.confirmado !== false,
  };
}

function claseEstado(estado) {
  switch (estado) {
    case ESTADOS_CATALOGO.ENCONTRADO:
      return "estado-catalogo estado-catalogo--encontrado";

    case ESTADOS_CATALOGO.PRECIO_NUEVO:
      return "estado-catalogo estado-catalogo--precio";

    case ESTADOS_CATALOGO.ARTICULO_NUEVO:
      return "estado-catalogo estado-catalogo--nuevo";

    case ESTADOS_CATALOGO.POSIBLE_COINCIDENCIA:
      return "estado-catalogo estado-catalogo--posible";

    default:
      return "estado-catalogo estado-catalogo--revisar";
  }
}

function textoEstado(estado) {
  switch (estado) {
    case ESTADOS_CATALOGO.ENCONTRADO:
      return "✅ Encontrado";

    case ESTADOS_CATALOGO.PRECIO_NUEVO:
      return "🟠 Precio diferente";

    case ESTADOS_CATALOGO.ARTICULO_NUEVO:
      return "🆕 Artículo nuevo";

    case ESTADOS_CATALOGO.POSIBLE_COINCIDENCIA:
      return "⚠️ Posible coincidencia";

    default:
      return "🔎 Revisar";
  }
}

function ImportadorAlbaranesV2() {
  const inputArchivoRef = useRef(null);

  const [proveedores, setProveedores] =
    useState([]);

  const [catalogo, setCatalogo] =
    useState([]);

  const [resultado, setResultado] =
    useState(RESULTADO_VACIO);

  const [archivoActual, setArchivoActual] =
    useState(null);

  const [lecturaCompleta, setLecturaCompleta] =
    useState(null);

  const [cargando, setCargando] =
    useState(true);

  const [procesando, setProcesando] =
    useState(false);

  const [comparando, setComparando] =
    useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [arrastrando, setArrastrando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [progreso, setProgreso] =
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
      const {
        data,
        error: errorProveedores,
      } = await supabase
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
    lectura,
  ) {
    const textoDocumento =
      lectura?.texto_normalizado ||
      lectura?.texto_original ||
      "";

    const textoNormalizado =
      normalizarTexto(textoDocumento);

    const nombreDetectado =
      normalizarTexto(
        analisis.proveedor_nombre ||
          "",
      );

    let proveedorEncontrado = null;

    if (nombreDetectado) {
      proveedorEncontrado =
        proveedores.find(
          (proveedor) => {
            const nombre =
              normalizarTexto(
                obtenerNombreProveedor(
                  proveedor,
                ),
              );

            return (
              nombre.length >= 4 &&
              (nombre.includes(
                nombreDetectado,
              ) ||
                nombreDetectado.includes(
                  nombre,
                ))
            );
          },
        );
    }

    if (!proveedorEncontrado) {
      proveedorEncontrado =
        proveedores.find(
          (proveedor) => {
            const cif =
              normalizarTexto(
                proveedor.nif_cif ||
                  proveedor.cif ||
                  proveedor.nif ||
                  "",
              );

            return (
              cif.length >= 6 &&
              textoNormalizado.includes(
                cif,
              )
            );
          },
        );
    }

    if (!proveedorEncontrado) {
      proveedorEncontrado =
        proveedores.find(
          (proveedor) => {
            const nombre =
              normalizarTexto(
                obtenerNombreProveedor(
                  proveedor,
                ),
              );

            return (
              nombre.length >= 5 &&
              textoNormalizado.includes(
                nombre,
              )
            );
          },
        );
    }

    return proveedorEncontrado;
  }

  async function compararConProveedor(
    proveedorId,
    lineasBase = resultado.lineas,
  ) {
    if (!proveedorId) {
      setCatalogo([]);

      setResultado((anterior) => ({
        ...anterior,

        lineas:
          anterior.lineas.map(
            (linea) =>
              prepararLinea({
                ...linea,

                estado_catalogo:
                  ESTADOS_CATALOGO.REVISAR,

                motivo:
                  "Selecciona un proveedor para comparar el artículo.",

                crear_articulo: false,

                actualizar_precio: false,
              }),
          ),
      }));

      return;
    }

    setComparando(true);
    setError("");

    try {
      const catalogoProveedor =
        await cargarCatalogoProveedor(
          proveedorId,
        );

      setCatalogo(
        catalogoProveedor,
      );

      const comparadas =
        compararLineasConCatalogo(
          lineasBase,
          catalogoProveedor,
        ).map(prepararLinea);

      setResultado((anterior) => ({
        ...anterior,
        lineas: comparadas,
      }));
    } catch (errorComparacion) {
      console.error(
        "Error comparando catálogo:",
        errorComparacion,
      );

      setError(
        errorComparacion.message ||
          "No se ha podido comparar el albarán con el catálogo.",
      );
    } finally {
      setComparando(false);
    }
  }

  async function procesarArchivo(archivo) {
    if (!archivo) {
      return;
    }

    setError("");
    setMensaje("");
    setProcesando(true);
    setArchivoActual(archivo);
    setLecturaCompleta(null);
    setCatalogo([]);
    setResultado(RESULTADO_VACIO);

    setProgreso({
      estado:
        "Preparando documento",
      progreso: 0,
    });

    try {
      const lectura =
        await leerDocumentoInteligente(
          archivo,
          setProgreso,
        );

      setLecturaCompleta(lectura);

      const analisis =
        analizarAlbaranV2(lectura);

      const proveedorDetectado =
        buscarProveedorAutomaticamente(
          analisis,
          lectura,
        );

      const lineasIniciales =
        (analisis.lineas || []).map(
          prepararLinea,
        );

      let lineasComparadas =
        lineasIniciales;

      let catalogoProveedor = [];

      if (proveedorDetectado?.id) {
        catalogoProveedor =
          await cargarCatalogoProveedor(
            proveedorDetectado.id,
          );

        lineasComparadas =
          compararLineasConCatalogo(
            lineasIniciales,
            catalogoProveedor,
          ).map(prepararLinea);
      }

      setCatalogo(catalogoProveedor);

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
            : analisis.proveedor_nombre ||
              "",

        lineas: lineasComparadas,

        texto_original:
          lectura.texto_original || "",

        calidad_lectura:
          lectura.calidad_lectura ||
          null,
      });

      if (
        lineasComparadas.length === 0
      ) {
        setMensaje(
          "El documento se ha leído, pero no se han detectado productos. Puedes añadirlos manualmente.",
        );
      } else {
        setMensaje(
          `Documento leído. Se han detectado ${lineasComparadas.length} líneas de producto.`,
        );
      }
    } catch (errorLectura) {
      console.error(
        "Error leyendo documento:",
        errorLectura,
      );

      setError(
        errorLectura.message ||
          "No se ha podido leer el documento.",
      );

      setArchivoActual(null);
    } finally {
      setProcesando(false);

      setProgreso((anterior) => ({
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

  async function seleccionarProveedor(
    proveedorId,
  ) {
    const proveedor =
      proveedores.find(
        (item) =>
          String(item.id) ===
          String(proveedorId),
      );

    setResultado((anterior) => ({
      ...anterior,

      proveedor_id:
        proveedorId,

      proveedor_nombre:
        proveedor
          ? obtenerNombreProveedor(
              proveedor,
            )
          : "",
    }));

    await compararConProveedor(
      proveedorId,
      resultado.lineas,
    );
  }

  function actualizarCampo(
    campo,
    valor,
  ) {
    setResultado((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function actualizarLinea(
    temporalId,
    campo,
    valor,
  ) {
    setResultado((anterior) => {
      const lineasActualizadas =
        anterior.lineas.map(
          (linea) => {
            if (
              linea.temporalId !==
              temporalId
            ) {
              return linea;
            }

            const actualizada = {
              ...linea,
              [campo]: valor,
            };

            if (
              campo === "cantidad" ||
              campo ===
                "precio_unitario"
            ) {
              actualizada.total_linea =
                redondear(
                  numero(
                    actualizada.cantidad,
                  ) *
                    numero(
                      actualizada
                        .precio_unitario,
                    ),
                  2,
                );

              actualizada.precio_nuevo =
                numero(
                  actualizada
                    .precio_unitario,
                );
            }

            if (
              campo ===
                "descripcion" ||
              campo === "codigo" ||
              campo ===
                "precio_unitario"
            ) {
              actualizada.estado_catalogo =
                ESTADOS_CATALOGO.REVISAR;

              actualizada.motivo =
                "La línea se ha modificado. Pulsa «Volver a comparar». ";

              actualizada.crear_articulo =
                false;

              actualizada.actualizar_precio =
                false;

              actualizada.confirmado =
                false;
            }

            return prepararLinea(
              actualizada,
            );
          },
        );

      return {
        ...anterior,
        lineas:
          lineasActualizadas,
      };
    });
  }

  function actualizarOpcionLinea(
    temporalId,
    campo,
    valor,
  ) {
    setResultado((anterior) => ({
      ...anterior,

      lineas:
        anterior.lineas.map(
          (linea) =>
            linea.temporalId ===
            temporalId
              ? {
                  ...linea,
                  [campo]: valor,
                }
              : linea,
        ),
    }));
  }

  function añadirLinea() {
    const nueva = prepararLinea({
      descripcion: "",
      cantidad: 1,
      unidad: "unidad",
      precio_unitario: "",
      iva: 10,
      estado_catalogo:
        ESTADOS_CATALOGO.REVISAR,
      confirmado: false,
      motivo:
        "Completa la línea y vuelve a comparar.",
    });

    setResultado((anterior) => ({
      ...anterior,
      lineas: [
        ...anterior.lineas,
        nueva,
      ],
    }));
  }

  function eliminarLinea(
    temporalId,
  ) {
    setResultado((anterior) => ({
      ...anterior,

      lineas:
        anterior.lineas.filter(
          (linea) =>
            linea.temporalId !==
            temporalId,
        ),
    }));
  }

  async function volverAComparar() {
    if (!resultado.proveedor_id) {
      setError(
        "Selecciona primero un proveedor.",
      );
      return;
    }

    await compararConProveedor(
      resultado.proveedor_id,
      resultado.lineas,
    );

    setMensaje(
      "Los artículos se han vuelto a comparar con el catálogo.",
    );
  }

  function confirmarCoincidencia(
    temporalId,
    usarExistente,
  ) {
    setResultado((anterior) => ({
      ...anterior,

      lineas:
        anterior.lineas.map(
          (linea) => {
            if (
              linea.temporalId !==
              temporalId
            ) {
              return linea;
            }

            return prepararLinea(
              resolverPosibleCoincidencia({
                linea,
                usarArticuloExistente:
                  usarExistente,
              }),
            );
          },
        ),
    }));
  }

  function limpiarImportador() {
    setResultado(RESULTADO_VACIO);
    setArchivoActual(null);
    setLecturaCompleta(null);
    setCatalogo([]);
    setError("");
    setMensaje("");

    setProgreso({
      estado: "",
      progreso: 0,
    });

    if (inputArchivoRef.current) {
      inputArchivoRef.current.value =
        "";
    }
  }

  const totalesCalculados =
    useMemo(
      () =>
        recalcularAlbaranV2(
          resultado.lineas,
        ),
      [resultado.lineas],
    );

  const resumenEstados =
    useMemo(() => {
      const resumen = {
        encontrados: 0,
        precios: 0,
        nuevos: 0,
        posibles: 0,
        revisar: 0,
      };

      for (const linea of resultado.lineas) {
        switch (
          linea.estado_catalogo
        ) {
          case ESTADOS_CATALOGO.ENCONTRADO:
            resumen.encontrados += 1;
            break;

          case ESTADOS_CATALOGO.PRECIO_NUEVO:
            resumen.precios += 1;
            break;

          case ESTADOS_CATALOGO.ARTICULO_NUEVO:
            resumen.nuevos += 1;
            break;

          case ESTADOS_CATALOGO.POSIBLE_COINCIDENCIA:
            resumen.posibles += 1;
            break;

          default:
            resumen.revisar += 1;
        }
      }

      return resumen;
    }, [resultado.lineas]);

  async function comprobarDuplicado() {
    if (
      !resultado.proveedor_id ||
      !resultado.numero_albaran?.trim()
    ) {
      return false;
    }

    const {
      data,
      error: errorConsulta,
    } = await supabase
      .from(
        "importaciones_albaran",
      )
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

  function validarAntesDeGuardar() {
    if (!resultado.proveedor_id) {
      return "Selecciona el proveedor.";
    }

    if (!resultado.fecha_albaran) {
      return "Indica la fecha del albarán.";
    }

    const lineasValidas =
      resultado.lineas.filter(
        (linea) =>
          linea.descripcion?.trim() &&
          numero(linea.cantidad) > 0 &&
          numero(
            linea.precio_unitario,
          ) >= 0,
      );

    if (
      lineasValidas.length === 0
    ) {
      return "El albarán debe tener al menos un producto válido.";
    }

    const coincidenciasPendientes =
      lineasValidas.filter(
        (linea) =>
          linea.estado_catalogo ===
          ESTADOS_CATALOGO
            .POSIBLE_COINCIDENCIA,
      );

    if (
      coincidenciasPendientes.length >
      0
    ) {
      return "Hay posibles coincidencias pendientes. Indica si son el mismo artículo o un artículo nuevo.";
    }

    const lineasSinConfirmar =
      lineasValidas.filter(
        (linea) =>
          linea.estado_catalogo ===
            ESTADOS_CATALOGO.REVISAR ||
          linea.confirmado === false,
      );

    if (lineasSinConfirmar.length > 0) {
      return "Hay líneas pendientes de revisar. Corrígelas y pulsa «Volver a comparar».";
    }

    return "";
  }

  async function guardarAlbaran() {
    setError("");
    setMensaje("");

    const errorValidacion =
      validarAntesDeGuardar();

    if (errorValidacion) {
      setError(errorValidacion);
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

      const lineasValidas =
        resultado.lineas.filter(
          (linea) =>
            linea.descripcion?.trim() &&
            numero(linea.cantidad) > 0,
        );

      const lineasParaGuardar =
        lineasValidas.map(
          (linea) => ({
            codigo:
              linea.codigo?.trim() ||
              "",

            descripcion:
              linea.descripcion?.trim() ||
              "",

            cantidad:
              numero(linea.cantidad),

            unidad:
              linea.unidad?.trim() ||
              "unidad",

            precio_unitario:
              numero(
                linea.precio_unitario,
              ),

            iva:
              numero(linea.iva),

            total_linea:
              redondear(
                numero(
                  linea.cantidad,
                ) *
                  numero(
                    linea
                      .precio_unitario,
                  ),
                2,
              ),

            estado_catalogo:
              linea.estado_catalogo,

            catalogo_id:
              linea.catalogo_id ||
              null,

            crear_articulo:
              Boolean(
                linea.crear_articulo,
              ),

            actualizar_precio:
              Boolean(
                linea.actualizar_precio,
              ),

            precio_anterior:
              numero(
                linea.precio_anterior,
              ),

            precio_nuevo:
              numero(
                linea.precio_unitario,
              ),

            confianza:
              numero(
                linea.confianza,
              ),
          }),
        );

      const payloadAlbaran = {
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

        lineas:
          lineasParaGuardar,

        base_imponible:
          totalesCalculados
            .base_imponible,

        total_iva:
          totalesCalculados
            .total_iva,

        total:
          totalesCalculados.total,

        texto_original:
          resultado.texto_original ||
          null,

        estado:
          "procesando_catalogo",

        catalogo_actualizado:
          false,

        articulos_creados: 0,

        precios_actualizados: 0,
      };

      const {
        data: albaranGuardado,
        error: errorAlbaran,
      } = await supabase
        .from(
          "importaciones_albaran",
        )
        .insert(payloadAlbaran)
        .select()
        .single();

      if (errorAlbaran) {
        throw errorAlbaran;
      }

      const resumenCambios =
        await aplicarCambiosCatalogo({
          lineas: lineasValidas,

          proveedorId:
            resultado.proveedor_id,

          fechaDocumento:
            resultado.fecha_albaran,

          numeroDocumento:
            resultado.numero_albaran,

          importacionAlbaranId:
            albaranGuardado.id,
        });

      const catalogoActualizado =
        resumenCambios.errores.length ===
        0;

      const {
        error: errorActualizacion,
      } = await supabase
        .from(
          "importaciones_albaran",
        )
        .update({
          estado:
            catalogoActualizado
              ? "importado"
              : "importado_con_errores",

          catalogo_actualizado:
            catalogoActualizado,

          articulos_creados:
            resumenCambios
              .articulos_creados,

          precios_actualizados:
            resumenCambios
              .precios_actualizados,
        })
        .eq(
          "id",
          albaranGuardado.id,
        );

      if (errorActualizacion) {
        console.error(
          "No se pudo actualizar el resumen del albarán:",
          errorActualizacion,
        );
      }

      if (
        resumenCambios.errores.length >
        0
      ) {
        const detalleErrores =
          resumenCambios.errores
            .map(
              (item) =>
                `${item.descripcion}: ${item.mensaje}`,
            )
            .join(" | ");

        setError(
          `El albarán se ha guardado, pero algunos cambios del catálogo han fallado: ${detalleErrores}`,
        );
      } else {
        setMensaje(
          `Albarán importado correctamente. Artículos nuevos: ${resumenCambios.articulos_creados}. Precios actualizados: ${resumenCambios.precios_actualizados}.`,
        );
      }

      setResultado((anterior) => ({
        ...anterior,
        estado: catalogoActualizado
          ? "importado"
          : "importado_con_errores",
      }));
    } catch (errorGuardado) {
      console.error(
        "Error importando albarán:",
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
          Cargando Lector Inteligente
          V2...
        </p>
      </section>
    );
  }

  const documentoLeido =
    Boolean(
      resultado.texto_original,
    ) ||
    resultado.lineas.length > 0;

  return (
    <section className="panel importador-emails">
      <div className="cabecera-seccion">
        <div>
          <p className="etiqueta">
            COMPRAS
          </p>

          <h1>
            🧠 Lector Inteligente V2
          </h1>

          <p className="texto-secundario">
            Lee albaranes, compara los
            productos con el catálogo, crea
            artículos nuevos y actualiza
            precios confirmados.
          </p>
        </div>

        {documentoLeido && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={volverAComparar}
              disabled={
                procesando ||
                comparando ||
                guardando
              }
            >
              {comparando
                ? "Comparando..."
                : "🔄 Volver a comparar"}
            </button>

            <button
              type="button"
              onClick={limpiarImportador}
              disabled={
                procesando ||
                guardando
              }
            >
              Leer otro albarán
            </button>
          </div>
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
            onClick={
              abrirSelectorArchivo
            }
            onKeyDown={(evento) => {
              if (
                evento.key ===
                  "Enter" ||
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
              🧠
            </div>

            <h3>
              Arrastra aquí el albarán
            </h3>

            <p>
              También puedes pulsar para
              seleccionar el PDF o la
              fotografía.
            </p>

            <small>
              PDF, JPG, PNG o WEBP
            </small>
          </div>
        </>
      )}

      {procesando && (
        <div className="email-import-card">
          <div className="email-import-card__header">
            <div>
              <span className="import-status">
                Analizando
              </span>

              <h3>
                {archivoActual?.name ||
                  "Documento"}
              </h3>

              <p>
                {progreso.estado ||
                  "Leyendo documento..."}
              </p>
            </div>

            <strong>
              {Math.round(
                numero(
                  progreso.progreso,
                ),
              )}
              %
            </strong>
          </div>

          <progress
            value={numero(
              progreso.progreso,
            )}
            max="100"
            style={{
              width: "100%",
              height: "18px",
            }}
          />
        </div>
      )}

      {documentoLeido &&
        !procesando && (
          <>
            <div
              className="email-import-card"
              style={{
                marginBottom: "18px",
              }}
            >
              <div className="email-import-card__header">
                <div>
                  <span className="import-status">
                    Diagnóstico de lectura
                  </span>

                  <h3>
                    {archivoActual?.name ||
                      "Albarán leído"}
                  </h3>
                </div>

                <strong>
                  Calidad:{" "}
                  {resultado
                    .calidad_lectura
                    ?.puntuacion ?? 0}
                  %
                </strong>
              </div>

              <div className="import-grid">
                <div>
                  <small>
                    Nivel de lectura
                  </small>

                  <strong
                    style={{
                      display: "block",
                    }}
                  >
                    {resultado
                      .calidad_lectura
                      ?.nivel ||
                      "Sin determinar"}
                  </strong>
                </div>

                <div>
                  <small>
                    Confianza del parser
                  </small>

                  <strong
                    style={{
                      display: "block",
                    }}
                  >
                    {redondear(
                      resultado
                        .confianza_media,
                      0,
                    )}
                    %
                  </strong>
                </div>

                <div>
                  <small>
                    Productos detectados
                  </small>

                  <strong
                    style={{
                      display: "block",
                    }}
                  >
                    {
                      resultado.lineas
                        .length
                    }
                  </strong>
                </div>

                <div>
                  <small>
                    Artículos del catálogo
                  </small>

                  <strong
                    style={{
                      display: "block",
                    }}
                  >
                    {catalogo.length}
                  </strong>
                </div>
              </div>
            </div>

            <div
              className="email-import-card"
              style={{
                marginBottom: "18px",
              }}
            >
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
                    disabled={
                      comparando ||
                      guardando
                    }
                  >
                    <option value="">
                      Seleccionar proveedor
                    </option>

                    {proveedores.map(
                      (proveedor) => (
                        <option
                          key={
                            proveedor.id
                          }
                          value={
                            proveedor.id
                          }
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
                  Fecha del albarán

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
            </div>

            <div
              className="email-import-card"
              style={{
                marginBottom: "18px",
              }}
            >
              <h3>
                Resultado de la comparación
              </h3>

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
                    ESTADOS_CATALOGO
                      .ENCONTRADO,
                  )}
                >
                  ✅ Encontrados:{" "}
                  {
                    resumenEstados.encontrados
                  }
                </span>

                <span
                  className={claseEstado(
                    ESTADOS_CATALOGO
                      .PRECIO_NUEVO,
                  )}
                >
                  🟠 Precios nuevos:{" "}
                  {resumenEstados.precios}
                </span>

                <span
                  className={claseEstado(
                    ESTADOS_CATALOGO
                      .ARTICULO_NUEVO,
                  )}
                >
                  🆕 Artículos nuevos:{" "}
                  {resumenEstados.nuevos}
                </span>

                <span
                  className={claseEstado(
                    ESTADOS_CATALOGO
                      .POSIBLE_COINCIDENCIA,
                  )}
                >
                  ⚠️ Coincidencias:{" "}
                  {resumenEstados.posibles}
                </span>

                <span
                  className={claseEstado(
                    ESTADOS_CATALOGO
                      .REVISAR,
                  )}
                >
                  🔎 Revisar:{" "}
                  {resumenEstados.revisar}
                </span>
              </div>
            </div>

            <div className="email-import-card">
              <div className="import-lines-header">
                <div>
                  <h3>
                    Productos detectados
                  </h3>

                  <p className="texto-secundario">
                    Revisa especialmente los
                    artículos nuevos, los
                    cambios de precio y las
                    posibles coincidencias.
                  </p>
                </div>

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
                      <th>Estado</th>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Unidad</th>
                      <th>Precio nuevo</th>
                      <th>IVA</th>
                      <th>Total</th>
                      <th>Acción</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {resultado.lineas
                      .length === 0 && (
                      <tr>
                        <td colSpan="10">
                          No se han detectado
                          productos. Pulsa
                          «Añadir producto».
                        </td>
                      </tr>
                    )}

                    {resultado.lineas.map(
                      (linea) => (
                        <tr
                          key={
                            linea.temporalId
                          }
                        >
                          <td
                            style={{
                              minWidth:
                                "170px",
                            }}
                          >
                            <span
                              className={claseEstado(
                                linea.estado_catalogo,
                              )}
                            >
                              {textoEstado(
                                linea.estado_catalogo,
                              )}
                            </span>

                            {linea.confianza >
                              0 && (
                              <small
                                style={{
                                  display:
                                    "block",
                                  marginTop:
                                    "6px",
                                }}
                              >
                                Confianza:{" "}
                                {redondear(
                                  linea.confianza,
                                  0,
                                )}
                                %
                              </small>
                            )}
                          </td>

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
                                  evento
                                    .target
                                    .value,
                                )
                              }
                              placeholder="Código"
                            />
                          </td>

                          <td
                            style={{
                              minWidth:
                                "250px",
                            }}
                          >
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
                                  evento
                                    .target
                                    .value,
                                )
                              }
                              placeholder="Descripción"
                            />

                            {linea.nombre_catalogo && (
                              <small
                                style={{
                                  display:
                                    "block",
                                  marginTop:
                                    "5px",
                                }}
                              >
                                Catálogo:{" "}
                                <strong>
                                  {
                                    linea.nombre_catalogo
                                  }
                                </strong>
                              </small>
                            )}

                            {linea.motivo && (
                              <small
                                style={{
                                  display:
                                    "block",
                                  marginTop:
                                    "5px",
                                }}
                              >
                                {linea.motivo}
                              </small>
                            )}
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
                                  evento
                                    .target
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
                                  evento
                                    .target
                                    .value,
                                )
                              }
                            />
                          </td>

                          <td
                            style={{
                              minWidth:
                                "130px",
                            }}
                          >
                            <input
                              type="number"
                              min="0"
                              step="0.0001"
                              value={
                                linea.precio_unitario
                              }
                              onChange={(
                                evento,
                              ) =>
                                actualizarLinea(
                                  linea.temporalId,
                                  "precio_unitario",
                                  evento
                                    .target
                                    .value,
                                )
                              }
                            />

                            {linea.estado_catalogo ===
                              ESTADOS_CATALOGO
                                .PRECIO_NUEVO && (
                              <small
                                style={{
                                  display:
                                    "block",
                                  marginTop:
                                    "5px",
                                }}
                              >
                                Anterior:{" "}
                                <strong>
                                  {formatearEuros(
                                    linea.precio_anterior,
                                  )}
                                </strong>
                                <br />
                                Cambio:{" "}
                                {linea
                                  .porcentaje_cambio >
                                0
                                  ? "+"
                                  : ""}
                                {
                                  linea.porcentaje_cambio
                                }
                                %
                              </small>
                            )}
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
                                  evento
                                    .target
                                    .value,
                                )
                              }
                            />
                          </td>

                          <td>
                            <strong>
                              {formatearEuros(
                                numero(
                                  linea.cantidad,
                                ) *
                                  numero(
                                    linea.precio_unitario,
                                  ),
                              )}
                            </strong>
                          </td>

                          <td
                            style={{
                              minWidth:
                                "200px",
                            }}
                          >
                            {linea.estado_catalogo ===
                              ESTADOS_CATALOGO
                                .ARTICULO_NUEVO && (
                              <label
                                style={{
                                  display:
                                    "flex",
                                  gap: "8px",
                                  alignItems:
                                    "center",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(
                                    linea.crear_articulo,
                                  )}
                                  onChange={(
                                    evento,
                                  ) =>
                                    actualizarOpcionLinea(
                                      linea.temporalId,
                                      "crear_articulo",
                                      evento
                                        .target
                                        .checked,
                                    )
                                  }
                                />

                                Crear artículo
                              </label>
                            )}

                            {linea.estado_catalogo ===
                              ESTADOS_CATALOGO
                                .PRECIO_NUEVO && (
                              <label
                                style={{
                                  display:
                                    "flex",
                                  gap: "8px",
                                  alignItems:
                                    "center",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(
                                    linea.actualizar_precio,
                                  )}
                                  onChange={(
                                    evento,
                                  ) =>
                                    actualizarOpcionLinea(
                                      linea.temporalId,
                                      "actualizar_precio",
                                      evento
                                        .target
                                        .checked,
                                    )
                                  }
                                />

                                Actualizar precio
                              </label>
                            )}

                            {linea.estado_catalogo ===
                              ESTADOS_CATALOGO
                                .ENCONTRADO && (
                              <span>
                                Sin cambios
                              </span>
                            )}

                            {linea.estado_catalogo ===
                              ESTADOS_CATALOGO
                                .POSIBLE_COINCIDENCIA && (
                              <div
                                style={{
                                  display:
                                    "flex",
                                  flexDirection:
                                    "column",
                                  gap: "6px",
                                }}
                              >
                                <small>
                                  Similitud:{" "}
                                  {
                                    linea.similitud
                                  }
                                  %
                                </small>

                                <button
                                  type="button"
                                  onClick={() =>
                                    confirmarCoincidencia(
                                      linea.temporalId,
                                      true,
                                    )
                                  }
                                >
                                  Es el mismo
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    confirmarCoincidencia(
                                      linea.temporalId,
                                      false,
                                    )
                                  }
                                >
                                  Es nuevo
                                </button>
                              </div>
                            )}

                            {linea.estado_catalogo ===
                              ESTADOS_CATALOGO
                                .REVISAR && (
                              <small>
                                Corrige la línea y
                                pulsa «Volver a
                                comparar».
                              </small>
                            )}
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
                              title="Eliminar línea"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <details className="email-original">
                <summary>
                  Ver texto original detectado
                </summary>

                <pre>
                  {
                    resultado.texto_original
                  }
                </pre>
              </details>

              {lecturaCompleta && (
                <details className="email-original">
                  <summary>
                    Ver diagnóstico técnico
                  </summary>

                  <pre>
                    {JSON.stringify(
                      {
                        version:
                          lecturaCompleta.version,

                        tipo_documento:
                          lecturaCompleta.tipo_documento,

                        calidad_lectura:
                          lecturaCompleta.calidad_lectura,

                        identificadores:
                          lecturaCompleta.identificadores,

                        diagnostico:
                          resultado.diagnostico,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              )}

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
                        totalesCalculados
                          .total,
                      )}
                    </strong>
                  </span>
                </div>

                <button
                  type="button"
                  className="boton-principal"
                  onClick={
                    guardarAlbaran
                  }
                  disabled={
                    guardando ||
                    procesando ||
                    comparando ||
                    resultado.lineas
                      .length === 0
                  }
                >
                  {guardando
                    ? "Importando y actualizando catálogo..."
                    : "✅ Confirmar importación"}
                </button>
              </div>
            </div>
          </>
        )}
    </section>
  );
}

export default ImportadorAlbaranesV2;