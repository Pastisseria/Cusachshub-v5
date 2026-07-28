export function prepararRevisionAlbaran(datos = {}) {
  return {
    proveedor: datos.proveedor || "",
    numero: datos.numero || "",
    fecha: datos.fecha || "",
    lineas: Array.isArray(datos.lineas) ? datos.lineas : [],
    subtotal: Number(datos.subtotal || 0),
    iva: Number(datos.iva || 0),
    total: Number(datos.total || 0),
    confirmacionNecesaria: true,
    advertencias: [
      "Revisa tots els camps abans de desar.",
      "No s'ha modificat el catàleg, les compres ni l'estoc.",
    ],
  };
}
