function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;

  let limpio = String(valor)
    .trim()
    .replace(/[€\s]/g, "")
    .replace(/[^0-9,.-]/g, "");

  const tieneComa = limpio.includes(",");
  const tienePunto = limpio.includes(".");

  if (tieneComa && tienePunto) {
    if (limpio.lastIndexOf(",") > limpio.lastIndexOf(".")) {
      limpio = limpio.replace(/\./g, "").replace(",", ".");
    } else {
      limpio = limpio.replace(/,/g, "");
    }
  } else if (tieneComa) {
    limpio = limpio.replace(",", ".");
  }

  const resultado = Number(limpio);
  return Number.isFinite(resultado) ? resultado : 0;
}

function redondear(valor) {
  return Number(numero(valor).toFixed(2));
}

function normalizarEspacios(texto = "") {
  return String(texto)
    .replace(/\t+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function normalizarFecha(anio, mes, dia) {
  const year = Number(anio) < 100 ? 2000 + Number(anio) : Number(anio);
  const month = String(Number(mes)).padStart(2, "0");
  const day = String(Number(dia)).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extraerFecha(texto) {
  const patrones = [
    /(?:fecha|data)(?:\s+(?:albar[aá]n|documento))?\s*[:#-]?\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/i,
    /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/,
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/,
  ];

  for (const patron of patrones) {
    const match = texto.match(patron);
    if (!match) continue;

    if (match[1]?.length === 4) {
      return normalizarFecha(match[1], match[2], match[3]);
    }

    return normalizarFecha(match[3], match[2], match[1]);
  }

  return "";
}

function extraerNumeroAlbaran(texto) {
  const patrones = [
    /(?:n(?:ú|u|º|°|o)?\.?\s*(?:albar[aá]n|documento)|albar[aá]n\s*(?:n(?:ú|u|º|°|o)?\.?|n[uú]mero)?|delivery\s*note)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\/._-]{2,})/i,
    /(?:documento|doc\.)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\/._-]{3,})/i,
  ];

  for (const patron of patrones) {
    const match = texto.match(patron);
    if (match?.[1]) return match[1].trim();
  }

  return "";
}

function extraerProveedor(texto) {
  const lineas = String(texto)
    .split(/\n+/)
    .map(normalizarEspacios)
    .filter(Boolean);

  const descartes =
    /^(albar[aá]n|factura|cliente|fecha|data|cif|nif|tel[eé]fono|direcci[oó]n|p[aá]gina|pedido|cantidad|descripci[oó]n|precio|importe|total)/i;

  return (
    lineas.find((linea) => {
      if (linea.length < 4 || linea.length > 90 || descartes.test(linea)) {
        return false;
      }

      const letras = (linea.match(/[A-Za-zÀ-ÿ]/g) || []).length;
      return letras >= 4;
    }) || ""
  );
}

function esLineaNoProducto(linea) {
  return /^(subtotal|base imponible|iva|total|forma de pago|observaciones|cliente|cif|nif|direcci[oó]n|tel[eé]fono|p[aá]gina|albar[aá]n|fecha|pedido|vencimiento|cantidad|descripci[oó]n|precio|importe)/i.test(
    normalizarEspacios(linea),
  );
}

function detectarIva(tokens) {
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const valor = numero(tokens[i]);
    if ([0, 4, 5, 10, 21].includes(valor)) return valor;
  }

  return 10;
}

function parsearLineaProducto(linea) {
  const original = normalizarEspacios(linea);

  if (!original || original.length < 8 || esLineaNoProducto(original)) {
    return null;
  }

  const importes = [
    ...original.matchAll(/-?\d{1,7}(?:[.,]\d{1,4})?\s*€?/g),
  ].map((match) => ({
    texto: match[0],
    valor: numero(match[0]),
    indice: match.index ?? 0,
  }));

  if (importes.length < 2) return null;

  const tokens = original.split(" ");
  const iva = detectarIva(tokens);
  const totalCandidato = importes[importes.length - 1];
  const precioCandidato = importes[importes.length - 2];

  let cantidadCandidato = importes.find(
    (item, indice) =>
      indice < importes.length - 2 &&
      item.valor > 0 &&
      item.valor <= 9999,
  );

  if (!cantidadCandidato) {
    cantidadCandidato = { valor: 1, indice: 0, texto: "1" };
  }

  let cantidad = cantidadCandidato.valor || 1;
  const precioUnitario = precioCandidato.valor;
  const totalLinea = totalCandidato.valor;

  if (precioUnitario <= 0 || totalLinea <= 0) return null;

  if (
    Math.abs(cantidad * precioUnitario - totalLinea) >
    Math.max(0.2, totalLinea * 0.12)
  ) {
    const posibleCantidad = totalLinea / precioUnitario;

    if (posibleCantidad > 0 && posibleCantidad <= 9999) {
      cantidad = redondear(posibleCantidad);
    }
  }

  const primerNumero = importes[0];
  const descripcionInicio = primerNumero.indice + primerNumero.texto.length;
  const descripcionFin = Math.max(descripcionInicio, precioCandidato.indice);

  let descripcion = normalizarEspacios(
    original.slice(descripcionInicio, descripcionFin),
  );

  let codigo = normalizarEspacios(
    original.slice(0, primerNumero.indice),
  );

  if (
    !codigo &&
    /^\d{3,}$/.test(primerNumero.texto.replace(/\D/g, ""))
  ) {
    codigo = primerNumero.texto.replace(/\D/g, "");
  }

  if (!descripcion || descripcion.length < 2) {
    descripcion = normalizarEspacios(
      original.slice(0, precioCandidato.indice),
    );
  }

  descripcion = descripcion
    .replace(/^[-–—.:\s]+/, "")
    .replace(
      /\b(?:ud|uds|unidad(?:es)?|kg|g|l|ml|caja|cajas|bandeja|bandejas|paquete|paquetes|bolsa|bolsas)\b\s*$/i,
      "",
    )
    .trim();

  if (!descripcion || /^\d+(?:[.,]\d+)?$/.test(descripcion)) {
    return null;
  }

  const unidadMatch = original.match(
    /\b(kg|g|l|ml|ud|uds|unidad(?:es)?|caja(?:s)?|bandeja(?:s)?|paquete(?:s)?|bolsa(?:s)?)\b/i,
  );

  return {
    codigo: codigo.slice(0, 40),
    descripcion,
    cantidad: redondear(cantidad),
    unidad: unidadMatch?.[1]?.toLowerCase() || "unidad",
    precio_unitario: redondear(precioUnitario),
    iva,
    total_linea: redondear(totalLinea),
  };
}

function unirLineasPartidas(lineas = []) {
  const resultado = [];

  for (const linea of lineas) {
    const limpia = normalizarEspacios(linea);
    if (!limpia) continue;

    const tieneImportes =
      (limpia.match(/\d+[.,]\d{2}/g) || []).length >= 2;

    if (!tieneImportes && resultado.length > 0 && !esLineaNoProducto(limpia)) {
      const ultima = resultado[resultado.length - 1];
      const ultimaTieneImportes =
        (ultima.match(/\d+[.,]\d{2}/g) || []).length >= 2;

      if (!ultimaTieneImportes) {
        resultado[resultado.length - 1] =
          normalizarEspacios(`${ultima} ${limpia}`);
        continue;
      }
    }

    resultado.push(limpia);
  }

  return resultado;
}

function eliminarDuplicados(lineas) {
  const vistos = new Set();

  return lineas.filter((linea) => {
    const clave = [
      linea.codigo,
      linea.descripcion,
      linea.cantidad,
      linea.total_linea,
    ]
      .join("|")
      .toLowerCase();

    if (vistos.has(clave)) return false;

    vistos.add(clave);
    return true;
  });
}

export function recalcularAlbaran(lineas = []) {
  let baseImponible = 0;
  let totalIva = 0;

  for (const linea of lineas) {
    const totalLinea = redondear(
      numero(linea.cantidad) * numero(linea.precio_unitario),
    );

    baseImponible += totalLinea;
    totalIva += totalLinea * (numero(linea.iva) / 100);
  }

  baseImponible = redondear(baseImponible);
  totalIva = redondear(totalIva);

  return {
    base_imponible: baseImponible,
    total_iva: totalIva,
    total: redondear(baseImponible + totalIva),
  };
}

export function analizarAlbaran(texto = "") {
  const textoLimpio = String(texto)
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  const lineasTexto = unirLineasPartidas(
    textoLimpio
      .split(/\n+/)
      .map(normalizarEspacios)
      .filter(Boolean),
  );

  const lineas = eliminarDuplicados(
    lineasTexto
      .map(parsearLineaProducto)
      .filter(Boolean),
  );

  const totales = recalcularAlbaran(lineas);

  return {
    proveedor_nombre: extraerProveedor(textoLimpio),
    numero_albaran: extraerNumeroAlbaran(textoLimpio),
    fecha_albaran: extraerFecha(textoLimpio),
    lineas,
    ...totales,
  };
}
