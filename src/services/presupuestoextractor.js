const MESES = {
  enero: 1,
  febrer: 2,
  febrero: 2,
  març: 3,
  marzo: 3,
  abril: 4,
  maig: 5,
  mayo: 5,
  juny: 6,
  junio: 6,
  juliol: 7,
  julio: 7,
  agost: 8,
  agosto: 8,
  setembre: 9,
  septiembre: 9,
  octubre: 10,
  novembre: 11,
  noviembre: 11,
  desembre: 12,
  diciembre: 12,
};

function limpiarTexto(value = "") {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function normalizarImporte(value = "") {
  const limpio = value.replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : 0;
}

function fechaISO(year, month, day) {
  if (!year || !month || !day) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function detectarFecha(texto, fechaCorreo) {
  const numeric = texto.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2}|\d{2})\b/);
  if (numeric) {
    const year = Number(numeric[3]) < 100 ? 2000 + Number(numeric[3]) : Number(numeric[3]);
    return fechaISO(year, Number(numeric[2]), Number(numeric[1]));
  }

  const monthNames = Object.keys(MESES).join("|");
  const textual = texto.toLowerCase().match(new RegExp(`\\b(\\d{1,2})\\s+(?:de\\s+)?(${monthNames})(?:\\s+(?:de\\s+)?(20\\d{2}))?\\b`, "i"));
  if (textual) {
    const fallbackYear = fechaCorreo ? new Date(fechaCorreo).getFullYear() : new Date().getFullYear();
    return fechaISO(Number(textual[3] || fallbackYear), MESES[textual[2].toLowerCase()], Number(textual[1]));
  }

  if (fechaCorreo) {
    const parsed = new Date(fechaCorreo);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function detectarHora(texto) {
  const match = texto.match(/\b(?:a\s+las?|a\s+les?|hora\s*:?)?\s*(\d{1,2})[.:_h](\d{2})\s*h?\b/i);
  if (!match) return "";
  return `${String(match[1]).padStart(2, "0")}:${match[2]}`;
}

function detectarEmail(texto, remitente = "") {
  const combined = `${remitente}\n${texto}`;
  const emails = combined.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || [];
  return emails.find((email) => !/cusachs/i.test(email)) || emails[0] || "";
}

function detectarTelefono(texto) {
  const matches = texto.match(/(?:\+34\s*)?(?:\d[\s.-]?){9}/g) || [];
  return matches.map((item) => item.replace(/[^\d+]/g, "")).find((item) => item.replace(/\D/g, "").length >= 9) || "";
}

function detectarCif(texto) {
  return texto.match(/\b(?:CIF|NIF|VAT)\s*[:.-]?\s*([A-Z0-9-]{7,15})\b/i)?.[1] || "";
}

function detectarDireccion(texto) {
  const lineas = texto.split("\n").map(limpiarTexto).filter(Boolean);
  return lineas.find((linea) => /\b(calle|carrer|avinguda|avenida|paseo|passeig|plaza|plaça|rambla|carretera|via)\b/i.test(linea)) || "";
}

function nombreDesdeRemitente(remitente = "", email = "") {
  const beforeAddress = remitente.replace(/<[^>]+>/g, "").replace(/["']/g, "").trim();
  if (beforeAddress && !/@/.test(beforeAddress) && !/cusachs/i.test(beforeAddress)) return beforeAddress;
  return email ? email.split("@")[0].replace(/[._-]+/g, " ") : "Cliente por revisar";
}

function detectarEmpresa(asunto, texto) {
  const combined = `${asunto}\n${texto}`;
  const known = combined.match(/\b(?:laboratorios?|lab\.?|empresa|company|coac|lidl|omnicom|rituals|vall d['’]?hebron)\s+[A-ZÀ-Ü][\wÀ-ÿ&.-]*(?:\s+[A-ZÀ-Ü][\wÀ-ÿ&.-]*){0,3}/i);
  return known?.[0]?.trim() || "";
}

function detectarTotal(texto) {
  const patterns = [
    /\btotal(?:\s+presupuesto|\s+pressupost)?\s*[:=-]?\s*([\d.]+(?:,\d{1,2})?)\s*€/i,
    /\bimporte(?:\s+total)?\s*[:=-]?\s*([\d.]+(?:,\d{1,2})?)\s*€/i,
    /([\d.]+(?:,\d{1,2})?)\s*€\s*(?:\+\s*iva|iva\s+no\s+incluido)/i,
  ];

  for (const pattern of patterns) {
    const match = texto.match(pattern);
    if (match) return normalizarImporte(match[1]);
  }
  return 0;
}

function detectarIva(texto) {
  const match = texto.match(/(?:iva|i\.v\.a\.)\s*(?:del|al|:)?\s*(\d{1,2})\s*%/i);
  if (match) return Number(match[1]);
  if (/\+\s*iva|iva\s+no\s+incluido/i.test(texto)) return 10;
  return 10;
}

function detectarEstado(texto) {
  if (/cancelad[oa]|anulad[oa]/i.test(texto)) return "Cancelado";
  if (/aceptamos|confirmamos|confirmado|d'acord|endavant|ok\s+con|aprobado/i.test(texto)) return "Aceptado";
  if (/factura|facturación|facturació/i.test(texto)) return "Pendiente de facturación";
  if (/presupuesto|pressupost|propuesta|proposta/i.test(texto)) return "Enviado";
  return "Borrador";
}

function detectarTipo(texto) {
  if (/visitador(?:a)?\s+m[eé]dic|laboratorio|centre m[eè]dic|centro m[eé]dico/i.test(texto)) return "Visitador médico";
  if (/empresa|oficina|corporativ|coac|lidl|omnicom|rituals/i.test(texto)) return "Empresa";
  return "Catering";
}

function esLineaRuido(linea) {
  return !linea || /^(de:|para:|to:|from:|cc:|enviado:|sent:|asunto:|subject:|gracias|saludos|atentamente|bon dia|buenos días|hola[,!]?|www\.|https?:)/i.test(linea);
}

function detectarLineas(texto, total, iva) {
  const lineasTexto = texto.split("\n").map(limpiarTexto).filter(Boolean);
  const candidatas = [];

  for (const linea of lineasTexto) {
    if (esLineaRuido(linea) || linea.length > 180) continue;
    if (/\b(total|subtotal|iva|importe|presupuesto|pressupost)\b/i.test(linea)) continue;

    const match = linea.match(/^(?:[-•*]\s*)?(\d+(?:[.,]\d+)?)\s*(?:x|u\.?|uds?\.?|unitats?|unidades?)?\s+(.{3,})$/i);
    if (match) {
      candidatas.push({
        descripcion: match[2].replace(/\s+-\s+[\d.,]+\s*€.*$/i, "").trim(),
        cantidad: normalizarImporte(match[1]) || 1,
        precio_unitario: 0,
        iva,
      });
      continue;
    }

    if (/^(?:[-•*]\s*)?(mini|caf[eè]|zumo|suc|aigua|agua|croissant|bocadillo|entrep[aà]|sandwich|pastas?|galetes|galletas|fruita|fruta|cava|refresco|finger|esmorzar|desayuno|berenar|merienda)/i.test(linea)) {
      candidatas.push({ descripcion: linea.replace(/^[-•*]\s*/, ""), cantidad: 1, precio_unitario: 0, iva });
    }
  }

  const unique = candidatas.filter((linea, index, array) =>
    array.findIndex((item) => item.descripcion.toLowerCase() === linea.descripcion.toLowerCase()) === index,
  ).slice(0, 30);

  if (unique.length === 0) {
    return [{ descripcion: "Servicio de catering importado desde email", cantidad: 1, precio_unitario: total || 0, iva }];
  }

  if (total > 0 && unique.every((linea) => !linea.precio_unitario)) {
    const totalCantidad = unique.reduce((sum, linea) => sum + Number(linea.cantidad || 0), 0) || 1;
    unique.forEach((linea) => {
      linea.precio_unitario = Number((total / (1 + iva / 100) / totalCantidad).toFixed(2));
    });
  }

  return unique;
}

export function extraerPresupuestoDesdeEmail(email) {
  const texto = `${email.asunto || ""}\n${email.cuerpo || ""}`;
  const emailCliente = detectarEmail(texto, email.remitente);
  const iva = detectarIva(texto);
  const total = detectarTotal(texto);
  const tipo = detectarTipo(texto);
  const nombre = nombreDesdeRemitente(email.remitente, emailCliente);

  return {
    archivo: email.archivo,
    message_id: email.messageId,
    hash_email: "",
    asunto: email.asunto,
    remitente: email.remitente,
    cuerpo_original: email.cuerpo,
    cliente_id: "",
    crear_cliente: true,
    nombre_cliente: nombre,
    empresa: detectarEmpresa(email.asunto, email.cuerpo),
    nif_cif: detectarCif(texto),
    email: emailCliente,
    telefono: detectarTelefono(texto),
    direccion: detectarDireccion(texto),
    fecha: detectarFecha(texto, email.fechaCorreo),
    hora_entrega: detectarHora(texto),
    tipo_documento: tipo,
    estado: detectarEstado(texto),
    persona_contacto: nombre,
    visitador_nombre: tipo === "Visitador médico" ? nombre : "",
    laboratorio: tipo === "Visitador médico" ? detectarEmpresa(email.asunto, email.cuerpo) : "",
    centro_medico: texto.match(/(?:centro|centre|hospital|cl[ií]nica)\s+[A-ZÀ-Ü][^\n,;]{2,60}/i)?.[0] || "",
    observaciones: `Importado desde: ${email.archivo}\nAsunto: ${email.asunto}`,
    iva,
    total,
    lineas: detectarLineas(texto, total, iva),
    avisos: [
      !emailCliente && "No se ha detectado el email del cliente.",
      !total && "No se ha detectado un total; revisa los precios de las líneas.",
      !detectarDireccion(texto) && "No se ha detectado una dirección de entrega.",
    ].filter(Boolean),
  };
}

export function calcularTotalesImportacion(lineas = []) {
  return lineas.reduce(
    (acc, linea) => {
      const cantidad = Number(linea.cantidad || 0);
      const precio = Number(linea.precio_unitario || 0);
      const iva = Number(linea.iva || 0);
      const subtotal = cantidad * precio;
      const importeIva = subtotal * (iva / 100);
      acc.subtotal += subtotal;
      acc.ivaTotal += importeIva;
      acc.total += subtotal + importeIva;
      return acc;
    },
    { subtotal: 0, ivaTotal: 0, total: 0 },
  );
}
