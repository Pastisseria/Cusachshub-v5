const VERSION_PARSER = "3.1.0";
const PATRON_NO_PRODUCTO = /^(pastisseria|cusachs|cliente|proveedor|albar[aá]n|factura|pedido|fecha|data|p[aá]gina|cif|nif|direcci[oó]n|tel[eé]fono|email|subtotal|base imponible|iva|total|forma de pago|vencimiento|observaciones|iban|banco|firma|portes)/i;

function espacios(texto = "") {
  return String(texto).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizarNombreProducto(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(?:de|del|la|las|el|los|para|con|sin|y|en)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numeroEuropeo(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  let limpio = String(valor).trim().replace(/[€%\s]/g, "").replace(/[^\d,.-]/g, "");
  if (!limpio || ["-", ".", ","].includes(limpio)) return null;
  const negativo = limpio.startsWith("-");
  limpio = limpio.replace(/-/g, "");
  if (limpio.includes(",") && limpio.includes(".")) {
    limpio = limpio.lastIndexOf(",") > limpio.lastIndexOf(".")
      ? limpio.replace(/\./g, "").replace(",", ".")
      : limpio.replace(/,/g, "");
  } else if (limpio.includes(",")) {
    limpio = limpio.replace(",", ".");
  }
  const n = Number(limpio);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

function redondear(valor, decimales = 4) {
  const n = Number(valor);
  return Number.isFinite(n) ? Number(n.toFixed(decimales)) : 0;
}

function extraerNumeros(texto = "") {
  return [...String(texto).matchAll(/-?\d{1,10}(?:[.,]\d{1,4})?\s*(?:€|eur|%)?/gi)]
    .map((m) => ({ texto: m[0], valor: numeroEuropeo(m[0]), indice: m.index ?? 0, fin: (m.index ?? 0) + m[0].length }))
    .filter((item) => item.valor !== null);
}

function esCabeceraTabla(texto = "") {
  const t = normalizarNombreProducto(texto);
  const palabras = ["codigo", "referencia", "articulo", "descripcion", "producto", "cantidad", "precio", "importe", "total", "iva"];
  return palabras.filter((p) => t.includes(p)).length >= 3;
}

function esPie(texto = "") {
  return /^(subtotal|base imponible|iva|total|forma de pago|vencimiento|observaciones|iban|banco|firma|portes)/i.test(espacios(texto));
}

function detectarUnidad(texto = "") {
  const m = espacios(texto).toLowerCase().match(/\b(ud|uds|unidad|unidades|kg|kgs|g|gr|l|lt|ml|cl|caja|cajas|bandeja|bandejas|paquete|paquetes|bolsa|bolsas|botella|botellas|lata|latas|pack|packs|bulto|bultos)\b/i);
  if (!m) return "unidad";
  const u = m[1].toLowerCase();
  const eq = { uds: "unidad", unidades: "unidad", kgs: "kg", gr: "g", lt: "l", cajas: "caja", bandejas: "bandeja", paquetes: "paquete", bolsas: "bolsa", botellas: "botella", latas: "lata", packs: "pack", bultos: "bulto" };
  return eq[u] || u;
}

function detectarIva(texto = "") {
  const m = String(texto).match(/\b(0|4|5|10|21)\s*%/);
  if (m) return Number(m[1]);
  const m2 = String(texto).match(/\biva\s*(0|4|5|10|21)\b/i);
  return m2 ? Number(m2[1]) : 10;
}

function detectarCodigo(texto = "") {
  const primero = espacios(texto).split(" ")[0] || "";
  const codigo = primero.toUpperCase().replace(/[^A-Z0-9._/-]/g, "");
  if (codigo.length < 3 || codigo.length > 30 || !/\d/.test(codigo)) return "";
  if (/^(IVA|TOTAL|BASE|EUR|UD|UDS|KG|L|ML)$/.test(codigo)) return "";
  return codigo;
}

function obtenerZonaTabla(lineas) {
  let inicio = lineas.findIndex((l) => esCabeceraTabla(l.texto || ""));
  inicio = inicio >= 0 ? inicio + 1 : lineas.findIndex((l) => {
    const t = l.texto || "";
    return !PATRON_NO_PRODUCTO.test(espacios(t)) && /[A-Za-zÀ-ÿ]/.test(t) && extraerNumeros(t).length >= 2;
  });
  if (inicio < 0) inicio = 0;
  let fin = lineas.length;
  for (let i = inicio; i < lineas.length; i += 1) {
    if (esPie(lineas[i].texto || "")) { fin = i; break; }
  }
  return { inicio, fin, lineas: lineas.slice(inicio, fin) };
}

function seleccionarValores(numeros) {
  const candidatos = numeros.filter((n) => !String(n.texto).includes("%"));
  if (candidatos.length < 2) return null;
  let mejor = null;
  for (let it = candidatos.length - 1; it >= 1; it -= 1) {
    const total = candidatos[it].valor;
    if (total <= 0) continue;
    for (let ip = it - 1; ip >= 0; ip -= 1) {
      const precio = candidatos[ip].valor;
      if (precio <= 0) continue;
      for (let ic = ip - 1; ic >= -1; ic -= 1) {
        const cantidad = ic >= 0 ? candidatos[ic].valor : 1;
        if (cantidad <= 0 || cantidad > 100000) continue;
        const diferencia = Math.abs(cantidad * precio - total);
        const tolerancia = Math.max(0.05, total * 0.04);
        let puntuacion = diferencia <= tolerancia ? 100 : -diferencia * 8;
        if (it === candidatos.length - 1) puntuacion += 20;
        if (ip === it - 1) puntuacion += 12;
        if (ic === ip - 1) puntuacion += 8;
        const opcion = { cantidad, precio_unitario: precio, total_linea: total, diferencia, puntuacion, indiceCantidad: ic, indicePrecio: ip };
        if (!mejor || opcion.puntuacion > mejor.puntuacion) mejor = opcion;
      }
    }
  }
  if (!mejor) return null;
  return { ...mejor, cantidad: redondear(mejor.cantidad, 4), precio_unitario: redondear(mejor.precio_unitario, 4), total_linea: redondear(mejor.total_linea, 2) };
}

function construirDescripcion(texto, numeros, seleccion, codigo) {
  let inicio = 0;
  if (seleccion.indiceCantidad >= 0) inicio = numeros[seleccion.indiceCantidad]?.fin || 0;
  const fin = numeros[seleccion.indicePrecio]?.indice ?? texto.length;
  if (fin <= inicio) inicio = 0;
  let descripcion = espacios(texto.slice(inicio, fin));
  if (codigo && descripcion.toUpperCase().startsWith(codigo)) descripcion = descripcion.slice(codigo.length);
  return espacios(descripcion
    .replace(/^\s*\d+(?:[.,]\d+)?\s*(?:x|ud|uds|kg|g|l|ml|caja|bandeja|pack)?\s*/i, "")
    .replace(/\b(?:dto|dcto|descuento)\s*\d+(?:[.,]\d+)?\s*%?/gi, " ")
    .replace(/\b(?:0|4|5|10|21)\s*%\b/g, " ")
    .replace(/^[-–—.:;*\s]+/, "")
    .replace(/[-–—.:;\s]+$/, ""));
}

function parsearLinea(linea) {
  const texto = espacios(linea?.texto || linea || "");
  if (!texto || PATRON_NO_PRODUCTO.test(texto) || esCabeceraTabla(texto) || esPie(texto)) return null;
  const numeros = extraerNumeros(texto);
  if (numeros.length < 2) return null;
  const seleccion = seleccionarValores(numeros);
  if (!seleccion) return null;
  const codigo = detectarCodigo(texto);
  let descripcion = construirDescripcion(texto, numeros, seleccion, codigo);
  const aprendizaje = linea?.aprendizaje_diccionario;
  if (aprendizaje?.nombre_corregido) descripcion = aprendizaje.nombre_corregido;
  if (!descripcion || (descripcion.match(/[A-Za-zÀ-ÿ]/g) || []).length < 2) return null;
  const unidad = aprendizaje?.unidad_corregida || detectarUnidad(texto);
  const iva = detectarIva(texto);
  const tolerancia = Math.max(0.05, seleccion.total_linea * 0.04);
  let confianza = 55;
  if (descripcion.length >= 8) confianza += 10;
  if (codigo) confianza += 10;
  if (seleccion.diferencia <= tolerancia) confianza += 20;
  if (unidad !== "unidad") confianza += 5;
  confianza = Math.min(100, confianza);
  return {
    codigo: aprendizaje?.codigo_proveedor || codigo,
    descripcion,
    nombre_normalizado: normalizarNombreProducto(descripcion),
    cantidad: seleccion.cantidad,
    unidad,
    precio_unitario: seleccion.precio_unitario,
    iva,
    total_linea: seleccion.total_linea,
    confianza,
    necesita_revision: confianza < 72,
    texto_origen: texto,
    producto_id: aprendizaje?.producto_id || null,
    catalogo_proveedor_id: aprendizaje?.catalogo_proveedor_id || null,
  };
}

function extraerFecha(texto = "") {
  const patrones = [
    /(?:fecha|data)(?:\s+(?:albar[aá]n|documento|emisi[oó]n))?\s*[:#-]?\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/i,
    /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/,
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/,
  ];
  for (const patron of patrones) {
    const m = String(texto).match(patron);
    if (!m) continue;
    let year, month, day;
    if (m[1].length === 4) [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
    else { [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])]; if (year < 100) year += 2000; }
    if (month < 1 || month > 12 || day < 1 || day > 31) return "";
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return "";
}

function extraerNumero(texto = "") {
  const patrones = [
    /(?:albar[aá]n|delivery\s*note)\s*(?:n(?:ú|u|º|°|o)?\.?|n[uú]mero)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9\/._-]{2,})/i,
    /(?:documento|doc\.?|n[uú]mero)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\/._-]{3,})/i,
  ];
  for (const patron of patrones) {
    const m = String(texto).match(patron);
    if (m?.[1]) return m[1].replace(/[.,;:]$/, "");
  }
  return "";
}

export function recalcularDocumentoIA(lineas = []) {
  let base = 0;
  let iva = 0;
  for (const linea of lineas) {
    const totalLinea = redondear((numeroEuropeo(linea.cantidad) || 0) * (numeroEuropeo(linea.precio_unitario) || 0), 2);
    base += totalLinea;
    iva += totalLinea * ((numeroEuropeo(linea.iva) ?? 10) / 100);
  }
  return { base_imponible: redondear(base, 2), total_iva: redondear(iva, 2), total: redondear(base + iva, 2) };
}

export function analizarDocumentoIA(lectura = {}) {
  const texto = lectura.texto_normalizado || lectura.texto_original || "";
  const lineasEntrada = Array.isArray(lectura.lineas)
    ? lectura.lineas
    : String(texto).split(/\n+/).map((t, indice) => ({ indice, texto: espacios(t) }));
  const zona = obtenerZonaTabla(lineasEntrada);
  const productos = zona.lineas.map(parsearLinea).filter(Boolean);
  const vistos = new Set();
  const lineas = productos.filter((p) => {
    const clave = `${p.codigo}|${p.nombre_normalizado}|${p.cantidad}|${p.total_linea}`.toLowerCase();
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
  const totales = recalcularDocumentoIA(lineas);
  const confianza_media = lineas.length ? redondear(lineas.reduce((a, l) => a + Number(l.confianza || 0), 0) / lineas.length, 2) : 0;
  return {
    version_parser: VERSION_PARSER,
    proveedor_id: lectura.proveedor_id || lectura.proveedor_detectado?.id || "",
    proveedor_nombre: lectura.proveedor_detectado?.nombre || "",
    numero_albaran: extraerNumero(texto),
    fecha_albaran: extraerFecha(texto),
    lineas,
    ...totales,
    confianza_media,
    necesita_revision: lineas.length === 0 || confianza_media < 78 || lineas.some((l) => l.necesita_revision),
    zona_tabla: { inicio: zona.inicio, fin: zona.fin, lineas_analizadas: zona.lineas.length },
    diagnostico: { lineas_documento: lineasEntrada.length, lineas_tabla: zona.lineas.length, productos_detectados: lineas.length, productos_revision: lineas.filter((l) => l.necesita_revision).length },
  };
}

export const analizarAlbaranIA = analizarDocumentoIA;
export default analizarDocumentoIA;
