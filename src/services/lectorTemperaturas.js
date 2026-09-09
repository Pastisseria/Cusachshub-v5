import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const MESES = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function numero(valor) {
  const n = Number(String(valor ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function fechaIso(valor) {
  const m = String(valor || "").match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})\s+(\d{2}:\d{2}:\d{2})/);
  if (!m || MESES[m[2]] === undefined) return null;
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return new Date(Date.UTC(year, MESES[m[2]], Number(m[1]), ...m[4].split(":").map(Number))).toISOString();
}

function buscar(texto, expresion) {
  return texto.match(expresion)?.[1]?.trim() || "";
}

export async function leerPdfTemperaturas(archivo, onProgreso) {
  if (!archivo || archivo.type !== "application/pdf") throw new Error("Selecciona un archivo PDF.");
  const bytes = await archivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const paginas = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    onProgreso?.(Math.round((i / pdf.numPages) * 90));
    const pagina = await pdf.getPage(i);
    const contenido = await pagina.getTextContent();
    paginas.push(contenido.items.map((item) => item.str).join(" "));
  }
  const texto = paginas.join("\n").replace(/\s+/g, " ");
  const inicio = buscar(texto, /Start Time:\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{2,4}\s+[0-9:]{8})/i);
  const fin = buscar(texto, /Stop Time:\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{2,4}\s+[0-9:]{8})/i);
  const nombreSugerido = archivo.name.replace(/\.pdf$/i, "").replace(/^TMM\d+[_ -]*/i, "").replace(/[_-]+/g, " ").trim();
  onProgreso?.(100);
  return {
    numero_serie: buscar(texto, /Serial Number:\s*([A-Z0-9-]+)/i),
    nombre_ubicacion: nombreSugerido || "Sin identificar",
    intervalo: buscar(texto, /Log Interval:\s*([0-9HMS ]+)/i),
    fecha_inicio: fechaIso(inicio),
    fecha_fin: fechaIso(fin),
    temperatura_maxima: numero(buscar(texto, /Highest Temperature:\s*(-?[0-9.,]+)/i)),
    temperatura_minima: numero(buscar(texto, /Lowest Temperature:\s*(-?[0-9.,]+)/i)),
    temperatura_media: numero(buscar(texto, /Average Temperature:\s*(-?[0-9.,]+)/i)),
    numero_registros: numero(buscar(texto, /Data Points:\s*([0-9]+)/i)),
    archivo_nombre: archivo.name,
  };
}
