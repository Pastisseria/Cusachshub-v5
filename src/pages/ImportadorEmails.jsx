import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";
import {
  analizarAlbaran,
  recalcularAlbaran,
} from "../ai/parserAlbaranes.js";

const RESULTADO_VACIO = {
  numero_albaran: "",
  fecha_albaran: "",
  proveedor_id: "",
  proveedor_nombre: "",
  lineas: [],
  base_imponible: 0,
  total_iva: 0,
  total: 0,
  texto_original: "",
};

function ImportadorAlbaranes() {
  const [texto, setTexto] = useState("");
  const [proveedores, setProveedores] = useState([]);
  const [resultado, setResultado] = useState(RESULTADO_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarProveedores();
  }, []);

  async function cargarProveedores() {
    setCargando(true);

    const { data, error: errorSupabase } = await supabase
      .from("proveedores")
      .select("*")
      .order("nombre", { ascending: true });

    if (errorSupabase) {
      setError(errorSupabase.message);
    }

    setProveedores(data || []);
    setCargando(false);
  }

  async function leerArchivo(evento) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    setError("");
    setMensaje("");

    const extension = archivo.name.split(".").pop()?.toLowerCase();

    if (["txt", "csv"].includes(extension)) {
      try {
        setTexto(await archivo.text());
      } catch {
        setError("No se pudo leer el archivo.");
      }
      return;
    }

    if (["pdf", "jpg", "jpeg", "png"].includes(extension)) {
      setError(
        "El archivo se ha seleccionado, pero PDF e imágenes necesitan OCR en una función segura de Supabase. Mientras tanto, copia y pega el texto del albarán en el cuadro."
      );
      return;
    }

    setError("Formato no compatible.");
  }

  function analizar() {
    setError("");
    setMensaje("");

    if (!texto.trim()) {
      setError("Pega el texto del albarán o carga un archivo .txt/.csv.");
      return;
    }

    setResultado(analizarAlbaran(texto));
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

  function añadirLinea() {
    setResultado((anterior) => ({
      ...anterior,
      lineas: [
        ...anterior.lineas,
        {
          descripcion: "",
          cantidad: 1,
          unidad: "unidad",
          precio_unitario: 0,
          iva: 10,
          total_linea: 0,
        },
      ],
    }));
  }

  function eliminarLinea(indice) {
    setResultado((anterior) => ({
      ...anterior,
      lineas: anterior.lineas.filter((_, posicion) => posicion !== indice),
    }));
  }

  const totalesCalculados = useMemo(
    () => recalcularAlbaran(resultado.lineas),
    [resultado.lineas]
  );

  async function guardarAlbaran() {
    setGuardando(true);
    setError("");
    setMensaje("");

    const proveedor = proveedores.find(
      (item) => String(item.id) === String(resultado.proveedor_id)
    );

    const payload = {
      proveedor_id: resultado.proveedor_id || null,
      proveedor_nombre:
        proveedor?.nombre ||
        proveedor?.nombre_comercial ||
        resultado.proveedor_nombre ||
        null,
      numero_albaran: resultado.numero_albaran || null,
      fecha_albaran: resultado.fecha_albaran || null,
      lineas: resultado.lineas,
      base_imponible: totalesCalculados.base_imponible,
      total_iva: totalesCalculados.total_iva,
      total: totalesCalculados.total,
      texto_original: texto,
      estado: "pendiente_revision",
    };

    const { error: errorGuardado } = await supabase
      .from("importaciones_albaran")
      .insert(payload);

    if (errorGuardado) {
      setError(errorGuardado.message);
    } else {
      setMensaje("Albarán guardado como borrador pendiente de revisión.");
    }

    setGuardando(false);
  }

  if (cargando) {
    return (
      <section className="panel">
        <p>Cargando importador de albaranes...</p>
      </section>
    );
  }

  return (
    <section className="panel importador-panel">
      <div className="cabecera-seccion">
        <div>
          <p className="etiqueta">COMPRAS</p>
          <h1>📄 Importar albaranes</h1>
          <p>
            El importador analiza texto y archivos .txt/.csv. Los PDF y las
            fotografías necesitarán el módulo OCR seguro de Supabase.
          </p>
        </div>
      </div>

      {error && <div className="mensaje-error">{error}</div>}
      {mensaje && <div className="mensaje-exito">{mensaje}</div>}

      <div className="importador-bloque">
        <label>
          Cargar albarán
          <input
            type="file"
            accept=".txt,.csv,.pdf,.jpg,.jpeg,.png,text/plain,text/csv,application/pdf,image/*"
            onChange={leerArchivo}
          />
        </label>

        <label>
          Texto del albarán
          <textarea
            rows="14"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder={"Ejemplo:\n2 Harina 25 kg 18,50 37,00\n1 Mantequilla 10 kg 65,00 65,00"}
          />
        </label>

        <button type="button" className="boton-principal" onClick={analizar}>
          Analizar albarán
        </button>
      </div>

      {(resultado.texto_original || resultado.lineas.length > 0) && (
        <div className="importador-bloque">
          <h2>Revisión del albarán</h2>

          <div className="form-grid">
            <label>
              Proveedor
              <select
                value={resultado.proveedor_id}
                onChange={(evento) =>
                  actualizarCampo("proveedor_id", evento.target.value)
                }
              >
                <option value="">Seleccionar proveedor</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre ||
                      proveedor.nombre_comercial ||
                      "Proveedor sin nombre"}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Número de albarán
              <input
                value={resultado.numero_albaran}
                onChange={(evento) =>
                  actualizarCampo("numero_albaran", evento.target.value)
                }
              />
            </label>

            <label>
              Fecha
              <input
                type="date"
                value={resultado.fecha_albaran}
                onChange={(evento) =>
                  actualizarCampo("fecha_albaran", evento.target.value)
                }
              />
            </label>
          </div>

          <div className="tabla-responsive">
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                  <th>Precio</th>
                  <th>IVA</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {resultado.lineas.map((linea, indice) => {
                  const totalLinea =
                    Number(linea.cantidad || 0) *
                    Number(linea.precio_unitario || 0);

                  return (
                    <tr key={indice}>
                      <td>
                        <input
                          value={linea.descripcion}
                          onChange={(evento) =>
                            actualizarLinea(
                              indice,
                              "descripcion",
                              evento.target.value
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={linea.cantidad}
                          onChange={(evento) =>
                            actualizarLinea(
                              indice,
                              "cantidad",
                              evento.target.value
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={linea.unidad}
                          onChange={(evento) =>
                            actualizarLinea(
                              indice,
                              "unidad",
                              evento.target.value
                            )
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
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={linea.iva}
                          onChange={(evento) =>
                            actualizarLinea(indice, "iva", evento.target.value)
                          }
                        />
                      </td>
                      <td>
                        {totalLinea.toLocaleString("es-ES", {
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={añadirLinea}>
            + Añadir línea
          </button>

          <div className="totales-importador">
            <p>
              Base imponible:{" "}
              <strong>
                {totalesCalculados.base_imponible.toLocaleString("es-ES", {
                  style: "currency",
                  currency: "EUR",
                })}
              </strong>
            </p>
            <p>
              IVA:{" "}
              <strong>
                {totalesCalculados.total_iva.toLocaleString("es-ES", {
                  style: "currency",
                  currency: "EUR",
                })}
              </strong>
            </p>
            <p>
              Total:{" "}
              <strong>
                {totalesCalculados.total.toLocaleString("es-ES", {
                  style: "currency",
                  currency: "EUR",
                })}
              </strong>
            </p>
          </div>

          <button
            type="button"
            className="boton-principal"
            disabled={guardando}
            onClick={guardarAlbaran}
          >
            {guardando ? "Guardando..." : "Guardar albarán para revisión"}
          </button>
        </div>
      )}
    </section>
  );
}

export default ImportadorAlbaranes;
