import { leerDocumento, leerZonaInferiorDocumento } from "./lectordocumentos.js";

const PROVEEDORES = [[/(arcon\s*food|artesania\s+congelada)/i, "Artesania congelada"], [/bon\s+llevat/i, "Bon Llevat"], [/calidulce/i, "Calidulce"], [/discer/i, "Discer"], [/ken\s+foods?/i, "Ken Foods"]];
const extraer = (texto, expresion) => String(texto.match(expresion)?.[1] || "").replace(/[|_[\]]/g, "").trim();

function fechaIso(texto) {
  const coincidencias = [...texto.matchAll(/\b([0-3]?\d)[\/.\-]([01]?\d)[\/.\-](20\d{2}|\d{2})\b/g)];
  if (!coincidencias.length) return "";
  const control = coincidencias.find((m) => /control|recep/i.test(texto.slice(Math.max(0, m.index - 100), m.index))) || coincidencias[0];
  const [, dia, mes, anio] = control;
  return `${anio.length === 2 ? `20${anio}` : anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

export async function leerControlRecepcion(archivo, onProgreso) {
  const texto = await leerDocumento(archivo, onProgreso);
  let textoSello = "";
  let normalizado = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let selloDetectado = /control\s+en\s+la\s+recep/i.test(normalizado);
  if (!selloDetectado) {
    textoSello = await leerZonaInferiorDocumento(archivo, onProgreso);
    const zona = textoSello.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const mencionaRecepcion = /recepci[o0]|recep(?:ci|c1|cl)[o0]/i.test(zona);
    const contieneCampos = /(respons|temperatura|envase|embal|caduc|etiqu|aspect|transport|acept|accept|devol|\bcor\b|\binc\b)/i.test(zona);
    selloDetectado = mencionaRecepcion && contieneCampos;
    normalizado = `${normalizado}\n${zona}`;
  }
  const proveedor = PROVEEDORES.find(([patron]) => patron.test(normalizado))?.[1] || "";
  const hora = extraer(normalizado, /hora\s*[:.]?\s*([0-2]?\d(?:[:h.]\d{0,2})?)/i).replace(/[h.]/i, ":").replace(/:$/, ":00");
  const responsableLeido = extraer(normalizado, /responsable(?:\s+de)?\s+recep(?:cio|cion)?\s*[:.]?\s*([^\n]{2,28})/i).replace(/\b(temperatura|cor|inc).*$/i, "").trim();
  const responsable = responsableLeido || (selloDetectado ? "Obrador" : "");
  const temperaturaTexto = extraer(normalizado, /temperatura\s*[:.]?\s*(-?\d+(?:[,.]\d+)?)\s*(?:o|°)?c/i).replace(",", ".");
  return { texto, texto_sello: textoSello, sello_detectado: selloDetectado, fecha_recepcion: fechaIso(normalizado), hora_recepcion: /^\d{1,2}:\d{2}$/.test(hora) ? hora.padStart(5, "0") : "", proveedor, responsable_recepcion: responsable, temperatura: temperaturaTexto === "" ? null : Number(temperaturaTexto), estado_revision: selloDetectado ? "conforme" : "pendiente", controles: selloDetectado ? { temperatura_estado: "conforme", embalaje: "conforme", caducidad_etiquetado: "conforme", lote_etiquetado: "conforme", aspecto_producto: "conforme", transporte: "conforme" } : {} };
}
