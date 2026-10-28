export function nombreVisitador(visitador) {
  return [visitador?.nombre, visitador?.apellidos].filter(Boolean).join(' ').trim();
}

function normalizar(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

// An explicit link always wins. Legacy names are accepted only if unambiguous.
export function resolverVisitador(documento, visitadores) {
  if (documento.tipo_documento !== 'Visitador médico') return null;
  if (documento.visitador_id != null && documento.visitador_id !== '') {
    return visitadores.find(v => String(v.id) === String(documento.visitador_id)) ?? null;
  }
  const nombre = normalizar(documento.visitador_nombre);
  if (!nombre) return null;
  const candidatos = visitadores.filter(v =>
    [nombreVisitador(v), v.nombre].some(alias => normalizar(alias) === nombre),
  );
  return candidatos.length === 1 ? candidatos[0] : null;
}

// Supabase returns bounded pages; don't silently lose older budgets or namesakes.
export async function leerTodasLasFilas(client, tabla, configurar = query => query) {
  const filas = [];
  for (let desde = 0; ; desde += 500) {
    const { data, error } = await configurar(client.from(tabla).select('*'))
      .order('id', { ascending: true }).range(desde, desde + 499);
    if (error) throw error;
    filas.push(...(data ?? []));
    if (!data || data.length < 500) return filas;
  }
}

export async function admiteVinculoVisitador(client) {
  const { error } = await client.from('presupuestos').select('visitador_id').limit(0);
  if (!error) return true;
  if (error.code === '42703' || error.code === 'PGRST204') return false;
  throw error;
}
