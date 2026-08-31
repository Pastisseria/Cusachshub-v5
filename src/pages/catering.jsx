import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const FORMULARIO_INICIAL = {
  id: null,
  cliente_id: "",
  presupuesto_id: "",
  titulo: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  direccion: "",
  poblacion: "",
  codigo_postal: "",
  numero_personas: "0",
  responsable: "",
  telefono_contacto: "",
  estado: "Pendiente",
  tipo_servicio: "",
  observaciones: "",
};

function Catering() {
  const hoy = new Date();

  const [fechaVisible, setFechaVisible] = useState(
    new Date(hoy.getFullYear(), hoy.getMonth(), 1),
  );

  const [caterings, setCaterings] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);

  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [modalAbierto, setModalAbierto] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [vista, setVista] = useState("mes");
  const [fechaSemana, setFechaSemana] = useState(
    obtenerInicioSemana(new Date()),
  );

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setError("");

    try {
      await importarPresupuestosAceptados();

      const [
        respuestaCaterings,
        respuestaClientes,
        respuestaPresupuestos,
      ] = await Promise.all([
        supabase
          .from("caterings")
          .select("*")
          .order("fecha", { ascending: true })
          .order("hora_inicio", { ascending: true }),

        supabase
          .from("clientes")
          .select("id, nombre, empresa")
          .order("nombre", { ascending: true }),

        supabase
          .from("presupuestos")
          .select("id, numero, cliente_id, estado")
          .order("created_at", { ascending: false }),
      ]);

      if (respuestaCaterings.error) {
        throw respuestaCaterings.error;
      }

      if (respuestaClientes.error) {
        throw respuestaClientes.error;
      }

      if (respuestaPresupuestos.error) {
        throw respuestaPresupuestos.error;
      }

      setCaterings(respuestaCaterings.data || []);
      setClientes(respuestaClientes.data || []);
      setPresupuestos(respuestaPresupuestos.data || []);
    } catch (err) {
      setError(
        err.message || "No se ha podido cargar el calendario.",
      );
    } finally {
      setCargando(false);
    }
  }

  async function importarPresupuestosAceptados() {
    const { data: aceptados, error: errorAceptados } = await supabase
      .from("presupuestos")
      .select(`
        id, numero, cliente_id, fecha, hora_entrega, direccion_entrega,
        persona_contacto, telefono_contacto, observaciones,
        clientes (nombre, empresa, direccion, poblacion, codigo_postal)
      `)
      .eq("tipo_documento", "Catering")
      .eq("estado", "Aceptado");
    if (errorAceptados) throw errorAceptados;
    if (!aceptados?.length) return;

    const ids = aceptados.map((presupuesto) => presupuesto.id);
    const { data: existentes, error: errorExistentes } = await supabase
      .from("caterings")
      .select("presupuesto_id")
      .in("presupuesto_id", ids);
    if (errorExistentes) throw errorExistentes;

    const idsExistentes = new Set(
      (existentes || []).map((catering) => String(catering.presupuesto_id)),
    );
    const pendientes = aceptados.filter(
      (presupuesto) => !idsExistentes.has(String(presupuesto.id)),
    );
    if (!pendientes.length) return;

    const nuevosCaterings = pendientes.map((presupuesto) => {
      const cliente = presupuesto.clientes || {};
      const nombre = cliente.empresa || cliente.nombre || "Cliente";
      return {
        cliente_id: presupuesto.cliente_id || null,
        presupuesto_id: presupuesto.id,
        titulo: `${nombre} · ${presupuesto.numero || "Catering"}`,
        fecha: presupuesto.fecha,
        hora_inicio: presupuesto.hora_entrega || null,
        direccion: presupuesto.direccion_entrega || cliente.direccion || null,
        poblacion: cliente.poblacion || null,
        codigo_postal: cliente.codigo_postal || null,
        responsable: presupuesto.persona_contacto || null,
        telefono_contacto: presupuesto.telefono_contacto || null,
        estado: "Confirmado",
        observaciones: presupuesto.observaciones || null,
        updated_at: new Date().toISOString(),
      };
    });

    const { error: errorInsercion } = await supabase
      .from("caterings")
      .insert(nuevosCaterings);
    if (errorInsercion) throw errorInsercion;
  }

  const diasCalendario = useMemo(() => {
    return crearDiasCalendario(fechaVisible);
  }, [fechaVisible]);

  const cateringsMes = useMemo(() => {
    return caterings.filter((catering) => {
      if (!catering.fecha) return false;

      const fecha = new Date(`${catering.fecha}T12:00:00`);

      return (
        fecha.getFullYear() === fechaVisible.getFullYear() &&
        fecha.getMonth() === fechaVisible.getMonth()
      );
    });
  }, [caterings, fechaVisible]);

  const diasSemanaVisible = useMemo(() => {
    return Array.from({ length: 7 }, (_, indice) => {
      const fecha = new Date(`${fechaSemana}T12:00:00`);
      fecha.setDate(fecha.getDate() + indice);
      return fecha;
    });
  }, [fechaSemana]);

  const cateringsSemana = useMemo(() => {
    const fechas = new Set(
      diasSemanaVisible.map((dia) => obtenerFechaISO(dia)),
    );

    return caterings
      .filter((catering) => fechas.has(catering.fecha))
      .sort((a, b) => {
        const porFecha = String(a.fecha || "").localeCompare(
          String(b.fecha || ""),
        );
        if (porFecha !== 0) return porFecha;

        return String(a.hora_inicio || "").localeCompare(
          String(b.hora_inicio || ""),
        );
      });
  }, [caterings, diasSemanaVisible]);

  const presupuestosFiltrados = useMemo(() => {
    if (!formulario.cliente_id) {
      return presupuestos;
    }

    return presupuestos.filter(
      (presupuesto) =>
        presupuesto.cliente_id === formulario.cliente_id,
    );
  }, [formulario.cliente_id, presupuestos]);


  function obtenerClienteEvento(evento) {
    const cliente = clientes.find(
      (item) => String(item.id) === String(evento.cliente_id),
    );

    return (
      cliente?.empresa ||
      cliente?.nombre ||
      evento.titulo ||
      "Catering"
    );
  }

  function obtenerNumeroPresupuesto(evento) {
    const presupuesto = presupuestos.find(
      (item) =>
        String(item.id) === String(evento.presupuesto_id),
    );

    return presupuesto?.numero || "";
  }

  function cambiarSemana(cantidad) {
    const fecha = new Date(`${fechaSemana}T12:00:00`);
    fecha.setDate(fecha.getDate() + cantidad * 7);
    setFechaSemana(obtenerInicioSemana(fecha));
  }

  function irSemanaActual() {
    setFechaSemana(obtenerInicioSemana(new Date()));
  }

  function imprimirSemana() {
    document.body.classList.add("imprimiendo-semana-catering");

    const limpiar = () => {
      document.body.classList.remove("imprimiendo-semana-catering");
      window.removeEventListener("afterprint", limpiar);
    };

    window.addEventListener("afterprint", limpiar);
    window.print();
  }

  function cambiarMes(cantidad) {
    setFechaVisible(
      (fechaActual) =>
        new Date(
          fechaActual.getFullYear(),
          fechaActual.getMonth() + cantidad,
          1,
        ),
    );
  }

  function irAHoy() {
    const fecha = new Date();

    setFechaVisible(
      new Date(fecha.getFullYear(), fecha.getMonth(), 1),
    );
  }

  function abrirNuevoCatering(fecha) {
    setError("");
    setMensaje("");

    setFormulario({
      ...FORMULARIO_INICIAL,
      fecha: fecha || obtenerFechaISO(new Date()),
    });

    setModalAbierto(true);
  }

  function abrirCatering(catering) {
    setError("");
    setMensaje("");

    setFormulario({
      id: catering.id,
      cliente_id: catering.cliente_id || "",
      presupuesto_id: catering.presupuesto_id || "",
      titulo: catering.titulo || "",
      fecha: catering.fecha || "",
      hora_inicio: cortarHora(catering.hora_inicio),
      hora_fin: cortarHora(catering.hora_fin),
      direccion: catering.direccion || "",
      poblacion: catering.poblacion || "",
      codigo_postal: catering.codigo_postal || "",
      numero_personas: String(catering.numero_personas ?? 0),
      responsable: catering.responsable || "",
      telefono_contacto:
        catering.telefono_contacto || "",
      estado: catering.estado || "Pendiente",
      tipo_servicio: catering.tipo_servicio || "",
      observaciones: catering.observaciones || "",
    });

    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;

    setModalAbierto(false);
    setFormulario(FORMULARIO_INICIAL);
  }

  function modificarFormulario(campo, valor) {
    setFormulario((formularioAnterior) => ({
      ...formularioAnterior,
      [campo]: valor,
      ...(campo === "cliente_id"
        ? { presupuesto_id: "" }
        : {}),
    }));
  }

  async function guardarCatering(event) {
    event.preventDefault();

    if (!formulario.titulo.trim()) {
      setError("Escribe el título del catering.");
      return;
    }

    if (!formulario.fecha) {
      setError("Selecciona una fecha.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const datos = {
      cliente_id: formulario.cliente_id || null,
      presupuesto_id: formulario.presupuesto_id || null,
      titulo: formulario.titulo.trim(),
      fecha: formulario.fecha,
      hora_inicio: formulario.hora_inicio || null,
      hora_fin: formulario.hora_fin || null,
      direccion: formulario.direccion.trim() || null,
      poblacion: formulario.poblacion.trim() || null,
      codigo_postal:
        formulario.codigo_postal.trim() || null,
      numero_personas: Number(
        formulario.numero_personas || 0,
      ),
      responsable: formulario.responsable.trim() || null,
      telefono_contacto:
        formulario.telefono_contacto.trim() || null,
      estado: formulario.estado,
      tipo_servicio:
        formulario.tipo_servicio.trim() || null,
      observaciones:
        formulario.observaciones.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (formulario.id) {
        const { error: errorSupabase } = await supabase
          .from("caterings")
          .update(datos)
          .eq("id", formulario.id);

        if (errorSupabase) {
          throw errorSupabase;
        }

        setMensaje("Catering actualizado correctamente.");
      } else {
        const { error: errorSupabase } = await supabase
          .from("caterings")
          .insert(datos);

        if (errorSupabase) {
          throw errorSupabase;
        }

        setMensaje("Catering creado correctamente.");
      }

      const fechaGuardada = new Date(
        `${formulario.fecha}T12:00:00`,
      );

      setFechaVisible(
        new Date(
          fechaGuardada.getFullYear(),
          fechaGuardada.getMonth(),
          1,
        ),
      );

      setModalAbierto(false);
      setFormulario(FORMULARIO_INICIAL);

      await cargarDatos();
    } catch (err) {
      setError(
        err.message || "No se ha podido guardar el catering.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarCatering() {
    if (!formulario.id) return;

    const confirmar = window.confirm(
      "¿Seguro que quieres eliminar este catering?",
    );

    if (!confirmar) return;

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const { error: errorSupabase } = await supabase
        .from("caterings")
        .delete()
        .eq("id", formulario.id);

      if (errorSupabase) {
        throw errorSupabase;
      }

      setModalAbierto(false);
      setFormulario(FORMULARIO_INICIAL);
      setMensaje("Catering eliminado correctamente.");

      await cargarDatos();
    } catch (err) {
      setError(
        err.message || "No se ha podido eliminar el catering.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <style>{ESTILOS_CATERING}</style>

      <section className="panel catering-panel">
        <div className="catering-cabecera">
          <div>
            <p className="catering-etiqueta">CALENDARIO</p>
            <h2>Catering</h2>
            <p className="catering-descripcion">
              Agenda mensual de eventos, horarios y servicios.
            </p>
          </div>

          <div className="catering-acciones-cabecera no-imprimir">
            <button
              type="button"
              className={vista === "mes" ? "" : "boton-secundario"}
              onClick={() => setVista("mes")}
            >
              Vista mensual
            </button>

            <button
              type="button"
              className={vista === "semana" ? "" : "boton-secundario"}
              onClick={() => setVista("semana")}
            >
              Vista semanal
            </button>

            <button
              type="button"
              onClick={() =>
                abrirNuevoCatering(obtenerFechaISO(new Date()))
              }
            >
              + Nuevo catering
            </button>
          </div>
        </div>

        <div className={vista === "mes" ? "catering-barra" : "catering-barra oculto"}>
          <div className="catering-navegacion">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => cambiarMes(-1)}
            >
              ←
            </button>

            <button
              type="button"
              className="boton-hoy"
              onClick={irAHoy}
            >
              Hoy
            </button>

            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => cambiarMes(1)}
            >
              →
            </button>
          </div>

          <h3>
            {MESES[fechaVisible.getMonth()]}{" "}
            {fechaVisible.getFullYear()}
          </h3>

          <span className="catering-contador">
            {cateringsMes.length}{" "}
            {cateringsMes.length === 1
              ? "evento"
              : "eventos"}
          </span>
        </div>

        {error && (
          <div className="catering-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {mensaje && (
          <div className="catering-mensaje">{mensaje}</div>
        )}

        {vista === "semana" && (
          <section className="catering-semana" id="catering-semana-imprimible">
            <div className="catering-semana-cabecera no-imprimir">
              <div className="catering-navegacion">
                <button type="button" onClick={() => cambiarSemana(-1)}>
                  ← Semana anterior
                </button>
                <button
                  type="button"
                  className="boton-hoy"
                  onClick={irSemanaActual}
                >
                  Esta semana
                </button>
                <button type="button" onClick={() => cambiarSemana(1)}>
                  Semana siguiente →
                </button>
              </div>

              <button type="button" onClick={imprimirSemana}>
                🖨️ Imprimir semana
              </button>
            </div>

            <header className="catering-semana-titulo">
              <div>
                <p>PASTISSERIA CUSACHS</p>
                <h3>Listado semanal de caterings</h3>
              </div>
              <strong>
                {formatearRangoSemana(diasSemanaVisible)}
              </strong>
            </header>

            <div className="catering-semana-tabla">
              <div className="catering-semana-hora-cabecera">Hora</div>

              {diasSemanaVisible.map((dia, indice) => (
                <div className="catering-semana-dia-cabecera" key={obtenerFechaISO(dia)}>
                  <strong>{DIAS_SEMANA[indice]}</strong>
                  <span>{formatearDiaCorto(dia)}</span>
                </div>
              ))}

              {crearHorasSemana().map((hora) => (
                <div className="catering-semana-fila" key={hora}>
                  <div className="catering-semana-hora">{hora}</div>

                  {diasSemanaVisible.map((dia) => {
                    const fechaDia = obtenerFechaISO(dia);
                    const eventos = cateringsSemana.filter(
                      (catering) =>
                        catering.fecha === fechaDia &&
                        obtenerHoraEntera(catering.hora_inicio) === hora,
                    );

                    return (
                      <div
                        className="catering-semana-celda"
                        key={`${fechaDia}-${hora}`}
                      >
                        {eventos.map((evento) => (
                          <button
                            type="button"
                            className={`catering-semana-evento estado-${normalizarEstado(
                              evento.estado,
                            )}`}
                            key={evento.id}
                            onClick={() => abrirCatering(evento)}
                          >
                            <strong>
                              {cortarHora(evento.hora_inicio) || hora}
                            </strong>
                            <span className="catering-semana-cliente">
                              {obtenerClienteEvento(evento)}
                            </span>

                            <small className="catering-semana-estado">
                              Estado: {evento.estado || "Pendiente"}
                            </small>

                            {Number(evento.numero_personas || 0) > 0 && (
                              <small>
                                Personas: {evento.numero_personas}
                              </small>
                            )}

                            {evento.tipo_servicio && (
                              <small>
                                Servicio: {evento.tipo_servicio}
                              </small>
                            )}

                            {evento.direccion && (
                              <small>
                                Dirección: {evento.direccion}
                              </small>
                            )}

                            {evento.responsable && (
                              <small>
                                Responsable: {evento.responsable}
                              </small>
                            )}

                            {evento.telefono_contacto && (
                              <small>
                                Tel.: {evento.telefono_contacto}
                              </small>
                            )}

                            {obtenerNumeroPresupuesto(evento) && (
                              <small>
                                Presupuesto: {obtenerNumeroPresupuesto(evento)}
                              </small>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {cargando ? (
          <div className="catering-cargando">
            Cargando calendario...
          </div>
        ) : (
          <div className={vista === "mes" ? "calendario-contenedor" : "calendario-contenedor oculto"}>
            <div className="calendario-semana">
              {DIAS_SEMANA.map((dia) => (
                <div
                  key={dia}
                  className="calendario-nombre-dia"
                  data-dia-corto={dia.slice(0, 3)}
                >
                  <span>{dia}</span>
                </div>
              ))}
            </div>

            <div className="calendario-rejilla">
              {diasCalendario.map((dia) => {
                const fechaDia = obtenerFechaISO(dia);

                const esMesVisible =
                  dia.getMonth() === fechaVisible.getMonth();

                const esHoy = mismoDia(dia, new Date());

                const eventosDia = caterings
                  .filter(
                    (catering) =>
                      catering.fecha === fechaDia,
                  )
                  .sort((a, b) =>
                    String(a.hora_inicio || "").localeCompare(
                      String(b.hora_inicio || ""),
                    ),
                  );

                return (
                  <button
                    type="button"
                    key={fechaDia}
                    className={[
                      "calendario-dia",
                      !esMesVisible
                        ? "calendario-dia-otro-mes"
                        : "",
                      esHoy
                        ? "calendario-dia-hoy"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      abrirNuevoCatering(fechaDia)
                    }
                  >
                    <span className="calendario-numero">
                      {dia.getDate()}
                    </span>

                    <div className="calendario-eventos">
                      {eventosDia.slice(0, 4).map((evento) => (
                        <span
                          key={evento.id}
                          className={`calendario-evento estado-${normalizarEstado(
                            evento.estado,
                          )}`}
                          title={[
                            obtenerClienteEvento(evento),
                            evento.estado || "Pendiente",
                            obtenerNumeroPresupuesto(evento)
                              ? `Presupuesto: ${obtenerNumeroPresupuesto(evento)}`
                              : "",
                            evento.direccion || "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                          onClick={(event) => {
                            event.stopPropagation();
                            abrirCatering(evento);
                          }}
                        >
                          {evento.hora_inicio && (
                            <strong>
                              {cortarHora(
                                evento.hora_inicio,
                              )}
                            </strong>
                          )}

                          <span>{obtenerClienteEvento(evento)}</span>
                        </span>
                      ))}

                      {eventosDia.length > 4 && (
                        <span className="calendario-mas">
                          +{eventosDia.length - 4} más
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {modalAbierto && (
        <div
          className="catering-modal-fondo"
          onMouseDown={cerrarModal}
        >
          <div
            className="catering-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="catering-modal-cabecera">
              <div>
                <p className="catering-etiqueta">
                  CATERING
                </p>

                <h3>
                  {formulario.id
                    ? "Editar catering"
                    : "Nuevo catering"}
                </h3>
              </div>

              <button
                type="button"
                className="catering-cerrar"
                onClick={cerrarModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarCatering}>
              <div className="catering-formulario">
                <label>
                  Título del evento *
                  <input
                    value={formulario.titulo}
                    onChange={(event) =>
                      modificarFormulario(
                        "titulo",
                        event.target.value,
                      )
                    }
                    required
                    placeholder="Ej. Catering Hospital Clínic"
                  />
                </label>

                <label>
                  Cliente
                  <select
                    value={formulario.cliente_id}
                    onChange={(event) =>
                      modificarFormulario(
                        "cliente_id",
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Sin cliente vinculado
                    </option>

                    {clientes.map((cliente) => (
                      <option
                        key={cliente.id}
                        value={cliente.id}
                      >
                        {cliente.nombre}
                        {cliente.empresa
                          ? ` — ${cliente.empresa}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Presupuesto
                  <select
                    value={formulario.presupuesto_id}
                    onChange={(event) =>
                      modificarFormulario(
                        "presupuesto_id",
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Sin presupuesto vinculado
                    </option>

                    {presupuestosFiltrados.map(
                      (presupuesto) => (
                        <option
                          key={presupuesto.id}
                          value={presupuesto.id}
                        >
                          {presupuesto.numero || "Sin número"} ·{" "}
                          {presupuesto.estado}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  Fecha *
                  <input
                    type="date"
                    value={formulario.fecha}
                    onChange={(event) =>
                      modificarFormulario(
                        "fecha",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label>
                  Hora de inicio
                  <input
                    type="time"
                    value={formulario.hora_inicio}
                    onChange={(event) =>
                      modificarFormulario(
                        "hora_inicio",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Hora de finalización
                  <input
                    type="time"
                    value={formulario.hora_fin}
                    onChange={(event) =>
                      modificarFormulario(
                        "hora_fin",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Número de personas
                  <input
                    type="number"
                    min="0"
                    value={formulario.numero_personas}
                    onChange={(event) =>
                      modificarFormulario(
                        "numero_personas",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Estado
                  <select
                    value={formulario.estado}
                    onChange={(event) =>
                      modificarFormulario(
                        "estado",
                        event.target.value,
                      )
                    }
                  >
                    <option value="Pendiente">
                      Pendiente
                    </option>
                    <option value="Confirmado">
                      Confirmado
                    </option>
                    <option value="Realizado">
                      Realizado
                    </option>
                    <option value="Cancelado">
                      Cancelado
                    </option>
                  </select>
                </label>

                <label>
                  Tipo de servicio
                  <input
                    value={formulario.tipo_servicio}
                    onChange={(event) =>
                      modificarFormulario(
                        "tipo_servicio",
                        event.target.value,
                      )
                    }
                    placeholder="Coffee break, almuerzo..."
                  />
                </label>

                <label>
                  Responsable
                  <input
                    value={formulario.responsable}
                    onChange={(event) =>
                      modificarFormulario(
                        "responsable",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Teléfono de contacto
                  <input
                    value={formulario.telefono_contacto}
                    onChange={(event) =>
                      modificarFormulario(
                        "telefono_contacto",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Código postal
                  <input
                    value={formulario.codigo_postal}
                    onChange={(event) =>
                      modificarFormulario(
                        "codigo_postal",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="campo-ancho">
                  Dirección
                  <input
                    value={formulario.direccion}
                    onChange={(event) =>
                      modificarFormulario(
                        "direccion",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="campo-ancho">
                  Población
                  <input
                    value={formulario.poblacion}
                    onChange={(event) =>
                      modificarFormulario(
                        "poblacion",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="campo-ancho">
                  Observaciones
                  <textarea
                    value={formulario.observaciones}
                    onChange={(event) =>
                      modificarFormulario(
                        "observaciones",
                        event.target.value,
                      )
                    }
                    placeholder="Montaje, alergias, acceso, material..."
                  />
                </label>
              </div>

              <div className="catering-modal-acciones">
                <button type="submit" disabled={guardando}>
                  {guardando
                    ? "Guardando..."
                    : "Guardar catering"}
                </button>

                <button
                  type="button"
                  className="boton-cancelar"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                {formulario.id && (
                  <button
                    type="button"
                    className="boton-eliminar"
                    onClick={eliminarCatering}
                    disabled={guardando}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function crearDiasCalendario(fechaVisible) {
  const año = fechaVisible.getFullYear();
  const mes = fechaVisible.getMonth();

  const primerDia = new Date(año, mes, 1);
  const ultimoDia = new Date(año, mes + 1, 0);

  const diasAntes = (primerDia.getDay() + 6) % 7;
  const diasDespues =
    6 - ((ultimoDia.getDay() + 6) % 7);

  const fechaInicio = new Date(
    año,
    mes,
    1 - diasAntes,
  );

  const fechaFinal = new Date(
    año,
    mes,
    ultimoDia.getDate() + diasDespues,
  );

  const dias = [];
  const cursor = new Date(fechaInicio);

  while (cursor <= fechaFinal) {
    dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dias;
}

function obtenerFechaISO(fecha) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(
    2,
    "0",
  );
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${año}-${mes}-${dia}`;
}

function mismoDia(fechaA, fechaB) {
  return (
    fechaA.getFullYear() === fechaB.getFullYear() &&
    fechaA.getMonth() === fechaB.getMonth() &&
    fechaA.getDate() === fechaB.getDate()
  );
}

function cortarHora(hora) {
  return hora ? String(hora).slice(0, 5) : "";
}

function obtenerInicioSemana(fecha) {
  const copia = new Date(fecha);
  const dia = copia.getDay();
  const diferencia = dia === 0 ? -6 : 1 - dia;

  copia.setDate(copia.getDate() + diferencia);
  return obtenerFechaISO(copia);
}

function crearHorasSemana() {
  return Array.from({ length: 10 }, (_, indice) =>
    `${String(indice + 7).padStart(2, "0")}:00`,
  );
}

function obtenerHoraEntera(hora) {
  if (!hora) return "07:00";

  const numeroHora = Number(String(hora).slice(0, 2));
  const horaSegura = Number.isFinite(numeroHora)
    ? Math.min(16, Math.max(7, numeroHora))
    : 7;

  return `${String(horaSegura).padStart(2, "0")}:00`;
}

function formatearDiaCorto(fecha) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
  }).format(fecha);
}

function formatearRangoSemana(dias) {
  if (!dias.length) return "";

  const inicio = dias[0];
  const fin = dias[dias.length - 1];

  return `${formatearDiaCorto(inicio)} - ${formatearDiaCorto(fin)} / ${fin.getFullYear()}`;
}

function normalizarEstado(estado) {
  return String(estado || "Pendiente")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

const ESTILOS_CATERING = `
  .catering-panel {
    padding: 28px;
  }

  .catering-cabecera,
  .catering-barra,
  .catering-modal-cabecera,
  .catering-modal-acciones {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .catering-cabecera h2,
  .catering-modal-cabecera h3 {
    margin: 0;
  }

  .catering-descripcion {
    margin: 6px 0 0;
    color: #756d7a;
  }

  .catering-etiqueta {
    margin: 0 0 6px;
    color: #7837a1;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 2px;
  }

  .catering-barra {
    margin: 24px 0 18px;
  }

  .catering-barra h3 {
    margin: 0;
    font-size: 25px;
    text-transform: capitalize;
  }

  .catering-navegacion {
    display: flex;
    gap: 8px;
  }

  .boton-hoy,
  .boton-cancelar {
    background: #ffffff;
    color: #642a87;
    border: 1px solid #cdb9d8;
  }

  .catering-contador {
    padding: 8px 13px;
    border-radius: 999px;
    background: #f1e8f6;
    color: #642a87;
    font-weight: 700;
  }

  .catering-error,
  .catering-mensaje,
  .catering-cargando {
    margin-bottom: 16px;
    padding: 12px 15px;
    border-radius: 10px;
  }

  .catering-error {
    background: #fde9ed;
    color: #a52d43;
  }

  .catering-mensaje {
    background: #e5f7ec;
    color: #256b41;
  }

  .catering-cargando {
    background: #f3eff5;
    color: #625968;
  }

  .calendario-contenedor {
    overflow-x: auto;
    border: 1px solid #ded5e3;
    border-radius: 16px;
    background: #ffffff;
  }

  .calendario-semana,
  .calendario-rejilla {
    display: grid;
    grid-template-columns: repeat(7, minmax(125px, 1fr));
    min-width: 875px;
  }

  .calendario-nombre-dia {
    padding: 12px;
    border-right: 1px solid #ded5e3;
    background: #f2eaf6;
    color: #622984;
    font-weight: 800;
    text-align: center;
  }

  .calendario-dia {
    position: relative;
    min-height: 140px;
    padding: 42px 9px 9px;
    border: 0;
    border-right: 1px solid #e7e1ea;
    border-bottom: 1px solid #e7e1ea;
    border-radius: 0;
    background: #ffffff;
    color: #302738;
    text-align: left;
    box-shadow: none;
    overflow: hidden;
  }

  .calendario-dia:hover {
    background: #faf7fc;
    transform: none;
  }

  .calendario-dia-otro-mes {
    background: #f7f5f8;
    color: #aaa2ae;
  }

  .calendario-dia-hoy {
    box-shadow: inset 0 0 0 2px #7837a1;
  }

  .calendario-numero {
    position: absolute;
    top: 8px;
    left: 10px;
    z-index: 3;
    display: flex;
    width: 29px;
    height: 29px;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #ffffff;
    font-weight: 800;
  }

  .calendario-dia-hoy .calendario-numero {
    background: #7837a1;
    color: white;
  }

  .calendario-eventos {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 0;
  }

  .calendario-evento {
    display: flex;
    gap: 5px;
    overflow: hidden;
    padding: 6px;
    border-radius: 7px;
    background: #efe4f6;
    color: #582376;
    font-size: 12px;
    cursor: pointer;
  }

  .calendario-evento span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .estado-confirmado {
    background: #e5f2ff;
    color: #245f9f;
  }

  .estado-realizado {
    background: #e5f7ec;
    color: #236c40;
  }

  .estado-cancelado {
    background: #fde9ed;
    color: #a93045;
    text-decoration: line-through;
  }

  .calendario-mas {
    padding-left: 5px;
    color: #756d7a;
    font-size: 12px;
    font-weight: 700;
  }

  .catering-semana-evento {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    width: 100%;
    padding: 8px;
    text-align: left;
    white-space: normal;
  }

  .catering-semana-evento strong {
    font-size: 13px;
  }

  .catering-semana-cliente {
    display: block;
    width: 100%;
    overflow: hidden;
    font-size: 13px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .catering-semana-evento small {
    display: block;
    width: 100%;
    overflow-wrap: anywhere;
    line-height: 1.25;
  }

  .catering-semana-estado {
    font-weight: 800;
  }

  .catering-modal-fondo {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(31, 20, 37, 0.6);
  }

  .catering-modal {
    width: min(1000px, 100%);
    max-height: 92vh;
    overflow-y: auto;
    padding: 26px;
    border-radius: 20px;
    background: #ffffff;
  }

  .catering-cerrar {
    width: 43px;
    padding: 6px;
    background: #ffffff;
    color: #4d4451;
    border: 1px solid #d1c7d6;
    font-size: 25px;
  }

  .catering-formulario {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-top: 20px;
  }

  .catering-formulario label {
    display: flex;
    flex-direction: column;
    gap: 7px;
    font-weight: 700;
  }

  .catering-formulario input,
  .catering-formulario select,
  .catering-formulario textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 11px;
    border: 1px solid #cfc5d4;
    border-radius: 9px;
    font: inherit;
  }

  .catering-formulario textarea {
    min-height: 100px;
    resize: vertical;
  }

  .campo-ancho {
    grid-column: 1 / -1;
  }

  .catering-modal-acciones {
    justify-content: flex-start;
    margin-top: 22px;
  }

  .boton-eliminar {
    margin-left: auto;
    background: #bb334b;
  }

  @media (max-width: 700px) {
    .catering-cabecera,
    .catering-barra {
      align-items: stretch;
      flex-direction: column;
    }

    .catering-formulario {
      grid-template-columns: 1fr;
    }

    .campo-ancho {
      grid-column: auto;
    }

    .catering-modal-acciones {
      flex-direction: column;
    }

    .catering-modal-acciones button {
      width: 100%;
    }

    .boton-eliminar {
      margin-left: 0;
    }
  }

  @media (max-width: 1050px) {
    .catering-panel {
      padding: 22px;
    }

    .catering-cabecera {
      align-items: flex-start;
    }

    .catering-acciones-cabecera {
      justify-content: flex-end;
    }

    .catering-acciones-cabecera button,
    .catering-navegacion button {
      min-width: 48px;
      min-height: 48px;
      touch-action: manipulation;
    }

    .calendario-contenedor {
      width: 100%;
      overflow: hidden;
    }

    .calendario-semana,
    .calendario-rejilla {
      grid-template-columns: repeat(7, minmax(0, 1fr));
      min-width: 0;
    }

    .calendario-nombre-dia {
      padding: 11px 4px;
      font-size: 13px;
    }

    .calendario-nombre-dia span {
      display: none;
    }

    .calendario-nombre-dia::after {
      content: attr(data-dia-corto);
    }

    .calendario-dia {
      min-height: 112px;
      padding: 40px 5px 6px;
    }

    .calendario-evento {
      padding: 5px;
      font-size: 11px;
    }
  }

  @media (max-width: 700px) {
    .catering-panel {
      padding: 16px;
    }

    .catering-barra h3 {
      text-align: center;
    }

    .catering-navegacion {
      justify-content: center;
    }

    .calendario-dia {
      min-height: 86px;
    }

    .calendario-evento {
      display: block;
    }

    .calendario-evento strong {
      display: block;
    }
  }
`;

export default Catering;
