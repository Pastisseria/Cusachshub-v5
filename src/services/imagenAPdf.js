const encoder = new TextEncoder();

function bytes(texto) {
  return encoder.encode(texto);
}

function unir(partes) {
  const total = partes.reduce((suma, parte) => suma + parte.length, 0);
  const resultado = new Uint8Array(total);
  let posicion = 0;
  partes.forEach((parte) => { resultado.set(parte, posicion); posicion += parte.length; });
  return resultado;
}

async function convertirAJpeg(archivo) {
  if (archivo.type === "image/jpeg") {
    const imagen = await createImageBitmap(archivo);
    const datos = new Uint8Array(await archivo.arrayBuffer());
    return { datos, ancho: imagen.width, alto: imagen.height };
  }
  const imagen = await createImageBitmap(archivo);
  const lienzo = document.createElement("canvas");
  lienzo.width = imagen.width;
  lienzo.height = imagen.height;
  const contexto = lienzo.getContext("2d");
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, lienzo.width, lienzo.height);
  contexto.drawImage(imagen, 0, 0);
  const blob = await new Promise((resolve) => lienzo.toBlob(resolve, "image/jpeg", 0.92));
  return { datos: new Uint8Array(await blob.arrayBuffer()), ancho: imagen.width, alto: imagen.height };
}

export async function imagenAPdf(archivo) {
  if (archivo.type === "application/pdf" || /\.pdf$/i.test(archivo.name)) return archivo;
  if (!archivo.type.startsWith("image/")) throw new Error("El archivo no es una imagen o un PDF.");
  const { datos, ancho, alto } = await convertirAJpeg(archivo);
  const vertical = alto >= ancho;
  const paginaAncho = vertical ? 595.28 : 841.89;
  const paginaAlto = vertical ? 841.89 : 595.28;
  const margen = 18;
  const escala = Math.min((paginaAncho - margen * 2) / ancho, (paginaAlto - margen * 2) / alto);
  const imagenAncho = ancho * escala;
  const imagenAlto = alto * escala;
  const x = (paginaAncho - imagenAncho) / 2;
  const y = (paginaAlto - imagenAlto) / 2;
  const contenido = `q ${imagenAncho.toFixed(2)} 0 0 ${imagenAlto.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`;
  const objetos = [
    bytes("<< /Type /Catalog /Pages 2 0 R >>"),
    bytes("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${paginaAncho.toFixed(2)} ${paginaAlto.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
    unir([bytes(`<< /Type /XObject /Subtype /Image /Width ${ancho} /Height ${alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${datos.length} >>\nstream\n`), datos, bytes("\nendstream")]),
    bytes(`<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`),
  ];
  const partes = [bytes("%PDF-1.4\n%âãÏÓ\n")];
  const posiciones = [0];
  objetos.forEach((objeto, indice) => {
    posiciones.push(partes.reduce((suma, parte) => suma + parte.length, 0));
    partes.push(bytes(`${indice + 1} 0 obj\n`), objeto, bytes("\nendobj\n"));
  });
  const xref = partes.reduce((suma, parte) => suma + parte.length, 0);
  partes.push(bytes(`xref\n0 6\n0000000000 65535 f \n${posiciones.slice(1).map((posicion) => `${String(posicion).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  const nombre = archivo.name.replace(/\.[^.]+$/, "") + ".pdf";
  return new File([unir(partes)], nombre, { type: "application/pdf" });
}
