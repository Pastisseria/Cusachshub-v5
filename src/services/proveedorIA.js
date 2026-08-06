import { supabase } from "../supabase.js";

function normalizar(texto = "") {
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export async function cargarProveedorIA(proveedorId) {
  if (!proveedorId) return null;
  const { data, error } = await supabase.from("proveedores_ia").select("*").eq("proveedor_id", proveedorId).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function guardarPlantillaProveedorIA({ proveedorId, proveedorNombre = "", lectura, analisis }) {
  if (!proveedorId) throw new Error("Falta el proveedor.");
  const existente = await cargarProveedorIA(proveedorId);
  const zona = analisis?.zona_tabla || {};
  const payload = {
    proveedor_id: proveedorId,
    nombre: proveedorNombre || null,
    cabecera_lineas: Math.max(0, Number(zona.inicio || 0)),
    primera_linea_producto: Number(zona.inicio || 0),
    separador_columnas: "posicional",
    formato_cantidad: "decimal_europeo",
    formato_precio: "decimal_europeo",
    iva_incluido: false,
    usa_codigo_articulo: (analisis?.lineas || []).some((l) => Boolean(l.codigo)),
    plantilla: {
      zona_tabla: zona,
      productos_detectados: analisis?.lineas?.length || 0,
      confianza_parser: analisis?.confianza_media || 0,
      textos_excluir: (lectura?.lineas || []).slice(0, Math.max(0, Number(zona.inicio || 0))).map((l) => String(l.texto || "").trim()).filter((t) => t.length >= 4 && t.length <= 100).slice(0, 25),
    },
    configuracion: { version: "3.1.0", parser: analisis?.version_parser || "3.1.0", tipo_documento: lectura?.tipo_documento || "albaran" },
    activo: true,
    confianza: Math.min(100, Number(analisis?.confianza_media || 0)),
    ultima_revision: new Date().toISOString(),
    aprendizajes: Number(existente?.aprendizajes || 0) + 1,
  };
  const consulta = existente?.id
    ? supabase.from("proveedores_ia").update(payload).eq("id", existente.id)
    : supabase.from("proveedores_ia").insert(payload);
  const { data, error } = await consulta.select().single();
  if (error) throw error;
  return { accion: existente?.id ? "plantilla_actualizada" : "plantilla_creada", plantilla: data };
}

export async function guardarDiccionarioArticulo({ proveedorId, linea }) {
  if (!proveedorId || !linea?.descripcion?.trim()) return null;
  const textoOriginal = String(linea.texto_origen || linea.descripcion).trim();
  const textoNormalizado = normalizar(textoOriginal);
  const { data: existente, error: errorConsulta } = await supabase.from("diccionario_articulos").select("*").eq("proveedor_id", proveedorId).eq("texto_normalizado", textoNormalizado).maybeSingle();
  if (errorConsulta) throw errorConsulta;
  const payload = {
    proveedor_id: proveedorId,
    producto_id: linea.producto_id ? String(linea.producto_id) : null,
    catalogo_proveedor_id: linea.catalogo_id || linea.catalogo_proveedor_id ? String(linea.catalogo_id || linea.catalogo_proveedor_id) : null,
    codigo_proveedor: linea.codigo?.trim() || null,
    texto_original: textoOriginal,
    texto_normalizado: textoNormalizado,
    nombre_corregido: linea.descripcion.trim(),
    unidad_original: linea.unidad || null,
    unidad_corregida: linea.unidad || null,
    cantidad_formato: Number(linea.cantidad_formato || 1),
    confirmado: true,
    activo: true,
    ultima_fecha: new Date().toISOString(),
    veces_utilizado: Number(existente?.veces_utilizado || 0) + 1,
  };
  const consulta = existente?.id
    ? supabase.from("diccionario_articulos").update(payload).eq("id", existente.id)
    : supabase.from("diccionario_articulos").insert(payload);
  const { data, error } = await consulta.select().single();
  if (error) throw error;
  return data;
}

export async function aprenderDeAlbaran({ proveedorId, proveedorNombre, lectura, analisis, lineas = [] }) {
  if (!proveedorId) throw new Error("Selecciona el proveedor.");
  const resultado = { plantilla: null, diccionario_guardado: 0, correcciones_guardadas: 0, errores: [] };
  try {
    resultado.plantilla = await guardarPlantillaProveedorIA({ proveedorId, proveedorNombre, lectura, analisis });
  } catch (error) {
    resultado.errores.push({ tipo: "plantilla", mensaje: error.message });
  }
  for (const linea of lineas) {
    try {
      if (!linea.descripcion?.trim() || linea.confirmado === false) continue;
      await guardarDiccionarioArticulo({ proveedorId, linea });
      resultado.diccionario_guardado += 1;
    } catch (error) {
      resultado.errores.push({ tipo: "diccionario", producto: linea.descripcion, mensaje: error.message });
    }
  }
  return resultado;
}

export default { cargarProveedorIA, guardarPlantillaProveedorIA, guardarDiccionarioArticulo, aprenderDeAlbaran };
