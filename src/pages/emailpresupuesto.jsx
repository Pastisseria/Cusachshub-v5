import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase.js";
import { analizarEmail } from "../ai/parserEmails.js";

const CLAVE_BORRADOR_PRESUPUESTO = "cusachs:borrador-presupuesto:v2";

function fechaActual() {
  return new Date().toISOString().slice(0, 10);
}

function crearTemporalId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

function EmailPresupuesto() {
  const navigate = useNavigate();
  const [textoEmail, setTextoEmail] = useState("");
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [analisis, setAnalisis] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setError("");
    try {
      const [respuestaClientes, respuestaProductos] = await Promise.all([
        supabase.from("clientes").select("*").order("nombre", { ascending: true }),
        supabase.from("productos").select("*").order("nombre", { ascending: true }),
      ]);

      if (respuestaClientes.error) throw respuestaClientes.error;
      if (respuestaProductos.error) throw respuestaProductos.error;

      setClientes(respuestaClientes.data || []);
      setProductos((respuestaProductos.data || []).filter((producto) => producto.activo !== false));
    } catch (err) {
      setError(err.message || "No se han podido cargar clientes y productos.");
    } finally {
      setCargando(false);
    }
  }

  function analizarTexto() {
    if (!textoEmail.trim()) {
      setError("Pega primero el email que has recibido.");
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      const resultado = analizarEmail({
        texto: textoEmail,
        clientes,
        productos,
      });

      setAnalisis({
        ...resultado,
        cliente_id: resultado.cliente_id || "",
        fecha_evento: resultado.fecha_evento || fechaActual(),
        hora_evento: resultado.hora_evento || "",
        numero_personas: resultado.numero_personas || "",
        telefono: resultado.telefono || "",
      });

      setMensaje(
        resultado.lineas?.length
          ? `He encontrado ${resultado.lineas.length} producto(s) del catálogo. Revisa los datos y prepara el presupuesto.`
          : "He leído el email. No he encontrado productos exactos del catálogo; puedes abrir igualmente el presupuesto y completar las líneas allí.",
      );
    } catch (err) {
      setError(err.message || "No se ha podido analizar el email.");
    } finally {
      setProcesando(false);
    }
  }

  function cambiarAnalisis(campo, valor) {
    setAnalisis((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function cambiarCantidad(productoId, valor) {
    setAnalisis((anterior) => ({
      ...anterior,
      lineas: (anterior?.lineas || []).map((linea) =>
        String(linea.producto_id) === String(productoId)
          ? { ...linea, cantidad: valor }
          : linea,
      ),
    }));
  }

  function eliminarLinea(productoId) {
    setAnalisis((anterior) => ({
      ...anterior,
      lineas: (anterior?.lineas || []).filter(
        (linea) => String(linea.producto_id) !== String(productoId),
      ),
    }));
  }

  function prepararPresupuesto() {
    if (!analisis) {
      setError("Analiza primero el email.");
      return;
    }

    const lineas = (analisis.lineas || []).map((linea) => ({
      temporalId: crearTemporalId(),
      producto_id: linea.producto_id || "",
      descripcion: linea.nombre || "",
      cantidad: String(linea.cantidad || 1),
      precio_unitario: String(linea.precio_unitario ?? ""),
      iva: "10",
    }));

    if (lineas.length === 0) {
      lineas.push({
        temporalId: crearTemporalId(),
        producto_id: "",
        descripcion: "",
        cantidad: "1",
        precio_unitario: "",
        iva: "10",
      });
    }

    const cliente = clientes.find(
      (item) => String(item.id) === String(analisis.cliente_id),
    );

    const observaciones = [
      analisis.numero_personas ? `Personas: ${analisis.numero_personas}` : "",
      analisis.email ? `Email contacto: ${analisis.email}` : "",
      "",
      "EMAIL ORIGINAL:",
      analisis.observaciones || textoEmail,
    ]
      .filter((texto, indice, array) => texto || (indice === 2 && array.slice(0, 2).some(Boolean)))
      .join("\n")
      .trim();

    const borrador = {
      activo: true,
      documentoEditando: null,
      visitadorSeleccionadoId: "",
      tipoDocumento: "Catering",
      clienteId: analisis.cliente_id || "",
      fecha: analisis.fecha_evento || fechaActual(),
      validezHasta: "",
      estado: "Borrador",
      idioma: "es",
      horaEntrega: analisis.hora_evento || "",
      direccionEntrega: cliente?.direccion || "",
      personaContacto: cliente?.persona_contacto || cliente?.contacto || "",
      telefonoContacto: analisis.telefono || cliente?.telefono || "",
      visitadorNombre: "",
      laboratorio: "",
      centroMedico: "",
      observaciones,
      transporte: "",
      transporteIva: "10",
      lineas,
      actualizadoEn: new Date().toISOString(),
      origen: "email-catering",
    };

    try {
      window.localStorage.setItem(
        CLAVE_BORRADOR_PRESUPUESTO,
        JSON.stringify(borrador),
      );
      navigate("/presupuestos");
    } catch {
      setError("El navegador no ha podido guardar el borrador del presupuesto.");
    }
  }

  const clienteSeleccionado = useMemo(
    () => clientes.find((cliente) => String(cliente.id) === String(analisis?.cliente_id)),
    [clientes, analisis?.cliente_id],
  );

  if (cargando) {
    return <section className="panel"><p>Cargando asistente de presupuestos...</p></section>;
  }

  return (
    <section className="panel email-presupuesto-panel">
      <div className="cabecera-seccion">
        <div>
          <p className="etiqueta">CATERING</p>
          <h1>📧 Email → Presupuesto</h1>
          <p className="texto-secundario">
            Pega el email del cliente. Cusachs Hub detectará cliente, fecha, hora, personas y productos del catálogo para dejarte el presupuesto preparado.
          </p>
        </div>
      </div>

      {error && <div className="mensaje-error">{error}</div>}
      {mensaje && <div className="mensaje-exito">{mensaje}</div>}

      <div className="formulario">
        <h3>1. Pega el email recibido</h3>
        <label>
          Email completo
          <textarea
            value={textoEmail}
            onChange={(event) => setTextoEmail(event.target.value)}
            placeholder="Pega aquí el correo del cliente..."
            style={{ minHeight: 260 }}
          />
        </label>

        <div className="grupo-botones" style={{ marginTop: 16 }}>
          <button type="button" onClick={analizarTexto} disabled={procesando}>
            {procesando ? "Analizando..." : "🧠 Analizar email"}
          </button>
          <button
            type="button"
            className="boton-secundario"
            onClick={() => {
              setTextoEmail("");
              setAnalisis(null);
              setError("");
              setMensaje("");
            }}
          >
            Limpiar
          </button>
        </div>
      </div>

      {analisis && (
        <div className="formulario">
          <h3>2. Revisa lo detectado</h3>

          <div className="rejilla-formulario">
            <label>
              Cliente
              <select
                value={analisis.cliente_id}
                onChange={(event) => cambiarAnalisis("cliente_id", event.target.value)}
              >
                <option value="">— Seleccionar cliente —</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.empresa || cliente.nombre || "Cliente"}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fecha del catering
              <input
                type="date"
                value={analisis.fecha_evento || ""}
                onChange={(event) => cambiarAnalisis("fecha_evento", event.target.value)}
              />
            </label>

            <label>
              Hora
              <input
                type="time"
                value={analisis.hora_evento || ""}
                onChange={(event) => cambiarAnalisis("hora_evento", event.target.value)}
              />
            </label>

            <label>
              Nº personas
              <input
                type="number"
                min="0"
                value={analisis.numero_personas || ""}
                onChange={(event) => cambiarAnalisis("numero_personas", event.target.value)}
              />
            </label>

            <label>
              Teléfono
              <input
                value={analisis.telefono || ""}
                onChange={(event) => cambiarAnalisis("telefono", event.target.value)}
              />
            </label>

            <label>
              Email contacto
              <input
                value={analisis.email || ""}
                onChange={(event) => cambiarAnalisis("email", event.target.value)}
              />
            </label>
          </div>

          {clienteSeleccionado && (
            <p className="texto-secundario" style={{ marginTop: 12 }}>
              Cliente detectado: <strong>{clienteSeleccionado.empresa || clienteSeleccionado.nombre}</strong>
            </p>
          )}

          <h3 style={{ marginTop: 24 }}>Productos detectados</h3>
          <div className="tabla-responsive">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(analisis.lineas || []).length === 0 && (
                  <tr>
                    <td colSpan="4">No se han encontrado productos exactos del catálogo.</td>
                  </tr>
                )}
                {(analisis.lineas || []).map((linea) => (
                  <tr key={linea.producto_id}>
                    <td><strong>{linea.nombre}</strong></td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.cantidad}
                        onChange={(event) => cambiarCantidad(linea.producto_id, event.target.value)}
                      />
                    </td>
                    <td>{Number(linea.precio_unitario || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</td>
                    <td>
                      <button
                        type="button"
                        className="boton-peligro"
                        onClick={() => eliminarLinea(linea.producto_id)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grupo-botones" style={{ marginTop: 24 }}>
            <button type="button" className="boton-exito" onClick={prepararPresupuesto}>
              📄 Preparar presupuesto
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default EmailPresupuesto;
