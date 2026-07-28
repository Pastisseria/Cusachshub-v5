function normalizar(texto = "") {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extraerFecha(texto) {
  const patrones = [
    /(?:fecha|dia|para el|per al|el)\s*[:\-]?\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/i,
    /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/,
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
    /(?:hora|a las|a les|sobre las|sobre les)?\s*(\d{1,2})[:.h](\d{2})/i
  );

  if (!coincidencia) return "";

  return `${coincidencia[1].padStart(2, "0")}:${coincidencia[2]}`;
}

function extraerPersonas(texto) {
  const coincidencia = texto.match(
    /(\d{1,4})\s*(?:personas|persones|pax|comensales|assistents|asistentes)/i
  );

  return coincidencia ? Number(coincidencia[1]) : "";
}

function extraerEmail(texto) {
  return texto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
}

function extraerTelefono(texto) {
  const coincidencia = texto.match(
    /(?:\+34\s*)?(?:\d[\s.-]?){9}/
  );

  return coincidencia
    ? coincidencia[0].replace(/[^\d+]/g, "")
    : "";
}

function detectarCliente(texto, clientes = []) {
  const textoNormalizado = normalizar(texto);

  const coincidencias = clientes
    .map((cliente) => {
      const nombre = cliente.nombre || cliente.nombre_comercial || cliente.empresa || "";
      const nombreNormalizado = normalizar(nombre);

      let puntuacion = 0;
      if (nombreNormalizado && textoNormalizado.includes(nombreNormalizado)) puntuacion += 100;
      if (cliente.email && textoNormalizado.includes(normalizar(cliente.email))) puntuacion += 80;
      if (cliente.telefono && textoNormalizado.includes(normalizar(cliente.telefono))) puntuacion += 60;

      return { cliente, puntuacion };
    })
    .filter((item) => item.puntuacion > 0)
    .sort((a, b) => b.puntuacion - a.puntuacion);

  return coincidencias[0]?.cliente ?? null;
}

function detectarProductos(texto, productos = []) {
  const lineas = texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  const encontrados = [];
  const usados = new Set();

  productos.forEach((producto) => {
    const nombre = producto.nombre || "";
    const nombreNormalizado = normalizar(nombre);
    if (!nombreNormalizado) return;

    const linea = lineas.find((item) =>
      normalizar(item).includes(nombreNormalizado)
    );

    if (!linea || usados.has(producto.id)) return;

    const antes = normalizar(linea).split(nombreNormalizado)[0];
    const cantidadCoincidente = antes.match(/(\d+(?:[.,]\d+)?)/);
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
  const clienteDetectado = detectarCliente(texto, clientes);
  const lineas = detectarProductos(texto, productos);

  return {
    cliente_id: clienteDetectado?.id ?? "",
    cliente_nombre:
      clienteDetectado?.nombre ||
      clienteDetectado?.nombre_comercial ||
      clienteDetectado?.empresa ||
      "",
    email: extraerEmail(texto),
    telefono: extraerTelefono(texto),
    fecha_evento: extraerFecha(texto),
    hora_evento: extraerHora(texto),
    numero_personas: extraerPersonas(texto),
    lineas,
    observaciones: texto.trim(),
  };
}
