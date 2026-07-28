import { buscarMejorProducto, normalizarTexto } from "./buscadorProductos.js";

const DIAS = {
  domingo: 0, diumenge: 0,
  lunes: 1, dilluns: 1,
  martes: 2, dimarts: 2,
  miercoles: 3, miércoles: 3, dimecres: 3,
  jueves: 4, dijous: 4,
  viernes: 5, divendres: 5,
  sabado: 6, sábado: 6, dissabte: 6,
};

function fechaISO(fecha) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}

function siguienteDiaSemana(diaObjetivo) {
  const fecha = new Date();
  const diferencia = (diaObjetivo - fecha.getDay() + 7) % 7 || 7;
  fecha.setDate(fecha.getDate() + diferencia);
  return fechaISO(fecha);
}

function detectarFecha(textoNormalizado) {
  const hoy = new Date();

  if (/\b(hoy|avui)\b/.test(textoNormalizado)) {
    return fechaISO(hoy);
  }

  if (/\b(manana|dema)\b/.test(textoNormalizado)) {
    hoy.setDate(hoy.getDate() + 1);
    return fechaISO(hoy);
  }

  const fechaNumerica = textoNormalizado.match(
    /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/,
  );

  if (fechaNumerica) {
    const dia = Number(fechaNumerica[1]);
    const mes = Number(fechaNumerica[2]);
    let año = fechaNumerica[3] ? Number(fechaNumerica[3]) : hoy.getFullYear();
    if (año < 100) año += 2000;

    const fecha = new Date(año, mes - 1, dia);
    if (
      fecha.getFullYear() === año &&
      fecha.getMonth() === mes - 1 &&
      fecha.getDate() === dia
    ) {
      return fechaISO(fecha);
    }
  }

  for (const [nombre, numero] of Object.entries(DIAS)) {
    if (new RegExp(`\\b${nombre}\\b`).test(textoNormalizado)) {
      return siguienteDiaSemana(numero);
    }
  }

  return "";
}

function detectarHora(textoNormalizado) {
  const coincidencia = textoNormalizado.match(
    /\b(?:a\s+las?|a\s+les?|a\s+la|hora)?\s*(\d{1,2})(?:[:.h](\d{2}))?\s*(?:hores?|horas?)?\b/,
  );

  if (!coincidencia) return "";

  const hora = Number(coincidencia[1]);
  const minuto = Number(coincidencia[2] || 0);

  if (hora > 23 || minuto > 59) return "";
  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

function detectarIdioma(textoNormalizado) {
  if (/\b(catalan|catala|català)\b/.test(textoNormalizado)) return "ca";
  if (/\b(ingles|english|anglès|angles)\b/.test(textoNormalizado)) return "en";
  if (/\b(castellano|castella|espanol|español)\b/.test(textoNormalizado)) return "es";
  return "";
}

function detectarPersonas(textoNormalizado) {
  const coincidencia = textoNormalizado.match(
    /\b(\d{1,4})\s*(personas|persones|comensales|pax)\b/,
  );

  return coincidencia ? Number(coincidencia[1]) : null;
}

function detectarCliente(texto, clientes = []) {
  const normalizado = normalizarTexto(texto);
  const candidatos = clientes
    .map((cliente) => {
      const nombre = normalizarTexto(cliente.nombre);
      const empresa = normalizarTexto(cliente.empresa);
      let puntuacion = 0;

      if (empresa && normalizado.includes(empresa)) puntuacion = 100;
      else if (nombre && normalizado.includes(nombre)) puntuacion = 90;

      return { cliente, puntuacion };
    })
    .filter((resultado) => resultado.puntuacion > 0)
    .sort((a, b) => b.puntuacion - a.puntuacion);

  return candidatos[0]?.cliente || null;
}

function detectarLineas(texto, productos = [], personas = null) {
  const segmentos = texto
    .split(/[,;\n]|\by\b|\bi\b|\bademas\b|\bañade\b|\bafegeix\b/gi)
    .map((segmento) => segmento.trim())
    .filter(Boolean);

  const encontrados = [];
  const idsIncluidos = new Set();

  for (const segmento of segmentos) {
    const cantidadEncontrada = segmento.match(/\b(\d+(?:[.,]\d+)?)\b/);
    const cantidad = cantidadEncontrada
      ? Number(cantidadEncontrada[1].replace(",", "."))
      : personas || 1;

    const consulta = segmento
      .replace(/\b\d+(?:[.,]\d+)?\b/g, " ")
      .replace(
        /\b(presupuesto|pressupost|cliente|client|personas|persones|para|per|el|la|los|les|las|de|del|a las|a les|mañana|dema|hoy|avui)\b/gi,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim();

    if (consulta.length < 2) continue;

    const resultado = buscarMejorProducto(consulta, productos, 48);
    if (!resultado.mejor?.producto) continue;

    const producto = resultado.mejor.producto;
    if (idsIncluidos.has(String(producto.id))) continue;
    idsIncluidos.add(String(producto.id));

    encontrados.push({
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      cantidad,
      precio_unitario: Number(producto.precio_venta || 0),
      iva: Number(producto.iva ?? 10),
      puntuacion: resultado.mejor.puntuacion,
      alternativas: resultado.alternativas.map((item) => ({
        id: item.producto.id,
        nombre: item.producto.nombre,
        puntuacion: item.puntuacion,
      })),
    });
  }

  return encontrados;
}

export function interpretarPedido(texto, { clientes = [], productos = [] } = {}) {
  const textoNormalizado = normalizarTexto(texto);
  const personas = detectarPersonas(textoNormalizado);

  return {
    textoOriginal: texto,
    cliente: detectarCliente(texto, clientes),
    fecha: detectarFecha(textoNormalizado),
    hora: detectarHora(textoNormalizado),
    idioma: detectarIdioma(textoNormalizado),
    personas,
    lineas: detectarLineas(texto, productos, personas),
    observaciones: texto,
  };
}
