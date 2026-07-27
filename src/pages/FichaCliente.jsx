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

      setFormulario({
        nombre: data.nombre ?? "",
        empresa: data.empresa ?? "",
        nif_cif: data.nif_cif ?? "",
        persona_contacto: data.persona_contacto ?? "",
        telefono: data.telefono ?? "",
        email: data.email ?? "",
        direccion: data.direccion ?? "",
        codigo_postal: data.codigo_postal ?? "",
        poblacion: data.poblacion ?? "",
        provincia: data.provincia ?? "",
        pais: data.pais ?? "España",
        observaciones: data.observaciones ?? "",
        activo: data.activo ?? true,
      });
    } catch (err) {
      setCliente(null);
      setError(err.message || "No se ha podido cargar el cliente.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarCliente();
  }, [id]);

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
    setFormulario({
      nombre: cliente.nombre ?? "",
      empresa: cliente.empresa ?? "",
      nif_cif: cliente.nif_cif ?? "",
      persona_contacto: cliente.persona_contacto ?? "",
      telefono: cliente.telefono ?? "",
      email: cliente.email ?? "",
      direccion: cliente.direccion ?? "",
      codigo_postal: cliente.codigo_postal ?? "",
      poblacion: cliente.poblacion ?? "",
      provincia: cliente.provincia ?? "",
      pais: cliente.pais ?? "España",
      observaciones: cliente.observaciones ?? "",
      activo: cliente.activo ?? true,
    });

    setEditando(false);
    setError("");
    setMensaje("");
  }

  async function guardarCambios(event) {
    event.preventDefault();

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
      persona_contacto: formulario.persona_contacto.trim() || null,
      telefono: formulario.telefono.trim() || null,
      email: formulario.email.trim() || null,
      direccion: formulario.direccion.trim() || null,
      codigo_postal: formulario.codigo_postal.trim() || null,
      poblacion: formulario.poblacion.trim() || null,
      provincia: formulario.provincia.trim() || null,
      pais: formulario.pais.trim() || "España",
      observaciones: formulario.observaciones.trim() || null,
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
      setFormulario({
        nombre: data.nombre ?? "",
        empresa: data.empresa ?? "",
        nif_cif: data.nif_cif ?? "",
        persona_contacto: data.persona_contacto ?? "",
        telefono: data.telefono ?? "",
        email: data.email ?? "",
        direccion: data.direccion ?? "",
        codigo_postal: data.codigo_postal ?? "",
        poblacion: data.poblacion ?? "",
        provincia: data.provincia ?? "",
        pais: data.pais ?? "España",
        observaciones: data.observaciones ?? "",
        activo: data.activo ?? true,
      });

      setEditando(false);
      setMensaje("Cliente actualizado correctamente.");
    } catch (err) {
      setError(err.message || "No se han podido guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <section className="panel">
        <p className="mensaje">Cargando ficha del cliente...</p>
      </section>
    );
  }

  if (!cliente) {
    return (
      <section className="panel">
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
        <form className="formulario" onSubmit={guardarCambios}>
          <h3>Modificar datos del cliente</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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

          <label style={{ display: "block", marginTop: "18px" }}>
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

            Cliente activo
          </label>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "24px",
            }}
          >
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
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "18px",
              marginTop: "24px",
            }}
          >
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
              <Dato titulo="Código postal" valor={cliente.codigo_postal} />
              <Dato titulo="Población" valor={cliente.poblacion} />
              <Dato titulo="Provincia" valor={cliente.provincia} />
              <Dato titulo="País" valor={cliente.pais} />
            </Bloque>

            <Bloque titulo="Observaciones">
              <p style={{ margin: 0 }}>
                {cliente.observaciones || "Sin observaciones."}
              </p>
            </Bloque>
          </div>
        </>
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

export default FichaCliente;