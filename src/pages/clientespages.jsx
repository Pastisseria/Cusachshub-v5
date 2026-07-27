import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase.js";

const FORMULARIO_VACIO = {
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
  pais: "España",
  observaciones: "",
  activo: true,
};

function Clientes() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarClientes() {
    setCargando(true);
    setError("");

    try {
      const { data, error: supabaseError } = await supabase
        .from("clientes")
        .select("*")
        .order("nombre", { ascending: true });

      if (supabaseError) {
        throw supabaseError;
      }

      setClientes(data ?? []);
    } catch (err) {
      setClientes([]);
      setError(err.message || "No se han podido cargar los clientes.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarClientes();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return clientes;
    }

    return clientes.filter((cliente) => {
      const contenido = [
        cliente.nombre,
        cliente.empresa,
        cliente.nif_cif,
        cliente.persona_contacto,
        cliente.telefono,
        cliente.email,
        cliente.poblacion,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });
  }, [clientes, busqueda]);

  function cambiarCampo(event) {
    const { name, value, type, checked } = event.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function nuevoCliente() {
    setClienteEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function empezarEdicion(cliente) {
    setClienteEditando(cliente);

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

    setError("");
    setMensaje("");
    setMostrarFormulario(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelarFormulario() {
    setClienteEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setMostrarFormulario(false);
    setError("");
    setMensaje("");
  }

  async function guardarCliente(event) {
    event.preventDefault();

    const nombreLimpio = formulario.nombre.trim();

    if (!nombreLimpio) {
      setError("Escribe el nombre del cliente.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const datosCliente = {
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
      updated_at: new Date().toISOString(),
    };

    try {
      if (clienteEditando) {
        const { error: supabaseError } = await supabase
          .from("clientes")
          .update(datosCliente)
          .eq("id", clienteEditando.id);

        if (supabaseError) {
          throw supabaseError;
        }

        setMensaje("Cliente actualizado correctamente.");
      } else {
        const { error: supabaseError } = await supabase
          .from("clientes")
          .insert(datosCliente);

        if (supabaseError) {
          throw supabaseError;
        }

        setMensaje("Cliente creado correctamente.");
      }

      setFormulario(FORMULARIO_VACIO);
      setClienteEditando(null);
      setMostrarFormulario(false);

      await cargarClientes();
    } catch (err) {
      setError(err.message || "No se ha podido guardar el cliente.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarCliente(cliente) {
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar a "${cliente.nombre}"?`,
    );

    if (!confirmar) {
      return;
    }

    setError("");
    setMensaje("");

    try {
      const { error: supabaseError } = await supabase
        .from("clientes")
        .delete()
        .eq("id", cliente.id);

      if (supabaseError) {
        throw supabaseError;
      }

      setMensaje("Cliente eliminado correctamente.");
      await cargarClientes();
    } catch (err) {
      setError(
        err.message ||
          "No se ha podido eliminar. Puede tener eventos relacionados.",
      );
    }
  }

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Módulo</p>
          <h2>Clientes</h2>
        </div>

        <span className="contador">
          {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "22px",
        }}
      >
        <input
          type="search"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por nombre, empresa, teléfono, CIF..."
          style={{
            flex: "1 1 320px",
            minHeight: "50px",
            padding: "0 16px",
            borderRadius: "12px",
            border: "1px solid #4b4453",
            background: "#151319",
            color: "white",
            fontSize: "16px",
          }}
        />

        <button type="button" onClick={nuevoCliente}>
          + Nuevo cliente
        </button>
      </div>

      {mostrarFormulario && (
        <form className="formulario" onSubmit={guardarCliente}>
          <h3>
            {clienteEditando ? "Editar cliente" : "Crear nuevo cliente"}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            <label>
              Nombre *
              <input
                name="nombre"
                type="text"
                value={formulario.nombre}
                onChange={cambiarCampo}
                disabled={guardando}
                required
              />
            </label>

            <label>
              Empresa
              <input
                name="empresa"
                type="text"
                value={formulario.empresa}
                onChange={cambiarCampo}
                disabled={guardando}
              />
            </label>

            <label>
              NIF / CIF
              <input
                name="nif_cif"
                type="text"
                value={formulario.nif_cif}
                onChange={cambiarCampo}
                disabled={guardando}
              />
            </label>

            <label>
              Persona de contacto
              <input
                name="persona_contacto"
                type="text"
                value={formulario.persona_contacto}
                onChange={cambiarCampo}
                disabled={guardando}
              />
            </label>

            <label>
              Teléfono
              <input
                name="telefono"
                type="tel"
                value={formulario.telefono}
                onChange={cambiarCampo}
                disabled={guardando}
              />
            </label>

            <label>
              Email
              <input
                name="email"
                type="email"
                value={formulario.email}
                onChange={cambiarCampo}
                disabled={guardando}
              />
            </label>

            <label>
              Dirección
              <input
                name="direccion"
                type="text"
                value={formulario.direccion}
                onChange={cambiarCampo}
                disabled={guardando}
              />
            </label>

            <label>
              Código postal
              <input
                name="codigo_postal"
                type="text"
                value={formulario.codigo_postal}
                onChange={cambiarCampo}
                disabled={guardando}
              />
            </label>

            <label>
              Población
              <input
                name="poblacion"
                type="text"
                value={formulario.poblacion}
                onChange={cambiarCampo}
                disabled={guardando}
              />
            </label>

            <label>
              Provincia
              <input
                name="provincia"
                type="text"
                value={formulario.provincia}
                onChange={cambiarCampo}
                disabled={guardando}
              />
            </label>

            <label>
              País
              <input
                name="pais"
                type="text"
                value={formulario.pais}
                onChange={cambiarCampo}
                disabled={guardando}
              />
            </label>
          </div>

          <label style={{ marginTop: "16px" }}>
            Observaciones
            <textarea
              name="observaciones"
              value={formulario.observaciones}
              onChange={cambiarCampo}
              disabled={guardando}
              rows="4"
              style={{
                width: "100%",
                marginTop: "8px",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid #4b4453",
                background: "#151319",
                color: "white",
                fontSize: "16px",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "16px",
            }}
          >
            <input
              name="activo"
              type="checkbox"
              checked={formulario.activo}
              onChange={cambiarCampo}
              disabled={guardando}
              style={{ width: "22px", height: "22px" }}
            />
            Cliente activo
          </label>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "20px",
            }}
          >
            <button type="submit" disabled={guardando}>
              {guardando
                ? "Guardando..."
                : clienteEditando
                  ? "Guardar cambios"
                  : "Crear cliente"}
            </button>

            <button
              type="button"
              className="boton-cancelar"
              onClick={cancelarFormulario}
              disabled={guardando}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && <p className="mensaje-error">Error: {error}</p>}
      {mensaje && <p className="mensaje">{mensaje}</p>}

      {cargando && <p className="mensaje">Cargando clientes...</p>}

      {!cargando && clientesFiltrados.length === 0 && (
        <div className="estado-vacio">
          <h3>No se han encontrado clientes</h3>
          <p>Pulsa “Nuevo cliente” para añadir uno.</p>
        </div>
      )}

      {!cargando && clientesFiltrados.length > 0 && (
        <div className="lista-clientes">
          {clientesFiltrados.map((cliente) => (
            <article className="cliente" key={cliente.id}>
              <div className="avatar">
                {(cliente.nombre ?? "C").charAt(0).toUpperCase()}
              </div>

              <div className="cliente-info">
                <h3>{cliente.nombre ?? "Cliente sin nombre"}</h3>

                <p>
                  {cliente.empresa ||
                    cliente.persona_contacto ||
                    "Cliente de Pastisseria Cusachs"}
                </p>

                {cliente.telefono && <p>📞 {cliente.telefono}</p>}
                {cliente.email && <p>✉️ {cliente.email}</p>}

                <div className="acciones">
                  <button
                    type="button"
                    className="boton-ficha"
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                  >
                    👤 Abrir ficha
                  </button>

                  <button
                    type="button"
                    onClick={() => empezarEdicion(cliente)}
                  >
                    ✏️ Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => eliminarCliente(cliente)}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default Clientes;