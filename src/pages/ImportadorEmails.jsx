import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";
import { analizarEmail } from "../ai/parserEmails.js";

const RESULTADO_VACIO = {
  cliente_id: "",
  cliente_nombre: "",
  email: "",
  telefono: "",
  fecha_evento: "",
  hora_evento: "",
  numero_personas: "",
  lineas: [],
  observaciones: "",
};

function ImportadorEmails() {
  const [texto, setTexto] = useState("");
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [resultado, setResultado] = useState(RESULTADO_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setError("");

    const [respuestaClientes, respuestaProductos] = await Promise.all([
      supabase.from("clientes").select("*").order("nombre", { ascending: true }),
      supabase.from("productos").select("*").eq("activo", true).order("nombre"),
    ]);

    if (respuestaClientes.error || respuestaProductos.error) {
      setError(
        respuestaClientes.error?.message ||
          respuestaProductos.error?.message ||
          "No se pudieron cargar los datos."
      );
    }

    setClientes(respuestaClientes.data || []);
    setProductos(respuestaProductos.data || []);
    setCargando(false);
  }

  async function leerArchivo(evento) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    setError("");
    setMensaje("");

    const extension = archivo.name.split(".").pop()?.toLowerCase();

    if (!["txt", "eml"].includes(extension)) {
      setError("Para emails utiliza un archivo .eml o .txt.");
      evento.target.value = "";
      return;
    }

    try {
      const contenido = await archivo.text();
      setTexto(contenido);
    } catch {
      setError("No se pudo leer el archivo seleccionado.");
    }
  }

  function analizar() {
    setError("");
    setMensaje("");

    if (!texto.trim()) {
      setError("Pega el contenido del email o carga un archivo.");
      return;
    }

    setResultado(
      analizarEmail({
        texto,
        clientes,
        productos,
      })
    );
  }

  function actualizarCampo(campo, valor) {
    setResultado((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function actualizarLinea(indice, campo, valor) {
    setResultado((anterior) => ({
      ...anterior,
      lineas: anterior.lineas.map((linea, posicion) =>
        posicion === indice ? { ...linea, [campo]: valor } : linea
      ),
    }));
  }

  function eliminarLinea(indice) {
    setResultado((anterior) => ({
      ...anterior,
      lineas: anterior.lineas.filter((_, posicion) => posicion !== indice),
    }));
  }

  function añadirLinea() {
    setResultado((anterior) => ({
      ...anterior,
      lineas: [
        ...anterior.lineas,
        {
          producto_id: "",
          nombre: "",
          cantidad: 1,
          precio_unitario: 0,
          confirmado: true,
        },
      ],
    }));
  }

  async function guardarBorrador() {
    setGuardando(true);
    setError("");
    setMensaje("");

    const clienteSeleccionado = clientes.find(
      (cliente) => String(cliente.id) === String(resultado.cliente_id)
    );

    const payload = {
      texto_original: texto,
      cliente_id: resultado.cliente_id || null,
      cliente_nombre:
        clienteSeleccionado?.nombre ||
        clienteSeleccionado?.nombre_comercial ||
        resultado.cliente_nombre ||
        null,
      email_contacto: resultado.email || null,
      telefono_contacto: resultado.telefono || null,
      fecha_evento: resultado.fecha_evento || null,
      hora_evento: resultado.hora_evento || null,
      numero_personas: resultado.numero_personas
        ? Number(resultado.numero_personas)
        : null,
      lineas: resultado.lineas,
      observaciones: resultado.observaciones || null,
      estado: "pendiente_revision",
    };

    const { error: errorGuardado } = await supabase
      .from("importaciones_email")
      .insert(payload);

    if (errorGuardado) {
      setError(errorGuardado.message);
    } else {
      setMensaje("Email guardado como borrador pendiente de revisión.");
    }

    setGuardando(false);
  }

  const totalEstimado = useMemo(
    () =>
      resultado.lineas.reduce(
        (total, linea) =>
          total +
          Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0),
        0
      ),
    [resultado.lineas]
  );

  if (cargando) {
    return (
      <section className="panel">
        <p>Cargando importador de emails...</p>
      </section>
    );
  }

  return (
    <section className="panel importador-panel">
      <div className="cabecera-seccion">
        <div>
          <p className="etiqueta">ADMINISTRACIÓN</p>
          <h1>📥 Importar emails</h1>
          <p>
            Pega un correo o carga un archivo .eml. El sistema prepara un
            borrador para revisar, pero no crea ningún presupuesto automáticamente.
          </p>
        </div>
      </div>

      {error && <div className="mensaje-error">{error}</div>}
      {mensaje && <div className="mensaje-exito">{mensaje}</div>}

      <div className="importador-bloque">
        <label>
          Cargar email (.eml o .txt)
          <input type="file" accept=".eml,.txt,text/plain,message/rfc822" onChange={leerArchivo} />
        </label>

        <label>
          Contenido del email
          <textarea
            rows="14"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Pega aquí el correo completo..."
          />
        </label>

        <button type="button" className="boton-principal" onClick={analizar}>
          Analizar email
        </button>
      </div>

      {(resultado.observaciones || resultado.lineas.length > 0) && (
        <div className="importador-bloque">
          <h2>Revisión del borrador</h2>

          <div className="form-grid">
            <label>
              Cliente
              <select
                value={resultado.cliente_id}
                onChange={(evento) =>
                  actualizarCampo("cliente_id", evento.target.value)
                }
              >
                <option value="">Sin cliente asignado</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre ||
                      cliente.nombre_comercial ||
                      cliente.empresa ||
                      "Cliente sin nombre"}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Email
              <input
                value={resultado.email}
                onChange={(evento) => actualizarCampo("email", evento.target.value)}
              />
            </label>

            <label>
              Teléfono
              <input
                value={resultado.telefono}
                onChange={(evento) =>
                  actualizarCampo("telefono", evento.target.value)
                }
              />
            </label>

            <label>
              Fecha del evento
              <input
                type="date"
                value={resultado.fecha_evento}
                onChange={(evento) =>
                  actualizarCampo("fecha_evento", evento.target.value)
                }
              />
            </label>

            <label>
              Hora
              <input
                type="time"
                value={resultado.hora_evento}
                onChange={(evento) =>
                  actualizarCampo("hora_evento", evento.target.value)
                }
              />
            </label>

            <label>
              Personas
              <input
                type="number"
                min="0"
                value={resultado.numero_personas}
                onChange={(evento) =>
                  actualizarCampo("numero_personas", evento.target.value)
                }
              />
            </label>
          </div>

          <div className="tabla-responsive">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {resultado.lineas.map((linea, indice) => (
                  <tr key={`${linea.producto_id}-${indice}`}>
                    <td>
                      <select
                        value={linea.producto_id}
                        onChange={(evento) => {
                          const producto = productos.find(
                            (item) =>
                              String(item.id) === String(evento.target.value)
                          );

                          actualizarLinea(
                            indice,
                            "producto_id",
                            evento.target.value
                          );
                          actualizarLinea(
                            indice,
                            "nombre",
                            producto?.nombre || ""
                          );
                          actualizarLinea(
                            indice,
                            "precio_unitario",
                            Number(producto?.precio_venta || 0)
                          );
                        }}
                      >
                        <option value="">Seleccionar producto</option>
                        {productos.map((producto) => (
                          <option key={producto.id} value={producto.id}>
                            {producto.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.cantidad}
                        onChange={(evento) =>
                          actualizarLinea(indice, "cantidad", evento.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.precio_unitario}
                        onChange={(evento) =>
                          actualizarLinea(
                            indice,
                            "precio_unitario",
                            evento.target.value
                          )
                        }
                      />
                    </td>
                    <td>
                      {(
                        Number(linea.cantidad || 0) *
                        Number(linea.precio_unitario || 0)
                      ).toLocaleString("es-ES", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="boton-peligro"
                        onClick={() => eliminarLinea(indice)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={añadirLinea}>
            + Añadir producto
          </button>

          <p className="total-importador">
            Total estimado:{" "}
            <strong>
              {totalEstimado.toLocaleString("es-ES", {
                style: "currency",
                currency: "EUR",
              })}
            </strong>
          </p>

          <label>
            Observaciones
            <textarea
              rows="7"
              value={resultado.observaciones}
              onChange={(evento) =>
                actualizarCampo("observaciones", evento.target.value)
              }
            />
          </label>

          <button
            type="button"
            className="boton-principal"
            disabled={guardando}
            onClick={guardarBorrador}
          >
            {guardando ? "Guardando..." : "Guardar borrador para revisión"}
          </button>
        </div>
      )}
    </section>
  );
}

export default ImportadorEmails;
