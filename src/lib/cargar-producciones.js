// Fetch every page: a single SELECT can silently stop at the API's row limit.
export async function cargarProduccionesCompletas(supabase, { desde, hasta } = {}) {
  const data = [];
  const tamanoPagina = 500;
  while (true) {
    let consulta = supabase.from("producciones").select("*", { count: "exact" });
    if (desde) consulta = consulta.gte("fecha", desde);
    if (hasta) consulta = consulta.lte("fecha", hasta);
    const respuesta = await consulta
      .order("fecha", { ascending: true })
      .order("hora_limite", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(data.length, data.length + tamanoPagina - 1);
    if (respuesta.error) return { data: null, error: respuesta.error };
    const pagina = respuesta.data || [];
    data.push(...pagina);
    if (respuesta.count != null && data.length >= respuesta.count) break;
    if (pagina.length === 0) {
      if (respuesta.count != null && data.length < respuesta.count) {
        return { data: null, error: new Error("No se ha podido cargar toda la producción. Recarga para volver a intentarlo.") };
      }
      break;
    }
    if (respuesta.count == null && pagina.length < tamanoPagina) break;
  }
  return { data, error: null };
}
