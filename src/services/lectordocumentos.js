import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function esImagen(archivo) {
  return ["image/jpeg", "image/png", "image/webp"].includes(archivo.type);
}

function esPdf(archivo) {
  return archivo.type === "application/pdf";
}

async function crearWorkerOCR(onProgress) {
  return createWorker("spa+cat+eng", 1, {
    logger: (mensaje) => {
      if (
        mensaje.status === "recognizing text" &&
        typeof mensaje.progress === "number"
      ) {
        onProgress?.({
          estado: "Reconociendo texto",
          progreso: Math.round(mensaje.progress * 100),
        });
      }
    },
  });
}

async function leerImagen(archivo, worker, onProgress) {
  onProgress?.({
    estado: "Preparando imagen",
    progreso: 5,
  });

  const url = URL.createObjectURL(archivo);

  try {
    const resultado = await worker.recognize(url);
    return resultado.data.text || "";
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function convertirPaginaEnCanvas(pagina, escala = 2) {
  const viewport = pagina.getViewport({ scale: escala });

  const canvas = document.createElement("canvas");
  const contexto = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await pagina.render({
    canvasContext: contexto,
    viewport,
  }).promise;

  return canvas;
}

async function leerPdf(archivo, worker, onProgress) {
  const buffer = await archivo.arrayBuffer();

  const documento = await pdfjsLib.getDocument({
    data: buffer,
  }).promise;

  const textos = [];

  for (
    let numeroPagina = 1;
    numeroPagina <= documento.numPages;
    numeroPagina += 1
  ) {
    onProgress?.({
      estado: `Llegint pàgina ${numeroPagina} de ${documento.numPages}`,
      progreso: Math.round(
        ((numeroPagina - 1) / documento.numPages) * 100
      ),
    });

    const pagina = await documento.getPage(numeroPagina);

    /*
      Primer intentem extreure el text real del PDF.
      Això és molt més ràpid que fer OCR.
    */
    const contenido = await pagina.getTextContent();

    const textoDirecto = contenido.items
      .map((elemento) => elemento.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (textoDirecto.length > 40) {
      textos.push(textoDirecto);
      continue;
    }

    /*
      Si és un PDF escanejat o una fotografia,
      convertim la pàgina en imatge i fem OCR.
    */
    const canvas = await convertirPaginaEnCanvas(pagina, 2);

    const resultadoOCR = await worker.recognize(canvas);

    textos.push(resultadoOCR.data.text || "");
  }

  return textos.join("\n\n");
}

export async function leerDocumento(archivo, onProgress) {
  if (!archivo) {
    throw new Error("No s'ha seleccionat cap arxiu.");
  }

  const formatosPermitidos = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!formatosPermitidos.includes(archivo.type)) {
    throw new Error(
      "Format no compatible. Utilitza PDF, JPG, JPEG, PNG o WEBP."
    );
  }

  let worker;

  try {
    onProgress?.({
      estado: "Carregant lector OCR",
      progreso: 0,
    });

    worker = await crearWorkerOCR(onProgress);

    let texto = "";

    if (esPdf(archivo)) {
      texto = await leerPdf(archivo, worker, onProgress);
    } else if (esImagen(archivo)) {
      texto = await leerImagen(archivo, worker, onProgress);
    }

    const textoLimpio = texto
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!textoLimpio) {
      throw new Error(
        "No s'ha pogut reconèixer text. Prova amb una fotografia més clara."
      );
    }

    onProgress?.({
      estado: "Document llegit",
      progreso: 100,
    });

    return textoLimpio;
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}