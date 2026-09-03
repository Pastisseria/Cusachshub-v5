import { supabase } from "../supabase.js";
import { ESTADOS_COMPARACION_IA } from "./comparadorIA.js";
import { normalizarNombreProducto } from "../ai/parserIA.js";

function numero(valor) { const n = Number(String(valor ?? "0").replace(",", ".")); return Number.isFinite(n) ? n : 0; }
function redondear(valor, decimales = 6) { return Number(numero(valor).toFixed(decimales)); }
function ivaDecimal(valor) { const iva = numero(valor); return iva > 1 ? redondear(iva / 100, 4) : redondear(iva, 4); }
function textoONull(valor) { const t = String(valor ?? "").trim(); return t || null; }

function limpiarLectorTrasImportacion(mensaje = "") {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem("cusachs:borrador-albaran-v3:v1");
    if (mensaje) window.sessionStorage.setItem("cusachs:mensaje-albaran-v3", mensaje);
  } catch {
    // Si el navegador bloquea el almacenamiento, seguimos igualmente.
  }

  window.setTimeout(() => {
    window.location.reload();
  }, 450);
}

function prepararArticuloNuevo(linea, proveedorId, fechaDocumento) {
  const precioSinIva = redondear(linea.precio_unitario);
  const iva = ivaDecimal(linea.iva);
  const cantidadFormato = Math.max(1, numero(linea.cantidad_formato || 1));
  const precioConIva = redondear(precioSinIva * (1 + iva));
  return {
    proveedor_id: proveedorId,
    categoria: linea.categoria?.trim() || "Sin categoría",
    producto: linea.descripcion.trim(),
    codigo_proveedor: textoONull(linea.codigo),
    cantidad_formato: cantidadFormato,
    unidad: linea.unidad || "unidad",
    precio_sin_iva: precioSinIva,
    iva,
    precio_con_iva: precioConIva,
    precio_unitario: redondear(precioConIva / cantidadFormato),
    observaciones: "Creado automáticamente desde el Lector Inteligente V3.",
    activo: true,
    fecha_precio: fechaDocumento || new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
    nombre_normalizado: normalizarNombreProducto(linea.descripcion),
    origen_ultima_actualizacion: "lector_inteligente_v3",
  };
}

async function crearArticulo({ linea, proveedorId, fechaDocumento }) {
  const { data, error } = await supabase.from("catalogo_proveedores").insert(prepararArticuloNuevo(linea, proveedorId, fechaDocumento)).select().single();
  if (error) throw error;
  return data;
}

async function guardarHistorial({ proveedorId, articulo, linea, fechaDocumento, numeroDocumento, importacionId }) {
  const anterior = numero(articulo.precio_sin_iva ?? articulo.precio_unitario);
  const nuevo = numero(linea.precio_unitario);
  const { error } = await supabase.from("historial_precios_v3").insert({
    proveedor_id: proveedorId || null,
    catalogo_proveedor_id: articulo?.id ? String(articulo.id) : null,
    producto_id: linea.producto_id ? String(linea.producto_id) : null,
    importacion_id: importacionId ? String(importacionId) : null,
    codigo_proveedor: textoONull(linea.codigo || articulo.codigo_proveedor),
    producto: linea.descripcion || articulo.producto,
    precio_anterior: anterior,
    precio_nuevo: nuevo,
    diferencia: redondear(nuevo - anterior),
    porcentaje_cambio: anterior > 0 ? redondear(((nuevo - anterior) / anterior) * 100, 2) : 100,
    iva: ivaDecimal(linea.iva),
    unidad: linea.unidad || articulo.unidad || "unidad",
    fecha_precio: fechaDocumento || new Date().toISOString().slice(0, 10),
    numero_documento: textoONull(numeroDocumento),
    origen: "lector_inteligente_v3",
  });
  if (error) throw error;
}

async function actualizarPrecio({ linea, articulo, proveedorId, fechaDocumento, numeroDocumento, importacionId }) {
  if (!articulo?.id) throw new Error(`Falta el artículo de catálogo para “${linea.descripcion}”.`);
  await guardarHistorial({ proveedorId, articulo, linea, fechaDocumento, numeroDocumento, importacionId });
  const precio = redondear(linea.precio_unitario);
  const iva = ivaDecimal(linea.iva);
  const cantidad = Math.max(1, numero(linea.cantidad_formato || articulo.cantidad_formato || 1));
  const precioConIva = redondear(precio * (1 + iva));
  const { data, error } = await supabase.from("catalogo_proveedores").update({
    producto: linea.descripcion.trim(),
    codigo_proveedor: textoONull(linea.codigo || articulo.codigo_proveedor),
    cantidad_formato: cantidad,
    unidad: linea.unidad || articulo.unidad || "unidad",
    precio_sin_iva: precio,
    iva,
    precio_con_iva: precioConIva,
    precio_unitario: redondear(precioConIva / cantidad),
    fecha_precio: fechaDocumento || new Date().toISOString().slice(0, 10),
    ultimo_precio_anterior: numero(articulo.precio_sin_iva ?? articulo.precio_unitario),
    fecha_ultimo_cambio_precio: fechaDocumento || new Date().toISOString().slice(0, 10),
    nombre_normalizado: normalizarNombreProducto(linea.descripcion),
    origen_ultima_actualizacion: "lector_inteligente_v3",
    updated_at: new Date().toISOString(),
  }).eq("id", articulo.id).select().single();
  if (error) throw error;
  return data;
}

async function buscarImportacionExistente({ proveedorId, numeroAlbaran }) {
  const numeroDocumento = textoONull(numeroAlbaran);
  if (!proveedorId || !numeroDocumento) return null;

  const { data, error } = await supabase
    .from("importaciones_albaran_v3")
    .select("id, proveedor_id, proveedor_nombre, numero_albaran, fecha_albaran, estado")
    .eq("proveedor_id", proveedorId)
    .eq("numero_albaran", numeroDocumento)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function crearImportacion({ archivo, proveedorId, proveedorNombre, lectura, analisis, lineas }) {
  const existente = await buscarImportacionExistente({
    proveedorId,
    numeroAlbaran: analisis.numero_albaran,
  });

  if (existente) {
    limpiarLectorTrasImportacion(
      `El albarán ${analisis.numero_albaran || ""} ya estaba guardado. Se ha limpiado el lector para evitar duplicados.`,
    );
    const errorDuplicado = new Error("Este albarán ya estaba guardado. No se ha duplicado.");
    errorDuplicado.codigo = "ALBARAN_DUPLICADO";
    throw errorDuplicado;
  }

  const { data, error } = await supabase.from("importaciones_albaran_v3").insert({
    proveedor_id: proveedorId || null,
    proveedor_nombre: proveedorNombre || null,
    numero_albaran: textoONull(analisis.numero_albaran),
    fecha_albaran: analisis.fecha_albaran || null,
    archivo_nombre: archivo?.name || null,
    archivo_tipo: archivo?.type || null,
    archivo_tamano: Number(archivo?.size || 0),
    texto_original: lectura?.texto_original || null,
    texto_normalizado: lectura?.texto_normalizado || null,
    lineas_detectadas: analisis.lineas || [],
    lineas_confirmadas: lineas || [],
    base_imponible: numero(analisis.base_imponible),
    total_iva: numero(analisis.total_iva),
    total: numero(analisis.total),
    calidad_lectura: numero(lectura?.calidad_lectura_v3?.puntuacion || lectura?.calidad_lectura?.puntuacion),
    confianza_parser: numero(analisis.confianza_media),
    articulos_detectados: lineas?.length || 0,
    estado: "procesando_catalogo",
    version_lector: lectura?.version || "3.1.0",
  }).select().single();

  if (error?.code === "23505") {
    limpiarLectorTrasImportacion(
      `El albarán ${analisis.numero_albaran || ""} ya estaba guardado. Se ha limpiado el lector para evitar duplicados.`,
    );
    const errorDuplicado = new Error("Este albarán ya estaba guardado. No se ha duplicado.");
    errorDuplicado.codigo = "ALBARAN_DUPLICADO";
    throw errorDuplicado;
  }

  if (error) throw error;
  return data;
}

export async function importarAlbaranCompletoIA({ archivo, proveedorId, proveedorNombre, lectura, analisis, lineas = [] }) {
  if (!proveedorId) throw new Error("Falta el proveedor.");
  const importacion = await crearImportacion({ archivo, proveedorId, proveedorNombre, lectura, analisis, lineas });
  const resumen = { articulos_creados: 0, precios_actualizados: 0, precios_sin_cambios: 0, articulos_omitidos: 0, errores: [] };
  for (const linea of lineas) {
    try {
      if (linea.estado_ia === ESTADOS_COMPARACION_IA.ARTICULO_NUEVO && linea.crear_articulo && linea.confirmado !== false) {
        await crearArticulo({ linea, proveedorId, fechaDocumento: analisis.fecha_albaran });
        resumen.articulos_creados += 1;
      } else if (linea.estado_ia === ESTADOS_COMPARACION_IA.PRECIO_DIFERENTE && linea.actualizar_precio && linea.confirmado !== false) {
        await actualizarPrecio({ linea, articulo: linea.articulo_catalogo, proveedorId, fechaDocumento: analisis.fecha_albaran, numeroDocumento: analisis.numero_albaran, importacionId: importacion.id });
        resumen.precios_actualizados += 1;
      } else if (linea.estado_ia === ESTADOS_COMPARACION_IA.COINCIDENCIA_EXACTA) {
        resumen.precios_sin_cambios += 1;
      } else {
        resumen.articulos_omitidos += 1;
      }
    } catch (error) {
      resumen.errores.push({ descripcion: linea.descripcion, mensaje: error.message });
    }
  }
  const estado = resumen.errores.length > 0 ? "importado_con_errores" : resumen.articulos_omitidos > 0 ? "importado_pendiente_revision" : "importado";
  const { data: final, error: errorFinal } = await supabase.from("importaciones_albaran_v3").update({
    articulos_creados: resumen.articulos_creados,
    precios_actualizados: resumen.precios_actualizados,
    errores_detectados: resumen.errores.length,
    catalogo_actualizado: resumen.errores.length === 0,
    necesita_revision: resumen.errores.length > 0 || resumen.articulos_omitidos > 0,
    estado,
    errores: resumen.errores,
  }).eq("id", importacion.id).select().single();
  if (errorFinal) throw errorFinal;

  limpiarLectorTrasImportacion(
    `Albarán ${analisis.numero_albaran || ""} guardado correctamente. El lector está listo para el siguiente.`,
  );

  return { importacion: final, resumen };
}

export default { importarAlbaranCompletoIA };
