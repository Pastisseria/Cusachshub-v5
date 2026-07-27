import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../supabase.js";

const FORMAS_PAGO = [
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta / Visa" },
  { value: "efectivo", label: "Efectivo" },
];

function Facturacion() {
  const [searchParams] = useSearchParams();
  const [facturas, setFacturas] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [facturaAbierta, setFacturaAbierta] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPago, setFiltroPago] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarFacturas();
  }, []);

  async function cargarFacturas() {
    setCargando(true);
    setError("");

    const { data, error: supabaseError } = await supabase
      .from("facturas")
      .select("*")
      .order("fecha_factura", { ascending: false })
      .order("created_at", { ascending: false });

    if (supabaseError) {
      setError(supabaseError.message);
      setFacturas([]);
    } else {
      setFacturas(data ?? []);

      const idImprimir = searchParams.get("imprimir");
      if (idImprimir) {
        const factura = (data ?? []).find((item) => String(item.id) === idImprimir);
        if (factura) await abrirFactura(factura, true);
      }
    }

    setCargando(false);
  }

  const facturasFiltradas = useMemo(() => {
    const texto = normalizar(busqueda);

    return facturas.filter((factura) => {
      const contenido = normalizar([
        factura.numero,
        factura.nombre_cliente,
        factura.cif,
        factura.detalle_concepto,
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

  async function abrirFactura(factura, imprimir = false) {
    setError("");

    const { data, error: supabaseError } = await supabase
      .from("factura_lineas")
      .select("*")
      .eq("factura_id", factura.id)
      .order("orden", { ascending: true });

    if (supabaseError) {
      setError(supabaseError.message);
      return;
    }

    setFacturaAbierta(factura);
    setLineas(data ?? []);

    if (imprimir) {
      setTimeout(() => window.print(), 300);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function actualizarCobro(factura, cambios) {
    setGuardando(true);
    setError("");
    setMensaje("");

    const datos = {
      ...cambios,
      updated_at: new Date().toISOString(),
    };

    if (datos.estado === "pagada" && !datos.fecha_pago) {
      datos.fecha_pago = fechaActual();
    }

    if (datos.estado && datos.estado !== "pagada") {
      datos.fecha_pago = null;
    }

    const { data, error: supabaseError } = await supabase
      .from("facturas")
      .update(datos)
      .eq("id", factura.id)
      .select("*")
      .single();

    if (supabaseError) {
      setError(supabaseError.message);
    } else {
      setFacturas((anteriores) =>
        anteriores.map((item) => (item.id === factura.id ? data : item)),
      );
      setFacturaAbierta((anterior) =>
        anterior?.id === factura.id ? data : anterior,
      );
      setMensaje("Cobro actualizado correctamente.");
    }

    setGuardando(false);
  }

  function imprimirFactura(factura) {
    abrirFactura(factura, true);
  }

  return (
    <section className="panel facturacion-page">
      <div className="facturacion-cabecera">
        <div>
          <p className="etiqueta">Administración</p>
          <h2>Facturación</h2>
          <p>Histórico de facturas generadas desde Presupuestos.</p>
        </div>
      </div>

      {error && <p className="mensaje-error">Error: {error}</p>}
      {mensaje && <p className="mensaje">{mensaje}</p>}

      <div className="facturacion-resumen">
        <article><span>Facturado</span><strong>{moneda(resumen.total)}</strong></article>
        <article><span>Cobrado</span><strong>{moneda(resumen.cobrado)}</strong></article>
        <article><span>Pendiente</span><strong>{moneda(resumen.pendiente)}</strong></article>
        <article><span>Facturas</span><strong>{facturas.length}</strong></article>
      </div>

      {facturaAbierta && (
        <div className="factura-detalle no-imprimir">
          <div className="facturacion-cabecera">
            <div>
              <p className="etiqueta">Factura</p>
              <h3>{facturaAbierta.numero}</h3>
              <p>{facturaAbierta.nombre_cliente}</p>
            </div>
            <button type="button" className="boton-cancelar" onClick={() => setFacturaAbierta(null)}>
              Cerrar
            </button>
          </div>

          <div className="factura-cobro-grid">
            <label>
              Estado
              <select
                value={facturaAbierta.estado || "pendiente"}
                disabled={guardando}
                onChange={(event) => actualizarCobro(facturaAbierta, { estado: event.target.value })}
              >
                <option value="pendiente">Pendiente</option>
                <option value="pagada">Pagada</option>
                <option value="anulada">Anulada</option>
              </select>
            </label>

            <label>
              Forma de pago
              <select
                value={facturaAbierta.forma_pago || "transferencia"}
                disabled={guardando}
                onChange={(event) => actualizarCobro(facturaAbierta, { forma_pago: event.target.value })}
              >
                {FORMAS_PAGO.map((forma) => (
                  <option key={forma.value} value={forma.value}>{forma.label}</option>
                ))}
              </select>
            </label>

            <label>
              Fecha de pago
              <input
                type="date"
                value={facturaAbierta.fecha_pago || ""}
                disabled={guardando || facturaAbierta.estado !== "pagada"}
                onChange={(event) => actualizarCobro(facturaAbierta, { fecha_pago: event.target.value })}
              />
            </label>

            <button type="button" onClick={() => imprimirFactura(facturaAbierta)}>
              🖨️ Imprimir / Guardar PDF
            </button>
          </div>
        </div>
      )}

      <div className="facturacion-filtros no-imprimir">
        <input
          type="search"
          placeholder="Buscar por número, cliente, CIF o concepto..."
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />

        <select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagada">Pagada</option>
          <option value="anulada">Anulada</option>
        </select>

        <select value={filtroPago} onChange={(event) => setFiltroPago(event.target.value)}>
          <option value="">Todas las formas de pago</option>
          {FORMAS_PAGO.map((forma) => (
            <option key={forma.value} value={forma.value}>{forma.label}</option>
          ))}
        </select>
      </div>

      {cargando ? (
        <p className="mensaje">Cargando facturas...</p>
      ) : (
        <div className="tabla-responsive no-imprimir">
          <table className="tabla-facturas">
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Pago</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas.map((factura) => (
                <tr key={factura.id}>
                  <td><strong>{factura.numero}</strong></td>
                  <td>{fechaEspañola(factura.fecha_factura)}</td>
                  <td>{factura.nombre_cliente}</td>
                  <td>{etiquetaPago(factura.forma_pago)}</td>
                  <td><span className={`factura-estado ${factura.estado}`}>{factura.estado}</span></td>
                  <td><strong>{moneda(factura.total)}</strong></td>
                  <td>
                    <div className="acciones">
                      <button type="button" onClick={() => abrirFactura(factura)}>👁️ Abrir</button>
                      <button type="button" onClick={() => imprimirFactura(factura)}>🖨️ PDF</button>
                    </div>
                  </td>
                </tr>
              ))}
              {facturasFiltradas.length === 0 && (
                <tr><td colSpan="7">No hay facturas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {facturaAbierta && <DocumentoFactura factura={facturaAbierta} lineas={lineas} />}
    </section>
  );
}

function DocumentoFactura({ factura, lineas }) {
  return (
    <section className="documento-factura-imprimir">
      <header className="factura-print-header">
        <div>
          <h1>PASTISSERIA CUSACHS</h1>
          <p>Factura</p>
        </div>
        <div>
          <h2>{factura.numero}</h2>
          <p>{fechaEspañola(factura.fecha_factura)}</p>
        </div>
      </header>

      <div className="factura-print-cliente">
        <h3>Datos del cliente</h3>
        <p><strong>Nombre:</strong> {factura.nombre_cliente}</p>
        <p><strong>CIF:</strong> {factura.cif || "—"}</p>
        <p><strong>Dirección:</strong> {factura.direccion || "—"}</p>
        <p><strong>E-mail:</strong> {factura.email || "—"}</p>
      </div>

      <table className="factura-print-tabla">
        <thead>
          <tr>
            <th>Concepto</th><th>Cantidad</th><th>Precio</th><th>IVA</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((linea) => (
            <tr key={linea.id}>
              <td>{linea.descripcion}</td>
              <td>{linea.cantidad}</td>
              <td>{moneda(linea.precio_unitario)}</td>
              <td>{linea.iva} %</td>
              <td>{moneda(linea.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="factura-print-totales">
        <p><span>Base imponible</span><strong>{moneda(factura.base_imponible)}</strong></p>
        <p><span>IVA</span><strong>{moneda(factura.importe_iva)}</strong></p>
        <p className="total"><span>Total</span><strong>{moneda(factura.total)}</strong></p>
      </div>

      <div className="factura-print-pago">
        <p><strong>Forma de pago:</strong> {etiquetaPago(factura.forma_pago)}</p>
        <p><strong>Estado:</strong> {factura.estado === "pagada" ? "Pagada" : "Pendiente de pago"}</p>
        {factura.fecha_pago && <p><strong>Fecha de pago:</strong> {fechaEspañola(factura.fecha_pago)}</p>}
      </div>

      {factura.observaciones && <p className="factura-print-observaciones">{factura.observaciones}</p>}
    </section>
  );
}

function normalizar(valor) {
  return String(valor ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function numero(valor) {
  const resultado = Number(String(valor ?? "").replace(",", "."));
  return Number.isFinite(resultado) ? resultado : 0;
}

function moneda(valor) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(numero(valor));
}

function fechaEspañola(valor) {
  if (!valor) return "—";
  const [a, m, d] = String(valor).slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function fechaActual() {
  return new Date().toISOString().slice(0, 10);
}

function etiquetaPago(valor) {
  if (valor === "tarjeta") return "Tarjeta / Visa";
  if (valor === "efectivo") return "Efectivo";
  return "Transferencia";
}

export default Facturacion;
