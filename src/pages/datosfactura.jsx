import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function idTemporal() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function numero(valor) {
  const n = Number(String(valor ?? 0).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function moneda(valor) {
  return numero(valor).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function fechaES(valor) {
  if (!valor) return "—";
  const [a, m, d] = String(valor).slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : valor;
}

function mesClave(fecha) {
  return String(fecha || "").slice(0, 7);
}

function etiquetaMes(clave) {
  if (!/^\d{4}-\d{2}$/.test(clave || "")) return clave || "Sin mes";
  const [a, m] = clave.split("-");
  return new Date(Number(a), Number(m) - 1, 1).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

function lineaNueva(datos = {}) {
  return {
    temporalId: datos.temporalId || idTemporal(),
    descripcion: datos.descripcion || "",
    cantidad: datos.cantidad ?? 1,
    precio_unitario: datos.precio_unitario ?? "",
    iva: datos.iva ?? 10,
  };
}

function leerLineas(valor) {
  if (Array.isArray(valor)) return valor.map(lineaNueva);
  if (typeof valor === "string") {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed.map(lineaNueva) : [lineaNueva()];
    } catch {
      return [lineaNueva()];
    }
  }
  return [lineaNueva()];
}

function calcular(lineas) {
  let base = 0;
  let iva = 0;
  lineas.forEach((linea) => {
    const subtotal = numero(linea.cantidad) * numero(linea.precio_unitario);
    base += subtotal;
    iva += subtotal * (numero(linea.iva) / 100);
  });
  base = Number(base.toFixed(2));
  iva = Number(iva.toFixed(2));
  return { base, iva, total: Number((base + iva).toFixed(2)) };
}

function formularioVacio() {
  return {
    fecha_factura: hoy(),
    cliente_id: "",
    numero_pedido: "",
    nombre_cliente: "",
    cif: "",
    direccion: "",
    codigo_postal: "",
    poblacion: "",
    provincia: "",
    email: "",
    telefono: "",
    observaciones: "",
    estado: "pendiente",
    lineas: [lineaNueva()],
  };
}

export default function DatosFactura() {
  const [registros, setRegistros] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [formulario, setFormulario] = useState(formularioVacio());
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [grupoAbierto, setGrupoAbierto] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const [r, c] = await Promise.all([
      supabase.from("facturas").select("*").order("fecha_factura", { ascending: false }),
      supabase.from("clientes").select("*").order("nombre", { ascending: true }),
    ]);
    if (r.error) setError(r.error.message);
    else setRegistros(r.data || []);
    if (!c.error) setClientes(c.data || []);
    setCargando(false);
  }

  const grupos = useMemo(() => {
    const mapa = new Map();
    registros.forEach((r) => {
      if (r.estado === "anulada") return;
      const cliente = r.nombre_cliente || "Sin cliente";
      const mes = mesClave(r.fecha_factura);
      const key = `${r.cliente_id || cliente}__${mes}`;
      if (!mapa.has(key)) {
        mapa.set(key, { key, cliente, cliente_id: r.cliente_id, mes, registros: [], total: 0, pendientes: 0 });
      }
      const g = mapa.get(key);
      g.registros.push(r);
      g.total += numero(r.total ?? r.importe);
      if (r.estado !== "preparado") g.pendientes += 1;
    });
    return [...mapa.values()]
      .filter((g) => !busqueda || g.cliente.toLowerCase().includes(busqueda.toLowerCase()))
      .sort((a, b) => b.mes.localeCompare(a.mes) || a.cliente.localeCompare(b.cliente));
  }, [registros, busqueda]);

  const totalesFormulario = useMemo(() => calcular(formulario.lineas), [formulario.lineas]);

  function seleccionarCliente(id) {
    const c = clientes.find((x) => String(x.id) === String(id));
    if (!c) {
      setFormulario((f) => ({ ...f, cliente_id: "" }));
      return;
    }
    setFormulario((f) => ({
      ...f,
      cliente_id: c.id,
      nombre_cliente: c.nombre || c.razon_social || c.empresa || "",
      cif: c.cif || c.nif || c.cif_nif || "",
      direccion: c.direccion || c.direccion_fiscal || "",
      codigo_postal: c.codigo_postal || c.cp || "",
      poblacion: c.poblacion || c.localidad || c.ciudad || "",
      provincia: c.provincia || "",
      email: c.email || c.correo || "",
      telefono: c.telefono || c.movil || "",
      numero_pedido: c.numero_pedido || c.numero_orden || f.numero_pedido || "",
    }));
  }

  function abrirNuevo() {
    setFormulario(formularioVacio());
    setEditandoId(null);
    setMostrarFormulario(true);
    setError("");
  }

  function editar(r) {
    setFormulario({
      ...formularioVacio(),
      fecha_factura: r.fecha_factura || hoy(),
      cliente_id: r.cliente_id || "",
      numero_pedido: r.numero_pedido || "",
      nombre_cliente: r.nombre_cliente || "",
      cif: r.cif || "",
      direccion: r.direccion || "",
      codigo_postal: r.codigo_postal || "",
      poblacion: r.poblacion || "",
      provincia: r.provincia || "",
      email: r.email || "",
      telefono: r.telefono || "",
      observaciones: r.observaciones || "",
      estado: r.estado === "preparado" ? "preparado" : "pendiente",
      lineas: leerLineas(r.lineas),
    });
    setEditandoId(r.id);
    setMostrarFormulario(true);
  }

  function actualizarLinea(id, campo, valor) {
    setFormulario((f) => ({
      ...f,
      lineas: f.lineas.map((l) => l.temporalId === id ? { ...l, [campo]: valor } : l),
    }));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const lineas = formulario.lineas
        .filter((l) => l.descripcion.trim() || numero(l.precio_unitario) !== 0)
        .map((l, i) => ({
          orden: i + 1,
          descripcion: l.descripcion.trim() || "Concepto",
          cantidad: numero(l.cantidad),
          precio_unitario: numero(l.precio_unitario),
          iva: numero(l.iva),
        }));
      if (!lineas.length) throw new Error("Añade al menos un concepto.");
      const t = calcular(lineas);
      const payload = {
        fecha_factura: formulario.fecha_factura,
        cliente_id: formulario.cliente_id || null,
        numero_pedido: formulario.numero_pedido.trim() || null,
        nombre_cliente: formulario.nombre_cliente.trim() || null,
        cif: formulario.cif.trim() || null,
        direccion: formulario.direccion.trim() || null,
        codigo_postal: formulario.codigo_postal.trim() || null,
        poblacion: formulario.poblacion.trim() || null,
        provincia: formulario.provincia.trim() || null,
        email: formulario.email.trim() || null,
        telefono: formulario.telefono.trim() || null,
        observaciones: formulario.observaciones.trim() || null,
        estado: formulario.estado,
        forma_pago: "transferencia",
        iva_incluido: false,
        lineas,
        base_imponible: t.base,
        subtotal: t.base,
        iva: t.iva,
        total_iva: t.iva,
        importe: t.total,
        total: t.total,
        manual: true,
        updated_at: new Date().toISOString(),
      };
      const q = editandoId
        ? supabase.from("facturas").update(payload).eq("id", editandoId)
        : supabase.from("facturas").insert({ ...payload, numero: null });
      const { error: err } = await q;
      if (err) throw err;
      setMostrarFormulario(false);
      setMensaje(editandoId ? "Datos actualizados." : "Datos guardados como pendientes para la factura.");
      await cargar();
    } catch (err) {
      setError(err.message || "No se han podido guardar los datos.");
    } finally {
      setGuardando(false);
    }
  }

  async function marcarGrupoPreparado(grupo) {
    const ids = grupo.registros.filter((r) => r.estado !== "preparado").map((r) => r.id);
    if (!ids.length) return;
    const { error: err } = await supabase.from("facturas").update({ estado: "preparado", updated_at: new Date().toISOString() }).in("id", ids);
    if (err) {
      setError(err.message);
      return;
    }
    setMensaje(`${grupo.cliente} · ${etiquetaMes(grupo.mes)} marcado como preparado para facturar.`);
    await cargar();
  }

  function imprimirGrupo(grupo) {
    setGrupoAbierto(grupo);
    setTimeout(() => window.print(), 150);
  }

  return (
    <section className="panel facturacion-page">
      <header className="facturacion-cabecera no-imprimir">
        <div>
          <p className="etiqueta">ADMINISTRACIÓN</p>
          <h2>Datos para la factura</h2>
          <p>Guarda las compras o servicios semanales y agrúpalos por cliente a final de mes. Cusachs Hub no emite la factura.</p>
        </div>
        <button className="boton-principal" type="button" onClick={abrirNuevo}>➕ Añadir datos pendientes</button>
      </header>

      {error && <p className="mensaje-error no-imprimir">{error}</p>}
      {mensaje && <p className="mensaje no-imprimir">{mensaje}</p>}

      <div className="facturacion-resumen no-imprimir">
        <article><span>Registros</span><strong>{registros.length}</strong></article>
        <article><span>Pendientes</span><strong>{registros.filter((r) => r.estado !== "preparado" && r.estado !== "anulada").length}</strong></article>
        <article><span>Preparados</span><strong>{registros.filter((r) => r.estado === "preparado").length}</strong></article>
        <article><span>Total pendiente</span><strong>{moneda(registros.filter((r) => r.estado !== "preparado" && r.estado !== "anulada").reduce((a, r) => a + numero(r.total ?? r.importe), 0))}</strong></article>
      </div>

      <div className="facturacion-filtros no-imprimir">
        <input type="search" placeholder="Buscar cliente..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      <div className="no-imprimir">
        <h3 style={{ margin: "18px 0 10px" }}>Resumen mensual por cliente</h3>
        {cargando ? <p>Cargando...</p> : grupos.map((g) => (
          <article key={g.key} className="email-import-card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <strong style={{ fontSize: 18 }}>{g.cliente}</strong>
                <div>{etiquetaMes(g.mes)} · {g.registros.length} entrega(s) · {g.pendientes ? `${g.pendientes} pendiente(s)` : "Preparado"}</div>
              </div>
              <strong style={{ fontSize: 20 }}>{moneda(g.total)}</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setGrupoAbierto(g)}>Ver detalle</button>
                <button type="button" onClick={() => imprimirGrupo(g)}>🖨 Resumen PDF</button>
                {g.pendientes > 0 && <button className="boton-principal" type="button" onClick={() => marcarGrupoPreparado(g)}>✓ Preparado para facturar</button>}
              </div>
            </div>
          </article>
        ))}
      </div>

      {grupoAbierto && (
        <section className="factura-vista-completa">
          <div className="factura-barra-acciones no-imprimir">
            <div><strong>Datos para la factura</strong><span>{grupoAbierto.cliente} · {etiquetaMes(grupoAbierto.mes)}</span></div>
            <button type="button" onClick={() => setGrupoAbierto(null)}>Cerrar</button>
          </div>
          <div className="factura-documento">
            <h1>DATOS PARA LA FACTURA</h1>
            <h2>{grupoAbierto.cliente}</h2>
            <p><strong>Periodo:</strong> {etiquetaMes(grupoAbierto.mes)}</p>
            <table className="tabla-facturas">
              <thead><tr><th>Fecha</th><th>N.º pedido</th><th>Conceptos</th><th>Total</th></tr></thead>
              <tbody>{grupoAbierto.registros.map((r) => (
                <tr key={r.id}>
                  <td>{fechaES(r.fecha_factura)}</td>
                  <td>{r.numero_pedido || "—"}</td>
                  <td>{leerLineas(r.lineas).map((l) => l.descripcion).filter(Boolean).join(", ") || "—"}</td>
                  <td><strong>{moneda(r.total ?? r.importe)}</strong></td>
                </tr>
              ))}</tbody>
            </table>
            <div className="factura-manual-totales"><div className="factura-manual-total-final"><span>TOTAL DEL PERIODO</span><strong>{moneda(grupoAbierto.total)}</strong></div></div>
            <p style={{ marginTop: 24 }}><strong>Documento interno:</strong> datos preparados para emitir la factura en el sistema externo. No es una factura.</p>
          </div>
        </section>
      )}

      {mostrarFormulario && (
        <div className="modal-fondo no-imprimir" onClick={() => setMostrarFormulario(false)}>
          <form className="modal-contenido factura-manual-modal" onSubmit={guardar} onClick={(e) => e.stopPropagation()}>
            <div className="modal-cabecera">
              <div><p className="etiqueta">DATOS PARA LA FACTURA</p><h2>{editandoId ? "Editar datos" : "Nueva entrega / compra"}</h2><p>Quedará pendiente y se agrupará automáticamente con el resto del mes.</p></div>
              <button type="button" className="boton-cerrar-modal" onClick={() => setMostrarFormulario(false)}>×</button>
            </div>
            <section className="factura-manual-seccion">
              <div className="factura-manual-grid">
                <label>Cliente<select value={formulario.cliente_id} onChange={(e) => seleccionarCliente(e.target.value)}><option value="">— Escoger cliente —</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre || c.razon_social || c.empresa || `Cliente ${c.id}`}</option>)}</select></label>
                <label>Fecha<input type="date" value={formulario.fecha_factura} onChange={(e) => setFormulario((f) => ({ ...f, fecha_factura: e.target.value }))} /></label>
                <label>Número de pedido<input value={formulario.numero_pedido} onChange={(e) => setFormulario((f) => ({ ...f, numero_pedido: e.target.value }))} placeholder="Opcional" /></label>
                <label>Estado<select value={formulario.estado} onChange={(e) => setFormulario((f) => ({ ...f, estado: e.target.value }))}><option value="pendiente">Pendiente</option><option value="preparado">Preparado para facturar</option></select></label>
              </div>
            </section>
            <section className="factura-manual-seccion">
              <div className="import-lines-header"><h3>Conceptos</h3><button type="button" onClick={() => setFormulario((f) => ({ ...f, lineas: [...f.lineas, lineaNueva()] }))}>+ Añadir línea</button></div>
              <div className="tabla-responsive"><table className="tabla-factura-manual"><thead><tr><th>Concepto</th><th>Cantidad</th><th>Precio</th><th>IVA</th><th>Total</th><th></th></tr></thead><tbody>{formulario.lineas.map((l) => { const t = calcular([l]); return <tr key={l.temporalId}><td><input value={l.descripcion} onChange={(e) => actualizarLinea(l.temporalId, "descripcion", e.target.value)} /></td><td><input type="number" step="0.01" value={l.cantidad} onChange={(e) => actualizarLinea(l.temporalId, "cantidad", e.target.value)} /></td><td><input type="number" step="0.01" value={l.precio_unitario} onChange={(e) => actualizarLinea(l.temporalId, "precio_unitario", e.target.value)} /></td><td><select value={l.iva} onChange={(e) => actualizarLinea(l.temporalId, "iva", e.target.value)}><option value="10">10 %</option><option value="21">21 %</option><option value="4">4 %</option><option value="0">0 %</option></select></td><td><strong>{moneda(t.total)}</strong></td><td><button type="button" onClick={() => setFormulario((f) => ({ ...f, lineas: f.lineas.length > 1 ? f.lineas.filter((x) => x.temporalId !== l.temporalId) : f.lineas }))}>×</button></td></tr>; })}</tbody></table></div>
              <div className="factura-manual-totales"><div><span>Base</span><strong>{moneda(totalesFormulario.base)}</strong></div><div><span>IVA</span><strong>{moneda(totalesFormulario.iva)}</strong></div><div className="factura-manual-total-final"><span>Total</span><strong>{moneda(totalesFormulario.total)}</strong></div></div>
            </section>
            <section className="factura-manual-seccion"><label>Observaciones<textarea rows="3" value={formulario.observaciones} onChange={(e) => setFormulario((f) => ({ ...f, observaciones: e.target.value }))} /></label></section>
            <div className="modal-acciones"><button type="button" onClick={() => setMostrarFormulario(false)}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? "Guardando..." : "Guardar datos"}</button></div>
          </form>
        </div>
      )}

      <div className="tabla-responsive no-imprimir" style={{ marginTop: 22 }}>
        <h3>Todos los registros</h3>
        <table className="tabla-facturas"><thead><tr><th>Fecha</th><th>Cliente</th><th>Pedido</th><th>Estado</th><th>Total</th><th></th></tr></thead><tbody>{registros.map((r) => <tr key={r.id}><td>{fechaES(r.fecha_factura)}</td><td>{r.nombre_cliente || "Sin cliente"}</td><td>{r.numero_pedido || "—"}</td><td><span className={`factura-estado ${r.estado || "pendiente"}`}>{r.estado === "preparado" ? "Preparado" : "Pendiente"}</span></td><td><strong>{moneda(r.total ?? r.importe)}</strong></td><td><button type="button" onClick={() => editar(r)}>Editar</button></td></tr>)}</tbody></table>
      </div>
    </section>
  );
}
