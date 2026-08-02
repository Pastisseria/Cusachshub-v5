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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setCargando(false);
      return;
    }

    const listado = data ?? [];
    setFacturas(listado);

    const idImprimir = searchParams.get("imprimir");
    if (idImprimir) {
      const factura = listado.find(
        (item) => String(item.id) === String(idImprimir),
      );
      if (factura) await abrirFactura(factura, true);
    }

    setCargando(false);
  }

  const facturasFiltradas = useMemo(() => {
    const texto = normalizar(busqueda);

    return facturas.filter((factura) => {
      const contenido = normalizar(
        [
          factura.numero,
          factura.nombre_cliente,
          factura.cif,
          factura.detalle_concepto,
          factura.numero_pedido,
          factura.email,
        ].join(" "),
      );

      return (
        (!texto || contenido.includes(texto)) &&
        (!filtroEstado || factura.estado === filtroEstado) &&
        (!filtroPago || factura.forma_pago === filtroPago)
      );
    });
  }, [facturas, busqueda, filtroEstado, filtroPago]);

  const resumen = useMemo(() => {
    return facturas.reduce(
      (acumulado, factura) => {
        const total = numero(factura.total);
        acumulado.total += total;
        if (factura.estado === "pagada") acumulado.cobrado += total;
        if (factura.estado === "pendiente") acumulado.pendiente += total;
        return acumulado;
      },
      { total: 0, cobrado: 0, pendiente: 0 },
    );
  }, [facturas]);

  async function abrirFactura(factura, imprimir = false) {
    setError("");
    setMensaje("");

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
      setTimeout(() => imprimirDocumento(), 350);
      return;
    }

    setTimeout(() => {
      document
        .getElementById("vista-factura")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
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
      setGuardando(false);
      return;
    }

    setFacturas((anteriores) =>
      anteriores.map((item) => (item.id === factura.id ? data : item)),
    );
    setFacturaAbierta((anterior) =>
      anterior?.id === factura.id ? data : anterior,
    );
    setMensaje("Factura actualizada correctamente.");
    setGuardando(false);
  }

  function imprimirDocumento() {
    document.body.classList.add("imprimiendo-factura");

    const limpiar = () => {
      document.body.classList.remove("imprimiendo-factura");
      window.removeEventListener("afterprint", limpiar);
    };

    window.addEventListener("afterprint", limpiar);
    window.print();
    setTimeout(limpiar, 1500);
  }

  async function imprimirFactura(factura) {
    if (!facturaAbierta || facturaAbierta.id !== factura.id) {
      await abrirFactura(factura, false);
    }
    setTimeout(() => imprimirDocumento(), 350);
  }

  function cerrarFactura() {
    setFacturaAbierta(null);
    setLineas([]);
    setMensaje("");
    setError("");
  }

  return (
    <section className="panel facturacion-page">
      <header className="facturacion-cabecera no-imprimir">
        <div>
          <p className="etiqueta">Administración</p>
          <h2>Facturación</h2>
          <p>Histórico de facturas generadas desde Presupuestos.</p>
        </div>
      </header>

      {error && <p className="mensaje-error no-imprimir">Error: {error}</p>}
      {mensaje && <p className="mensaje no-imprimir">{mensaje}</p>}

      <div className="facturacion-resumen no-imprimir">
        <article><span>Facturado</span><strong>{moneda(resumen.total)}</strong></article>
        <article><span>Cobrado</span><strong>{moneda(resumen.cobrado)}</strong></article>
        <article><span>Pendiente</span><strong>{moneda(resumen.pendiente)}</strong></article>
        <article><span>Facturas</span><strong>{facturas.length}</strong></article>
      </div>

      {facturaAbierta && (
        <section id="vista-factura" className="factura-vista-completa">
          <div className="factura-barra-acciones no-imprimir">
            <div>
              <strong>Factura abierta</strong>
              <span>{facturaAbierta.nombre_cliente}</span>
            </div>

            <div className="grupo-botones">
              <button type="button" onClick={imprimirDocumento}>
                🖨 Imprimir / Guardar PDF
              </button>
              <button type="button" className="boton-cancelar" onClick={cerrarFactura}>
                Cerrar
              </button>
            </div>
          </div>

          <div className="factura-cobro-grid no-imprimir">
            <label>
              Estado
              <select
                value={facturaAbierta.estado || "pendiente"}
                disabled={guardando}
                onChange={(evento) =>
                  actualizarCobro(facturaAbierta, { estado: evento.target.value })
                }
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
                onChange={(evento) =>
                  actualizarCobro(facturaAbierta, { forma_pago: evento.target.value })
                }
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
                onChange={(evento) =>
                  actualizarCobro(facturaAbierta, { fecha_pago: evento.target.value })
                }
              />
            </label>
          </div>

          <DocumentoFactura factura={facturaAbierta} lineas={lineas} />
        </section>
      )}

      <div className="facturacion-filtros no-imprimir">
        <input
          type="search"
          placeholder="Buscar por cliente, CIF, pedido o concepto..."
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
        />

        <select value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagada">Pagada</option>
          <option value="anulada">Anulada</option>
        </select>

        <select value={filtroPago} onChange={(evento) => setFiltroPago(evento.target.value)}>
          <option value="">Todas las formas de pago</option>
          {FORMAS_PAGO.map((forma) => (
            <option key={forma.value} value={forma.value}>{forma.label}</option>
          ))}
        </select>
      </div>

      {cargando ? (
        <p className="mensaje no-imprimir">Cargando facturas...</p>
      ) : (
        <div className="tabla-responsive no-imprimir">
          <table className="tabla-facturas">
            <thead>
              <tr>
                <th>Número interno</th>
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
                  <td><strong>{factura.numero || "—"}</strong></td>
                  <td>{fechaEspañola(factura.fecha_factura)}</td>
                  <td>{factura.nombre_cliente || "Sin cliente"}</td>
                  <td>{etiquetaPago(factura.forma_pago)}</td>
                  <td>
                    <span className={`factura-estado ${factura.estado || "pendiente"}`}>
                      {factura.estado || "pendiente"}
                    </span>
                  </td>
                  <td><strong>{moneda(factura.total)}</strong></td>
                  <td>
                    <div className="acciones">
                      <button type="button" onClick={() => abrirFactura(factura)}>👁 Abrir</button>
                      <button type="button" onClick={() => imprimirFactura(factura)}>🖨 PDF</button>
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
    </section>
  );
}

function DocumentoFactura({ factura, lineas }) {
  const concepto =
    factura.detalle_concepto ||
    factura.concepto ||
    lineas.map((linea) => linea.descripcion).filter(Boolean).join("\n") ||
    "Servicio de catering";

  const numeroPedido =
    factura.numero_pedido ||
    factura.n_pedido ||
    factura.pedido ||
    factura.referencia_pedido ||
    "";

  const ivaIncluido =
    factura.iva_incluido === true ||
    factura.iva_incluido === "true" ||
    factura.iva_incluido === "si" ||
    factura.iva_incluido === "sí";

  const importeMostrar =
    factura.importe !== null && factura.importe !== undefined
      ? factura.importe
      : factura.total;

  return (
    <article className="documento-factura-imprimir factura-modelo-cliente">
      <header className="factura-modelo-cabecera">
        <h1>FACTURA</h1>
        <h2>{factura.nombre_cliente || "CLIENTE"}</h2>
      </header>

      <section className="factura-modelo-bloque">
        <h3>DATOS PARA FACTURA</h3>
        <div className="factura-modelo-subtitulo">Datos Cliente</div>

        <dl className="factura-modelo-datos">
          <div><dt>Nombre:</dt><dd>{factura.nombre_cliente || "—"}</dd></div>
          <div><dt>CIF:</dt><dd>{factura.cif || "—"}</dd></div>
          <div><dt>Dirección:</dt><dd>{factura.direccion || "—"}</dd></div>
          <div><dt>E-mail:</dt><dd>{factura.email || "—"}</dd></div>
          <div><dt>Fecha Factura:</dt><dd>{fechaEspañola(factura.fecha_factura)}</dd></div>
        </dl>
      </section>

      <section className="factura-modelo-bloque">
        <h3>DETALLE CONCEPTO FACTURA</h3>

        <div className="factura-modelo-concepto">
          {String(concepto)
            .split("\n")
            .filter(Boolean)
            .map((linea, indice) => (
              <p key={`${linea}-${indice}`}>{linea}</p>
            ))}
        </div>

        {numeroPedido && (
          <p className="factura-modelo-pedido">
            <strong>N.º DE PEDIDO:</strong> {numeroPedido}
          </p>
        )}
      </section>

      <section className="factura-modelo-resumen">
        <div className="factura-modelo-fila">
          <span>Importe:</span>
          <strong>{moneda(importeMostrar)}</strong>
        </div>

        <div className="factura-modelo-fila">
          <span>IVA incluido:</span>
          <div className="factura-modelo-opciones">
            <span className={ivaIncluido ? "seleccionada" : ""}>
              {ivaIncluido ? "☒" : "☐"} Sí
            </span>
            <span className={!ivaIncluido ? "seleccionada" : ""}>
              {!ivaIncluido ? "☒" : "☐"} No
            </span>
          </div>
        </div>

        <div className="factura-modelo-fila">
          <span>Forma de pago:</span>
          <div className="factura-modelo-opciones factura-modelo-pagos">
            {FORMAS_PAGO.map((forma) => {
              const seleccionada =
                (factura.forma_pago || "transferencia") === forma.value;

              return (
                <span key={forma.value} className={seleccionada ? "seleccionada" : ""}>
                  {seleccionada ? "☒" : "☐"} {forma.label}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {factura.observaciones && (
        <section className="factura-modelo-observaciones">
          <strong>Observaciones:</strong>
          <p>{factura.observaciones}</p>
        </section>
      )}
    </article>
  );
}

function normalizar(valor) {
  return String(valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;

  const resultado = Number(
    String(valor)
      .replace(/[€\s]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", "."),
  );

  return Number.isFinite(resultado) ? resultado : 0;
}

function moneda(valor) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(numero(valor));
}

function fechaEspañola(valor) {
  if (!valor) return "—";
  const [ano, mes, dia] = String(valor).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return String(valor);
  return `${dia}/${mes}/${ano}`;
}

function fechaActual() {
  return new Date().toISOString().slice(0, 10);
}

function etiquetaPago(valor) {
  const forma = FORMAS_PAGO.find((item) => item.value === valor);
  return forma?.label || "Transferencia";
}

export default Facturacion;