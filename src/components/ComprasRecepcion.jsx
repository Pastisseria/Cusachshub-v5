import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";
import { analizarDocumentoIA } from "../ai/parserIA.js";
import { leerDocumentoInteligenteV3 } from "../services/lectorInteligenteV3.js";

const cantidadFormato = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 6 });
const euros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
const unidades = { u: "unidad", ud: "unidad", uds: "unidad", unidades: "unidad", kgs: "kg", gr: "g", lt: "l", litros: "l", cajas: "caja", paquetes: "paquete", bolsas: "bolsa", botellas: "botella", bandejas: "bandeja" };
const nuevaLinea = () => ({ codigo: "", descripcion: "", cantidad: "", unidad: "unidad", importe: "" });

export async function leerCompraRecepcion(archivo, proveedores, onProgreso) {
  const lectura = await leerDocumentoInteligenteV3(archivo, { proveedores, onProgreso });
  const analisis = analizarDocumentoIA(lectura);
  const lineas = (analisis.lineas || []).map(l => ({
    codigo: l.codigo || "", descripcion: l.descripcion, cantidad: l.cantidad,
    unidad: l.unidad || "unidad", importe: Number(l.total_linea) > 0 ? l.total_linea : "",
  }));
  if (!lineas.length) {
    for (const linea of lectura.lineas || []) {
      const texto = String(linea?.texto || linea || "").trim();
      const columnas = texto.match(/^(.+?)\s+(\d+(?:[,.]\d+)?)\s+(kg|g|l|ml|ud|uds|unidades?|cajas?|paquetes?|bolsas?)$/i);
      if (!columnas || /^(?:total|subtotal|portes|iva)\b/i.test(columnas[1])) continue;
      const [, descripcion, cantidad, unidad] = columnas;
      lineas.push({ ...nuevaLinea(), descripcion, cantidad: cantidad.replace(",", "."), unidad });
    }
  }
  return { lectura, analisis, compra: { numero: analisis.numero_albaran || "", fecha: analisis.fecha_albaran || "", lineas, validado: false } };
}

function acumular(registros, anio, proveedor) {
  const grupos = new Map();
  for (const registro of registros) {
    const compra = registro.compra_albaran;
    if (!compra?.validado || !compra.fecha.startsWith(anio + "-") || (proveedor && registro.proveedor_id !== proveedor)) continue;
    for (const linea of compra.lineas) {
      const unidad = normalizar(linea.unidad);
      const unidadAgrupada = unidades[unidad] || unidad;
      const clave = JSON.stringify([registro.proveedor_id, normalizar(linea.codigo) || normalizar(linea.descripcion), unidadAgrupada]);
      const fila = grupos.get(clave) || { clave, proveedor: registro.proveedor, articulo: linea.descripcion, unidad: unidadAgrupada, cantidad: 0, importe: null, sinImporte: 0, documentos: new Map() };
      fila.cantidad += Number(linea.cantidad);
      if (linea.importe == null) fila.sinImporte++;
      else fila.importe = (fila.importe ?? 0) + Number(linea.importe);
      fila.documentos.set(registro.id, { registro, numero: compra.numero, fecha: compra.fecha });
      grupos.set(clave, fila);
    }
  }
  return [...grupos.values()].sort((a, b) => (a.proveedor || "").localeCompare(b.proveedor || "", "es") || a.articulo.localeCompare(b.articulo, "es"));
}

export default function ComprasRecepcion({ registros, proveedores, recargar, abrir, ocupado }) {
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [proveedor, setProveedor] = useState("");
  const [grupoDocumento, setGrupoDocumento] = useState("");
  const [documento, setDocumento] = useState("");
  const [revision, setRevision] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(false);
  const filas = useMemo(() => acumular(registros, anio, proveedor), [registros, anio, proveedor]);
  const totales = new Map();
  for (const fila of filas) {
    const total = totales.get(fila.proveedor) || { importe: null, sinImporte: 0 };
    if (fila.importe != null) total.importe = (total.importe ?? 0) + fila.importe;
    total.sinImporte += fila.sinImporte;
    totales.set(fila.proveedor, total);
  }
  const opciones = useMemo(() => [...new Map([...proveedores.map(p => [p.id, p.nombre]), ...registros.filter(r => r.proveedor_id && r.proveedor).map(r => [r.proveedor_id, r.proveedor])])], [proveedores, registros]);

  const gruposDocumentos = useMemo(() => {
    const nombres = new Map(opciones);
    const idsPorNombre = new Map(opciones.map(([id, nombre]) => [normalizar(nombre), id]));
    const grupos = new Map();
    for (const registro of registros) {
      const nombre = registro.proveedor?.trim();
      const id = registro.proveedor_id || idsPorNombre.get(normalizar(nombre));
      const clave = id ? `id:${id}` : nombre ? `nombre:${normalizar(nombre)}` : "sin-proveedor";
      const grupo = grupos.get(clave) || { clave, nombre: nombres.get(id) || nombre || "Sin proveedor asignado", documentos: [] };
      grupo.documentos.push(registro);
      grupos.set(clave, grupo);
    }
    return [...grupos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [opciones, registros]);
  const documentosProveedor = gruposDocumentos.find(g => g.clave === grupoDocumento)?.documentos || [];
  const documentoSeleccionado = documentosProveedor.find(r => r.id === documento);

  async function revisar() {
    const registro = documentoSeleccionado;
    if (!registro) return;
    setMensaje("");
    setProcesando(true);
    try {
      let compra = registro.compra_albaran;
      if (!compra) {
        const descarga = await supabase.storage.from("higiene-pdfs").download(registro.archivo_ruta);
        if (descarga.error) throw descarga.error;
        const archivo = new File([descarga.data], registro.archivo_nombre, { type: "application/pdf" });
        ({ compra } = await leerCompraRecepcion(archivo, proveedores, ({ estado }) => setMensaje(estado)));
      }
      setRevision({ ...compra, anterior: registro.compra_albaran, id: registro.id, proveedor: registro.proveedor_id || "", fecha: compra.fecha || registro.fecha_recepcion });
      setMensaje(compra.lineas.length ? "" : "No se han detectado líneas. Puedes añadirlas consultando el PDF.");
    } catch (error) {
      setMensaje(error.message || "No se pudo leer el documento.");
    } finally {
      setProcesando(false);
    }
  }

  async function guardar(evento) {
    evento.preventDefault();
    const proveedorNombre = opciones.find(([id]) => id === revision.proveedor)?.[1];
    if (!proveedorNombre || !revision.fecha || !/[\p{L}\p{N}]/u.test(revision.numero) || !revision.lineas.length ||
        revision.lineas.some(l => !l.descripcion.trim() || !l.unidad.trim() || l.cantidad === "" || !Number.isFinite(Number(l.cantidad)) || Number(l.cantidad) === 0)) {
      setMensaje("Completa proveedor, fecha, número, artículo, cantidad y unidad en todas las líneas.");
      return;
    }
    const compra = {
      fecha: revision.fecha, numero: revision.numero.trim(), validado: true,
      lineas: revision.lineas.map(l => ({
        codigo: l.codigo.trim(), descripcion: l.descripcion.trim(), unidad: l.unidad.trim(),
        cantidad: Number(l.cantidad), importe: l.importe == null || l.importe === "" ? null : Number(l.importe),
      })),
    };
    setProcesando(true);
    setMensaje("");
    try {
      let consulta = supabase.from("higiene_control_recepcion")
        .update({ compra_albaran: compra, proveedor_id: revision.proveedor, proveedor: proveedorNombre })
        .eq("id", revision.id);
      consulta = revision.anterior ? consulta.eq("compra_albaran", JSON.stringify(revision.anterior)) : consulta.is("compra_albaran", null);
      const { error } = await consulta.select("id").single();
      if (error) throw error;
      setRevision(null);
      await recargar();
      setMensaje("Albarán validado e incluido en el acumulado.");
    } catch (error) {
      setMensaje(error.code === "23505" ? "Ya hay un albarán validado de ese proveedor con el mismo número y año." : error.message);
    } finally {
      setProcesando(false);
    }
  }

  async function exportar() {
    try {
      const { utils, writeFile } = await import("xlsx");
      const libro = utils.book_new();
      const datos = filas.map(f => ({
        Proveedor: f.proveedor, Artículo: f.articulo, Unidad: f.unidad, Cantidad: f.cantidad,
        "Importe registrado": f.importe, "Líneas sin importe": f.sinImporte,
        Albaranes: [...f.documentos.values()].map(d => d.numero).join(", "),
      }));
      utils.book_append_sheet(libro, utils.json_to_sheet(datos), "Compras");
      writeFile(libro, `compras-proveedor-${anio}.xlsx`);
    } catch (error) {
      setMensaje(`No se pudo exportar el Excel: ${error.message}`);
    }
  }

  function cambiarLinea(indice, campo, valor) {
    setRevision(actual => ({ ...actual, lineas: actual.lineas.map((linea, i) => i === indice ? { ...linea, [campo]: valor } : linea) }));
  }

  return <section className="recepcion-revision">
    <h2>Compras por proveedor</h2>
    <div className="recepcion-grid">
      <label>Año<input type="number" min="2000" max="2100" value={anio} onChange={e => setAnio(e.target.value)}/></label>
      <label>Proveedor<select value={proveedor} onChange={e => setProveedor(e.target.value)}>
        <option value="">Todos los proveedores</option>
        {opciones.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
      </select></label>
    </div>
    <div className="recepcion-toolbar">
      <button type="button" disabled={!filas.length} onClick={exportar}>Exportar Excel</button>
    </div>
    {totales.size > 0 && <ul>{[...totales].map(([nombre, total]) => <li key={nombre}><strong>{nombre}</strong> · {total.importe == null ? "Sin importe" : euros.format(total.importe)}{total.sinImporte > 0 && ` · ${total.sinImporte} línea(s) sin importe`}</li>)}</ul>}
    {filas.length ? <div className="tabla-responsive"><table>
      <thead><tr><th>Proveedor</th><th>Artículo</th><th>Cantidad</th><th>Unidad</th><th>Importe registrado</th><th>Albaranes</th></tr></thead>
      <tbody>{filas.map(f => <tr key={f.clave}>
        <td>{f.proveedor}</td><td>{f.articulo}</td><td>{cantidadFormato.format(f.cantidad)}</td><td>{f.unidad}</td>
        <td>{f.importe == null ? "Sin importe" : euros.format(f.importe)}
          {f.importe != null && f.sinImporte > 0 && <div>{f.sinImporte} línea(s) sin importe</div>}</td>
        <td><details><summary>{f.documentos.size} albarán(es)</summary>
          {[...f.documentos.values()].map(({ registro, numero, fecha }) => <div key={registro.id}>
            <button type="button" onClick={() => abrir(registro, true)}>{numero} · {fecha}</button>
          </div>)}</details></td>
      </tr>)}</tbody>
    </table></div> : <p>Sin compras validadas para esta selección.</p>}
    <h3>Revisar un albarán</h3>
    <div className="recepcion-grid">
      <label>Proveedor del albarán<select value={grupoDocumento} disabled={!!revision || procesando || ocupado} onChange={e => {
        setGrupoDocumento(e.target.value);
        setDocumento("");
        setMensaje("");
      }}>
        <option value="">Selecciona un proveedor</option>
        {gruposDocumentos.map(g => <option key={g.clave} value={g.clave}>{g.nombre} ({g.documentos.length})</option>)}
      </select></label>
      <label>Documento<select value={documentoSeleccionado?.id || ""} disabled={!documentosProveedor.length || !!revision || procesando || ocupado} onChange={e => setDocumento(e.target.value)}>
        <option value="">Selecciona un albarán</option>
        {documentosProveedor.map(r => <option key={r.id} value={r.id}>{r.compra_albaran?.fecha || r.fecha_recepcion} · {r.compra_albaran?.numero || r.archivo_nombre} · {r.compra_albaran?.validado ? "Validado" : r.compra_albaran ? "Por revisar" : "Por leer"}</option>)}
      </select></label>
    </div>
    <button type="button" disabled={!documentoSeleccionado || procesando || ocupado || !!revision} onClick={revisar}>Leer o revisar artículos</button>
    {mensaje && <p role="status">{mensaje}</p>}
    {revision && <form onSubmit={guardar}>
      <button type="button" onClick={() => abrir(registros.find(r => r.id === revision.id), true)}>Ver albarán original</button>
      <div className="recepcion-grid">
        <label>Proveedor<select required value={revision.proveedor} onChange={e => setRevision({ ...revision, proveedor: e.target.value })}>
          <option value="">Selecciona proveedor</option>
          {opciones.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
        </select></label>
        <label>Fecha del albarán<input required type="date" value={revision.fecha} onChange={e => setRevision({ ...revision, fecha: e.target.value })}/></label>
        <label>Nº de albarán<input required value={revision.numero} onChange={e => setRevision({ ...revision, numero: e.target.value })}/></label>
      </div>
      <div className="tabla-responsive"><table>
        <thead><tr><th>Código</th><th>Artículo</th><th>Cantidad</th><th>Unidad</th><th>Importe de línea</th><th></th></tr></thead>
        <tbody>{revision.lineas.map((l, i) => <tr key={i}>
          <td><input aria-label={`Código de línea ${i + 1}`} value={l.codigo} onChange={e => cambiarLinea(i, "codigo", e.target.value)}/></td>
          <td><input required aria-label={`Artículo de línea ${i + 1}`} value={l.descripcion} onChange={e => cambiarLinea(i, "descripcion", e.target.value)}/></td>
          <td><input required type="number" step="any" aria-label={`Cantidad de línea ${i + 1}`} value={l.cantidad} onChange={e => cambiarLinea(i, "cantidad", e.target.value)}/></td>
          <td><input required aria-label={`Unidad de línea ${i + 1}`} value={l.unidad} onChange={e => cambiarLinea(i, "unidad", e.target.value)}/></td>
          <td><input type="number" step="any" aria-label={`Importe de línea ${i + 1}`} value={l.importe ?? ""} onChange={e => cambiarLinea(i, "importe", e.target.value)}/></td>
          <td><button type="button" aria-label={`Quitar línea ${i + 1}`} onClick={() => setRevision({ ...revision, lineas: revision.lineas.filter((_, indice) => i !== indice) })}>Quitar</button></td>
        </tr>)}</tbody>
      </table></div>
      <div className="recepcion-toolbar">
        <button type="button" onClick={() => setRevision({ ...revision, lineas: [...revision.lineas, nuevaLinea()] })}>Añadir línea</button>
        <button type="submit" disabled={procesando || ocupado}>Validar compras</button>
        <button type="button" disabled={procesando} onClick={() => setRevision(null)}>Cerrar</button>
      </div>
    </form>}
  </section>;
}

export function ComprasFichaProveedor({ proveedorId }) {
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [resultado, setResultado] = useState(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let vigente = true;
    async function cargar() {
      const registros = [];
      const pagina = 200;
      try {
        while (vigente) {
          const { data, error } = await supabase.from("higiene_control_recepcion")
            .select("id,proveedor,proveedor_id,compra_albaran,archivo_ruta")
            .eq("proveedor_id", proveedorId).eq("compra_albaran->>validado", "true")
            .order("id").range(registros.length, registros.length + pagina - 1);
          if (error) throw error;
          registros.push(...data);
          if (data.length < pagina) break;
        }
        if (vigente) setResultado({ registros });
      } catch (error) {
        if (vigente) setResultado({ error: error.message });
      }
    }
    cargar();
    return () => { vigente = false; };
  }, [proveedorId]);

  const filas = useMemo(() => acumular(resultado?.registros || [], anio, proveedorId), [resultado, anio, proveedorId]);
  const hayImporte = filas.some(fila => fila.importe != null);
  const total = filas.reduce((suma, fila) => suma + (fila.importe ?? 0), 0);
  const sinImporte = filas.reduce((suma, fila) => suma + fila.sinImporte, 0);

  async function abrirAlbaran(registro) {
    const { data, error } = await supabase.storage.from("higiene-pdfs").createSignedUrl(registro.archivo_ruta, 120);
    if (error) setAviso(error.message);
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return <section>
    <h3>Compras registradas</h3>
    <label>Año <input type="number" min="2000" max="2100" value={anio} onChange={e => setAnio(e.target.value)} /></label>
    {aviso && <p role="alert">{aviso}</p>}
    {!resultado ? <p role="status">Cargando compras…</p> : resultado.error ? <p role="alert">{resultado.error}</p> :
      filas.length ? <>
        <p><strong>Total registrado</strong> · {hayImporte ? euros.format(total) : "Sin importe"}{sinImporte > 0 && ` · ${sinImporte} línea(s) sin importe`}</p>
        <div className="tabla-responsive"><table>
          <thead><tr><th>Artículo</th><th>Cantidad</th><th>Unidad</th><th>Importe registrado</th><th>Albaranes</th></tr></thead>
          <tbody>{filas.map(fila => <tr key={fila.clave}>
            <td>{fila.articulo}</td><td>{cantidadFormato.format(fila.cantidad)}</td><td>{fila.unidad}</td>
            <td>{fila.importe == null ? "Sin importe" : euros.format(fila.importe)}</td>
            <td><details><summary>{fila.documentos.size} albarán(es)</summary>
              {[...fila.documentos.values()].map(({ registro, numero, fecha }) =>
                <div key={registro.id}><button type="button" onClick={() => abrirAlbaran(registro)}>{numero} · {fecha}</button></div>
              )}
            </details></td>
          </tr>)}</tbody>
        </table></div>
      </> : <p>Sin albaranes validados para este año.</p>}
  </section>;
}
