import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const VINO = rgb(0.34, 0.08, 0.18);
const NEGRO = rgb(0.08, 0.08, 0.08);
const BLANCO = rgb(1, 1, 1);
const limpio = (valor) => String(valor ?? "").trim();
const marca = (valor, esperado) => valor === esperado ? "X" : "";

function ajustar(valor, maximo, fuente, tamano) {
  let resultado = limpio(valor);
  while (resultado.length && fuente.widthOfTextAtSize(resultado, tamano) > maximo) resultado = resultado.slice(0, -1);
  return resultado;
}

export async function crearPdfConSello(pdfOriginal, control) {
  const documento = await PDFDocument.load(await pdfOriginal.arrayBuffer());
  const pagina = documento.getPages()[0];
  const normal = await documento.embedFont(StandardFonts.Helvetica);
  const negrita = await documento.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = pagina.getSize();
  const ancho = Math.min(300, width - 36);
  const alto = 184;
  const margen = 18;
  const x = control.posicion_sello.includes("derecha") ? width - ancho - margen : margen;
  const y = control.posicion_sello.includes("arriba") ? height - alto - margen : margen;
  const fila = 18;

  pagina.drawRectangle({ x, y, width: ancho, height: alto, color: BLANCO, borderColor: VINO, borderWidth: 1.4, opacity: 0.96 });
  pagina.drawRectangle({ x, y: y + alto - 28, width: ancho, height: 28, color: VINO });
  pagina.drawText("CONTROL EN LA RECEPCIÓN", { x: x + 38, y: y + alto - 19, size: 12, font: negrita, color: BLANCO });

  const linea = (indice, etiqueta, valor = "") => {
    const fy = y + alto - 47 - indice * fila;
    pagina.drawLine({ start: { x, y: fy - 5 }, end: { x: x + ancho, y: fy - 5 }, thickness: 0.55, color: VINO });
    pagina.drawText(etiqueta, { x: x + 7, y: fy, size: 7.5, font: negrita, color: NEGRO });
    if (valor) pagina.drawText(ajustar(valor, ancho - 112, normal, 8), { x: x + 108, y: fy, size: 8, font: normal, color: NEGRO });
    return fy;
  };

  let fy = linea(0, "FECHA:", control.fecha_recepcion ? control.fecha_recepcion.split("-").reverse().join("/") : "");
  pagina.drawText("HORA:", { x: x + ancho / 2, y: fy, size: 7.5, font: negrita, color: NEGRO });
  pagina.drawText(limpio(control.hora_recepcion).slice(0, 5), { x: x + ancho / 2 + 38, y: fy, size: 8, font: normal, color: NEGRO });
  linea(1, "Responsable recepción:", control.responsable_recepcion);

  const controles = control.controles || {};
  const filas = [
    ["Temperatura:", control.temperatura === "" || control.temperatura == null ? "" : `${control.temperatura} °C`, controles.temperatura_estado],
    ["Envase / Embalaje:", "", controles.embalaje],
    ["Caducidad / Etiquetado:", "", controles.caducidad_etiquetado],
    ["Lote / Etiquetado:", "", controles.lote_etiquetado],
    ["Aspecto del producto:", "", controles.aspecto_producto],
    ["Estado del transporte:", "", controles.transporte],
  ];
  filas.forEach(([etiqueta, valor, estado], indice) => {
    fy = linea(indice + 2, etiqueta, valor);
    pagina.drawText(`[${marca(estado, "conforme")}] Cor.`, { x: x + ancho - 88, y: fy, size: 7.5, font: normal, color: NEGRO });
    pagina.drawText(`[${marca(estado, "no_conforme")}] Inc.`, { x: x + ancho - 44, y: fy, size: 7.5, font: normal, color: NEGRO });
  });
  pagina.drawText(`[${control.estado_revision === "conforme" ? "X" : ""}] Aceptación`, { x: x + 8, y: y + 7, size: 8, font: negrita, color: NEGRO });
  pagina.drawText(`[${control.estado_revision === "incidencia" ? "X" : ""}] Devolución`, { x: x + ancho - 94, y: y + 7, size: 8, font: negrita, color: NEGRO });

  const bytes = await documento.save();
  return new File([bytes], `${pdfOriginal.name.replace(/\.pdf$/i, "")}-control-recepcion.pdf`, { type: "application/pdf" });
}
