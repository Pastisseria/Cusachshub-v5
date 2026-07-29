export function prepararRevisionAlbaran(datos = {}) {
  return {
    proveedor: datos.proveedor || "",
    numero: datos.numero || "",
    fecha: datos.fecha || "",
    lineas: Array.isArray(datos.lineas) ? datos.lineas : [],
    subtotal: Number(datos.subtotal || 0),
    iva: Number(datos.iva || 0),
    total: Number(datos.total || 0),
    confirmacionNecesaria: true,
    advertencias: [
      "Revisa tots els camps abans de desar.",
      "No s'ha modificat el catàleg, les compres ni l'estoc.",
    ],
  };
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;

  let limpio = String(valor)
    .trim()
    .replace(/[€\s]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const resultado = Number(limpio);
  return Number.isFinite(resultado) ? resultado : 0;
}

function redondear(valor) {
  return Number(Number(valor || 0).toFixed(2));
}

function limpiarTexto(texto = "") {
  return String(texto)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extraerFecha(texto) {
  const patrones = [
    /fec\.?\s*albar[aá]n\s*[:.-]?\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/i,
    /fecha\s*(?:del\s*)?albar[aá]n\s*[:.-]?\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/i,
    /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/,
  ];

  for (const patron of patrones) {
    const match = texto.match(patron);
    if (!match) continue;

    const dia = match[1].padStart(2, "0");
    const mes = match[2].padStart(2, "0");
    const anyo = match[3].length === 2 ? `20${match[3]}` : match[3];

    return `${anyo}-${mes}-${dia}`;
  }

  return "";
}

function extraerNumeroAlbaran(texto) {
  const patrones = [
    /num\.?\s*albar[aá]n\s*[:#.-]?\s*([A-Z0-9/_-]+)/i,
    /n[uú]m(?:ero)?\.?\s*(?:de\s*)?albar[aá]n\s*[:#.-]?\s*([A-Z0-9/_-]+)/i,
    /albar[aá]n\s*[:#.-]?\s*([A-Z0-9/_-]+)/i,
    /\balb\.?\s*([A-Z0-9/_-]+)/i,
  ];

  for (const patron of patrones) {
    const match = texto.match(patron);
    if (match?.[1]) return match[1];
  }

  return "";
}

function extraerTotales(texto) {
  const totalCoincidencias = [
    ...texto.matchAll(
      /(?:total\s+albar[aá]n(?:\s+servicio)?|importe\s+total|total)\s*[:€-]?\s*([\d.,]+)/gi
    ),
  ];

  const total =
    totalCoincidencias.length > 0
      ? numero(totalCoincidencias.at(-1)[1])
      : 0;

  const baseCoincidencias = [
    ...texto.matchAll(
      /(?:base\s+imponible|b\.?\s*imponible|subtotal)\s*[:€-]?\s*([\d.,]+)/gi
    ),
  ];

  const ivaCoincidencias = [
    ...texto.matchAll(
      /(?:importe\s+iva|imp\.?\s*iva|total\s+iva)\s*[:€-]?\s*([\d.,]+)/gi
    ),
  ];

  return {
    base_imponible:
      baseCoincidencias.length > 0
        ? numero(baseCoincidencias.at(-1)[1])
        : 0,
    total_iva:
      ivaCoincidencias.length > 0
        ? numero(ivaCoincidencias.at(-1)[1])
        : 0,
    total,
  };
}

function esLineaNoProducto(linea) {
  const texto = linea.toLowerCase();

  return (
    !linea ||
    texto.includes("descripcion cant") ||
    texto.includes("descripción cant") ||
    texto.includes("base imponible") ||
    texto.includes("b.imponible") ||
    texto.includes("total albaran") ||
    texto.includes("total albarán") ||
    texto.includes("administracio") ||
    texto.includes("administración") ||
    texto.includes("telefono") ||
    texto.includes("cod.cliente") ||
    texto.includes("n.i.f") ||
    texto.includes("doc.electronic") ||
    /^[-–—_\s]+$/.test(linea)
  );
}

/*
  Formato real detectado en los albaranes del usuario:

  04114 VICHY 0.30L 24B. S.R BANDEJA 2 C 0.384 18.540 37.08 10.00 16106

  Interpretación:
  - código inicial: 04114
  - descripción: VICHY 0.30L 24B. S.R BANDEJA
  - cantidad: 2
  - unidad: C
  - valor intermedio / IBEE: 0.384
  - precio unitario: 18.540
  - importe: 37.08
  - IVA: 10.00
  - código final OCR: 16106
*/
function extraerLineaFormatoProveedor(linea) {
  const limpia = linea.replace(/\s+/g, " ").trim();

  const match = limpia.match(
    /^(?:(\d{3,8})\s+)?(.+?)\s+(\d+(?:[.,]\d+)?)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{1,5})\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{1,2}(?:[.,]\d+)?)\s+(?:\d{4,8})$/
  );

  if (!match) return null;

  const codigo = match[1] || "";
  const descripcion = match[2].trim();
  const cantidad = numero(match[3]);
  const unidad = match[4].trim();
  const precioUnitario = numero(match[6]);
  const totalLinea = numero(match[7]);
  const iva = numero(match[8]);

  if (!descripcion || cantidad <= 0 || precioUnitario < 0) {
    return null;
  }

  return {
    codigo,
    descripcion,
    cantidad,
    unidad,
    precio_unitario: precioUnitario,
    iva,
    total_linea: totalLinea || redondear(cantidad * precioUnitario),
  };
}

function extraerLineaGenerica(linea) {
  const limpia = linea.replace(/\s+/g, " ").trim();

  const patrones = [
    /^(\d+(?:[.,]\d+)?)\s*[|;\t]+\s*(.+?)\s*[|;\t]+\s*([\d.,]+)\s*[|;\t]+\s*([\d.,]+)\s*€?$/,
    /^(\d+(?:[.,]\d+)?)\s+(.+?)\s+([\d.,]+)\s+([\d.,]+)\s*€?$/,
  ];

  for (const patron of patrones) {
    const match = limpia.match(patron);
    if (!match) continue;

    const cantidad = numero(match[1]);
    const descripcion = match[2].trim();
    const precioUnitario = numero(match[3]);
    const totalLinea = numero(match[4]);

    if (!descripcion || cantidad <= 0) continue;

    return {
      codigo: "",
      descripcion,
      cantidad,
      unidad: "unidad",
      precio_unitario: precioUnitario,
      iva: 10,
      total_linea: totalLinea || redondear(cantidad * precioUnitario),
    };
  }

  return null;
}

function extraerLineas(texto) {
  const lineasTexto = limpiarTexto(texto)
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);

  const resultado = [];

  for (const linea of lineasTexto) {
    if (esLineaNoProducto(linea)) continue;

    const lineaProveedor = extraerLineaFormatoProveedor(linea);

    if (lineaProveedor) {
      resultado.push(lineaProveedor);
      continue;
    }

    const lineaGenerica = extraerLineaGenerica(linea);

    if (lineaGenerica) {
      resultado.push(lineaGenerica);
    }
  }

  return resultado;
}

export function analizarAlbaran(texto) {
  const textoLimpio = limpiarTexto(texto);
  const lineas = extraerLineas(textoLimpio);
  const totalesExtraidos = extraerTotales(textoLimpio);
  const totalesCalculados = recalcularAlbaran(lineas);

  return {
    numero_albaran: extraerNumeroAlbaran(textoLimpio),
    fecha_albaran: extraerFecha(textoLimpio),
    proveedor_id: "",
    proveedor_nombre: "",
    lineas,
    base_imponible:
      totalesExtraidos.base_imponible || totalesCalculados.base_imponible,
    total_iva:
      totalesExtraidos.total_iva || totalesCalculados.total_iva,
    total: totalesExtraidos.total || totalesCalculados.total,
    texto_original: textoLimpio,
  };
}

export function recalcularAlbaran(lineas = []) {
  const base = lineas.reduce((acumulado, linea) => {
    const totalLinea = numero(linea.total_linea);

    if (totalLinea > 0) {
      return acumulado + totalLinea;
    }

    return (
      acumulado +
      numero(linea.cantidad) * numero(linea.precio_unitario)
    );
  }, 0);

  const totalIva = lineas.reduce((acumulado, linea) => {
    const baseLinea =
      numero(linea.total_linea) ||
      numero(linea.cantidad) * numero(linea.precio_unitario);

    return acumulado + baseLinea * (numero(linea.iva) / 100);
  }, 0);

  return {
    base_imponible: redondear(base),
    total_iva: redondear(totalIva),
    total: redondear(base + totalIva),
  };
}
