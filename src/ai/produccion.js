export async function prepararPropuestaProduccion({
  supabase,
  fecha,
} = {}) {
  if (!supabase) throw new Error("Falta la connexió amb Supabase.");
  if (!fecha) throw new Error("Indica la data de producció.");

  const { data: presupuestos, error } = await supabase
    .from("presupuestos")
    .select("id, numero, fecha, estado, cliente_id")
    .eq("fecha", fecha)
    .eq("estado", "Aceptado");

  if (error) throw error;

  const ids = (presupuestos || []).map((documento) => documento.id);
  if (!ids.length) {
    return { fecha, presupuestos: [], productos: [], advertencias: [] };
  }

  const { data: lineas, error: errorLineas } = await supabase
    .from("presupuesto_lineas")
    .select("presupuesto_id, producto_id, descripcion, cantidad")
    .in("presupuesto_id", ids);

  if (errorLineas) throw errorLineas;

  const mapa = new Map();
  for (const linea of lineas || []) {
    const clave = linea.producto_id || `manual:${linea.descripcion}`;
    const anterior = mapa.get(clave) || {
      producto_id: linea.producto_id || null,
      descripcion: linea.descripcion,
      cantidad: 0,
    };
    anterior.cantidad += Number(linea.cantidad || 0);
    mapa.set(clave, anterior);
  }

  return {
    fecha,
    presupuestos,
    productos: [...mapa.values()],
    advertencias: [
      "Proposta pendent de revisió. No s'ha creat cap ordre de producció.",
    ],
  };
}
