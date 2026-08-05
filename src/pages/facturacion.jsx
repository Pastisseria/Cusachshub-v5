import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const FORMAS_PAGO = [
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta / Visa" },
  { value: "efectivo", label: "Efectivo" },
];

const TIPOS_IVA = [0, 4, 10, 21];

function idTemporal() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function nuevaLinea(datos = {}) {
  return {
    temporalId: datos.temporalId || idTemporal(),
    descripcion: datos.descripcion || "",
    cantidad: datos.cantidad ?? 1,
    precio_unitario: datos.precio_unitario ?? "",
    iva: datos.iva ?? 10,
  };
}

function facturaVacia() {
  return {
    numero: "",
    fecha_factura: fechaActual(),
    fecha_vencimiento: "",
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
    detalle_concepto: "",
    observaciones: "",
    forma_pago: "transferencia",
    estado: "pendiente",
    fecha_pago: "",
    iva_incluido: false,
    lineas: [nuevaLinea()],
  };
}

function leerLineas(valor) {
  if (Array.isArray(valor)) return valor.map(nuevaLinea);
  if (typeof valor === "string") {
    try {
      const datos = JSON.parse(valor);
      return Array.isArray(datos) ? datos.map(nuevaLinea) : [nuevaLinea()];
    } catch {
      return [nuevaLinea()];
    }
  }
  return [nuevaLinea()];
}

function Facturacion() {
  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [facturaAbierta, setFacturaAbierta] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(facturaVacia());
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPago, setFiltroPago] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  async function cargarDatosIniciales() {
    setCargando(true);
    setError("");

    const [resultadoFacturas, resultadoClientes] = await Promise.all([
      supabase
        .from("facturas")
        .select("*")
        .order("fecha_factura", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("clientes")
        .select("*"),
    ]);

    if (resultadoFacturas.error) {
      setError(`Facturas: ${resultadoFacturas.error.message}`);
      setFacturas([]);
    } else {
      setFacturas(resultadoFacturas.data || []);
    }

    if (resultadoClientes.error) {
      setError((anterior) =>
        [anterior, `Clientes: ${resultadoClientes.error.message}`]
          .filter(Boolean)
          .join(" | "),
      );
      setClientes([]);
    } else {
      setClientes(resultadoClientes.data || []);
    }

    setCargando(false);
  }

  async function cargarFacturas() {
    const { data, error: consultaError } = await supabase
      .from("facturas")
      .select("*")
      .order("fecha_factura", { ascending: false })
      .order("created_at", { ascending: false });

    if (consultaError) {
      setError(consultaError.message);
      return;
    }

    setFacturas(data || []);
  }

  const facturasFiltradas = useMemo(() => {
    const texto = normalizar(busqueda);
    return facturas.filter((factura) => {
      const contenido = normalizar([
        factura.numero,
        factura.nombre_cliente,
        factura.cif,
        factura.detalle_concepto,
        factura.numero_pedido,
        factura.email,
      ].join(" "));

      return (
        (!texto || contenido.includes(texto)) &&
        (!filtroEstado || factura.estado === filtroEstado) &&
        (!filtroPago || factura.forma_pago === filtroPago)
      );
    });
  }, [facturas, busqueda, filtroEstado, filtroPago]);

  const resumen = useMemo(() => {
    return facturas.reduce(
      (acc, factura) => {
        const total = numero(factura.total);
        acc.total += total;
        if (factura.estado === "pagada") acc.cobrado += total;
        if (factura.estado === "pendiente") acc.pendiente += total;
        return acc;
      },
      { total: 0, cobrado: 0, pendiente: 0 },
    );
  }, [facturas]);

  const calculos = useMemo(
    () => calcularFactura(formulario.lineas, formulario.iva_incluido),
    [formulario.lineas, formulario.iva_incluido],
  );

  function abrirNueva() {
    setFormulario(facturaVacia());
    setEditandoId(null);
    setMostrarFormulario(true);
    setError("");
    setMensaje("");
  }

  function editarFactura(factura) {
    setFormulario({
      numero: factura.numero || "",
      fecha_factura: factura.fecha_factura || fechaActual(),
      fecha_vencimiento: factura.fecha_vencimiento || "",
      cliente_id: factura.cliente_id || "",
      numero_pedido: factura.numero_pedido || "",
      nombre_cliente: factura.nombre_cliente || "",
      cif: factura.cif || "",
      direccion: factura.direccion || "",
      codigo_postal: factura.codigo_postal || "",
      poblacion: factura.poblacion || "",
      provincia: factura.provincia || "",
      email: factura.email || "",
      telefono: factura.telefono || "",
      detalle_concepto: factura.detalle_concepto || factura.concepto || "",
      observaciones: factura.observaciones || "",
      forma_pago: factura.forma_pago || "transferencia",
      estado: factura.estado || "pendiente",
      fecha_pago: factura.fecha_pago || "",
      iva_incluido: factura.iva_incluido === true || factura.iva_incluido === "true",
      lineas: leerLineas(factura.lineas),
    });
    setEditandoId(factura.id);
    setMostrarFormulario(true);
  }

  function duplicarFactura(factura) {
    editarFactura(factura);
    setEditandoId(null);
    setFormulario((anterior) => ({
      ...anterior,
      numero: "",
      fecha_factura: fechaActual(),
      fecha_vencimiento: "",
      estado: "pendiente",
      fecha_pago: "",
    }));
    setMensaje("Copia creada. El número correlativo se asignará al guardar.");
  }

  function seleccionarCliente(clienteId) {
    if (!clienteId) {
      setFormulario((anterior) => ({
        ...anterior,
        cliente_id: "",
      }));
      return;
    }

    const cliente = clientes.find((item) => String(item.id) === String(clienteId));
    if (!cliente) return;

    setFormulario((anterior) => ({
      ...anterior,
      cliente_id: cliente.id,
      numero_pedido:
        cliente.numero_pedido ||
        cliente.numero_orden ||
        cliente.pedido ||
        anterior.numero_pedido ||
        "",
      nombre_cliente:
        cliente.nombre ||
        cliente.razon_social ||
        cliente.empresa ||
        cliente.nombre_fiscal ||
        "",
      cif: cliente.cif || cliente.nif || cliente.cif_nif || "",
      direccion:
        cliente.direccion ||
        cliente.direccion_fiscal ||
        cliente.domicilio ||
        "",
      codigo_postal: cliente.codigo_postal || cliente.cp || "",
      poblacion: cliente.poblacion || cliente.localidad || cliente.ciudad || "",
      provincia: cliente.provincia || "",
      email: cliente.email || cliente.correo || "",
      telefono: cliente.telefono || cliente.movil || "",
    }));
  }

  function actualizarCampo(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function actualizarLinea(temporalId, campo, valor) {
    setFormulario((anterior) => ({
      ...anterior,
      lineas: anterior.lineas.map((linea) =>
        linea.temporalId === temporalId ? { ...linea, [campo]: valor } : linea,
      ),
    }));
  }

  function añadirLinea() {
    setFormulario((anterior) => ({
      ...anterior,
      lineas: [...anterior.lineas, nuevaLinea()],
    }));
  }

  function eliminarLinea(temporalId) {
    setFormulario((anterior) => {
      const lineas = anterior.lineas.filter((linea) => linea.temporalId !== temporalId);
      return { ...anterior, lineas: lineas.length ? lineas : [nuevaLinea()] };
    });
  }

  async function obtenerSiguienteNumero() {
    const { data, error: consultaError } = await supabase
      .from("facturas")
      .select("numero");

    if (consultaError) throw consultaError;

    const numeros = (data || [])
      .map((factura) => String(factura.numero ?? "").trim())
      .filter((valor) => /^\d+$/.test(valor))
      .map(Number)
      .filter(Number.isFinite);

    return String(numeros.length ? Math.max(...numeros) + 1 : 1);
  }

  async function guardarFactura(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const lineas = formulario.lineas
        .filter((linea) => linea.descripcion.trim() || numero(linea.precio_unitario) !== 0)
        .map((linea, indice) => ({
          orden: indice + 1,
          descripcion: linea.descripcion.trim() || "Concepto",
          cantidad: Math.max(0, numero(linea.cantidad)),
          precio_unitario: numero(linea.precio_unitario),
          iva: numero(linea.iva),
        }));

      if (!lineas.length) throw new Error("Añade al menos un concepto o importe.");

      const totales = calcularFactura(lineas, formulario.iva_incluido);

      const numeroCorrelativo = editandoId
        ? String(formulario.numero || "").trim()
        : await obtenerSiguienteNumero();

      const payload = {
        numero: numeroCorrelativo || null,
        fecha_factura: formulario.fecha_factura || fechaActual(),
        fecha_vencimiento: formulario.fecha_vencimiento || null,
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
        detalle_concepto: formulario.detalle_concepto.trim() || null,
        observaciones: formulario.observaciones.trim() || null,
        forma_pago: formulario.forma_pago,
        estado: formulario.estado,
        fecha_pago:
          formulario.estado === "pagada"
            ? formulario.fecha_pago || fechaActual()
            : null,
        iva_incluido: Boolean(formulario.iva_incluido),
        lineas,
        base_imponible: totales.base,
        subtotal: totales.base,
        iva: totales.iva,
        total_iva: totales.iva,
        importe: totales.total,
        total: totales.total,
        manual: true,
        updated_at: new Date().toISOString(),
      };

      const consulta = editandoId
        ? supabase.from("facturas").update(payload).eq("id", editandoId)
        : supabase.from("facturas").insert(payload);

      const { data, error: guardarError } = await consulta.select("*").single();
      if (guardarError) throw guardarError;

      setFacturas((anteriores) =>
        editandoId
          ? anteriores.map((factura) => (factura.id === data.id ? data : factura))
          : [data, ...anteriores],
      );

      setFacturaAbierta(data);
      setMostrarFormulario(false);
      setEditandoId(null);
      setMensaje(editandoId ? "Factura actualizada." : "Factura manual creada.");
    } catch (guardarError) {
      setError(guardarError.message || "No se ha podido guardar la factura.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarFactura(factura) {
    if (!window.confirm(`¿Eliminar la factura ${factura.numero || "sin número"}?`)) return;
    const { error: borrarError } = await supabase.from("facturas").delete().eq("id", factura.id);
    if (borrarError) {
      setError(borrarError.message);
      return;
    }
    setFacturas((anteriores) => anteriores.filter((item) => item.id !== factura.id));
    if (facturaAbierta?.id === factura.id) setFacturaAbierta(null);
    setMensaje("Factura eliminada.");
  }

  function imprimirDocumento() {
    document.body.classList.add("imprimiendo-factura");
    const limpiar = () => document.body.classList.remove("imprimiendo-factura");
    window.addEventListener("afterprint", limpiar, { once: true });
    window.print();
    setTimeout(limpiar, 1500);
  }

  return (
    <section className="panel facturacion-page">
      <header className="facturacion-cabecera no-imprimir">
        <div>
          <p className="etiqueta">Administración</p>
          <h2>Facturación</h2>
          <p>Crea facturas manuales con datos de cliente opcionales.</p>
        </div>
        <button type="button" className="boton-principal" onClick={abrirNueva}>
          ➕ Nueva factura manual
        </button>
      </header>

      {error && <p className="mensaje-error no-imprimir">Error: {error}</p>}
      {mensaje && <p className="mensaje no-imprimir">{mensaje}</p>}

      <div className="facturacion-resumen no-imprimir">
        <article><span>Facturado</span><strong>{moneda(resumen.total)}</strong></article>
        <article><span>Cobrado</span><strong>{moneda(resumen.cobrado)}</strong></article>
        <article><span>Pendiente</span><strong>{moneda(resumen.pendiente)}</strong></article>
        <article><span>Facturas</span><strong>{facturas.length}</strong></article>
      </div>

      {mostrarFormulario && (
        <div className="modal-fondo no-imprimir" onClick={() => setMostrarFormulario(false)}>
          <form className="modal-contenido factura-manual-modal" onSubmit={guardarFactura} onClick={(e) => e.stopPropagation()}>
            <div className="modal-cabecera">
              <div>
                <p className="etiqueta">FACTURACIÓN</p>
                <h2>{editandoId ? "Editar factura" : "Nueva factura manual"}</h2>
                <p>Nombre, CIF, dirección, email y teléfono son opcionales.</p>
              </div>
              <button type="button" className="boton-cerrar-modal" onClick={() => setMostrarFormulario(false)}>×</button>
            </div>

            <section className="factura-manual-seccion">
              <h3>Datos generales</h3>
              <div className="factura-manual-grid">
                <Campo label="Cliente guardado" ancho>
                  <select
                    value={formulario.cliente_id}
                    onChange={(e) => seleccionarCliente(e.target.value)}
                  >
                    <option value="">— Escoger cliente —</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre ||
                          cliente.razon_social ||
                          cliente.empresa ||
                          cliente.nombre_fiscal ||
                          `Cliente ${cliente.id}`}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Número de pedido">
                  <input
                    value={formulario.numero_pedido}
                    onChange={(e) => actualizarCampo("numero_pedido", e.target.value)}
                    placeholder="Opcional"
                  />
                </Campo>
                <Campo label="Número correlativo">
                  <input
                    value={editandoId ? formulario.numero : "Se asignará automáticamente"}
                    readOnly
                  />
                </Campo>
                <Campo label="Fecha"><input type="date" value={formulario.fecha_factura} onChange={(e) => actualizarCampo("fecha_factura", e.target.value)} /></Campo>
                <Campo label="Vencimiento"><input type="date" value={formulario.fecha_vencimiento} onChange={(e) => actualizarCampo("fecha_vencimiento", e.target.value)} /></Campo>
                <Campo label="Estado">
                  <select value={formulario.estado} onChange={(e) => actualizarCampo("estado", e.target.value)}>
                    <option value="pendiente">Pendiente</option><option value="pagada">Pagada</option><option value="anulada">Anulada</option>
                  </select>
                </Campo>
                <Campo label="Forma de pago">
                  <select value={formulario.forma_pago} onChange={(e) => actualizarCampo("forma_pago", e.target.value)}>
                    {FORMAS_PAGO.map((forma) => <option key={forma.value} value={forma.value}>{forma.label}</option>)}
                  </select>
                </Campo>
                <Campo label="IVA incluido">
                  <select value={formulario.iva_incluido ? "si" : "no"} onChange={(e) => actualizarCampo("iva_incluido", e.target.value === "si") }>
                    <option value="no">No: sumar IVA</option><option value="si">Sí: precio final</option>
                  </select>
                </Campo>
              </div>
            </section>

            <section className="factura-manual-seccion">
              <h3>Datos del cliente <small>Opcionales</small></h3>
              <div className="factura-manual-grid">
                <Campo label="Nombre o empresa" ancho><input value={formulario.nombre_cliente} onChange={(e) => actualizarCampo("nombre_cliente", e.target.value)} /></Campo>
                <Campo label="CIF / NIF"><input value={formulario.cif} onChange={(e) => actualizarCampo("cif", e.target.value)} /></Campo>
                <Campo label="Dirección" ancho><input value={formulario.direccion} onChange={(e) => actualizarCampo("direccion", e.target.value)} /></Campo>
                <Campo label="Código postal"><input value={formulario.codigo_postal} onChange={(e) => actualizarCampo("codigo_postal", e.target.value)} /></Campo>
                <Campo label="Población"><input value={formulario.poblacion} onChange={(e) => actualizarCampo("poblacion", e.target.value)} /></Campo>
                <Campo label="Provincia"><input value={formulario.provincia} onChange={(e) => actualizarCampo("provincia", e.target.value)} /></Campo>
                <Campo label="Email"><input type="email" value={formulario.email} onChange={(e) => actualizarCampo("email", e.target.value)} /></Campo>
                <Campo label="Teléfono"><input value={formulario.telefono} onChange={(e) => actualizarCampo("telefono", e.target.value)} /></Campo>
              </div>
            </section>

            <section className="factura-manual-seccion">
              <div className="import-lines-header"><h3>Conceptos</h3><button type="button" onClick={añadirLinea}>+ Añadir línea</button></div>
              <div className="tabla-responsive">
                <table className="tabla-factura-manual">
                  <thead><tr><th>Concepto</th><th>Cantidad</th><th>Precio</th><th>IVA</th><th>Total</th><th></th></tr></thead>
                  <tbody>
                    {formulario.lineas.map((linea) => {
                      const calculo = calcularLinea(linea, formulario.iva_incluido);
                      return (
                        <tr key={linea.temporalId}>
                          <td><input value={linea.descripcion} onChange={(e) => actualizarLinea(linea.temporalId, "descripcion", e.target.value)} placeholder="Concepto" /></td>
                          <td><input type="number" min="0" step="0.01" value={linea.cantidad} onChange={(e) => actualizarLinea(linea.temporalId, "cantidad", e.target.value)} /></td>
                          <td><input type="number" step="0.01" value={linea.precio_unitario} onChange={(e) => actualizarLinea(linea.temporalId, "precio_unitario", e.target.value)} /></td>
                          <td><select value={linea.iva} onChange={(e) => actualizarLinea(linea.temporalId, "iva", e.target.value)}>{TIPOS_IVA.map((tipo) => <option key={tipo} value={tipo}>{tipo} %</option>)}</select></td>
                          <td><strong>{moneda(calculo.total)}</strong></td>
                          <td><button type="button" className="boton-peligro" onClick={() => eliminarLinea(linea.temporalId)}>×</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="factura-manual-totales">
                <div><span>Base imponible</span><strong>{moneda(calculos.base)}</strong></div>
                <div><span>IVA</span><strong>{moneda(calculos.iva)}</strong></div>
                <div className="factura-manual-total-final"><span>Total</span><strong>{moneda(calculos.total)}</strong></div>
              </div>
            </section>

            <section className="factura-manual-seccion">
              <div className="factura-manual-grid">
                <Campo label="Detalle general" ancho><textarea rows="4" value={formulario.detalle_concepto} onChange={(e) => actualizarCampo("detalle_concepto", e.target.value)} /></Campo>
                <Campo label="Observaciones" ancho><textarea rows="3" value={formulario.observaciones} onChange={(e) => actualizarCampo("observaciones", e.target.value)} /></Campo>
              </div>
            </section>

            <div className="modal-acciones">
              <button type="button" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
              <button type="submit" className="boton-principal" disabled={guardando}>{guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear factura"}</button>
            </div>
          </form>
        </div>
      )}

      {facturaAbierta && (
        <section id="vista-factura" className="factura-vista-completa">
          <div className="factura-barra-acciones no-imprimir">
            <div><strong>Factura abierta</strong><span>{facturaAbierta.nombre_cliente || "Sin datos de cliente"}</span></div>
            <div className="grupo-botones">
              <button type="button" onClick={() => editarFactura(facturaAbierta)}>✏ Editar</button>
              <button type="button" onClick={imprimirDocumento}>🖨 Imprimir / PDF</button>
              <button type="button" className="boton-cancelar" onClick={() => setFacturaAbierta(null)}>Cerrar</button>
            </div>
          </div>
          <DocumentoFactura factura={facturaAbierta} />
        </section>
      )}

      <div className="facturacion-filtros no-imprimir">
        <input type="search" placeholder="Buscar por cliente, CIF, número o concepto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}><option value="">Todos los estados</option><option value="pendiente">Pendiente</option><option value="pagada">Pagada</option><option value="anulada">Anulada</option></select>
        <select value={filtroPago} onChange={(e) => setFiltroPago(e.target.value)}><option value="">Todas las formas de pago</option>{FORMAS_PAGO.map((forma) => <option key={forma.value} value={forma.value}>{forma.label}</option>)}</select>
      </div>

      {cargando ? <p className="mensaje no-imprimir">Cargando facturas...</p> : (
        <div className="tabla-responsive no-imprimir">
          <table className="tabla-facturas">
            <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Pago</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead>
            <tbody>
              {facturasFiltradas.map((factura) => (
                <tr key={factura.id}>
                  <td><strong>{factura.numero || "—"}</strong></td>
                  <td>{fechaEspañola(factura.fecha_factura)}</td>
                  <td>{factura.nombre_cliente || "Sin cliente"}</td>
                  <td>{etiquetaPago(factura.forma_pago)}</td>
                  <td><span className={`factura-estado ${factura.estado || "pendiente"}`}>{factura.estado || "pendiente"}</span></td>
                  <td><strong>{moneda(factura.total)}</strong></td>
                  <td><div className="acciones"><button onClick={() => setFacturaAbierta(factura)}>👁 Abrir</button><button onClick={() => editarFactura(factura)}>✏ Editar</button><button onClick={() => duplicarFactura(factura)}>📋 Duplicar</button><button className="boton-peligro" onClick={() => eliminarFactura(factura)}>🗑</button></div></td>
                </tr>
              ))}
              {!facturasFiltradas.length && <tr><td colSpan="7">No hay facturas.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Campo({ label, ancho = false, children }) {
  return <label className={ancho ? "factura-manual-ancho" : ""}>{label}{children}</label>;
}

function DocumentoFactura({ factura }) {
  const lineas = leerLineas(factura.lineas);
  const ivaIncluido = factura.iva_incluido === true || factura.iva_incluido === "true";
  const totales = calcularFactura(lineas, ivaIncluido);
  const hayCliente = Boolean(factura.nombre_cliente || factura.cif || factura.direccion || factura.email || factura.telefono);

  return (
    <article className="documento-factura-imprimir factura-modelo-cliente">
      <header className="factura-modelo-cabecera">
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.4rem)",
            lineHeight: 1.05,
            marginBottom: "12px",
          }}
        >
          DATOS PARA LA FACTURA
        </h1>
        <h2>{factura.nombre_cliente || ""}</h2>
        <div className="factura-documento-meta">
          <span><strong>Número:</strong> {factura.numero || "—"}</span>
          <span><strong>Fecha:</strong> {fechaEspañola(factura.fecha_factura)}</span>
          {factura.numero_pedido && (
            <span><strong>N.º pedido:</strong> {factura.numero_pedido}</span>
          )}
        </div>
      </header>

      {hayCliente && (
        <section className="factura-modelo-bloque">
          <h3>DATOS DEL CLIENTE</h3>
          <dl className="factura-modelo-datos">
            {factura.nombre_cliente && <div><dt>Nombre:</dt><dd>{factura.nombre_cliente}</dd></div>}
            {factura.cif && <div><dt>CIF:</dt><dd>{factura.cif}</dd></div>}
            {factura.direccion && <div><dt>Dirección:</dt><dd>{[factura.direccion, factura.codigo_postal, factura.poblacion, factura.provincia].filter(Boolean).join(", ")}</dd></div>}
            {factura.email && <div><dt>E-mail:</dt><dd>{factura.email}</dd></div>}
            {factura.telefono && <div><dt>Teléfono:</dt><dd>{factura.telefono}</dd></div>}
          </dl>
        </section>
      )}

      <section className="factura-modelo-bloque">
        <h3>FORMA DE PAGO</h3>
        <dl className="factura-modelo-datos">
          <div>
            <dt>Forma de pago:</dt>
            <dd>{etiquetaPago(factura.forma_pago)}</dd>
          </div>
          <div>
            <dt>Fecha de vencimiento:</dt>
            <dd>{fechaEspañola(factura.fecha_vencimiento)}</dd>
          </div>
          <div>
            <dt>Estado de pago:</dt>
            <dd>{etiquetaEstado(factura.estado)}</dd>
          </div>
          {factura.fecha_pago && (
            <div>
              <dt>Fecha de pago:</dt>
              <dd>{fechaEspañola(factura.fecha_pago)}</dd>
            </div>
          )}
        </dl>
      </section>

      {factura.detalle_concepto && <section className="factura-modelo-bloque"><h3>DETALLE CONCEPTO FACTURA</h3><div className="factura-modelo-concepto">{String(factura.detalle_concepto).split("\n").map((linea, indice) => <p key={indice}>{linea || "\u00A0"}</p>)}</div></section>}

      <section className="factura-documento-lineas">
        <table>
          <thead><tr><th>Concepto</th><th>Cant.</th><th>Precio</th><th>IVA</th><th>Total</th></tr></thead>
          <tbody>{lineas.map((linea, indice) => { const calculo = calcularLinea(linea, ivaIncluido); return <tr key={indice}><td>{linea.descripcion || "Concepto"}</td><td>{numero(linea.cantidad)}</td><td>{moneda(linea.precio_unitario)}</td><td>{numero(linea.iva)} %</td><td><strong>{moneda(calculo.total)}</strong></td></tr>; })}</tbody>
        </table>
      </section>

      <section className="factura-documento-totales">
        <div><span>Base imponible</span><strong>{moneda(totales.base)}</strong></div>
        <div><span>IVA</span><strong>{moneda(totales.iva)}</strong></div>
        <div className="factura-documento-total"><span>Total</span><strong>{moneda(totales.total)}</strong></div>
        <p>IVA incluido: <strong>{ivaIncluido ? "Sí" : "No"}</strong></p>
        <p>Forma de pago: <strong>{etiquetaPago(factura.forma_pago)}</strong></p>
      </section>

      {factura.observaciones && <section className="factura-modelo-observaciones"><strong>Observaciones:</strong><p>{factura.observaciones}</p></section>}
    </article>
  );
}

function calcularLinea(linea, ivaIncluido) {
  const importe = numero(linea.cantidad) * numero(linea.precio_unitario);
  const tipoIva = numero(linea.iva);
  if (ivaIncluido) {
    const base = importe / (1 + tipoIva / 100);
    return { base, iva: importe - base, total: importe };
  }
  const iva = importe * tipoIva / 100;
  return { base: importe, iva, total: importe + iva };
}

function calcularFactura(lineas, ivaIncluido) {
  return (Array.isArray(lineas) ? lineas : []).reduce((acc, linea) => {
    const calculo = calcularLinea(linea, ivaIncluido);
    acc.base += calculo.base;
    acc.iva += calculo.iva;
    acc.total += calculo.total;
    return acc;
  }, { base: 0, iva: 0, total: 0 });
}

function normalizar(valor) {
  return String(valor ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;
  const resultado = Number(String(valor).replace(/[€\s]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
  return Number.isFinite(resultado) ? resultado : 0;
}

function moneda(valor) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(numero(valor));
}

function fechaEspañola(valor) {
  if (!valor) return "—";
  const [ano, mes, dia] = String(valor).slice(0, 10).split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : String(valor);
}

function fechaActual() {
  return new Date().toISOString().slice(0, 10);
}

function etiquetaPago(valor) {
  return FORMAS_PAGO.find((forma) => forma.value === valor)?.label || "Transferencia";
}

function etiquetaEstado(valor) {
  if (valor === "pagada") return "Pagada";
  if (valor === "anulada") return "Anulada";
  return "Pendiente";
}

export default Facturacion;