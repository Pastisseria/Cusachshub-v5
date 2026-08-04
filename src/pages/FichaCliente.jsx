import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase.js";

const CLIENTE_VACIO = {
  nombre: "",
  empresa: "",
  nif_cif: "",
  persona_contacto: "",
  telefono: "",
  email: "",
  direccion: "",
  codigo_postal: "",
  poblacion: "",
  provincia: "",
  pais: "",
  observaciones: "",
  activo: true,
};

function FichaCliente() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cliente, setCliente] = useState(null);
  const [formulario, setFormulario] = useState(CLIENTE_VACIO);
  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarCliente() {
    setCargando(true);
    setError("");

    try {
      const { data, error: supabaseError } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      setCliente(data);
      cargarFormulario(data);
    } catch (err) {
      setCliente(null);
      setError(err.message || "No se ha podido cargar el cliente.");
    } finally {
      setCargando(false);
    }
  }

  function cargarFormulario(datos) {
    setFormulario({
      nombre: datos.nombre ?? "",
      empresa: datos.empresa ?? "",
      nif_cif: datos.nif_cif ?? "",
      persona_contacto: datos.persona_contacto ?? "",
      telefono: datos.telefono ?? "",
      email: datos.email ?? "",
      direccion: datos.direccion ?? "",
      codigo_postal: datos.codigo_postal ?? "",
      poblacion: datos.poblacion ?? "",
      provincia: datos.provincia ?? "",
      pais: datos.pais ?? "España",
      observaciones: datos.observaciones ?? "",
      activo: datos.activo ?? true,
    });
  }

  useEffect(() => {
    cargarCliente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function cambiarCampo(evento) {
    const { name, value, type, checked } = evento.target;

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
    cargarFormulario(cliente);
    setEditando(false);
    setError("");
    setMensaje("");
  }

  async function guardarCambios(evento) {
    evento.preventDefault();

    const nombreLimpio = formulario.nombre.trim();

    if (!nombreLimpio) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const datosActualizados = {
      nombre: nombreLimpio,
      empresa: formulario.empresa.trim() || null,
      nif_cif: formulario.nif_cif.trim() || null,
      persona_contacto:
        formulario.persona_contacto.trim() || null,
      telefono: formulario.telefono.trim() || null,
      email: formulario.email.trim() || null,
      direccion: formulario.direccion.trim() || null,
      codigo_postal:
        formulario.codigo_postal.trim() || null,
      poblacion: formulario.poblacion.trim() || null,
      provincia: formulario.provincia.trim() || null,
      pais: formulario.pais.trim() || "España",
      observaciones:
        formulario.observaciones.trim() || null,
      activo: formulario.activo,
    };

    try {
      const { data, error: supabaseError } = await supabase
        .from("clientes")
        .update(datosActualizados)
        .eq("id", id)
        .select("*")
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      setCliente(data);
      cargarFormulario(data);
      setEditando(false);
      setMensaje("Cliente actualizado correctamente.");
    } catch (err) {
      setError(
        err.message || "No se han podido guardar los cambios.",
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <section className="panel ficha-cliente">
        <p className="mensaje">Cargando ficha del cliente...</p>
      </section>
    );
  }

  if (!cliente) {
    return (
      <section className="panel ficha-cliente">
        <p className="mensaje-error">
          Error: {error || "No se ha encontrado el cliente."}
        </p>

        <button type="button" onClick={() => navigate("/clientes")}>
          ← Volver a clientes
        </button>
      </section>
    );
  }

  return (
    <section className="panel ficha-cliente">
      <div className="ficha-cliente-acciones">
        <button type="button" onClick={() => navigate("/clientes")}>
          ← Volver a clientes
        </button>

        {!editando && (
          <button type="button" onClick={empezarEdicion}>
            ✏️ Editar cliente
          </button>
        )}
      </div>

      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Ficha del cliente</p>
          <h2>{cliente.nombre}</h2>
        </div>

        <span className="contador">
          {cliente.activo === false ? "Inactivo" : "Activo"}
        </span>
      </div>

      {error && <p className="mensaje-error">Error: {error}</p>}
      {mensaje && <p className="mensaje">{mensaje}</p>}

      {editando ? (
        <form className="formulario ficha-cliente-form" onSubmit={guardarCambios}>
          <h3>Modificar datos del cliente</h3>

          <div className="ficha-cliente-grid">
            <Campo
              etiqueta="Nombre *"
              name="nombre"
              value={formulario.nombre}
              onChange={cambiarCampo}
              disabled={guardando}
              required
            />

            <Campo
              etiqueta="Empresa"
              name="empresa"
              value={formulario.empresa}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            <Campo
              etiqueta="NIF / CIF"
              name="nif_cif"
              value={formulario.nif_cif}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            <Campo
              etiqueta="Persona de contacto"
              name="persona_contacto"
              value={formulario.persona_contacto}
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

            <Campo
              etiqueta="Código postal"
              name="codigo_postal"
              value={formulario.codigo_postal}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            <Campo
              etiqueta="Población"
              name="poblacion"
              value={formulario.poblacion}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            <Campo
              etiqueta="Provincia"
              name="provincia"
              value={formulario.provincia}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            <Campo
              etiqueta="País"
              name="pais"
              value={formulario.pais}
              onChange={cambiarCampo}
              disabled={guardando}
            />
          </div>

          <label className="ficha-cliente-textarea">
            Observaciones

            <textarea
              name="observaciones"
              value={formulario.observaciones}
              onChange={cambiarCampo}
              disabled={guardando}
              rows="5"
            />
          </label>

          <label className="ficha-cliente-check">
            <input
              name="activo"
              type="checkbox"
              checked={formulario.activo}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            Cliente activo
          </label>

          <div className="ficha-cliente-botones">
            <button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "💾 Guardar cambios"}
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
        <div className="ficha-cliente-grid ficha-cliente-grid--datos">
          <Bloque titulo="Datos generales">
            <Dato titulo="Nombre" valor={cliente.nombre} />
            <Dato titulo="Empresa" valor={cliente.empresa} />
            <Dato titulo="NIF / CIF" valor={cliente.nif_cif} />
            <Dato
              titulo="Persona de contacto"
              valor={cliente.persona_contacto}
            />
          </Bloque>

          <Bloque titulo="Contacto">
            <Dato titulo="Teléfono" valor={cliente.telefono} />
            <Dato titulo="Email" valor={cliente.email} />
          </Bloque>

          <Bloque titulo="Dirección">
            <Dato titulo="Dirección" valor={cliente.direccion} />
            <Dato
              titulo="Código postal"
              valor={cliente.codigo_postal}
            />
            <Dato titulo="Población" valor={cliente.poblacion} />
            <Dato titulo="Provincia" valor={cliente.provincia} />
            <Dato titulo="País" valor={cliente.pais} />
          </Bloque>

          <Bloque titulo="Observaciones">
            <p>{cliente.observaciones || "Sin observaciones."}</p>
          </Bloque>
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
    <label className="ficha-cliente-campo">
      {etiqueta}

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
      />
    </label>
  );
}

function Bloque({ titulo, children }) {
  return (
    <article className="ficha-cliente-bloque">
      <h3>{titulo}</h3>
      {children}
    </article>
  );
}

function Dato({ titulo, valor }) {
  return (
    <p>
      <strong>{titulo}:</strong> {valor || "—"}
    </p>
  );
}

export default FichaCliente;