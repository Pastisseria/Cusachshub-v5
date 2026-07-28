export async function consultarStock({ supabase, productoIds = [] } = {}) {
  if (!supabase) throw new Error("Falta la connexió amb Supabase.");
  if (!productoIds.length) return [];

  const { data, error } = await supabase
    .from("stock")
    .select("*")
    .in("producto_id", productoIds);

  if (error) throw error;
  return data || [];
}

export function calcularStockPrevisto({ stockActual = 0, entradas = 0, salidas = 0 }) {
  return Number(stockActual || 0) + Number(entradas || 0) - Number(salidas || 0);
}
