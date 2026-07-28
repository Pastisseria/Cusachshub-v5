import { interpretarPedido } from "./parserPedidos.js";
import { normalizarTexto } from "./buscadorProductos.js";

export const INTENCIONES_ASISTENTE = {
  PRESUPUESTO: "presupuesto",
  PRODUCCION: "produccion",
  COMPRAS: "compras",
  STOCK: "stock",
  FACTURACION: "facturacion",
  CONSULTA: "consulta",
};

export function detectarIntencion(texto = "") {
  const normalizado = normalizarTexto(texto);

  if (/\b(factura|facturar|facturacion|facturacio)\b/.test(normalizado)) {
    return INTENCIONES_ASISTENTE.FACTURACION;
  }

  if (/\b(produccion|produccio|preparar|fabricar)\b/.test(normalizado)) {
    return INTENCIONES_ASISTENTE.PRODUCCION;
  }

  if (/\b(comprar|compra|comanda|pedido proveedor|proveedor)\b/.test(normalizado)) {
    return INTENCIONES_ASISTENTE.COMPRAS;
  }

  if (/\b(stock|existencias|existencies|almacen|magatzem)\b/.test(normalizado)) {
    return INTENCIONES_ASISTENTE.STOCK;
  }

  if (/\b(presupuesto|pressupost|catering|cliente|client)\b/.test(normalizado)) {
    return INTENCIONES_ASISTENTE.PRESUPUESTO;
  }

  return INTENCIONES_ASISTENTE.CONSULTA;
}

export async function prepararPropuestaAsistente({
  texto,
  clientes = [],
  productos = [],
} = {}) {
  if (!String(texto || "").trim()) {
    throw new Error("Escriu o dicta una ordre.");
  }

  const intencion = detectarIntencion(texto);

  if (intencion === INTENCIONES_ASISTENTE.PRESUPUESTO) {
    const datos = interpretarPedido(texto, { clientes, productos });

    return {
      intencion,
      titulo: "Proposta de pressupost",
      datos,
      puedeAplicarseAlPresupuesto: true,
      confirmacionNecesaria: true,
      advertencias: [
        "Revisa el client, la data, l'hora i tots els productes.",
        "En aplicar-la només s'omplirà el formulari; no es desarà automàticament.",
      ],
    };
  }

  return {
    intencion,
    titulo: "Ordre detectada",
    datos: { textoOriginal: texto },
    puedeAplicarseAlPresupuesto: false,
    confirmacionNecesaria: true,
    advertencias: [
      "Aquest mòdul ja està preparat, però encara no executarà l'acció.",
      "No s'ha modificat cap dada.",
    ],
  };
}
