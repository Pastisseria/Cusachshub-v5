import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

function Dashboard() {
  const [datos, setDatos] = useState({
    presupuestos: 0,
    facturasPendientes: 0,
    cobradoMes: 0,
    facturadoMes: 0,
  });

  const [cateringsHoy, setCateringsHoy] = useState([]);
  const [lineasPorPresupuesto, setLineasPorPresupuesto] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const hoyISO = obtenerFechaISO(new Date());
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyISO);

  useEffect(() => {
    cargarDashboard(fechaSeleccionada);
  }, [fechaSeleccionada]);

  async function cargarDashboard(fechaOperativa = fechaSeleccionada) {
    setCargando(true);
    setError("");

    try {
      const hoy = new Date();
      const inicioMes = `${hoy.getFullYear()}-${String(
        hoy.getMonth() + 1,
      ).padStart(2, "0")}-01`;

      const [
        respuestaPresupuestosResumen,
        respuestaFacturas,
        respuestaPresupuestosHoy,
        respuestaCateringsHoy,
        respuestaProduccionHoy,
      ] = await Promise.all([
        supabase.from("presupuestos").select("id, estado"),

        supabase
          .from("facturas")
          .select("total, estado, fecha_factura")
          .gte("fecha_factura", inicioMes),

        supabase
          .from("presupuestos")
          .select(`
            id,
            numero,
            cliente_id,
            fecha,
            estado,
            tipo_documento,
            hora_entrega,
            direccion_entrega,
            persona_contacto,
            telefono_contacto,
            observaciones,
            clientes (
              id,
              nombre,
              empresa,
              telefono,
              email
            )
          `)
          .eq("fecha", fechaOperativa)
          .eq("estado", "Aceptado")
          .order("hora_entrega", { ascending: true }),

        supabase
          .from("caterings")
          .select(`
            id,
            presupuesto_id,
            cliente_id,
            titulo,
            fecha,
            hora_inicio,
            hora_fin,
            direccion,
            poblacion,
            codigo_postal,
            numero_personas,
            responsable,
            telefono_contacto,
            tipo_servicio,
            observaciones,
            estado,
            clientes (
              id,
              nombre,
              empresa,
              telefono,
              email
            )
          `)
          .eq("fecha", fechaOperativa)
          .neq("estado", "Cancelado")
          .order("hora_inicio", { ascending: true }),

        supabase
          .from("producciones")
          .select(`
            id,
            catering_id,
            cliente_id,
            cliente_nombre,
            pedido_nombre,
            fecha,
            zona,
            producto_nombre,
            cantidad,
            unidad,
            estado,
            hora_limite,
            direccion_entrega,
            observaciones
          `)
          .eq("fecha", fechaOperativa)
          .neq("estado", "Cancelado")
          .order("hora_limite", { ascending: true }),
      ]);

      const errores = [
        respuestaPresupuestosResumen.error,
        respuestaFacturas.error,
        respuestaPresupuestosHoy.error,
        respuestaCateringsHoy.error,
        respuestaProduccionHoy.error,
      ].filter(Boolean);

      if (errores.length > 0) {
        throw errores[0];
      }

      const listaPresupuestosResumen =
        respuestaPresupuestosResumen.data ?? [];
      const listaFacturas = respuestaFacturas.data ?? [];
      const presupuestosHoy = respuestaPresupuestosHoy.data ?? [];
      const cateringsBD = respuestaCateringsHoy.data ?? [];
      const produccionHoy = respuestaProduccionHoy.data ?? [];

      setDatos({
        presupuestos: listaPresupuestosResumen.filter(
          (item) =>
            ![
              "Facturado",
              "Cancelado",
              "Facturado externamente",
            ].includes(item.estado),
        ).length,

        facturasPendientes: listaFacturas.filter(
          (item) =>
            String(item.estado || "").toLowerCase() === "pendiente",
        ).length,

        cobradoMes: listaFacturas
          .filter(
            (item) =>
              String(item.estado || "").toLowerCase() === "pagada",
          )
          .reduce(
            (suma, item) => suma + Number(item.total || 0),
            0,
          ),

        facturadoMes: listaFacturas.reduce(
          (suma, item) => suma + Number(item.total || 0),
          0,
        ),
      });

      // 1) Cargamos todas las líneas de los presupuestos aceptados de hoy.
      const idsPresupuestosHoy = presupuestosHoy.map((item) => item.id);

      let lineasPresupuesto = [];

      if (idsPresupuestosHoy.length > 0) {
        const { data, error } = await supabase
          .from("presupuesto_lineas")
          .select(`
            id,
            presupuesto_id,
            producto_id,
            descripcion,
            cantidad
          `)
          .in("presupuesto_id", idsPresupuestosHoy)
          .order("created_at", { ascending: true });

        if (error) throw error;
        lineasPresupuesto = data || [];
      }

      const lineasAgrupadas = {};

      lineasPresupuesto.forEach((linea) => {
        if (!lineasAgrupadas[linea.presupuesto_id]) {
          lineasAgrupadas[linea.presupuesto_id] = [];
        }

        lineasAgrupadas[linea.presupuesto_id].push(linea);
      });

      setLineasPorPresupuesto(lineasAgrupadas);

      // 2) Índices para unir Presupuesto + Catering + Producción.
      const cateringPorPresupuesto = new Map(
        cateringsBD
          .filter((item) => item.presupuesto_id)
          .map((item) => [String(item.presupuesto_id), item]),
      );

      const produccionPorPedido = new Map();

      produccionHoy.forEach((linea) => {
        const clave = String(linea.pedido_nombre || "").trim();
        if (!clave) return;

        if (!produccionPorPedido.has(clave)) {
          produccionPorPedido.set(clave, []);
        }

        produccionPorPedido.get(clave).push(linea);
      });

      // 3) La base principal son TODOS los presupuestos aceptados de hoy.
      //    Así nunca desaparecen del Dashboard aunque no exista fila en caterings.
      const unificados = presupuestosHoy.map((presupuesto) => {
        const catering =
          cateringPorPresupuesto.get(String(presupuesto.id)) || null;

        const produccion =
          produccionPorPedido.get(String(presupuesto.numero || "").trim()) ||
          [];

        const cliente =
          presupuesto.clientes ||
          catering?.clientes ||
          null;

        const estadosProduccion = produccion.map((item) => item.estado);

        let estadoProduccion = "Sin enviar";

        if (estadosProduccion.length > 0) {
          if (
            estadosProduccion.every(
              (estado) => estado === "Terminado",
            )
          ) {
            estadoProduccion = "Terminado";
          } else if (
            estadosProduccion.some(
              (estado) => estado === "En preparación",
            )
          ) {
            estadoProduccion = "En preparación";
          } else {
            estadoProduccion = "Pendiente";
          }
        }

        return {
          id: catering?.id || `presupuesto-${presupuesto.id}`,
          presupuesto_id: presupuesto.id,
          numero: presupuesto.numero,
          cliente_id:
            presupuesto.cliente_id ||
            catering?.cliente_id ||
            null,
          titulo:
            catering?.titulo ||
            presupuesto.numero ||
            "Catering",
          fecha: presupuesto.fecha,
          hora_inicio:
            catering?.hora_inicio ||
            presupuesto.hora_entrega ||
            null,
          hora_fin: catering?.hora_fin || null,
          direccion:
            catering?.direccion ||
            presupuesto.direccion_entrega ||
            null,
          poblacion: catering?.poblacion || null,
          codigo_postal: catering?.codigo_postal || null,
          numero_personas:
            catering?.numero_personas || 0,
          responsable:
            catering?.responsable ||
            presupuesto.persona_contacto ||
            null,
          telefono_contacto:
            catering?.telefono_contacto ||
            presupuesto.telefono_contacto ||
            null,
          tipo_servicio:
            catering?.tipo_servicio ||
            presupuesto.tipo_documento ||
            "Catering",
          observaciones:
            catering?.observaciones ||
            presupuesto.observaciones ||
            null,
          estado:
            catering?.estado ||
            presupuesto.estado ||
            "Aceptado",
          estado_produccion: estadoProduccion,
          clientes: cliente,
          lineas_produccion: produccion,
          origen: catering ? "Presupuesto + Catering" : "Presupuesto",
        };
      });

      // 4) Añadimos caterings creados manualmente que no tengan presupuesto.
      cateringsBD.forEach((catering) => {
        const yaExiste = unificados.some(
          (item) =>
            item.presupuesto_id &&
            String(item.presupuesto_id) ===
              String(catering.presupuesto_id),
        );

        if (yaExiste) return;

        const produccion = produccionHoy.filter(
          (linea) =>
            (catering.id &&
              String(linea.catering_id || "") ===
                String(catering.id)) ||
            String(linea.pedido_nombre || "") ===
              String(catering.titulo || ""),
        );

        const estadosProduccion = produccion.map((item) => item.estado);

        let estadoProduccion = "Sin enviar";

        if (estadosProduccion.length > 0) {
          if (
            estadosProduccion.every(
              (estado) => estado === "Terminado",
            )
          ) {
            estadoProduccion = "Terminado";
          } else if (
            estadosProduccion.some(
              (estado) => estado === "En preparación",
            )
          ) {
            estadoProduccion = "En preparación";
          } else {
            estadoProduccion = "Pendiente";
          }
        }

        unificados.push({
          ...catering,
          numero: catering.titulo || "",
          estado_produccion: estadoProduccion,
          lineas_produccion: produccion,
          origen: "Catering",
        });
      });

      unificados.sort((a, b) =>
        String(a.hora_inicio || "99:99").localeCompare(
          String(b.hora_inicio || "99:99"),
        ),
      );

      setCateringsHoy(unificados);
    } catch (err) {
      console.error("Error al cargar dashboard:", err);
      setError(
        err?.message || "No se ha podido cargar el Dashboard.",
      );
    } finally {
      setCargando(false);
    }
  }

  function cambiarDia(dias) {
    const fechaBase = new Date(`${fechaSeleccionada}T12:00:00`);
    fechaBase.setDate(fechaBase.getDate() + dias);
    setFechaSeleccionada(obtenerFechaISO(fechaBase));
  }

  function volverAHoy() {
    setFechaSeleccionada(hoyISO);
  }

  const resumenHoy = useMemo(() => {
    const confirmados = cateringsHoy.filter((item) =>
      ["Aceptado", "Confirmado"].includes(item.estado),
    ).length;

    const pendientes = cateringsHoy.filter(
      (item) => item.estado === "Pendiente",
    ).length;

    const personas = cateringsHoy.reduce(
      (suma, item) => suma + Number(item.numero_personas || 0),
      0,
    );

    return {
      total: cateringsHoy.length,
      confirmados,
      pendientes,
      personas,
    };
  }, [cateringsHoy]);

  return (
    <>
      <style>{ESTILOS_DASHBOARD}</style>

      <section className="dashboard-direccion">
        <div className="dashboard-cabecera">
          <div>
            <p className="dashboard-etiqueta">CUSACHS HUB</p>
            <h1>Dashboard de dirección</h1>
            <p className="dashboard-subtitulo">
              Resumen del negocio y detalle operativo por día.
            </p>
          </div>

          <button
            type="button"
            className="dashboard-recargar"
            onClick={() => cargarDashboard(fechaSeleccionada)}
            disabled={cargando}
          >
            {cargando ? "Actualizando..." : "🔄 Actualizar"}
          </button>
        </div>

        {error && (
          <div className="dashboard-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {cargando ? (
          <div className="dashboard-cargando">
            Cargando resumen...
          </div>
        ) : (
          <>
            <div className="dashboard-resumen">
              <Tarjeta
                titulo="Presupuestos pendientes"
                valor={datos.presupuestos}
              />

              <Tarjeta
                titulo="Facturas pendientes"
                valor={datos.facturasPendientes}
              />

              <Tarjeta
                titulo="Facturado este mes"
                valor={euros(datos.facturadoMes)}
              />

              <Tarjeta
                titulo="Cobrado este mes"
                valor={euros(datos.cobradoMes)}
              />
            </div>

            <section className="dashboard-hoy">
              <div className="dashboard-hoy-cabecera">
                <div>
                  <p className="dashboard-etiqueta">
                    OPERATIVA DEL DÍA
                  </p>

                  <h2>Caterings del día</h2>

                  <p>
                    {formatearFechaCompleta(fechaSeleccionada)}
                  </p>

                  <div className="dashboard-navegacion-fecha">
                    <button type="button" onClick={() => cambiarDia(-1)}>← Día anterior</button>
                    <button type="button" className="dashboard-hoy-boton" onClick={volverAHoy} disabled={fechaSeleccionada === hoyISO}>Hoy</button>
                    <button type="button" onClick={() => cambiarDia(1)}>Día siguiente →</button>
                    <input type="date" value={fechaSeleccionada} onChange={(event) => setFechaSeleccionada(event.target.value)} aria-label="Seleccionar fecha del dashboard" />
                  </div>
                </div>

                <div className="dashboard-hoy-resumen">
                  <MiniDato
                    etiqueta="Caterings"
                    valor={resumenHoy.total}
                  />

                  <MiniDato
                    etiqueta="Confirmados"
                    valor={resumenHoy.confirmados}
                  />

                  <MiniDato
                    etiqueta="Pendientes"
                    valor={resumenHoy.pendientes}
                  />

                  <MiniDato
                    etiqueta="Personas"
                    valor={resumenHoy.personas}
                  />
                </div>
              </div>

              {cateringsHoy.length === 0 ? (
                <div className="dashboard-vacio">
                  <div className="dashboard-vacio-icono">✓</div>
                  <h3>No hay caterings para este día</h3>
                  <p>
                    Cuando haya servicios programados para este día aparecerán
                    aquí con todo el detalle.
                  </p>
                </div>
              ) : (
                <div className="dashboard-caterings">
                  {cateringsHoy.map((catering) => {
                    const cliente =
                      catering.clientes || null;

                    const nombreCliente =
                      obtenerNombreCliente(cliente) ||
                      catering.titulo ||
                      "Cliente";

                    const direccion = [
                      catering.direccion,
                      catering.codigo_postal,
                      catering.poblacion,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    const lineasPresupuesto =
                      lineasPorPresupuesto[
                        catering.presupuesto_id
                      ] || [];

                    const lineas =
                      lineasPresupuesto.length > 0
                        ? lineasPresupuesto
                        : (catering.lineas_produccion || []).map((linea) => ({
                            id: `produccion-${linea.id}`,
                            cantidad: linea.cantidad,
                            descripcion: linea.producto_nombre,
                          }));

                    return (
                      <article
                        className="dashboard-catering"
                        key={catering.id}
                      >
                        <div className="dashboard-catering-cabecera">
                          <div>
                            <div className="dashboard-estados">
                              <span
                                className={`dashboard-estado estado-${normalizarClase(
                                  catering.estado,
                                )}`}
                              >
                                {catering.estado || "Pendiente"}
                              </span>

                              <span
                                className={`dashboard-estado-produccion produccion-${normalizarClase(
                                  catering.estado_produccion,
                                )}`}
                              >
                                🏭 {catering.estado_produccion || "Sin enviar"}
                              </span>
                            </div>

                            <h3>{nombreCliente}</h3>

                            <p className="dashboard-pedido">
                              {catering.numero || catering.titulo || "Catering sin título"}
                            </p>
                          </div>

                          <div className="dashboard-hora">
                            <strong>
                              {cortarHora(catering.hora_inicio) ||
                                "Sin hora"}
                            </strong>

                            {catering.hora_fin && (
                              <span>
                                hasta{" "}
                                {cortarHora(catering.hora_fin)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="dashboard-catering-datos">
                          <Dato
                            titulo="📍 Dirección"
                            valor={direccion || "Sin indicar"}
                          />

                          <Dato
                            titulo="👥 Personas"
                            valor={
                              Number(catering.numero_personas || 0) >
                              0
                                ? catering.numero_personas
                                : "Sin indicar"
                            }
                          />

                          <Dato
                            titulo="👤 Responsable"
                            valor={
                              catering.responsable ||
                              "Sin indicar"
                            }
                          />

                          <Dato
                            titulo="📞 Teléfono contacto"
                            valor={
                              catering.telefono_contacto ||
                              cliente?.telefono ||
                              "Sin indicar"
                            }
                          />

                          <Dato
                            titulo="🍽 Tipo de servicio"
                            valor={
                              catering.tipo_servicio ||
                              "Sin indicar"
                            }
                          />

                          <Dato
                            titulo="✉ Email"
                            valor={
                              cliente?.email || "Sin indicar"
                            }
                          />
                        </div>

                        {catering.observaciones && (
                          <div className="dashboard-observaciones">
                            <strong>Observaciones</strong>
                            <p>{catering.observaciones}</p>
                          </div>
                        )}

                        <div className="dashboard-lineas">
                          <div className="dashboard-lineas-titulo">
                            <h4>Pedido / producción</h4>
                            <span>
                              {lineas.length}{" "}
                              {lineas.length === 1
                                ? "línea"
                                : "líneas"}
                            </span>
                          </div>

                          {lineas.length === 0 ? (
                            <p className="dashboard-sin-lineas">
                              Este catering no tiene líneas de
                              presupuesto vinculadas.
                            </p>
                          ) : (
                            <div className="dashboard-tabla-lineas">
                              {lineas.map((linea) => (
                                <div
                                  className="dashboard-linea"
                                  key={linea.id}
                                >
                                  <strong>
                                    {formatearCantidad(
                                      linea.cantidad,
                                    )}
                                  </strong>

                                  <span>
                                    {linea.descripcion ||
                                      "Producto"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="dashboard-catering-acciones">
                          <a
                            href={`${import.meta.env.BASE_URL}#/catering`}
                          >
                            🍽 Abrir Catering
                          </a>

                          <a
                            href={`${import.meta.env.BASE_URL}#/produccion`}
                          >
                            🏭 Abrir Producción
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </>
  );
}

function Tarjeta({ titulo, valor }) {
  return (
    <div className="dashboard-tarjeta">
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function MiniDato({ etiqueta, valor }) {
  return (
    <div className="dashboard-mini-dato">
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function Dato({ titulo, valor }) {
  return (
    <div className="dashboard-dato">
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function obtenerNombreCliente(cliente) {
  if (!cliente) return "";

  if (cliente.empresa && cliente.nombre) {
    return `${cliente.empresa} — ${cliente.nombre}`;
  }

  return cliente.empresa || cliente.nombre || "";
}

function obtenerFechaISO(fecha) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${año}-${mes}-${dia}`;
}

function formatearFechaCompleta(fecha) {
  if (!fecha) return "";

  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${fecha}T12:00:00`));
}

function cortarHora(hora) {
  return hora ? String(hora).slice(0, 5) : "";
}

function formatearCantidad(cantidad) {
  return Number(cantidad || 0).toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  });
}

function normalizarClase(valor) {
  return String(valor || "pendiente")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function euros(valor) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(valor || 0));
}

const ESTILOS_DASHBOARD = `
  .dashboard-direccion {
    padding: 30px;
  }

  .dashboard-cabecera,
  .dashboard-hoy-cabecera,
  .dashboard-catering-cabecera,
  .dashboard-lineas-titulo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .dashboard-cabecera h1,
  .dashboard-hoy h2,
  .dashboard-catering h3,
  .dashboard-lineas h4 {
    margin: 0;
  }

  .dashboard-etiqueta {
    margin: 0 0 7px;
    color: #6d2f8e;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 2px;
  }

  .dashboard-subtitulo {
    margin: 7px 0 0;
    color: #766d7a;
  }

  .dashboard-recargar {
    white-space: nowrap;
  }

  .dashboard-cargando,
  .dashboard-error {
    margin-top: 20px;
    padding: 14px 16px;
    border-radius: 12px;
  }

  .dashboard-cargando {
    background: #f5f0f7;
  }

  .dashboard-error {
    background: #fde7ec;
    color: #a42f46;
  }

  .dashboard-resumen {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-top: 24px;
  }

  .dashboard-tarjeta {
    padding: 22px;
    border: 1px solid #ddd2e2;
    border-radius: 17px;
    background: #ffffff;
  }

  .dashboard-tarjeta span {
    display: block;
    color: #765d7f;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .dashboard-tarjeta strong {
    display: block;
    margin-top: 12px;
    color: #5c257c;
    font-size: 27px;
  }

  .dashboard-hoy {
    margin-top: 28px;
    padding: 24px;
    border: 1px solid #ddd2e2;
    border-radius: 20px;
    background: #ffffff;
  }

  .dashboard-hoy-cabecera > div:first-child > p:last-child {
    margin: 7px 0 0;
    color: #766d7a;
    text-transform: capitalize;
  }

  .dashboard-hoy-resumen {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-end;
  }

  .dashboard-mini-dato {
    min-width: 105px;
    padding: 11px 14px;
    border-radius: 12px;
    background: #f6f0f8;
  }

  .dashboard-mini-dato span {
    display: block;
    color: #765d7f;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .dashboard-mini-dato strong {
    display: block;
    margin-top: 4px;
    color: #5c257c;
    font-size: 21px;
  }

  .dashboard-vacio {
    margin-top: 20px;
    padding: 45px 20px;
    border: 1px dashed #cec1d3;
    border-radius: 16px;
    background: #faf8fb;
    text-align: center;
  }

  .dashboard-vacio-icono {
    font-size: 35px;
    color: #713397;
  }

  .dashboard-vacio h3 {
    margin: 8px 0 5px;
  }

  .dashboard-vacio p {
    margin: 0;
    color: #766d7a;
  }

  .dashboard-caterings {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-top: 20px;
  }

  .dashboard-catering {
    overflow: hidden;
    border: 1px solid #ddd2e2;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 8px 24px rgba(54, 30, 67, 0.06);
  }

  .dashboard-catering-cabecera {
    align-items: flex-start;
    padding: 20px;
    background: linear-gradient(135deg, #f5eaf9, #ffffff);
  }

  .dashboard-catering h3 {
    margin-top: 10px;
    font-size: 23px;
  }

  .dashboard-pedido {
    margin: 4px 0 0;
    color: #716777;
  }

  .dashboard-estado {
    display: inline-flex;
    padding: 6px 10px;
    border-radius: 999px;
    background: #efe7f3;
    color: #5f2c7c;
    font-size: 12px;
    font-weight: 900;
  }

  .dashboard-estado.estado-aceptado,
  .dashboard-estado.estado-confirmado {
    background: #e2f5e8;
    color: #246840;
  }

  .dashboard-estado.estado-pendiente {
    background: #fff4d6;
    color: #8a6516;
  }

  .dashboard-estados {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .dashboard-estado-produccion {
    display: inline-flex;
    padding: 6px 10px;
    border-radius: 999px;
    background: #f0edf2;
    color: #625568;
    font-size: 12px;
    font-weight: 900;
  }

  .dashboard-estado-produccion.produccion-pendiente {
    background: #fff4d6;
    color: #8a6516;
  }

  .dashboard-estado-produccion.produccion-en-preparacion {
    background: #e7f2ff;
    color: #2d6f9f;
  }

  .dashboard-estado-produccion.produccion-terminado {
    background: #e2f5e8;
    color: #246840;
  }

  .dashboard-estado-produccion.produccion-sin-enviar {
    background: #f0edf2;
    color: #625568;
  }

  .dashboard-hora {
    min-width: 110px;
    text-align: right;
  }

  .dashboard-hora strong {
    display: block;
    color: #5c257c;
    font-size: 26px;
  }

  .dashboard-hora span {
    color: #766d7a;
    font-size: 12px;
  }

  .dashboard-catering-datos {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    padding: 18px 20px;
  }

  .dashboard-dato {
    padding: 12px;
    border: 1px solid #ece4ef;
    border-radius: 12px;
    background: #fbf9fc;
  }

  .dashboard-dato span {
    display: block;
    color: #7c7180;
    font-size: 12px;
    font-weight: 700;
  }

  .dashboard-dato strong {
    display: block;
    margin-top: 5px;
    color: #312a35;
    font-size: 14px;
  }

  .dashboard-observaciones {
    margin: 0 20px 18px;
    padding: 14px;
    border-left: 4px solid #713397;
    border-radius: 8px;
    background: #faf7fc;
  }

  .dashboard-observaciones strong {
    display: block;
    margin-bottom: 5px;
  }

  .dashboard-observaciones p {
    margin: 0;
  }

  .dashboard-lineas {
    margin: 0 20px 20px;
    border: 1px solid #e6dce9;
    border-radius: 14px;
    overflow: hidden;
  }

  .dashboard-lineas-titulo {
    padding: 12px 14px;
    background: #f6f0f8;
  }

  .dashboard-lineas-titulo span {
    color: #6f6474;
    font-size: 12px;
    font-weight: 800;
  }

  .dashboard-tabla-lineas {
    display: flex;
    flex-direction: column;
  }

  .dashboard-linea {
    display: grid;
    grid-template-columns: 70px 1fr;
    gap: 12px;
    padding: 10px 14px;
    border-top: 1px solid #eee7f0;
  }

  .dashboard-linea:first-child {
    border-top: 0;
  }

  .dashboard-linea strong {
    color: #5d277b;
  }

  .dashboard-sin-lineas {
    margin: 0;
    padding: 14px;
    color: #7d737f;
  }

  .dashboard-catering-acciones {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 0 20px 20px;
  }

  .dashboard-catering-acciones a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 14px;
    border-radius: 10px;
    background: #4b075e;
    color: #ffffff;
    font-weight: 800;
    text-decoration: none;
  }

  .dashboard-navegacion-fecha {
    display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 14px;
  }
  .dashboard-navegacion-fecha button, .dashboard-navegacion-fecha input {
    min-height: 40px; padding: 0 12px; border: 1px solid #d8cadd; border-radius: 10px;
    background: #ffffff; color: #4b075e; font: inherit; font-weight: 800;
  }
  .dashboard-navegacion-fecha button { cursor: pointer; }
  .dashboard-navegacion-fecha button:hover { background: #f6f0f8; }
  .dashboard-navegacion-fecha .dashboard-hoy-boton { background: #4b075e; color: #ffffff; }
  .dashboard-navegacion-fecha button:disabled { opacity: 0.45; cursor: default; }

  @media (max-width: 1100px) {
    .dashboard-resumen {
      grid-template-columns: repeat(2, 1fr);
    }

    .dashboard-catering-datos {
      grid-template-columns: repeat(2, 1fr);
    }

    .dashboard-hoy-cabecera {
      align-items: flex-start;
      flex-direction: column;
    }

    .dashboard-hoy-resumen {
      justify-content: flex-start;
    }
  }

  @media (max-width: 700px) {
    .dashboard-direccion {
      padding: 16px;
    }

    .dashboard-cabecera,
    .dashboard-catering-cabecera {
      align-items: stretch;
      flex-direction: column;
    }

    .dashboard-resumen,
    .dashboard-catering-datos {
      grid-template-columns: 1fr;
    }

    .dashboard-hora {
      text-align: left;
    }
  }
`;

export default Dashboard;