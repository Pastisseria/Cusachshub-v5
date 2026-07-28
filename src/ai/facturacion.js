export function prepararVistaPreviaFactura(documento, lineas = []) {
  if (!documento) throw new Error("No hi ha cap pressupost seleccionat.");

  return {
    presupuesto_id: documento.id,
    numero_presupuesto: documento.numero,
    cliente_id: documento.cliente_id || null,
    cliente:
      documento.clientes?.empresa ||
      documento.clientes?.nombre ||
      documento.visitador_nombre ||
      "Client",
    fecha: new Date().toISOString().slice(0, 10),
    subtotal: Number(documento.subtotal || 0),
    iva_total: Number(documento.iva_total || 0),
    total: Number(documento.total || 0),
    lineas,
    confirmacionNecesaria: true,
    mensaje: "La factura encara no s'ha creat.",
  };
}
