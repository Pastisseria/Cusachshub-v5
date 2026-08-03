import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const IDIOMA_OCR = "spa";
const MAX_PAGINAS_PDF = 12;

function notificar(onProgreso, estado, progreso) {
  if (typeof onProgreso === "function") {
    onProgreso({ estado, progreso: Math.max(0, Math.min(100, progreso)) });
  }
}

function esPdf(archivo) {
  return archivo?.type === "application/pdf" || /\.pdf$/i.test(archivo?.name || "");
}

function esImagen(archivo) {
  return archivo?.type?.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(archivo?.name || "");
}

function limpiarTextoOCR(texto = "") {
  return String(texto)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function crearWorker(onProgreso, progresoInicial = 0, progresoFinal = 100) {
  return createWorker(IDIOMA_OCR, 1, {
    logger: (mensaje) => {
      if (mensaje?.status === "recognizing text") {
        const tramo = progresoFinal - progresoInicial;
        const avance = progresoInicial + tramo * Number(mensaje.progress || 0);
        notificar(onProgreso, "Reconociendo texto", avance);
      }
    },
  });
}

async function leerImagen(archivo, onProgreso) {
  notificar(onProgreso, "Preparando fotografía", 5);
  const worker = await crearWorker(onProgreso, 10, 95);

  try {
    const { data } = await worker.recognize(archivo);
    notificar(onProgreso, "Fotografía leída", 100);
    return limpiarTextoOCR(data?.text || "");
  } finally {
    await worker.terminate();
  }
}

async function extraerTextoNativoPdf(pdf, onProgreso) {
  const paginas = Math.min(pdf.numPages, MAX_PAGINAS_PDF);
  const bloques = [];

  for (let paginaNumero = 1; paginaNumero <= paginas; paginaNumero += 1) {
    notificar(
      onProgreso,
      `Leyendo texto del PDF (${paginaNumero}/${paginas})`,
      5 + (paginaNumero / paginas) * 35,
    );

    const pagina = await pdf.getPage(paginaNumero);
    const contenido = await pagina.getTextContent();
    const textoPagina = contenido.items
      .map((item) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (textoPagina) bloques.push(textoPagina);
  }

  return limpiarTextoOCR(bloques.join("\n"));
}

async function renderizarPagina(pagina, escala = 2) {
  const viewport = pagina.getViewport({ scale: escala });
  const canvas = document.createElement("canvas");
  const contexto = canvas.getContext("2d", { willReadFrequently: true });

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await pagina.render({ canvasContext: contexto, viewport }).promise;
  return canvas;
}

async function leerPdfPorOCR(pdf, onProgreso) {
  const paginas = Math.min(pdf.numPages, MAX_PAGINAS_PDF);
  const worker = await crearWorker(onProgreso, 45, 95);
  const bloques = [];

  try {
    for (let paginaNumero = 1; paginaNumero <= paginas; paginaNumero += 1) {
      const inicio = 45 + ((paginaNumero - 1) / paginas) * 50;
      const fin = 45 + (paginaNumero / paginas) * 50;

      notificar(onProgreso, `Escaneando página ${paginaNumero}/${paginas}`, inicio);
      const pagina = await pdf.getPage(paginaNumero);
      const canvas = await renderizarPagina(pagina, 2.1);
      const { data } = await worker.recognize(canvas);
      const textoPagina = limpiarTextoOCR(data?.text || "");
      if (textoPagina) bloques.push(textoPagina);
      notificar(onProgreso, `Página ${paginaNumero} leída`, fin);
    }
  } finally {
    await worker.terminate();
  }

  return limpiarTextoOCR(bloques.join("\n"));
}

async function leerPdf(archivo, onProgreso) {
  notificar(onProgreso, "Abriendo PDF", 3);
  const buffer = await archivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const textoNativo = await extraerTextoNativoPdf(pdf, onProgreso);
  const caracteresUtiles = textoNativo.replace(/\s/g, "").length;

  if (caracteresUtiles >= 80) {
    notificar(onProgreso, "PDF leído", 100);
    return textoNativo;
  }

  notificar(onProgreso, "El PDF es una imagen; iniciando OCR", 42);
  const textoOCR = await leerPdfPorOCR(pdf, onProgreso);
  notificar(onProgreso, "PDF leído", 100);
  return textoOCR;
}

export async function leerDocumento(archivo, onProgreso) {
  if (!archivo) throw new Error("No se ha seleccionado ningún documento.");

  const limiteMb = 20;
  if (archivo.size > limiteMb * 1024 * 1024) {
    throw new Error(`El archivo supera el límite de ${limiteMb} MB.`);
  }

  if (esPdf(archivo)) return leerPdf(archivo, onProgreso);
  if (esImagen(archivo)) return leerImagen(archivo, onProgreso);

  throw new Error("Formato no admitido. Utiliza PDF, JPG, PNG o WEBP.");
}
