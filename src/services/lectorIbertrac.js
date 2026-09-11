import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function fechaIso(valor = "") {
  const partes = valor.match(/(\d{2})\s*[/-]\s*(\d{2})\s*[/-]\s*(\d{2,4})/);
  if (!partes) return "";
  const anio = partes[3].length === 2 ? `20${partes[3]}` : partes[3];
  return `${anio}-${partes[2]}-${partes[1]}`;
}

function limpiar(valor = "") {
  return valor.replace(/\s+([,;:)])/g, "$1").replace(/([(])\s+/g, "$1").replace(/\s+/g, " ").trim();
}

function unir(items) {
  return limpiar(items.sort((a, b) => a.x - b.x).map((item) => item.texto).join(" "));
}

function agruparLineas(items) {
  const lineas = [];
  for (const item of [...items].sort((a, b) => a.top - b.top || a.x - b.x)) {
    let linea = lineas.find((fila) => Math.abs(fila.top - item.top) <= 2.5);
    if (!linea) { linea = { top: item.top, items: [] }; lineas.push(linea); }
    linea.items.push(item);
  }
  return lineas.sort((a, b) => a.top - b.top).map((linea) => ({ ...linea, texto: unir(linea.items) }));
}

function nombreCorto(nombre) {
  return limpiar(nombre.split("(")[0]).replace(/\s*-\s*$/, "");
}

function extraerProductos(items, lineas) {
  const cabecera = lineas.find((linea) => /PRODUCTES?\s+UTILITZATS/i.test(linea.texto));
  if (!cabecera) return [];
  const fin = lineas.find((linea) => linea.top > cabecera.top && /INCID[ÈE]NCIES|Nom i signatura/i.test(linea.texto));
  const desde = cabecera.top + 25;
  const hasta = fin?.top ?? Math.max(...items.map((item) => item.top));
  const zonaTabla = items.filter((item) => item.top >= desde && item.top < hasta);
  const lineasTabla = agruparLineas(zonaTabla);
  const inicios = [];

  for (const linea of lineasTabla) {
    const izquierda = unir(linea.items.filter((item) => item.x < 200));
    if (!izquierda || /^(Nom comercial|DDD Serveis de Control de Plagues)$/i.test(izquierda)) continue;
    const anterior = inicios.at(-1);
    if (anterior && linea.top - anterior.ultimaLinea <= 10) {
      anterior.nombre = limpiar(`${anterior.nombre} ${izquierda}`);
      anterior.ultimaLinea = linea.top;
    } else {
      inicios.push({ top: linea.top, ultimaLinea: linea.top, nombre: izquierda });
    }
  }

  return inicios.map((inicio, indice) => {
    const anterior = inicios[indice - 1];
    const siguiente = inicios[indice + 1];
    const limiteAnterior = anterior ? (anterior.top + inicio.top) / 2 : desde;
    const limiteSiguiente = siguiente ? (inicio.top + siguiente.top) / 2 : hasta;
    const fila = zonaTabla.filter((item) => item.top >= limiteAnterior && item.top < limiteSiguiente);
    const registro = unir(fila.filter((item) => item.x >= 200 && item.x < 265));
    const consumo = unir(fila.filter((item) => item.x >= 415 && item.x < 450));
    const zona = unir(fila.filter((item) => item.x >= 450 && item.x < 525));
    const lote = unir(fila.filter((item) => item.x >= 520));
    const nombre = limpiar(inicio.nombre);
    const registroLimpio = /no procede/i.test(registro) ? "No procede" : registro;
    return {
      nombre,
      nombre_corto: nombreCorto(nombre),
      numero_registro: registroLimpio,
      consumo,
      zona,
      lote,
      requiere_ficha_biocida: Boolean(registroLimpio && registroLimpio !== "No procede"),
    };
  }).filter((producto) => producto.nombre_corto);
}

export async function leerIbertracPdf(archivo) {
  const documento = await pdfjsLib.getDocument({ data: await archivo.arrayBuffer() }).promise;
  const paginas = [];
  for (let numero = 1; numero <= documento.numPages; numero += 1) {
    const pagina = await documento.getPage(numero);
    const viewport = pagina.getViewport({ scale: 1 });
    const contenido = await pagina.getTextContent();
    const items = contenido.items.filter((item) => item.str?.trim()).map((item) => ({ texto: item.str.trim(), x: item.transform[4], top: viewport.height - item.transform[5] }));
    paginas.push({ items, lineas: agruparLineas(items) });
  }

  const texto = paginas.flatMap((pagina) => pagina.lineas.map((linea) => linea.texto)).join("\n");
  const productos = paginas.flatMap((pagina) => extraerProductos(pagina.items, pagina.lineas));
  const numero = texto.match(/Certificat de servei n[uú]m\.\s*(\d+)/i)?.[1] || "";
  const fechaTexto = texto.match(/Data d'execuci[oó]:\s*(\d{2}\s*[/-]\s*\d{2}\s*[/-]\s*\d{2,4})/i)?.[1] || "";
  const contrato = texto.match(/Contracte n[uú]m\.:?\s*([^\s.]+(?:-\d+)?)/i)?.[1] || "";
  const tecnico = texto.match(/TRAMS HORARIS[\s\S]{0,100}?\n\s*([^:\n]+):\s*\d{2}[/-]/i)?.[1]?.trim() || "";
  const riesgo = texto.match(/RISC D'INFESTACI[ÓO]:\s*([^\n]+)/i)?.[1]?.trim() || "";
  const incidencia = texto.match(/INCID[ÈE]NCIES:\s*([^\n]+)/i)?.[1]?.trim() || "";
  const observaciones = [
    contrato && `Contrato: ${contrato}`,
    tecnico && `Técnico/a: ${tecnico}`,
    riesgo && `Riesgo de infestación: ${riesgo}`,
    incidencia && `Incidencias: ${incidencia}`,
  ].filter(Boolean).join(" · ");

  // IMPORTANTE: este lector también se ejecuta al adjuntar fichas técnicas,
  // fichas de seguridad, registros sanitarios y etiquetajes. No devolvemos
  // nunca "tipo: parte", porque eso sobrescribía el tipo elegido en la tarjeta
  // y hacía que el documento quedara guardado como parte de servicio.
  // Tampoco ponemos un título genérico si no hemos identificado de verdad un
  // certificado de servicio. Así se conserva el producto/tipo/título que ya
  // fijó la tarjeta desde la que el usuario pulsó "Subir".
  const esCertificadoServicio = Boolean(
    numero ||
    productos.length ||
    /Certificat de servei|PRODUCTES?\s+UTILITZATS|Data d'execuci[oó]/i.test(texto),
  );

  return {
    fecha_documento: esCertificadoServicio ? fechaIso(fechaTexto) : "",
    titulo: esCertificadoServicio && numero ? `Certificado de servicio ${numero}` : "",
    numero_documento: esCertificadoServicio ? numero : "",
    producto: esCertificadoServicio
      ? productos.map((producto) => producto.nombre_corto).join("; ")
      : "",
    numero_registro: esCertificadoServicio
      ? productos
          .filter((producto) => producto.numero_registro && producto.numero_registro !== "No procede")
          .map((producto) => producto.numero_registro)
          .join("; ")
      : "",
    zona_aplicacion: esCertificadoServicio
      ? [...new Set(productos.map((producto) => producto.zona).filter(Boolean))].join("; ")
      : "",
    observaciones: esCertificadoServicio ? observaciones : "",
    productos_detectados: esCertificadoServicio ? productos : [],
  };
}

export function normalizarProducto(valor = "") {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(ficha|fitxa|tecnica|tecnica|seguridad|seguretat|registro|sanitario|sanitaria|etiquetaje|etiquetatge|producto|producte)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
