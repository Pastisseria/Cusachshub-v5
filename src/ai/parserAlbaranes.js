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
    .replace(/[€\s]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const resultado = Number(limpio);
  return Number.isFinite(resultado) ? resultado : 0;
}

function extraerFecha(texto) {
  const match = texto.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (!match) return "";

  const dia = match[1].padStart(2, "0");
  const mes = match[2].padStart(2, "0");
  const anyo = match[3].length === 2 ? `20${match[3]}` : match[3];

  return `${anyo}-${mes}-${dia}`;
}

function extraerNumeroAlbaran(texto) {
  return (
    texto.match(
      /(?:albar[aá]n|delivery note|n[uú]m(?:ero)?|no\.?)\s*[:#-]?\s*([A-Z0-9/_-]+)/i
    )?.[1] ?? ""
  );
}

function extraerTotales(texto) {
  const base =
    texto.match(/(?:base imponible|subtotal)\s*[:€]?\s*([\d.,]+)/i)?.[1] ?? "";
  const iva =
    texto.match(/(?:total iva|iva)\s*[:€]?\s*([\d.,]+)/i)?.[1] ?? "";
  const total =
    texto.match(/(?:total albar[aá]n|total)\s*[:€]?\s*([\d.,]+)/i)?.[1] ?? "";

  return {
    base_imponible: numero(base),
    total_iva: numero(iva),
    total: numero(total),
  };
}

function extraerLineas(texto) {
  const lineas = texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  const resultado = [];

  for (const linea of lineas) {
    // Formatos habituales:
    // 2 | Harina 25 kg | 18,50 | 37,00
    // 2 Harina 25 kg 18,50 37,00
    const match = linea.match(
      /^(\d+(?:[.,]\d+)?)\s*[|;\t ]+\s*(.+?)\s*[|;\t ]+\s*([\d.,]+)\s*[|;\t ]+\s*([\d.,]+)\s*€?$/
    );

    if (!match) continue;

    const cantidad = numero(match[1]);
    const descripcion = match[2].trim();
    const precioUnitario = numero(match[3]);
    const totalLinea = numero(match[4]);

    if (!descripcion || cantidad <= 0) continue;

    resultado.push({
      descripcion,
      cantidad,
      unidad: "unidad",
      precio_unitario: precioUnitario,
      iva: 10,
      total_linea: totalLinea || cantidad * precioUnitario,
    });
  }

  return resultado;
}

export function analizarAlbaran(texto) {
  const totales = extraerTotales(texto);

  return {
    numero_albaran: extraerNumeroAlbaran(texto),
    fecha_albaran: extraerFecha(texto),
    proveedor_id: "",
    proveedor_nombre: "",
    lineas: extraerLineas(texto),
    ...totales,
    texto_original: texto.trim(),
  };
}

export function recalcularAlbaran(lineas = []) {
  const base = lineas.reduce(
    (acumulado, linea) =>
      acumulado +
      numero(linea.cantidad) * numero(linea.precio_unitario),
    0
  );

  const totalIva = lineas.reduce((acumulado, linea) => {
    const baseLinea = numero(linea.cantidad) * numero(linea.precio_unitario);
    return acumulado + baseLinea * (numero(linea.iva) / 100);
  }, 0);

  return {
    base_imponible: Number(base.toFixed(2)),
    total_iva: Number(totalIva.toFixed(2)),
    total: Number((base + totalIva).toFixed(2)),
  };
}
