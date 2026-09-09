import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const limpiar = (valor) => String(valor || "").replace(/\s+/g, " ").trim();
const fechaIso = (texto) => {
  const partes = texto?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : "";
};
const numero = (texto) => {
  let limpio = String(texto || "").trim();
  const ultimaComa = limpio.lastIndexOf(",");
  const ultimoPunto = limpio.lastIndexOf(".");
  if (ultimaComa > ultimoPunto) limpio = limpio.replace(/\./g, "").replace(",", ".");
  else if (ultimoPunto > ultimaComa) limpio = limpio.replace(/,/g, "");
  const valor = Number(limpio);
  return Number.isFinite(valor) ? Math.abs(valor) : "";
};

export async function leerRecogidaAceitePdf(archivo) {
  const documento = await pdfjsLib.getDocument({ data: await archivo.arrayBuffer() }).promise;
  const paginas = [];
  for (let pagina = 1; pagina <= documento.numPages; pagina += 1) {
    const contenido = await (await documento.getPage(pagina)).getTextContent();
    paginas.push(contenido.items.map((item) => item.str).join(" "));
  }
  const texto = limpiar(paginas.join(" "));
  const albaran = texto.match(/N[uú]mero de albar[aá]n(?: de (?:entrega|recogida))?\s*:?\s*(\d+)/i)?.[1] || "";
  const factura = texto.match(/N[uú]mero de factura\s*:?\s*([\d-]+)/i)?.[1] || "";
  const fechas = [...texto.matchAll(/\b(\d{2}\/\d{2}\/\d{4})\b/g)].map((m) => m[1]);
  const cantidad = numero(texto.match(/Aceite vegetal usado(?:\s+LER\s+20\s+01\s+25)?\s+(-?[\d.,]+)/i)?.[1]) ||
    numero(texto.match(/Cantidad(?: Aceptada)?\s*\(kg\)\s*:?\s*(-?[\d.,]+)/i)?.[1]);
  const importe = numero(texto.match(/Reembolso de aceite usado\s+(-?[\d.,]+)/i)?.[1]);
  return {
    fecha_recogida: fechaIso(texto.match(/Fecha de recogida\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1]) || fechaIso(fechas[0]),
    gestor: /Olleco Bunge/i.test(texto) ? "Olleco Bunge IB, S.L." : "",
    numero_documento: albaran || factura,
    numero_factura: factura,
    cantidad_kg: cantidad,
    importe,
    codigo_residuo: "20 01 25",
  };
}
