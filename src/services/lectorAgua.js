import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
const iso = (v) => { const m = v?.match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
const num = (v) => { const n = Number(String(v || "").replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) ? n : ""; };
export async function leerFacturaAguaPdf(archivo) {
  const doc = await pdfjsLib.getDocument({ data: await archivo.arrayBuffer() }).promise; const partes = [];
  for (let i = 1; i <= doc.numPages; i += 1) { const c = await (await doc.getPage(i)).getTextContent(); partes.push(c.items.map((x) => x.str).join(" ")); }
  const texto = partes.join(" ").replace(/\s+/g, " "); const fechas = [...texto.matchAll(/\b\d{2}[\/-]\d{2}[\/-]\d{4}\b/g)].map((m) => m[0]);
  return { proveedor: /aigües de barcelona/i.test(texto) ? "Aigües de Barcelona" : "", numero_factura: texto.match(/(?:n[uú]m(?:ero)?\.?\s*(?:de)?\s*factura|factura\s*n[uú]m\.?)\s*:?\s*([A-Z0-9\/-]+)/i)?.[1] || "", fecha_factura: iso(texto.match(/fecha\s+(?:de\s+)?factura\s*:?\s*(\d{2}[\/-]\d{2}[\/-]\d{4})/i)?.[1]) || iso(fechas[0]), periodo_desde: iso(fechas[1]), periodo_hasta: iso(fechas[2]), consumo_m3: num(texto.match(/(?:consumo|total consumido)[^\d]{0,20}([\d.,]+)\s*m[³3]/i)?.[1]), importe_total: num(texto.match(/(?:total(?:\s+factura)?|importe total)\s*:?\s*([\d.,]+)\s*€/i)?.[1]) };
}
