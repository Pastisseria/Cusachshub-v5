
export function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function palabrasSignificativas(texto) {
  const ignoradas = new Set([
    "de", "del", "la", "las", "el", "los", "un", "una", "unos", "unas",
    "amb", "de", "dels", "les", "els", "i", "y", "con", "para", "per",
  ]);

  return normalizarTexto(texto)
    .split(" ")
    .filter((palabra) => palabra.length > 1 && !ignoradas.has(palabra));
}

export function calcularCoincidenciaProducto(consulta, producto) {
  const consultaNormalizada = normalizarTexto(consulta);
  const nombre = normalizarTexto(producto?.nombre);
  const referencia = normalizarTexto(producto?.referencia);

  if (!consultaNormalizada || !nombre) return 0;
  if (consultaNormalizada === nombre) return 100;
  if (nombre.includes(consultaNormalizada)) return 90;
  if (consultaNormalizada.includes(nombre)) return 85;
  if (referencia && consultaNormalizada.includes(referencia)) return 82;

  const palabrasConsulta = palabrasSignificativas(consultaNormalizada);
  const palabrasNombre = new Set(palabrasSignificativas(nombre));

  if (!palabrasConsulta.length) return 0;

  const coincidentes = palabrasConsulta.filter((palabra) =>
    [...palabrasNombre].some(
      (palabraNombre) =>
        palabraNombre === palabra ||
        palabraNombre.startsWith(palabra) ||
        palabra.startsWith(palabraNombre),
    ),
  ).length;

  return Math.round((coincidentes / palabrasConsulta.length) * 75);
}

export function buscarMejorProducto(consulta, productos = [], minimo = 40) {
  const resultados = productos
    .map((producto) => ({
      producto,
      puntuacion: calcularCoincidenciaProducto(consulta, producto),
    }))
    .filter((resultado) => resultado.puntuacion >= minimo)
    .sort((a, b) => b.puntuacion - a.puntuacion);

  return {
    mejor: resultados[0] || null,
    alternativas: resultados.slice(1, 4),
  };
}
