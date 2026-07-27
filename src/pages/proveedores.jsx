import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const PROVEEDOR_VACIO = {
  nombre: "",
  cif: "",
  contacto: "",
  telefono: "",
  email: "",
  direccion: "",
  poblacion: "",
  codigo_postal: "",
  forma_pago: "",
  dias_entrega: "",
  pedido_minimo: "",
  observaciones: "",
  activo: true,
};

function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [formulario, setFormulario] = useState(PROVEEDOR_VACIO);
  const [proveedorEditando, setProveedorEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarProveedores() {
    setCargando(true);
    setError("");

    try {
      const { data, error: supabaseError } = await supabase
        .from("proveedores")
        .select("*")
        .order("nombre", { ascending: true });

      if (supabaseError) {
        throw supabaseError;
      }

      setProveedores(data ?? []);
    } catch (err) {
      setProveedores([]);
      setError(
        err.message || "No se han podido cargar los proveedores.",
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarProveedores();
  }, []);

  const proveedoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return proveedores;
    }

    return proveedores.filter((proveedor) => {
      const contenido = [
        proveedor.nombre,
        proveedor.cif,
        proveedor.contacto,
        proveedor.telefono,
        proveedor.email,
        proveedor.poblacion,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });
  }, [proveedores, busqueda]);

  function cambiarCampo(event) {
    const { name, value, type, checked } = event.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function nuevoProveedor() {
    setFormulario(PROVEEDOR_VACIO);
    setProveedorEditando(null);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function editarProveedor(proveedor) {
    setProveedorEditando(proveedor);

    setFormulario({
      nombre: proveedor.nombre ?? "",
      cif: proveedor.cif ?? "",
      contacto: proveedor.contacto ?? "",
      telefono: proveedor.telefono ?? "",
      email: proveedor.email ?? "",
      direccion: proveedor.direccion ?? "",
      poblacion: proveedor.poblacion ?? "",
      codigo_postal: proveedor.codigo_postal ?? "",
      forma_pago: proveedor.forma_pago ?? "",
      dias_entrega: proveedor.dias_entrega ?? "",
      pedido_minimo: proveedor.pedido_minimo ?? "",
      observaciones: proveedor.observaciones ?? "",
      activo: proveedor.activo ?? true,
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
    setFormulario(PROVEEDOR_VACIO);
    setProveedorEditando(null);
    setMostrarFormulario(false);
    setError("");
  }

  async function guardarProveedor(event) {
    event.preventDefault();

    const nombreLimpio = formulario.nombre.trim();
    const emailLimpio = formulario.email.trim();

    if (!nombreLimpio) {
      setError("El nombre del proveedor es obligatorio.");
      return;
    }

    if (emailLimpio && !emailValido(emailLimpio)) {
      setError("El correo electrónico no tiene un formato válido.");
      return;
    }

    const pedidoMinimo = convertirNumero(formulario.pedido_minimo);

    if (pedidoMinimo < 0) {
      setError("El pedido mínimo no puede ser negativo.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const datosProveedor = {
      nombre: nombreLimpio,
      cif: formulario.cif.trim() || null,
      contacto: formulario.contacto.trim() || null,
      telefono: formulario.telefono.trim() || null,
      email: emailLimpio || null,
      direccion: formulario.direccion.trim() || null,
      poblacion: formulario.poblacion.trim() || null,
      codigo_postal: formulario.codigo_postal.trim() || null,
      forma_pago: formulario.forma_pago.trim() || null,
      dias_entrega: formulario.dias_entrega.trim() || null,
      pedido_minimo: pedidoMinimo,
      observaciones: formulario.observaciones.trim() || null,
      activo: formulario.activo,
      updated_at: new Date().toISOString(),
    };

    try {
      if (proveedorEditando) {
        const { error: supabaseError } = await supabase
          .from("proveedores")
          .update(datosProveedor)
          .eq("id", proveedorEditando.id);

        if (supabaseError) {
          throw supabaseError;
        }

        setMensaje("Proveedor actualizado correctamente.");
      } else {
        const { error: supabaseError } = await supabase
          .from("proveedores")
          .insert(datosProveedor);

        if (supabaseError) {
          throw supabaseError;
        }

        setMensaje("Proveedor creado correctamente.");
      }

      setFormulario(PROVEEDOR_VACIO);
      setProveedorEditando(null);
      setMostrarFormulario(false);

      await cargarProveedores();
    } catch (err) {
      setError(
        err.message || "No se ha podido guardar el proveedor.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarProveedor(proveedor) {
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar "${proveedor.nombre}"?`,
    );

    if (!confirmar) {
      return;
    }

    setError("");
    setMensaje("");

    try {
      const { error: supabaseError } = await supabase
        .from("proveedores")
        .delete()
        .eq("id", proveedor.id);

      if (supabaseError) {
        throw supabaseError;
      }

      setMensaje("Proveedor eliminado correctamente.");
      await cargarProveedores();
    } catch (err) {
      setError(
        err.message || "No se ha podido eliminar el proveedor.",
      );
    }
  }

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Compras</p>
          <h2>Proveedores</h2>
          <p>Datos comerciales, contacto y condiciones de compra.</p>
        </div>

        <span className="contador">
          {proveedores.length}{" "}
          {proveedores.length === 1
            ? "proveedor"
            : "proveedores"}
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
          placeholder="Buscar proveedor, CIF, contacto o población..."
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

        <button type="button" onClick={nuevoProveedor}>
          + Nuevo proveedor
        </button>
      </div>

      {mostrarFormulario && (
        <form className="formulario" onSubmit={guardarProveedor}>
          <h3>
            {proveedorEditando
              ? "Editar proveedor"
              : "Crear nuevo proveedor"}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <Campo
              etiqueta="Nombre comercial *"
              name="nombre"
              value={formulario.nombre}
              onChange={cambiarCampo}
              disabled={guardando}
              required
            />

            <Campo
              etiqueta="CIF / NIF"
              name="cif"
              value={formulario.cif}
              onChange={cambiarCampo}
              disabled={guardando}
            />

            <Campo
              etiqueta="Persona de contacto"
              name="contacto"
              value={formulario.contacto}
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
              etiqueta="Población"
              name="poblacion"
              value={formulario.poblacion}
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

            <label>
              Forma de pago
              <select
                name="forma_pago"
                value={formulario.forma_pago}
                onChange={cambiarCampo}
                disabled={guardando}
                style={estiloCampo}
              >
                <option value="">Seleccionar</option>
                <option value="Contado">Contado</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Domiciliación">Domiciliación</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="30 días">30 días</option>
                <option value="60 días">60 días</option>
              </select>
            </label>

            <Campo
              etiqueta="Días habituales de entrega"
              name="dias_entrega"
              value={formulario.dias_entrega}
              onChange={cambiarCampo}
              disabled={guardando}
              placeholder="Lunes, miércoles y viernes"
            />

            <Campo
              etiqueta="Pedido mínimo"
              name="pedido_minimo"
              type="number"
              step="0.01"
              min="0"
              value={formulario.pedido_minimo}
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
              rows="4"
              style={{
                ...estiloCampo,
                padding: "14px",
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

            Proveedor activo
          </label>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "22px",
            }}
          >
            <button type="submit" disabled={guardando}>
              {guardando
                ? "Guardando..."
                : proveedorEditando
                  ? "💾 Guardar cambios"
                  : "Crear proveedor"}
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

      {cargando && <p className="mensaje">Cargando proveedores...</p>}

      {!cargando && proveedoresFiltrados.length === 0 && (
        <div className="estado-vacio">
          <h3>No se han encontrado proveedores</h3>
          <p>Pulsa “Nuevo proveedor” para crear el primero.</p>
        </div>
      )}

      {!cargando && proveedoresFiltrados.length > 0 && (
        <div className="lista-clientes">
          {proveedoresFiltrados.map((proveedor) => (
            <article className="cliente" key={proveedor.id}>
              <div className="avatar">🚚</div>

              <div className="cliente-info">
                <h3>{proveedor.nombre}</h3>

                <p>
                  {proveedor.cif
                    ? `CIF: ${proveedor.cif}`
                    : "CIF no indicado"}
                  {proveedor.poblacion
                    ? ` · ${proveedor.poblacion}`
                    : ""}
                </p>

                <p>
                  Contacto:{" "}
                  {proveedor.contacto || "No indicado"}
                </p>

                <p>
                  Teléfono: {proveedor.telefono || "No indicado"} ·
                  Correo: {proveedor.email || "No indicado"}
                </p>

                <p>
                  Forma de pago:{" "}
                  {proveedor.forma_pago || "No indicada"} · Pedido
                  mínimo: {formatearEuros(proveedor.pedido_minimo)}
                </p>

                <p>
                  Entregas:{" "}
                  {proveedor.dias_entrega || "No especificadas"} ·{" "}
                  {proveedor.activo === false
                    ? "Inactivo"
                    : "Activo"}
                </p>

                <div className="acciones">
                  <button
                    type="button"
                    onClick={() => editarProveedor(proveedor)}
                  >
                    ✏️ Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => eliminarProveedor(proveedor)}
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

const estiloCampo = {
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
};

function Campo({
  etiqueta,
  name,
  value,
  onChange,
  type = "text",
  disabled = false,
  required = false,
  placeholder = "",
  step,
  min,
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
        placeholder={placeholder}
        step={step}
        min={min}
        style={estiloCampo}
      />
    </label>
  );
}

function convertirNumero(valor) {
  const numero = Number(String(valor || "0").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function formatearEuros(valor) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(valor || 0));
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default Proveedores;