import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
const limpiar = (texto) => String(texto || "").replace(/\s+/g, " ").trim();
function seccion(texto, inicio, finales) { const desde = texto.search(inicio); if (desde < 0) return ""; const resto = texto.slice(desde).replace(inicio, ""); const posiciones = finales.map((x) => resto.search(x)).filter((x) => x >= 0); return limpiar(resto.slice(0, posiciones.length ? Math.min(...posiciones) : resto.length)); }
export async function leerFichaTecnicaPdf(archivo, onProgreso) {
  const pdf = await pdfjsLib.getDocument({ data: await archivo.arrayBuffer() }).promise, paginas = [];
  for (let i = 1; i <= pdf.numPages; i += 1) { const p = await pdf.getPage(i); const c = await p.getTextContent(); paginas.push(c.items.map((x) => x.str).join(" ")); onProgreso?.(Math.round(i / pdf.numPages * 100)); }
  const texto = limpiar(paginas.join(" "));
  const descripcion = seccion(texto, /DESCRIPCI[ÓO]N DEL PRODUCTO/i, [/PROPIEDADES F[IÍ]SICO/i, /CARACTER[IÍ]STICAS/i]);
  const instrucciones = seccion(texto, /INSTRUCCIONES DE USO/i, [/NORMAS DE MANIPULACI[ÓO]N/i]);
  const manipulacion = seccion(texto, /NORMAS DE MANIPULACI[ÓO]N/i, [/La informaci[óo]n aqu[ií] contenida/i]);
  const nombre = texto.match(/FICHA T[ÉE]CNICA\s+(?:\d{2}\/\d{4}\s+)?(.+?)\s+DESCRIPCI[ÓO]N DEL PRODUCTO/i)?.[1] || archivo.name.replace(/\.pdf$/i, "").replace(/^\d+\s*/, "").replace(/[_+]+/g, " ");
  const revision = texto.match(/FICHA T[ÉE]CNICA\s+(\d{2})\/(\d{4})/i);
  const dosis = instrucciones.match(/(?:dosis|dosificaci[óo]n)[^.;]*(?:\.|;|$)/i)?.[0] || instrucciones;
  return { nombre: limpiar(nombre), marca: /PROQUIMIA/i.test(texto) ? "PROQUIMIA" : "", proveedor: /PROQUIMIA/i.test(texto) ? "PROQUIMIA, S.A." : "", uso: descripcion.slice(0, 700), dilucion: limpiar(dosis).slice(0, 700), peligros: manipulacion.slice(0, 700), fecha_revision: revision ? `${revision[2]}-${revision[1]}-01` : new Date().toISOString().slice(0, 10) };
}
