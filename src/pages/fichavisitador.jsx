import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase.js";

const VISITADOR_VACIO = {
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
};

function FichaVisitador() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [visitador, setVisitador] = useState(null);
  const [formulario, setFormulario] =
    useState(VISITADOR_VACIO);

  const [pedidos, setPedidos] = useState([]);

  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoPedidos, setCargandoPedidos] =
    useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarVisitador() {
    setCargando(true);
    setError("");

    try {
      const { data, error: supabaseError } = await supabase
        .from("visitadores_medicos")
        .select("*")
        .eq("id", id)
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      setVisitador(data);
      cargarFormulario(data);
    } catch (err) {
      setVisitador(null);
      setError(
        err.message ||
          "No se ha podido cargar el visitador médico.",
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarPedidos() {
    setCargandoPedidos(true);

    try {
      const { data, error: supabaseError } = await supabase
        .from("presupuestos")
        .select("*")
        .eq("visitador_id", id)
        .order("created_at", { ascending: false });

      if (supabaseError) {
        throw supabaseError;
      }

      setPedidos(data ?? []);
    } catch (err) {
      console.error(
        "No se han podido cargar los pedidos:",
        err,
      );

      setPedidos([]);
    } finally {
      setCargandoPedidos(false);
    }
  }

  useEffect(() => {
    cargarVisitador();
    cargarPedidos();
  }, [id]);

  function cargarFormulario(datosVisitador) {
    setFormulario({
      nombre: datosVisitador.nombre ?? "",
      apellidos: datosVisitador.apellidos ?? "",
      laboratorio: datosVisitador.laboratorio ?? "",
      centro_medico: datosVisitador.centro_medico ?? "",
      especialidad: datosVisitador.especialidad ?? "",
      telefono: datosVisitador.telefono ?? "",
      movil: datosVisitador.movil ?? "",
      email: datosVisitador.email ?? "",
      direccion: datosVisitador.direccion ?? "",
      observaciones: datosVisitador.observaciones ?? "",
      activo: datosVisitador.activo ?? true,
    });
  }

  function cambiarCampo(event) {
    const { name, value, type, checked } = event.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function empezarEdicion() {
    setError("");
    setMensaje("");
    setEditando(true);
  }

  function cancelarEdicion() {
    cargarFormulario(visitador);
    setEditando(false);
    setError("");
    setMensaje("");
  }

  async function guardarCambios(event) {
    event.preventDefault();

    const nombreLimpio = formulario.nombre.trim();

    if (!nombreLimpio) {
      setError(
        "El nombre del visitador médico es obligatorio.",
      );
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const datosActualizados = {
      nombre: nombreLimpio,
      apellidos: formulario.apellidos.trim() || null,
      laboratorio: formulario.laboratorio.trim() || null,
      centro_medico:
        formulario.centro_medico.trim() || null,
      especialidad:
        formulario.especialidad.trim() || null,
      telefono: formulario.telefono.trim() || null,
      movil: formulario.movil.trim() || null,
      email: formulario.email.trim() || null,
      direccion: formulario.direccion.trim() || null,
      observaciones:
        formulario.observaciones.trim() || null,
      activo: formulario.activo,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error: supabaseError } = await supabase
        .from("visitadores_medicos")
        .update(datosActualizados)
        .eq("id", id)
        .select("*")
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      setVisitador(data);
      cargarFormulario(data);

      setEditando(false);
      setMensaje(
        "Visitador médico actualizado correctamente.",
      );
    } catch (err) {
      setError(
        err.message ||
          "No se han podido guardar los cambios.",
      );
    } finally {
      setGuardando(false);
    }
  }

  function nuevoPedido() {
    navigate(`/presupuestos?visitador_id=${id}`);
  }

  function abrirPedido(pedido) {
    navigate(`/presupuestos?presupuesto_id=${pedido.id}`);
  }

  if (cargando) {
    return (
      <section className="panel">
        <p className="mensaje">
          Cargando ficha del visitador médico...
        </p>
      </section>
    );
  }

  if (!visitador) {
    return (
      <section className="panel">
        <p className="mensaje-error">
          Error:{" "}
          {error ||
            "No se ha encontrado el visitador médico."}
        </p>

        <button
          type="button"
          onClick={() =>
            navigate("/visitadores-medicos")
          }
        >
          ← Volver a visitadores
        </button>
      </section>
    );
  }

  const nombreCompleto = [
    visitador.nombre,
    visitador.apellidos,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "28px",
        }}
      >
        <button
          type="button"
          onClick={() =>
            navigate("/visitadores-medicos")
          }
        >
          ← Volver a visitadores
        </button>

        {!editando && (
          <button type="button" onClick={empezarEdicion}>
            ✏️ Editar visitador
          </button>
        )}
      </div>

      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">
            Ficha del visitador médico
          </p>

          <h2>{nombreCompleto}</h2>
        </div>

        <span className="contador">
          {visitador.activo === false
            ? "Inactivo"
            : "Activo"}
        </span>
      </div>

      {error && (
        <p className="mensaje-error">Error: {error}</p>
      )}

      {mensaje && <p className="mensaje">{mensaje}</p>}

      {editando ? (
        <form
          className="formulario"
          onSubmit={guardarCambios}
        >
          <h3>Modificar datos del visitador</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            <Campo
              etiqueta="Nombre *"
              name="nombre"
              value={formulario.nombre}
              onChange={cambiarCampo}
              disabled={guardando}
              required
            />

            <Campo
              etiqueta="Apellidos"
              name="apellidos"
              value={formulario.apellidos}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            <Campo
              etiqueta="Laboratorio"
              name="laboratorio"
              value={formulario.laboratorio}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            <Campo
              etiqueta="Centro médico"
              name="centro_medico"
              value={formulario.centro_medico}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            <Campo
              etiqueta="Especialidad"
              name="especialidad"
              value={formulario.especialidad}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            <Campo
              etiqueta="Teléfono"
              name="telefono"
              type="tel"
              value={formulario.telefono}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            <Campo
              etiqueta="Móvil"
              name="movil"
              type="tel"
              value={formulario.movil}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            <Campo
              etiqueta="Correo electrónico"
              name="email"
              type="email"
              value={formulario.email}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            <Campo
              etiqueta="Dirección"
              name="direccion"
              value={formulario.direccion}
              onChange={cambiarCampo}
              disabled={guardando}
            />
          </div>

          <label
            style={{
              display: "block",
              marginTop: "18px",
            }}
          >
            Observaciones

            <textarea
              name="observaciones"
              value={formulario.observaciones}
              onChange={cambiarCampo}
              disabled={guardando}
              rows="5"
              style={{
                display: "block",
                width: "100%",
                boxSizing: "border-box",
                marginTop: "8px",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid #4b4453",
                background: "#151319",
                color: "white",
                fontSize: "16px",
                resize: "vertical",
              }}
            />
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "18px",
            }}
          >
            <input
              name="activo"
              type="checkbox"
              checked={formulario.activo}
              onChange={cambiarCampo}
              disabled={guardando}
              style={{
                width: "22px",
                height: "22px",
              }}
            />

            Visitador activo
          </label>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "24px",
            }}
          >
            <button
              type="submit"
              disabled={guardando}
            >
              {guardando
                ? "Guardando..."
                : "💾 Guardar cambios"}
            </button>

            <button
              type="button"
              className="boton-cancelar"
              onClick={cancelarEdicion}
              disabled={guardando}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
            marginTop: "24px",
          }}
        >
          <Bloque titulo="Datos generales">
            <Dato
              titulo="Nombre"
              valor={visitador.nombre}
            />

            <Dato
              titulo="Apellidos"
              valor={visitador.apellidos}
            />

            <Dato
              titulo="Laboratorio"
              valor={visitador.laboratorio}
            />

            <Dato
              titulo="Centro médico"
              valor={visitador.centro_medico}
            />

            <Dato
              titulo="Especialidad"
              valor={visitador.especialidad}
            />
          </Bloque>

          <Bloque titulo="Contacto">
            <Dato
              titulo="Teléfono"
              valor={visitador.telefono}
            />

            <Dato
              titulo="Móvil"
              valor={visitador.movil}
            />

            <Dato
              titulo="Email"
              valor={visitador.email}
            />

            <Dato
              titulo="Dirección"
              valor={visitador.direccion}
            />
          </Bloque>

          <Bloque titulo="Observaciones">
            <p style={{ margin: 0 }}>
              {visitador.observaciones ||
                "Sin observaciones."}
            </p>
          </Bloque>
        </div>
      )}

      <div className="separador" />

      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">
            Actividad comercial
          </p>

          <h2>Historial de pedidos</h2>
        </div>

        <button type="button" onClick={nuevoPedido}>
          + Nuevo pedido
        </button>
      </div>

      {cargandoPedidos && (
        <p className="mensaje">
          Cargando pedidos...
        </p>
      )}

      {!cargandoPedidos && pedidos.length === 0 && (
        <div className="estado-vacio">
          <h3>Este visitador todavía no tiene pedidos</h3>

          <p>
            Pulsa “Nuevo pedido” para crear el primero.
          </p>
        </div>
      )}

      {!cargandoPedidos && pedidos.length > 0 && (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td>
                    {pedido.numero ||
                      pedido.numero_presupuesto ||
                      `Pedido ${pedido.id
                        .slice(0, 8)
                        .toUpperCase()}`}
                  </td>

                  <td>
                    {formatearFecha(
                      pedido.fecha ||
                        pedido.created_at,
                    )}
                  </td>

                  <td>
                    <span
                      className={`estado estado-${normalizarEstado(
                        pedido.estado,
                      )}`}
                    >
                      {pedido.estado || "Borrador"}
                    </span>
                  </td>

                  <td>
                    {formatearImporte(
                      pedido.total ??
                        pedido.importe_total ??
                        0,
                    )}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="boton-ficha"
                      onClick={() =>
                        abrirPedido(pedido)
                      }
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Campo({
  etiqueta,
  name,
  value,
  onChange,
  type = "text",
  disabled = false,
  required = false,
}) {
  return (
    <label>
      {etiqueta}

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        style={{
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          marginTop: "8px",
          minHeight: "48px",
          padding: "0 14px",
          borderRadius: "12px",
          border: "1px solid #4b4453",
          background: "#151319",
          color: "white",
          fontSize: "16px",
        }}
      />
    </label>
  );
}

function Bloque({ titulo, children }) {
  return (
    <div
      style={{
        padding: "22px",
        border: "1px solid #3e3944",
        borderRadius: "16px",
        background: "#151319",
      }}
    >
      <h3 style={{ marginTop: 0 }}>{titulo}</h3>
      {children}
    </div>
  );
}

function Dato({ titulo, valor }) {
  return (
    <p>
      <strong>{titulo}:</strong> {valor || "—"}
    </p>
  );
}

function formatearFecha(fecha) {
  if (!fecha) {
    return "—";
  }

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return fecha;
  }

  return fechaConvertida.toLocaleDateString("es-ES");
}

function formatearImporte(importe) {
  const numero = Number(importe);

  if (Number.isNaN(numero)) {
    return "0,00 €";
  }

  return numero.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function normalizarEstado(estado) {
  return String(estado || "borrador")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

export default FichaVisitador;