import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabase.js";

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const TURNOS = {
  manana: {
    etiqueta: "Mañana",
    inicio: "08:00",
    fin: "15:00",
    pausa: 0,
  },
  tarde: {
    etiqueta: "Tarde",
    inicio: "13:00",
    fin: "20:30",
    pausa: 0,
  },
  tety: {
    etiqueta: "13:00–18:00",
    inicio: "13:00",
    fin: "18:00",
    pausa: 0,
  },
  personalizado: {
    etiqueta: "Personalizado",
    inicio: "",
    fin: "",
    pausa: 0,
  },
  fiesta: {
    etiqueta: "Fiesta",
    inicio: "",
    fin: "",
    pausa: 0,
  },
  vacaciones: {
    etiqueta: "Vacaciones",
    inicio: "",
    fin: "",
    pausa: 0,
  },
  formacion: {
    etiqueta: "Formación",
    inicio: "",
    fin: "",
    pausa: 0,
  },
};

const EMPLEADO_VACIO = {
  nombre: "",
  puesto: "",
  observaciones: "",
  activo: true,
};

const VACACIONES_VACIAS = {
  empleado_id: "",
  fecha_inicio: "",
  fecha_fin: "",
  observaciones: "",
};

const FORMACION_VACIA = {
  empleado_id: "",
  nombre: "",
  fecha: "",
  horas: "",
  observaciones: "",
};

function fechaISO(fecha) {
  const ano = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function crearFechaLocal(fechaTexto) {
  if (!fechaTexto) return new Date();

  const [ano, mes, dia] = fechaTexto.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function obtenerLunes(fechaBase = new Date()) {
  const fecha = new Date(fechaBase);
  fecha.setHours(12, 0, 0, 0);

  const dia = fecha.getDay();
  const diferencia = dia === 0 ? -6 : 1 - dia;

  fecha.setDate(fecha.getDate() + diferencia);

  return fecha;
}

function sumarDias(fecha, dias) {
  const nuevaFecha = new Date(fecha);
  nuevaFecha.setDate(nuevaFecha.getDate() + dias);
  return nuevaFecha;
}

function formatearFecha(fecha) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
  }).format(fecha);
}

function formatearFechaCompleta(fechaTexto) {
  if (!fechaTexto) return "";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(crearFechaLocal(fechaTexto));
}

function calcularHoras(inicio, fin, pausaMinutos = 0) {
  if (!inicio || !fin) return 0;

  const [horaInicio, minutoInicio] = inicio.split(":").map(Number);
  const [horaFin, minutoFin] = fin.split(":").map(Number);

  let minutosInicio = horaInicio * 60 + minutoInicio;
  let minutosFin = horaFin * 60 + minutoFin;

  if (minutosFin < minutosInicio) {
    minutosFin += 24 * 60;
  }

  const minutosTrabajados = Math.max(
    0,
    minutosFin - minutosInicio - Number(pausaMinutos || 0),
  );

  return minutosTrabajados / 60;
}

function mostrarHoras(valor) {
  const numero = Number(valor || 0);

  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: numero % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(numero);
}

function HorarioPersonal() {
  const [lunesSemana, setLunesSemana] = useState(obtenerLunes());

  const [empleados, setEmpleados] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [vacaciones, setVacaciones] = useState([]);
  const [formaciones, setFormaciones] = useState([]);

  const [empleadoFormulario, setEmpleadoFormulario] =
    useState(EMPLEADO_VACIO);
  const [empleadoEditando, setEmpleadoEditando] = useState(null);

  const [vacacionesFormulario, setVacacionesFormulario] =
    useState(VACACIONES_VACIAS);

  const [formacionFormulario, setFormacionFormulario] =
    useState(FORMACION_VACIA);

  const [mostrarEmpleados, setMostrarEmpleados] = useState(false);
  const [mostrarVacaciones, setMostrarVacaciones] = useState(false);
  const [mostrarFormaciones, setMostrarFormaciones] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const diasSemana = useMemo(
    () =>
      DIAS_SEMANA.map((nombre, indice) => {
        const fecha = sumarDias(lunesSemana, indice);

        return {
          nombre,
          fecha,
          fechaISO: fechaISO(fecha),
        };
      }),
    [lunesSemana],
  );

  const fechaInicioSemana = diasSemana[0]?.fechaISO;
  const fechaFinSemana = diasSemana[6]?.fechaISO;

  useEffect(() => {
    cargarDatos();
  }, [fechaInicioSemana, fechaFinSemana]);

  async function cargarDatos() {
    if (!fechaInicioSemana || !fechaFinSemana) return;

    setCargando(true);
    setError("");

    const [
      respuestaEmpleados,
      respuestaHorarios,
      respuestaVacaciones,
      respuestaFormaciones,
    ] = await Promise.all([
      supabase
        .from("personal_empleados")
        .select("*")
        .order("orden", { ascending: true })
        .order("nombre", { ascending: true }),

      supabase
        .from("personal_horarios")
        .select("*")
        .gte("fecha", fechaInicioSemana)
        .lte("fecha", fechaFinSemana),

      supabase
        .from("personal_vacaciones")
        .select("*, empleado:personal_empleados(nombre)")
        .order("fecha_inicio", { ascending: false }),

      supabase
        .from("personal_formaciones")
        .select("*, empleado:personal_empleados(nombre)")
        .order("fecha", { ascending: false }),
    ]);

    const errores = [
      respuestaEmpleados.error,
      respuestaHorarios.error,
      respuestaVacaciones.error,
      respuestaFormaciones.error,
    ].filter(Boolean);

    if (errores.length > 0) {
      setError(errores[0].message);
    }

    setEmpleados(respuestaEmpleados.data || []);
    setHorarios(respuestaHorarios.data || []);
    setVacaciones(respuestaVacaciones.data || []);
    setFormaciones(respuestaFormaciones.data || []);

    setCargando(false);
  }

  function buscarHorario(empleadoId, fecha) {
    return horarios.find(
      (horario) =>
        horario.empleado_id === empleadoId && horario.fecha === fecha,
    );
  }

  function obtenerTurnoCelda(empleadoId, fecha) {
    const horario = buscarHorario(empleadoId, fecha);

    return {
      tipo_turno: horario?.tipo_turno || "fiesta",
      hora_inicio: horario?.hora_inicio?.slice(0, 5) || "",
      hora_fin: horario?.hora_fin?.slice(0, 5) || "",
      pausa_minutos: horario?.pausa_minutos || 0,
      observaciones: horario?.observaciones || "",
    };
  }

  async function guardarTurno(empleadoId, fecha, cambios) {
    setError("");
    setMensaje("");

    const turnoActual = obtenerTurnoCelda(empleadoId, fecha);
    const turnoNuevo = {
      ...turnoActual,
      ...cambios,
    };

    if (cambios.tipo_turno && TURNOS[cambios.tipo_turno]) {
      const configuracion = TURNOS[cambios.tipo_turno];

      turnoNuevo.hora_inicio = configuracion.inicio || null;
      turnoNuevo.hora_fin = configuracion.fin || null;
      turnoNuevo.pausa_minutos = configuracion.pausa || 0;
    }

    const registro = {
      empleado_id: empleadoId,
      fecha,
      tipo_turno: turnoNuevo.tipo_turno,
      hora_inicio: turnoNuevo.hora_inicio || null,
      hora_fin: turnoNuevo.hora_fin || null,
      pausa_minutos: Number(turnoNuevo.pausa_minutos || 0),
      observaciones: turnoNuevo.observaciones || "",
      updated_at: new Date().toISOString(),
    };

    setHorarios((anteriores) => {
      const existe = anteriores.some(
        (item) =>
          item.empleado_id === empleadoId && item.fecha === fecha,
      );

      if (existe) {
        return anteriores.map((item) =>
          item.empleado_id === empleadoId && item.fecha === fecha
            ? { ...item, ...registro }
            : item,
        );
      }

      return [...anteriores, registro];
    });

    const { data, error: errorSupabase } = await supabase
      .from("personal_horarios")
      .upsert(registro, {
        onConflict: "empleado_id,fecha",
      })
      .select()
      .single();

    if (errorSupabase) {
      setError(errorSupabase.message);
      await cargarDatos();
      return;
    }

    setHorarios((anteriores) =>
      anteriores.map((item) =>
        item.empleado_id === empleadoId && item.fecha === fecha
          ? data
          : item,
      ),
    );
  }

  function cambiarCampoEmpleado(campo, valor) {
    setEmpleadoFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function prepararEdicionEmpleado(empleado) {
    setEmpleadoEditando(empleado.id);
    setEmpleadoFormulario({
      nombre: empleado.nombre || "",
      puesto: empleado.puesto || "",
      observaciones: empleado.observaciones || "",
      activo: empleado.activo !== false,
    });
    setMostrarEmpleados(true);
  }

  function limpiarEmpleado() {
    setEmpleadoFormulario(EMPLEADO_VACIO);
    setEmpleadoEditando(null);
  }

  async function guardarEmpleado(evento) {
    evento.preventDefault();

    if (!empleadoFormulario.nombre.trim()) {
      setError("Debes indicar el nombre del empleado.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const registro = {
      nombre: empleadoFormulario.nombre.trim(),
      puesto: empleadoFormulario.puesto.trim(),
      observaciones: empleadoFormulario.observaciones.trim(),
      activo: empleadoFormulario.activo,
      updated_at: new Date().toISOString(),
    };

    let respuesta;

    if (empleadoEditando) {
      respuesta = await supabase
        .from("personal_empleados")
        .update(registro)
        .eq("id", empleadoEditando);
    } else {
      respuesta = await supabase.from("personal_empleados").insert({
        ...registro,
        orden: empleados.length + 1,
      });
    }

    if (respuesta.error) {
      setError(respuesta.error.message);
    } else {
      setMensaje(
        empleadoEditando
          ? "Empleado actualizado correctamente."
          : "Empleado creado correctamente.",
      );
      limpiarEmpleado();
      await cargarDatos();
    }

    setGuardando(false);
  }

  async function desactivarEmpleado(empleado) {
    const confirmado = window.confirm(
      `¿Quieres ${
        empleado.activo ? "desactivar" : "activar"
      } a ${empleado.nombre}?`,
    );

    if (!confirmado) return;

    const { error: errorSupabase } = await supabase
      .from("personal_empleados")
      .update({
        activo: !empleado.activo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", empleado.id);

    if (errorSupabase) {
      setError(errorSupabase.message);
      return;
    }

    await cargarDatos();
  }

  async function guardarVacaciones(evento) {
    evento.preventDefault();

    if (
      !vacacionesFormulario.empleado_id ||
      !vacacionesFormulario.fecha_inicio ||
      !vacacionesFormulario.fecha_fin
    ) {
      setError("Selecciona empleado, fecha de inicio y fecha de fin.");
      return;
    }

    if (
      vacacionesFormulario.fecha_fin <
      vacacionesFormulario.fecha_inicio
    ) {
      setError(
        "La fecha final no puede ser anterior a la fecha de inicio.",
      );
      return;
    }

    setGuardando(true);
    setError("");

    const { error: errorSupabase } = await supabase
      .from("personal_vacaciones")
      .insert({
        empleado_id: vacacionesFormulario.empleado_id,
        fecha_inicio: vacacionesFormulario.fecha_inicio,
        fecha_fin: vacacionesFormulario.fecha_fin,
        observaciones:
          vacacionesFormulario.observaciones.trim(),
      });

    if (errorSupabase) {
      setError(errorSupabase.message);
      setGuardando(false);
      return;
    }

    const fechasVacaciones = [];
    let fechaActual = crearFechaLocal(
      vacacionesFormulario.fecha_inicio,
    );
    const fechaFinal = crearFechaLocal(
      vacacionesFormulario.fecha_fin,
    );

    while (fechaActual <= fechaFinal) {
      fechasVacaciones.push({
        empleado_id: vacacionesFormulario.empleado_id,
        fecha: fechaISO(fechaActual),
        tipo_turno: "vacaciones",
        hora_inicio: null,
        hora_fin: null,
        pausa_minutos: 0,
        observaciones:
          vacacionesFormulario.observaciones.trim(),
        updated_at: new Date().toISOString(),
      });

      fechaActual = sumarDias(fechaActual, 1);
    }

    await supabase.from("personal_horarios").upsert(fechasVacaciones, {
      onConflict: "empleado_id,fecha",
    });

    setVacacionesFormulario(VACACIONES_VACIAS);
    setMensaje("Vacaciones guardadas en el calendario.");
    await cargarDatos();
    setGuardando(false);
  }

  async function eliminarVacaciones(id) {
    if (!window.confirm("¿Quieres eliminar estas vacaciones?")) return;

    const { error: errorSupabase } = await supabase
      .from("personal_vacaciones")
      .delete()
      .eq("id", id);

    if (errorSupabase) {
      setError(errorSupabase.message);
      return;
    }

    await cargarDatos();
  }

  async function guardarFormacion(evento) {
    evento.preventDefault();

    if (
      !formacionFormulario.empleado_id ||
      !formacionFormulario.nombre.trim() ||
      !formacionFormulario.fecha
    ) {
      setError("Indica empleado, formación y fecha.");
      return;
    }

    setGuardando(true);
    setError("");

    const horasFormacion = Number(formacionFormulario.horas || 0);

    const { error: errorSupabase } = await supabase
      .from("personal_formaciones")
      .insert({
        empleado_id: formacionFormulario.empleado_id,
        nombre: formacionFormulario.nombre.trim(),
        fecha: formacionFormulario.fecha,
        horas: horasFormacion,
        observaciones:
          formacionFormulario.observaciones.trim(),
      });

    if (errorSupabase) {
      setError(errorSupabase.message);
      setGuardando(false);
      return;
    }

    const inicio =
      horasFormacion > 0 ? "09:00" : null;

    const fin =
      horasFormacion > 0
        ? `${String(9 + Math.floor(horasFormacion)).padStart(
            2,
            "0",
          )}:${horasFormacion % 1 ? "30" : "00"}`
        : null;

    await supabase.from("personal_horarios").upsert(
      {
        empleado_id: formacionFormulario.empleado_id,
        fecha: formacionFormulario.fecha,
        tipo_turno: "formacion",
        hora_inicio: inicio,
        hora_fin: fin,
        pausa_minutos: 0,
        observaciones: formacionFormulario.nombre.trim(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "empleado_id,fecha",
      },
    );

    setFormacionFormulario(FORMACION_VACIA);
    setMensaje("Formación guardada correctamente.");
    await cargarDatos();
    setGuardando(false);
  }

  async function eliminarFormacion(id) {
    if (!window.confirm("¿Quieres eliminar esta formación?")) return;

    const { error: errorSupabase } = await supabase
      .from("personal_formaciones")
      .delete()
      .eq("id", id);

    if (errorSupabase) {
      setError(errorSupabase.message);
      return;
    }

    await cargarDatos();
  }

  function horasEmpleadoSemana(empleadoId) {
    return diasSemana.reduce((total, dia) => {
      const horario = obtenerTurnoCelda(
        empleadoId,
        dia.fechaISO,
      );

      if (
        ["fiesta", "vacaciones"].includes(horario.tipo_turno)
      ) {
        return total;
      }

      return (
        total +
        calcularHoras(
          horario.hora_inicio,
          horario.hora_fin,
          horario.pausa_minutos,
        )
      );
    }, 0);
  }

  function empleadosTrabajandoDia(fecha) {
    return empleados.filter((empleado) => {
      if (!empleado.activo) return false;

      const horario = obtenerTurnoCelda(empleado.id, fecha);

      return !["fiesta", "vacaciones"].includes(
        horario.tipo_turno,
      );
    }).length;
  }

  async function copiarSemanaAnterior() {
    const lunesAnterior = sumarDias(lunesSemana, -7);
    const domingoAnterior = sumarDias(lunesAnterior, 6);

    const { data, error: errorSupabase } = await supabase
      .from("personal_horarios")
      .select("*")
      .gte("fecha", fechaISO(lunesAnterior))
      .lte("fecha", fechaISO(domingoAnterior));

    if (errorSupabase) {
      setError(errorSupabase.message);
      return;
    }

    if (!data?.length) {
      setError("La semana anterior no tiene horarios guardados.");
      return;
    }

    const confirmado = window.confirm(
      "Se copiarán los turnos de la semana anterior. Los turnos actuales de esta semana podrían sustituirse.",
    );

    if (!confirmado) return;

    const registros = data.map((horario) => ({
      empleado_id: horario.empleado_id,
      fecha: fechaISO(
        sumarDias(crearFechaLocal(horario.fecha), 7),
      ),
      tipo_turno: horario.tipo_turno,
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
      pausa_minutos: horario.pausa_minutos,
      observaciones: horario.observaciones,
      updated_at: new Date().toISOString(),
    }));

    const { error: errorCopiar } = await supabase
      .from("personal_horarios")
      .upsert(registros, {
        onConflict: "empleado_id,fecha",
      });

    if (errorCopiar) {
      setError(errorCopiar.message);
      return;
    }

    setMensaje("Semana anterior copiada correctamente.");
    await cargarDatos();
  }

  function exportarExcel() {
    const filas = empleados.map((empleado) => {
      const fila = {
        Empleado: empleado.nombre,
        Puesto: empleado.puesto || "",
      };

      diasSemana.forEach((dia) => {
        const horario = obtenerTurnoCelda(
          empleado.id,
          dia.fechaISO,
        );

        const etiqueta =
          TURNOS[horario.tipo_turno]?.etiqueta ||
          horario.tipo_turno;

        fila[
          `${dia.nombre} ${formatearFecha(dia.fecha)}`
        ] =
          horario.hora_inicio && horario.hora_fin
            ? `${etiqueta} ${horario.hora_inicio}-${horario.hora_fin}`
            : etiqueta;
      });

      fila["Horas semanales"] = horasEmpleadoSemana(empleado.id);

      return fila;
    });

    const hoja = XLSX.utils.json_to_sheet(filas);

    hoja["!cols"] = [
      { wch: 20 },
      { wch: 18 },
      ...diasSemana.map(() => ({ wch: 24 })),
      { wch: 16 },
    ];

    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(libro, hoja, "Horario");

    XLSX.writeFile(
      libro,
      `Horario_${fechaInicioSemana}_${fechaFinSemana}.xlsx`,
    );
  }

  function imprimirHorario() {
    window.print();
  }

  const empleadosActivos = empleados.filter(
    (empleado) => empleado.activo,
  );

  const totalHorasSemana = empleadosActivos.reduce(
    (total, empleado) =>
      total + horasEmpleadoSemana(empleado.id),
    0,
  );

  return (
    <section className="panel horario-personal-page">
      <header className="horario-cabecera no-imprimir">
        <div>
          <p className="etiqueta">PERSONAL</p>
          <h1>Horario de personal</h1>
          <p className="texto-secundario">
            Horarios, vacaciones y formación del equipo.
          </p>
        </div>

        <div className="horario-cabecera-acciones">
          <button
            type="button"
            className="boton-secundario"
            onClick={() =>
              setMostrarEmpleados((anterior) => !anterior)
            }
          >
            👥 Empleados
          </button>

          <button
            type="button"
            className="boton-secundario"
            onClick={() =>
              setMostrarVacaciones((anterior) => !anterior)
            }
          >
            🏖 Vacaciones
          </button>

          <button
            type="button"
            className="boton-secundario"
            onClick={() =>
              setMostrarFormaciones((anterior) => !anterior)
            }
          >
            🎓 Formación
          </button>

          <button type="button" onClick={exportarExcel}>
            📥 Excel
          </button>

          <button type="button" onClick={imprimirHorario}>
            🖨 Imprimir
          </button>
        </div>
      </header>

      {error && <div className="mensaje-error">{error}</div>}
      {mensaje && <div className="mensaje">{mensaje}</div>}

      {mostrarEmpleados && (
        <div className="horario-panel-secundario no-imprimir">
          <div className="titulo-seccion">
            <div>
              <p className="etiqueta">EQUIPO</p>
              <h2>Empleados</h2>
            </div>

            {empleadoEditando && (
              <button
                type="button"
                className="boton-secundario"
                onClick={limpiarEmpleado}
              >
                Nuevo empleado
              </button>
            )}
          </div>

          <form
            className="rejilla-formulario"
            onSubmit={guardarEmpleado}
          >
            <label>
              Nombre
              <input
                value={empleadoFormulario.nombre}
                onChange={(evento) =>
                  cambiarCampoEmpleado(
                    "nombre",
                    evento.target.value,
                  )
                }
                placeholder="Nombre del empleado"
              />
            </label>

            <label>
              Puesto o departamento
              <input
                value={empleadoFormulario.puesto}
                onChange={(evento) =>
                  cambiarCampoEmpleado(
                    "puesto",
                    evento.target.value,
                  )
                }
                placeholder="Obrador, cocina, barra..."
              />
            </label>

            <label className="campo-completo">
              Observaciones
              <textarea
                value={empleadoFormulario.observaciones}
                onChange={(evento) =>
                  cambiarCampoEmpleado(
                    "observaciones",
                    evento.target.value,
                  )
                }
              />
            </label>

            <label className="checkbox-linea">
              <input
                type="checkbox"
                checked={empleadoFormulario.activo}
                onChange={(evento) =>
                  cambiarCampoEmpleado(
                    "activo",
                    evento.target.checked,
                  )
                }
              />
              Empleado activo
            </label>

            <div className="grupo-botones">
              <button type="submit" disabled={guardando}>
                {empleadoEditando
                  ? "Guardar cambios"
                  : "Añadir empleado"}
              </button>

              {empleadoEditando && (
                <button
                  type="button"
                  className="boton-secundario"
                  onClick={limpiarEmpleado}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="horario-lista-empleados">
            {empleados.map((empleado) => (
              <article
                key={empleado.id}
                className={`horario-empleado-tarjeta ${
                  empleado.activo ? "" : "inactivo"
                }`}
              >
                <div>
                  <strong>{empleado.nombre}</strong>
                  <span>{empleado.puesto || "Sin puesto"}</span>
                </div>

                <div className="acciones">
                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={() =>
                      prepararEdicionEmpleado(empleado)
                    }
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    className={
                      empleado.activo
                        ? "boton-peligro"
                        : "boton-exito"
                    }
                    onClick={() =>
                      desactivarEmpleado(empleado)
                    }
                  >
                    {empleado.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {mostrarVacaciones && (
        <div className="horario-panel-secundario no-imprimir">
          <div className="titulo-seccion">
            <div>
              <p className="etiqueta">AUSENCIAS</p>
              <h2>Vacaciones</h2>
            </div>
          </div>

          <form
            className="rejilla-formulario"
            onSubmit={guardarVacaciones}
          >
            <label>
              Empleado
              <select
                value={vacacionesFormulario.empleado_id}
                onChange={(evento) =>
                  setVacacionesFormulario((anterior) => ({
                    ...anterior,
                    empleado_id: evento.target.value,
                  }))
                }
              >
                <option value="">Seleccionar empleado</option>
                {empleadosActivos.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {empleado.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fecha de inicio
              <input
                type="date"
                value={vacacionesFormulario.fecha_inicio}
                onChange={(evento) =>
                  setVacacionesFormulario((anterior) => ({
                    ...anterior,
                    fecha_inicio: evento.target.value,
                  }))
                }
              />
            </label>

            <label>
              Fecha final
              <input
                type="date"
                value={vacacionesFormulario.fecha_fin}
                onChange={(evento) =>
                  setVacacionesFormulario((anterior) => ({
                    ...anterior,
                    fecha_fin: evento.target.value,
                  }))
                }
              />
            </label>

            <label className="campo-completo">
              Observaciones
              <textarea
                value={vacacionesFormulario.observaciones}
                onChange={(evento) =>
                  setVacacionesFormulario((anterior) => ({
                    ...anterior,
                    observaciones: evento.target.value,
                  }))
                }
              />
            </label>

            <button type="submit" disabled={guardando}>
              Guardar vacaciones
            </button>
          </form>

          <div className="tabla-contenedor margen-superior">
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Observaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {vacaciones.map((periodo) => (
                  <tr key={periodo.id}>
                    <td>
                      {periodo.empleado?.nombre || "Empleado"}
                    </td>
                    <td>
                      {formatearFechaCompleta(
                        periodo.fecha_inicio,
                      )}
                    </td>
                    <td>
                      {formatearFechaCompleta(periodo.fecha_fin)}
                    </td>
                    <td>{periodo.observaciones || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="boton-peligro"
                        onClick={() =>
                          eliminarVacaciones(periodo.id)
                        }
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}

                {!vacaciones.length && (
                  <tr>
                    <td colSpan="5">No hay vacaciones guardadas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mostrarFormaciones && (
        <div className="horario-panel-secundario no-imprimir">
          <div className="titulo-seccion">
            <div>
              <p className="etiqueta">APRENDIZAJE</p>
              <h2>Formación</h2>
            </div>
          </div>

          <form
            className="rejilla-formulario"
            onSubmit={guardarFormacion}
          >
            <label>
              Empleado
              <select
                value={formacionFormulario.empleado_id}
                onChange={(evento) =>
                  setFormacionFormulario((anterior) => ({
                    ...anterior,
                    empleado_id: evento.target.value,
                  }))
                }
              >
                <option value="">Seleccionar empleado</option>
                {empleadosActivos.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {empleado.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nombre de la formación
              <input
                value={formacionFormulario.nombre}
                onChange={(evento) =>
                  setFormacionFormulario((anterior) => ({
                    ...anterior,
                    nombre: evento.target.value,
                  }))
                }
                placeholder="Manipulación de alimentos..."
              />
            </label>

            <label>
              Fecha
              <input
                type="date"
                value={formacionFormulario.fecha}
                onChange={(evento) =>
                  setFormacionFormulario((anterior) => ({
                    ...anterior,
                    fecha: evento.target.value,
                  }))
                }
              />
            </label>

            <label>
              Horas
              <input
                type="number"
                min="0"
                step="0.5"
                value={formacionFormulario.horas}
                onChange={(evento) =>
                  setFormacionFormulario((anterior) => ({
                    ...anterior,
                    horas: evento.target.value,
                  }))
                }
              />
            </label>

            <label className="campo-completo">
              Observaciones
              <textarea
                value={formacionFormulario.observaciones}
                onChange={(evento) =>
                  setFormacionFormulario((anterior) => ({
                    ...anterior,
                    observaciones: evento.target.value,
                  }))
                }
              />
            </label>

            <button type="submit" disabled={guardando}>
              Guardar formación
            </button>
          </form>

          <div className="tabla-contenedor margen-superior">
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Formación</th>
                  <th>Fecha</th>
                  <th>Horas</th>
                  <th>Observaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {formaciones.map((formacion) => (
                  <tr key={formacion.id}>
                    <td>
                      {formacion.empleado?.nombre || "Empleado"}
                    </td>
                    <td>{formacion.nombre}</td>
                    <td>
                      {formatearFechaCompleta(formacion.fecha)}
                    </td>
                    <td>{mostrarHoras(formacion.horas)} h</td>
                    <td>{formacion.observaciones || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="boton-peligro"
                        onClick={() =>
                          eliminarFormacion(formacion.id)
                        }
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}

                {!formaciones.length && (
                  <tr>
                    <td colSpan="6">
                      No hay formaciones guardadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="horario-navegacion no-imprimir">
        <button
          type="button"
          className="boton-secundario"
          onClick={() =>
            setLunesSemana((anterior) =>
              sumarDias(anterior, -7),
            )
          }
        >
          ← Semana anterior
        </button>

        <div className="horario-periodo">
          <strong>
            {formatearFecha(diasSemana[0].fecha)} –{" "}
            {formatearFechaCompleta(diasSemana[6].fechaISO)}
          </strong>

          <button
            type="button"
            className="boton-secundario"
            onClick={() => setLunesSemana(obtenerLunes())}
          >
            Semana actual
          </button>
        </div>

        <button
          type="button"
          className="boton-secundario"
          onClick={() =>
            setLunesSemana((anterior) =>
              sumarDias(anterior, 7),
            )
          }
        >
          Semana siguiente →
        </button>
      </div>

      <div className="horario-resumen">
        <article>
          <span>Empleados activos</span>
          <strong>{empleadosActivos.length}</strong>
        </article>

        <article>
          <span>Horas programadas</span>
          <strong>{mostrarHoras(totalHorasSemana)} h</strong>
        </article>

        <article>
          <span>Inicio de semana</span>
          <strong>
            {formatearFechaCompleta(fechaInicioSemana)}
          </strong>
        </article>

        <article>
          <span>Fin de semana</span>
          <strong>{formatearFechaCompleta(fechaFinSemana)}</strong>
        </article>
      </div>

      <div className="grupo-botones no-imprimir margen-inferior">
        <button
          type="button"
          className="boton-secundario"
          onClick={copiarSemanaAnterior}
        >
          📋 Copiar semana anterior
        </button>
      </div>

      {cargando ? (
        <div className="estado-vacio">
          <p>Cargando horario...</p>
        </div>
      ) : (
        <div className="horario-tabla-contenedor">
          <table className="horario-tabla">
            <thead>
              <tr>
                <th className="horario-columna-empleado">
                  Empleado
                </th>

                {diasSemana.map((dia) => (
                  <th key={dia.fechaISO}>
                    <span>{dia.nombre}</span>
                    <small>{formatearFecha(dia.fecha)}</small>
                  </th>
                ))}

                <th className="horario-columna-total">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {empleadosActivos.map((empleado) => (
                <tr key={empleado.id}>
                  <td className="horario-empleado">
                    <strong>{empleado.nombre}</strong>
                    <small>{empleado.puesto || "Personal"}</small>
                  </td>

                  {diasSemana.map((dia) => {
                    const turno = obtenerTurnoCelda(
                      empleado.id,
                      dia.fechaISO,
                    );

                    const horas = calcularHoras(
                      turno.hora_inicio,
                      turno.hora_fin,
                      turno.pausa_minutos,
                    );

                    return (
                      <td
                        key={`${empleado.id}-${dia.fechaISO}`}
                        className={`horario-celda turno-${turno.tipo_turno}`}
                      >
                        <select
                          value={turno.tipo_turno}
                          onChange={(evento) =>
                            guardarTurno(
                              empleado.id,
                              dia.fechaISO,
                              {
                                tipo_turno:
                                  evento.target.value,
                              },
                            )
                          }
                        >
                          {Object.entries(TURNOS).map(
                            ([valor, configuracion]) => (
                              <option key={valor} value={valor}>
                                {configuracion.etiqueta}
                              </option>
                            ),
                          )}
                        </select>

                        {[
                          "manana",
                          "tarde",
                          "tety",
                          "personalizado",
                          "formacion",
                        ].includes(turno.tipo_turno) && (
                          <div className="horario-horas">
                            <input
                              type="time"
                              value={turno.hora_inicio}
                              onChange={(evento) =>
                                guardarTurno(
                                  empleado.id,
                                  dia.fechaISO,
                                  {
                                    hora_inicio:
                                      evento.target.value,
                                  },
                                )
                              }
                            />

                            <span>–</span>

                            <input
                              type="time"
                              value={turno.hora_fin}
                              onChange={(evento) =>
                                guardarTurno(
                                  empleado.id,
                                  dia.fechaISO,
                                  {
                                    hora_fin:
                                      evento.target.value,
                                  },
                                )
                              }
                            />
                          </div>
                        )}

                        {horas > 0 && (
                          <small className="horario-horas-total">
                            {mostrarHoras(horas)} h
                          </small>
                        )}
                      </td>
                    );
                  })}

                  <td className="horario-total-empleado">
                    <strong>
                      {mostrarHoras(
                        horasEmpleadoSemana(empleado.id),
                      )}{" "}
                      h
                    </strong>
                  </td>
                </tr>
              ))}

              <tr className="horario-fila-cobertura">
                <td>
                  <strong>Personas trabajando</strong>
                </td>

                {diasSemana.map((dia) => (
                  <td key={dia.fechaISO}>
                    <strong>
                      {empleadosTrabajandoDia(dia.fechaISO)}
                    </strong>
                  </td>
                ))}

                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default HorarioPersonal;