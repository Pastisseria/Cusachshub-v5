const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
export function calcularRecipientes(datos, tipo, determinarZona) {
  const lineas = new Map();
  const vistas = new Set();
  for (const linea of datos.lineas) {
    if (vistas.has(String(linea.id))) continue;
    vistas.add(String(linea.id));
    const key = String(linea.presupuesto_id);
    if (!lineas.has(key)) lineas.set(key, []);
    lineas.get(key).push(linea);
  }
  const filas = new Map(), caterings = new Set();
  for (const catering of datos.caterings) {
    if (caterings.has(String(catering.id))) continue;
    caterings.add(String(catering.id));
    const estado = normalizar(catering.estado);
    if (estado === "cancelado") continue;
    const confirmado = ["aceptado","confirmado"].includes(estado);
    if ((tipo === "confirmados") !== confirmado) continue;
    for (const linea of lineas.get(String(catering.presupuesto_id)) || []) {
      const producto = linea.productos;
      const nombre = producto?.nombre || linea.descripcion || "Producto sin nombre";
      if (determinarZona(producto, nombre) !== "Cocina") continue;
      const cantidad = Number(linea.cantidad);
      if (!Number.isFinite(cantidad) || cantidad <= 0) continue;
      const unidad = linea.unidad || producto?.unidad || "unidades";
      const clave = JSON.stringify([linea.producto_id || normalizar(nombre), normalizar(unidad)]);
      if (!filas.has(clave)) filas.set(clave, {clave, nombre, unidad, eventos:new Map()});
      const fila = filas.get(clave);
      const evento = fila.eventos.get(String(catering.id)) || {fecha:catering.fecha, cantidad:0};
      evento.cantidad += cantidad;
      fila.eventos.set(String(catering.id), evento);
    }
  }
  return [...filas.values()].map(fila => {
    const dias = {};
    for (const evento of fila.eventos.values()) dias[evento.fecha] = (dias[evento.fecha] || 0) + Math.ceil(evento.cantidad);
    return {clave:fila.clave, nombre:fila.nombre, unidad:fila.unidad, dias, total:Object.values(dias).reduce((a,b) => a+b, 0)};
  }).sort((a,b) => a.nombre.localeCompare(b.nombre, "es"));
}
export function resumirRecipientes(filas, reglas) {
  const mapa = new Map();
  for (const fila of filas) {
    const regla = reglas[fila.clave];
    if (!regla?.activo || !regla.recipiente?.trim()) continue;
    const clave = normalizar(regla.recipiente);
    if (!mapa.has(clave)) mapa.set(clave, {clave, nombre:regla.recipiente.trim(), dias:{}, total:0});
    const resumen = mapa.get(clave);
    resumen.total += fila.total;
    for (const [dia, cantidad] of Object.entries(fila.dias)) resumen.dias[dia] = (resumen.dias[dia] || 0) + cantidad;
  }
  return [...mapa.values()].sort((a,b) => a.nombre.localeCompare(b.nombre, "es"));
}
