function normalizar(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodificarBase64(valor = "") {
  try {
    const limpio = String(valor).replace(/\s+/g, "");
    const binario = atob(limpio);
    const bytes = Uint8Array.from(binario, (caracter) =>
      caracter.charCodeAt(0),
    );
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return "";
  }
}

function decodificarQuotedPrintable(valor = "") {
  try {
    const unido = String(valor).replace(/=\r?\n/g, "");
    const bytes = [];

    for (let indice = 0; indice < unido.length; indice += 1) {
      if (
        unido[indice] === "=" &&
        /^[0-9A-Fa-f]{2}$/.test(unido.slice(indice + 1, indice + 3))
      ) {
        bytes.push(Number.parseInt(unido.slice(indice + 1, indice + 3), 16));
        indice += 2;
      } else {
        bytes.push(unido.charCodeAt(indice));
      }
    }

    return new TextDecoder("utf-8", { fatal: false }).decode(
      new Uint8Array(bytes),
    );
  } catch {
    return String(valor);
  }
}

function decodificarCabeceraMime(valor = "") {
  return String(valor).replace(
    /=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g,
    (_, charset, tipo, contenido) =>
      tipo.toLowerCase() === "b"
        ? decodificarBase64(contenido)
        : decodificarQuotedPrintable(contenido.replace(/_/g, " ")),
  );
}

function quitarHtml(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, codigo) =>
      String.fromCharCode(Number(codigo)),
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function separarCabecerasYCuerpo(bloque = "") {
  const coincidencia = String(bloque).match(/\r?\n\r?\n/);

  if (!coincidencia) {
    return { cabecerasTexto: "", cuerpo: String(bloque) };
  }

  const indice = coincidencia.index ?? 0;

  return {
    cabecerasTexto: String(bloque).slice(0, indice),
    cuerpo: String(bloque).slice(indice + coincidencia[0].length),
  };
}

function leerCabeceras(texto = "") {
  const lineas = String(texto).replace(/\r/g, "").split("\n");
  const cabeceras = {};
  let nombreActual = "";

  for (const linea of lineas) {
    if (/^[ \t]/.test(linea) && nombreActual) {
      cabeceras[nombreActual] += ` ${linea.trim()}`;
      continue;
    }

    const posicion = linea.indexOf(":");
    if (posicion <= 0) continue;

    nombreActual = linea.slice(0, posicion).trim().toLowerCase();
    cabeceras[nombreActual] = linea.slice(posicion + 1).trim();
  }

  return cabeceras;
}

function obtenerParametro(cabecera = "", nombre = "") {
  const patron = new RegExp(
    `${nombre}\\s*=\\s*(?:"([^"]+)"|([^;\\s]+))`,
    "i",
  );
  const coincidencia = String(cabecera).match(patron);
  return coincidencia?.[1] || coincidencia?.[2] || "";
}

function decodificarParte(cuerpo = "", codificacion = "") {
  const tipo = String(codificacion).toLowerCase();
  if (tipo.includes("base64")) return decodificarBase64(cuerpo);
  if (tipo.includes("quoted-printable")) {
    return decodificarQuotedPrintable(cuerpo);
  }
  return String(cuerpo);
}

function extraerTextoParte(bloque = "") {
  const { cabecerasTexto, cuerpo } = separarCabecerasYCuerpo(bloque);
  const cabeceras = leerCabeceras(cabecerasTexto);
  const tipoContenido = cabeceras["content-type"] || "text/plain";
  const codificacion = cabeceras["content-transfer-encoding"] || "";
  const tipoNormalizado = tipoContenido.toLowerCase();

  if (
    tipoNormalizado.includes("application/") ||
    tipoNormalizado.includes("image/") ||
    tipoNormalizado.includes("audio/") ||
    tipoNormalizado.includes("video/")
  ) {
    return "";
  }

  const textoDecodificado = decodificarParte(cuerpo, codificacion);

  if (tipoNormalizado.includes("text/html")) {
    return quitarHtml(textoDecodificado);
  }

  if (tipoNormalizado.includes("text/plain")) {
    return textoDecodificado.trim();
  }

  return "";
}

function extraerTextoEmailCrudo(contenido = "") {
  const texto = String(contenido || "");

  if (!/^(from|to|subject|content-type|mime-version):/im.test(texto)) {
    return texto.trim();
  }

  const { cabecerasTexto, cuerpo } = separarCabecerasYCuerpo(texto);
  const cabeceras = leerCabeceras(cabecerasTexto);
  const tipoContenido = cabeceras["content-type"] || "";
  const codificacion = cabeceras["content-transfer-encoding"] || "";

  const asunto = decodificarCabeceraMime(cabeceras.subject || "");
  const remitente = decodificarCabeceraMime(cabeceras.from || "");
  const destinatario = decodificarCabeceraMime(cabeceras.to || "");

  let textoPrincipal = "";

  if (/multipart\//i.test(tipoContenido)) {
    const limite = obtenerParametro(tipoContenido, "boundary");

    if (limite) {
      const partes = cuerpo
        .split(`--${limite}`)
        .map((parte) => parte.trim())
        .filter((parte) => parte && parte !== "--" && !parte.startsWith("--"));

      const textosPlanos = [];
      const textosHtml = [];

      for (const parte of partes) {
        const { cabecerasTexto: cabecerasParte } =
          separarCabecerasYCuerpo(parte);
        const cabeceras = leerCabeceras(cabecerasParte);
        const tipo = (cabeceras["content-type"] || "text/plain").toLowerCase();
        const extraido = extraerTextoParte(parte);

        if (!extraido) continue;
        if (tipo.includes("text/plain")) textosPlanos.push(extraido);
        else if (tipo.includes("text/html")) textosHtml.push(extraido);
      }

      textoPrincipal =
        textosPlanos.join("\n\n").trim() ||
        textosHtml.join("\n\n").trim();
    }
  } else {
    const decodificado = decodificarParte(cuerpo, codificacion);
    textoPrincipal = /text\/html/i.test(tipoContenido)
      ? quitarHtml(decodificado)
      : decodificado.trim();
  }

  return [
    asunto ? `Asunto: ${asunto}` : "",
    remitente ? `De: ${remitente}` : "",
    destinatario ? `Para: ${destinatario}` : "",
    "",
    textoPrincipal,
  ]
    .filter((linea, indice, array) => {
      if (linea) return true;
      return indice === 3 && array.slice(0, 3).some(Boolean);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extraerFecha(texto) {
  const patrones = [
    /(?:fecha|dia|para el|per al|el)\s*[:\-]?\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/i,
    /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/,
  ];

  for (const patron of patrones) {
    const coincidencia = texto.match(patron);
    if (!coincidencia) continue;

    const dia = coincidencia[1].padStart(2, "0");
    const mes = coincidencia[2].padStart(2, "0");
    let anyo = coincidencia[3];
    if (anyo.length === 2) anyo = `20${anyo}`;

    return `${anyo}-${mes}-${dia}`;
  }

  return "";
}

function extraerHora(texto) {
  const coincidencia = texto.match(
    /(?:hora|a las|a les|sobre las|sobre les)?\s*(\d{1,2})[:.h](\d{2})/i,
  );

  if (!coincidencia) return "";
  return `${coincidencia[1].padStart(2, "0")}:${coincidencia[2]}`;
}

function extraerPersonas(texto) {
  const coincidencia = texto.match(
    /(\d{1,4})\s*(?:personas|persones|pax|comensales|assistents|asistentes)/i,
  );
  return coincidencia ? Number(coincidencia[1]) : "";
}

function extraerEmail(texto) {
  const emails = String(texto).match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  );

  if (!emails?.length) return "";

  return (
    emails.find((email) => !/noreply|no-reply|mailer-daemon/i.test(email)) ||
    emails[0]
  );
}

function extraerTelefono(texto) {
  const coincidencia = texto.match(/(?:\+34\s*)?(?:\d[\s.-]?){9}/);
  return coincidencia ? coincidencia[0].replace(/[^\d+]/g, "") : "";
}

function detectarCliente(texto, clientes = []) {
  const textoNormalizado = normalizar(texto);

  const coincidencias = clientes
    .map((cliente) => {
      const nombre =
        cliente.nombre ||
        cliente.nombre_comercial ||
        cliente.empresa ||
        "";
      const nombreNormalizado = normalizar(nombre);

      let puntuacion = 0;

      if (
        nombreNormalizado &&
        textoNormalizado.includes(nombreNormalizado)
      ) {
        puntuacion += 100;
      }

      if (
        cliente.email &&
        textoNormalizado.includes(normalizar(cliente.email))
      ) {
        puntuacion += 80;
      }

      if (
        cliente.telefono &&
        textoNormalizado.includes(normalizar(cliente.telefono))
      ) {
        puntuacion += 60;
      }

      return { cliente, puntuacion };
    })
    .filter((item) => item.puntuacion > 0)
    .sort((a, b) => b.puntuacion - a.puntuacion);

  return coincidencias[0]?.cliente ?? null;
}

function detectarProductos(texto, productos = []) {
  const lineasTexto = String(texto)
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  const encontrados = [];
  const usados = new Set();

  productos.forEach((producto) => {
    const nombre = producto.nombre || "";
    const nombreNormalizado = normalizar(nombre);
    if (!nombreNormalizado) return;

    const palabrasProducto = nombreNormalizado
      .split(" ")
      .filter((palabra) => palabra.length >= 3);

    const linea = lineasTexto.find((item) => {
      const normalizada = normalizar(item);

      if (normalizada.includes(nombreNormalizado)) return true;
      if (palabrasProducto.length < 2) return false;

      const coincidencias = palabrasProducto.filter((palabra) =>
        normalizada.includes(palabra),
      ).length;

      return coincidencias / palabrasProducto.length >= 0.75;
    });

    if (!linea || usados.has(producto.id)) return;

    const cantidadCoincidente = linea.match(
      /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:x|uds?|unidades?)?\b/i,
    );

    const cantidad = cantidadCoincidente
      ? Number(cantidadCoincidente[1].replace(",", "."))
      : 1;

    encontrados.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      cantidad,
      precio_unitario: Number(producto.precio_venta || 0),
      confirmado: true,
    });

    usados.add(producto.id);
  });

  return encontrados;
}

export function analizarEmail({ texto, clientes = [], productos = [] }) {
  const textoLimpio = extraerTextoEmailCrudo(texto);
  const clienteDetectado = detectarCliente(textoLimpio, clientes);
  const lineas = detectarProductos(textoLimpio, productos);

  return {
    cliente_id: clienteDetectado?.id ?? "",
    cliente_nombre:
      clienteDetectado?.nombre ||
      clienteDetectado?.nombre_comercial ||
      clienteDetectado?.empresa ||
      "",
    email: extraerEmail(textoLimpio),
    telefono: extraerTelefono(textoLimpio),
    fecha_evento: extraerFecha(textoLimpio),
    hora_evento: extraerHora(textoLimpio),
    numero_personas: extraerPersonas(textoLimpio),
    lineas,
    observaciones: textoLimpio.trim(),
  };
}
