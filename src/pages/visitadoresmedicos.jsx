import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase.js";

const FORMULARIO_VACIO = {
  nombre: "",
  apellidos: "",
  laboratorio: "",
  centro_medico: "",
  especialidad: "",
  telefono: "",
  movil: "",
  email: "",
  direccion: "",
  observaciones: "",
  activo: true,
  estado_pago: "pendiente",
  forma_pago: "",
  fecha_pago: "",
  importe_pagado: "",
};

function VisitadoresMedicos() {
  const navigate = useNavigate();
  const [visitadores, setVisitadores] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [visitadorEditando, setVisitadorEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarVisitadores() {
    setCargando(true);
    setError("");

    const { data, error: supabaseError } = await supabase
      .from("visitadores_medicos")
      .select("*")
      .order("nombre", { ascending: true });

    if (supabaseError) setError(supabaseError.message);
    setVisitadores(data ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargarVisitadores();
  }, []);

  const visitadoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return visitadores;

    return visitadores.filter((visitador) =>
      [
        visitador.nombre,
        visitador.apellidos,
        visitador.laboratorio,
        visitador.centro_medico,
        visitador.especialidad,
        visitador.telefono,
        visitador.movil,
        visitador.email,
        visitador.estado_pago,
        visitador.forma_pago,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(texto),
    );
  }, [visitadores, busqueda]);

  function cambiarCampo(event) {
    const { name, value, type, checked } = event.target;
    setFormulario((anterior) => ({
      ...anterior,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function nuevoVisitador() {
    setVisitadorEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setMostrarFormulario(true);
  }

  function empezarEdicion(visitador) {
    setVisitadorEditando(visitador);
    setFormulario({
      nombre: visitador.nombre ?? "",
      apellidos: visitador.apellidos ?? "",
      laboratorio: visitador.laboratorio ?? "",
      centro_medico: visitador.centro_medico ?? "",
      especialidad: visitador.especialidad ?? "",
      telefono: visitador.telefono ?? "",
      movil: visitador.movil ?? "",
      email: visitador.email ?? "",
      direccion: visitador.direccion ?? "",
      observaciones: visitador.observaciones ?? "",
      activo: visitador.activo ?? true,
      estado_pago: visitador.estado_pago ?? "pendiente",
      forma_pago: visitador.forma_pago ?? "",
      fecha_pago: visitador.fecha_pago ?? "",
      importe_pagado: visitador.importe_pagado ?? "",
    });
    setMostrarFormulario(true);
  }

  function cancelarFormulario() {
    setVisitadorEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setMostrarFormulario(false);
  }

  async function guardarVisitador(event) {
    event.preventDefault();

    if (!formulario.nombre.trim()) {
      setError("Escribe el nombre del visitador médico.");
      return;
    }

    setGuardando(true);
    const datos = {
      nombre: formulario.nombre.trim(),
      apellidos: textoONull(formulario.apellidos),
      laboratorio: textoONull(formulario.laboratorio),
      centro_medico: textoONull(formulario.centro_medico),
      especialidad: textoONull(formulario.especialidad),
      telefono: textoONull(formulario.telefono),
      movil: textoONull(formulario.movil),
      email: textoONull(formulario.email),
      direccion: textoONull(formulario.direccion),
      observaciones: textoONull(formulario.observaciones),
      activo: formulario.activo,
      estado_pago: formulario.estado_pago,
      forma_pago: textoONull(formulario.forma_pago),
      fecha_pago: formulario.estado_pago === "pagado" ? formulario.fecha_pago || null : null,
      importe_pagado: Number(formulario.importe_pagado || 0),
      updated_at: new Date().toISOString(),
    };

    const respuesta = visitadorEditando
      ? await supabase.from("visitadores_medicos").update(datos).eq("id", visitadorEditando.id)
      : await supabase.from("visitadores_medicos").insert(datos);

    if (respuesta.error) setError(respuesta.error.message);
    else {
      setMensaje("Visitador guardado correctamente.");
      setMostrarFormulario(false);
      setFormulario(FORMULARIO_VACIO);
      setVisitadorEditando(null);
      await cargarVisitadores();
    }
    setGuardando(false);
  }

  async function eliminarVisitador(visitador) {
    if (!window.confirm(`¿Eliminar a ${visitador.nombre}?`)) return;
    const { error: supabaseError } = await supabase
      .from("visitadores_medicos")
      .delete()
      .eq("id", visitador.id);

    if (supabaseError) setError(supabaseError.message);
    else await cargarVisitadores();
  }

  function generarFactura(visitador) {
    navigate("/facturacion", {
      state: {
        datosFactura: {
          origen: "visitador",
          visitador_id: visitador.id,
          nombre_cliente: [visitador.nombre, visitador.apellidos].filter(Boolean).join(" "),
          direccion: visitador.direccion ?? "",
          email: visitador.email ?? "",
          detalle_concepto: visitador.laboratorio
            ? `Servicios / pedido para ${visitador.laboratorio}`
            : "Servicios / pedido visitador médico",
          importe: visitador.importe_pagado ?? "",
          forma_pago: visitador.forma_pago || "tarjeta",
          estado: visitador.estado_pago === "pagado" ? "pagada" : "pendiente",
          fecha_pago: visitador.fecha_pago ?? "",
        },
      },
    });
  }

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Módulo</p>
          <h2>Visitadores médicos</h2>
        </div>
        <span className="contador">{visitadores.length} visitadores</span>
      </div>

      <div className="visitadores-barra">
        <input
          type="search"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por nombre, laboratorio, pago..."
        />
        <button type="button" onClick={nuevoVisitador}>+ Nuevo visitador</button>
      </div>

      {mostrarFormulario && (
        <form className="formulario" onSubmit={guardarVisitador}>
          <h3>{visitadorEditando ? "Editar visitador médico" : "Crear visitador médico"}</h3>

          <div className="visitadores-grid">
            {[
              ["nombre", "Nombre *", "text"],
              ["apellidos", "Apellidos", "text"],
              ["laboratorio", "Laboratorio", "text"],
              ["centro_medico", "Centro médico", "text"],
              ["especialidad", "Especialidad", "text"],
              ["telefono", "Teléfono", "tel"],
              ["movil", "Móvil", "tel"],
              ["email", "Email", "email"],
              ["direccion", "Dirección", "text"],
            ].map(([name, label, type]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  type={type}
                  value={formulario[name]}
                  onChange={cambiarCampo}
                  required={name === "nombre"}
                />
              </label>
            ))}

            <label>
              Estado del pago
              <select name="estado_pago" value={formulario.estado_pago} onChange={cambiarCampo}>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
              </select>
            </label>

            <label>
              Forma de pago
              <select name="forma_pago" value={formulario.forma_pago} onChange={cambiarCampo}>
                <option value="">Sin indicar</option>
                <option value="tarjeta">Tarjeta / Visa</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </label>

            <label>
              Importe pagado
              <input
                name="importe_pagado"
                type="number"
                min="0"
                step="0.01"
                value={formulario.importe_pagado}
                onChange={cambiarCampo}
              />
            </label>

            <label>
              Fecha de pago
              <input
                name="fecha_pago"
                type="date"
                value={formulario.fecha_pago}
                onChange={cambiarCampo}
              />
            </label>
          </div>

          <label>
            Observaciones
            <textarea name="observaciones" value={formulario.observaciones} onChange={cambiarCampo} rows="4" />
          </label>

          <label className="factura-check">
            <input name="activo" type="checkbox" checked={formulario.activo} onChange={cambiarCampo} />
            Visitador activo
          </label>

          <div className="acciones">
            <button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" className="boton-cancelar" onClick={cancelarFormulario}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && <p className="mensaje-error">Error: {error}</p>}
      {mensaje && <p className="mensaje">{mensaje}</p>}
      {cargando && <p className="mensaje">Cargando visitadores...</p>}

      <div className="lista-clientes">
        {visitadoresFiltrados.map((visitador) => {
          const nombreCompleto = [visitador.nombre, visitador.apellidos].filter(Boolean).join(" ");

          return (
            <article className="cliente" key={visitador.id}>
              <div className="avatar">{visitador.nombre.charAt(0).toUpperCase()}</div>
              <div className="cliente-info">
                <h3>{nombreCompleto}</h3>
                <p>{visitador.laboratorio || visitador.centro_medico || "Visitador médico"}</p>
                <p>
                  Pago: <strong>{visitador.estado_pago === "pagado" ? "Pagado" : "Pendiente"}</strong>
                  {visitador.forma_pago ? ` · ${visitador.forma_pago === "tarjeta" ? "Visa/Tarjeta" : visitador.forma_pago}` : ""}
                </p>

                <div className="acciones">
                  <button type="button" onClick={() => generarFactura(visitador)}>
                    🧾 Generar factura
                  </button>
                  <button type="button" className="boton-ficha" onClick={() => navigate(`/visitadores-medicos/${visitador.id}`)}>
                    👤 Abrir ficha
                  </button>
                  <button type="button" onClick={() => empezarEdicion(visitador)}>✏️ Editar</button>
                  <button type="button" className="boton-eliminar" onClick={() => eliminarVisitador(visitador)}>🗑️ Eliminar</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function textoONull(valor) {
  const texto = String(valor ?? "").trim();
  return texto || null;
}

export default VisitadoresMedicos;
