import { supabase } from "../supabase.js";
import { normalizarNombreProducto } from "../ai/parserIA.js";

export const ESTADOS_COMPARACION_IA = {
  COINCIDENCIA_EXACTA: "COINCIDENCIA_EXACTA",
  PRECIO_DIFERENTE: "PRECIO_DIFERENTE",
  POSIBLE_COINCIDENCIA: "POSIBLE_COINCIDENCIA",
  ARTICULO_NUEVO: "ARTICULO_NUEVO",
  REVISAR: "REVISAR",
};

function numero(valor) { const n = Number(String(valor ?? "0").replace(",", ".")); return Number.isFinite(n) ? n : 0; }
function redondear(valor, decimales = 6) { return Number(numero(valor).toFixed(decimales)); }
function codigo(valor = "") { return String(valor).trim().toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9._/-]/g, ""); }

function prepararArticulo(a) {
  const iva = numero(a.iva);
  return { ...a, nombre_normalizado: normalizarNombreProducto(a.producto || ""), codigo_normalizado: codigo(a.codigo_proveedor || ""), precio_catalogo: a.precio_sin_iva !== null && a.precio_sin_iva !== undefined ? redondear(a.precio_sin_iva) : redondear(a.precio_unitario), iva_porcentaje: iva > 0 && iva <= 1 ? iva * 100 : iva };
}

export async function cargarCatalogoIA(proveedorId) {
  if (!proveedorId) return [];
  const { data, error } = await supabase.from("catalogo_proveedores").select("*").eq("proveedor_id", proveedorId).eq("activo", true).order("producto", { ascending: true });
  if (error) throw error;
  return (data || []).map(prepararArticulo);
}

function similitudNombre(a, b) {
  const x = normalizarNombreProducto(a); const y = normalizarNombreProducto(b);
  if (!x || !y) return 0; if (x === y) return 1;
  const pa = new Set(x.split(" ").filter(Boolean)); const pb = new Set(y.split(" ").filter(Boolean));
  let comunes = 0; for (const p of pa) if (pb.has(p)) comunes += 1;
  const union = new Set([...pa, ...pb]).size;
  return Math.max(x.includes(y) || y.includes(x) ? Math.min(x.length, y.length) / Math.max(x.length, y.length) : 0, union ? comunes / union : 0);
}

function resultado(linea, estado, articulo = null, similitud = 0, motivo = "") {
  const anterior = articulo?.precio_catalogo || 0; const nuevo = redondear(linea.precio_unitario);
  return { ...linea, estado_ia: estado, catalogo_id: articulo?.id || null, articulo_catalogo: articulo, producto_catalogo: articulo?.producto || "", codigo_catalogo: articulo?.codigo_proveedor || "", precio_anterior: anterior, precio_nuevo: nuevo, diferencia_precio: redondear(nuevo - anterior), porcentaje_cambio: anterior > 0 ? redondear(((nuevo - anterior) / anterior) * 100, 2) : 100, similitud_nombre: redondear(similitud * 100, 2), motivo, crear_articulo: estado === ESTADOS_COMPARACION_IA.ARTICULO_NUEVO, actualizar_precio: estado === ESTADOS_COMPARACION_IA.PRECIO_DIFERENTE, confirmado: ![ESTADOS_COMPARACION_IA.POSIBLE_COINCIDENCIA, ESTADOS_COMPARACION_IA.REVISAR].includes(estado), necesita_revision: Boolean(linea.necesita_revision) || [ESTADOS_COMPARACION_IA.POSIBLE_COINCIDENCIA, ESTADOS_COMPARACION_IA.REVISAR].includes(estado) };
}

export function compararLineaIA(linea, catalogo = []) {
  if (!linea?.descripcion?.trim()) return resultado(linea, ESTADOS_COMPARACION_IA.REVISAR, null, 0, "Falta la descripción.");
  const c = codigo(linea.codigo);
  const porCodigo = c ? catalogo.find((a) => a.codigo_normalizado === c) : null;
  if (porCodigo) return resultado(linea, Math.abs(porCodigo.precio_catalogo - numero(linea.precio_unitario)) <= 0.005 ? ESTADOS_COMPARACION_IA.COINCIDENCIA_EXACTA : ESTADOS_COMPARACION_IA.PRECIO_DIFERENTE, porCodigo, 1, "Artículo encontrado por código.");
  const nombre = normalizarNombreProducto(linea.descripcion);
  const exacto = catalogo.find((a) => a.nombre_normalizado === nombre);
  if (exacto) return resultado(linea, Math.abs(exacto.precio_catalogo - numero(linea.precio_unitario)) <= 0.005 ? ESTADOS_COMPARACION_IA.COINCIDENCIA_EXACTA : ESTADOS_COMPARACION_IA.PRECIO_DIFERENTE, exacto, 1, "Artículo encontrado por nombre exacto.");
  const candidatos = catalogo.map((a) => ({ articulo: a, similitud: similitudNombre(linea.descripcion, a.producto) })).filter((x) => x.similitud >= 0.58).sort((a, b) => b.similitud - a.similitud);
  if (candidatos[0]?.similitud >= 0.72) return resultado(linea, ESTADOS_COMPARACION_IA.POSIBLE_COINCIDENCIA, candidatos[0].articulo, candidatos[0].similitud, "Se ha encontrado un artículo parecido. Debes confirmarlo.");
  return resultado(linea, ESTADOS_COMPARACION_IA.ARTICULO_NUEVO, null, 0, "No existe un artículo suficientemente parecido.");
}

export function compararLineasIA(lineas = [], catalogo = []) { return lineas.map((linea) => compararLineaIA(linea, catalogo)); }

export function resolverCoincidenciaIA({ linea, usarArticuloExistente }) {
  if (!linea) return linea;
  if (usarArticuloExistente && linea.articulo_catalogo) {
    const mismoPrecio = Math.abs(numero(linea.precio_anterior) - numero(linea.precio_unitario)) <= 0.005;
    return { ...linea, estado_ia: mismoPrecio ? ESTADOS_COMPARACION_IA.COINCIDENCIA_EXACTA : ESTADOS_COMPARACION_IA.PRECIO_DIFERENTE, crear_articulo: false, actualizar_precio: !mismoPrecio, confirmado: true, necesita_revision: false, motivo: "Coincidencia confirmada manualmente." };
  }
  return { ...linea, estado_ia: ESTADOS_COMPARACION_IA.ARTICULO_NUEVO, catalogo_id: null, articulo_catalogo: null, producto_catalogo: "", precio_anterior: 0, crear_articulo: true, actualizar_precio: false, confirmado: true, necesita_revision: false, motivo: "Confirmado como artículo nuevo." };
}

export function obtenerResumenComparacionIA(lineas = []) {
  const r = { coincidencias_exactas: 0, precios_diferentes: 0, posibles_coincidencias: 0, articulos_nuevos: 0, revisar: 0 };
  for (const l of lineas) {
    if (l.estado_ia === ESTADOS_COMPARACION_IA.COINCIDENCIA_EXACTA) r.coincidencias_exactas += 1;
    else if (l.estado_ia === ESTADOS_COMPARACION_IA.PRECIO_DIFERENTE) r.precios_diferentes += 1;
    else if (l.estado_ia === ESTADOS_COMPARACION_IA.POSIBLE_COINCIDENCIA) r.posibles_coincidencias += 1;
    else if (l.estado_ia === ESTADOS_COMPARACION_IA.ARTICULO_NUEVO) r.articulos_nuevos += 1;
    else r.revisar += 1;
  }
  return r;
}

export default { cargarCatalogoIA, compararLineaIA, compararLineasIA, resolverCoincidenciaIA, obtenerResumenComparacionIA };
