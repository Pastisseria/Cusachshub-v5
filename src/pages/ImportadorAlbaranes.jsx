import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

import {
  analizarAlbaran,
  recalcularAlbaran,
} from "../ai/parserAlbaranes.js";

import { leerDocumento } from "../services/lectorDocumentos.js";

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

  const [procesandoArchivo, setProcesandoArchivo] = useState(false);

  const [progresoOCR, setProgresoOCR] = useState({
    estado: "",
    progreso: 0,
  });

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarProveedores();
  }, []);

  async function cargarProveedores() {
    setCargando(true);
    setError("");

    try {
      const { data, error: errorSupabase } = await supabase
        .from("proveedores")
        .select("*")
        .order("nombre", { ascending: true });

      if (errorSupabase) {
        throw errorSupabase;
      }

      setProveedores(data || []);
    } catch (errorCarga) {
      console.error("Error cargando proveedores:", errorCarga);

      setError(
        errorCarga.message ||
          "No se pudieron cargar los proveedores."
      );
    } finally {
      setCargando(false);
    }
  }

  async function leerArchivo(evento) {
    const archivo = evento.target.files?.[0];

    if (!archivo) return;

    setError("");
    setMensaje("");
    setTexto("");
    setResultado(RESULTADO_VACIO);

    setProcesandoArchivo(true);

    setProgresoOCR({
      estado: "Preparando documento",
      progreso: 0,
    });

    try {
      const textoExtraido = await leerDocumento(
        archivo,
        setProgresoOCR
      );

      setTexto(textoExtraido);

      const analisis = analizarAlbaran(textoExtraido);

      setResultado({
        ...RESULTADO_VACIO,
        ...analisis,
        texto_original: textoExtraido,
      });

      setMensaje(
        "Documento leído correctamente. Revisa las líneas antes de guardar el albarán."
      );
    } catch (errorLectura) {
      console.error("Error leyendo el documento:", errorLectura);

      setError(
        errorLectura.message ||
          "No se ha podido leer el documento."
      );
    } finally {
      setProcesandoArchivo(false);

      setProgresoOCR((anterior) => ({
        ...anterior,
        progreso: anterior.progreso || 100,
      }));
    }
  }

  function analizarTextoManual() {
    setError("");
    setMensaje("");

    if (!texto.trim()) {
      setError(
        "Selecciona un documento o pega el texto del albarán."
      );
      return;
    }

    try {
      const analisis = analizarAlbaran(texto);

      setResultado({
        ...RESULTADO_VACIO,
        ...analisis,
        texto_original: texto,
      });

      setMensaje(
        "Texto analizado. Revisa los datos antes de guardar."
      );
    } catch (errorAnalisis) {
      console.error("Error analizando albarán:", errorAnalisis);

      setError(
        errorAnalisis.message ||
          "No se ha podido analizar el texto del albarán."
      );
    }
  }

  function actualizarCampo(campo, valor) {
    setResultado((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function actualizarLinea(indice, campo, valor) {
    setResultado((anterior) => ({
      ...anterior,

      lineas: anterior.lineas.map((linea, posicion) =>
        posicion === indice
          ? {
              ...linea,
              [campo]: valor,
            }
          : linea
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

      lineas: anterior.lineas.filter(
        (_, posicion) => posicion !== indice
      ),
    }));
  }

  function limpiarImportador() {
    setTexto("");
    setResultado(RESULTADO_VACIO);
    setError("");
    setMensaje("");

    setProgresoOCR({
      estado: "",
      progreso: 0,
    });

    const inputArchivo = document.getElementById(
      "archivo-albaran"
    );

    if (inputArchivo) {
      inputArchivo.value = "";
    }
  }

  const totalesCalculados = useMemo(() => {
    return recalcularAlbaran(resultado.lineas);
  }, [resultado.lineas]);

  async function guardarAlbaran() {
    setError("");
    setMensaje("");

    if (!resultado.proveedor_id) {
      setError("Selecciona el proveedor del albarán.");
      return;
    }

    if (!resultado.fecha_albaran) {
      setError("Indica la fecha del albarán.");
      return;
    }

    if (resultado.lineas.length === 0) {
      setError(
        "El albarán no contiene ninguna línea de producto."
      );
      return;
    }

    const lineasValidas = resultado.lineas.filter(
      (linea) =>
        linea.descripcion?.trim() &&
        Number(linea.cantidad || 0) > 0
    );

    if (lineasValidas.length === 0) {
      setError(
        "Completa al menos una línea con descripción y cantidad."
      );
      return;
    }

    setGuardando(true);

    try {
      const proveedorSeleccionado = proveedores.find(
        (proveedor) =>
          String(proveedor.id) ===
          String(resultado.proveedor_id)
      );

      const payload = {
        proveedor_id: resultado.proveedor_id || null,

        proveedor_nombre:
          proveedorSeleccionado?.nombre ||
          proveedorSeleccionado?.nombre_comercial ||
          resultado.proveedor_nombre ||
          null,

        numero_albaran:
          resultado.numero_albaran?.trim() || null,

        fecha_albaran:
          resultado.fecha_albaran || null,

        lineas: lineasValidas.map((linea) => ({
          descripcion: linea.descripcion?.trim() || "",
          cantidad: Number(linea.cantidad || 0),
          unidad: linea.unidad?.trim() || "unidad",
          precio_unitario: Number(
            linea.precio_unitario || 0
          ),
          iva: Number(linea.iva || 0),

          total_linea: Number(
            (
              Number(linea.cantidad || 0) *
              Number(linea.precio_unitario || 0)
            ).toFixed(2)
          ),
        })),

        base_imponible:
          totalesCalculados.base_imponible,

        total_iva:
          totalesCalculados.total_iva,

        total:
          totalesCalculados.total,

        texto_original:
          texto || resultado.texto_original || null,

        estado: "pendiente_revision",
      };

      const { error: errorGuardado } = await supabase
        .from("importaciones_albaran")
        .insert(payload);

      if (errorGuardado) {
        throw errorGuardado;
      }

      setMensaje(
        "Albarán guardado correctamente como pendiente de revisión."
      );
    } catch (errorGuardado) {
      console.error(
        "Error guardando el albarán:",
        errorGuardado
      );

      setError(
        errorGuardado.message ||
          "No se ha podido guardar el albarán."
      );
    } finally {
      setGuardando(false);
    }
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
            Selecciona un PDF o una fotografía del albarán.
            El sistema intentará leer automáticamente el
            proveedor, la fecha, los productos, las cantidades
            y los precios.
          </p>
        </div>
      </div>

      {error && (
        <div className="mensaje-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mensaje-exito">
          {mensaje}
        </div>
      )}

      <div className="importador-bloque">
        <h2>1. Seleccionar documento</h2>

        <label>
          Cargar albarán
          <input
            id="archivo-albaran"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={leerArchivo}
            disabled={procesandoArchivo}
          />
        </label>

        {procesandoArchivo && (
          <div className="ocr-progreso">
            <p>
              <strong>
                {progresoOCR.estado ||
                  "Leyendo documento"}
              </strong>
            </p>

            <progress
              value={progresoOCR.progreso}
              max="100"
            />

            <span>
              {progresoOCR.progreso}%
            </span>
          </div>
        )}

        <label>
          Texto detectado
          <textarea
            rows="14"
            value={texto}
            onChange={(evento) =>
              setTexto(evento.target.value)
            }
            placeholder={
              "Aquí aparecerá el texto leído del PDF o de la fotografía.\n\nTambién puedes pegar manualmente el texto del albarán."
            }
            disabled={procesandoArchivo}
          />
        </label>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="boton-principal"
            onClick={analizarTextoManual}
            disabled={
              procesandoArchivo || !texto.trim()
            }
          >
            {procesandoArchivo
              ? "Leyendo documento..."
              : "Analizar albarán"}
          </button>

          <button
            type="button"
            onClick={limpiarImportador}
            disabled={
              procesandoArchivo || guardando
            }
          >
            Limpiar
          </button>
        </div>
      </div>

      {(resultado.texto_original ||
        resultado.lineas.length > 0) && (
        <div className="importador-bloque">
          <h2>2. Revisar datos del albarán</h2>

          <div className="form-grid">
            <label>
              Proveedor
              <select
                value={resultado.proveedor_id}
                onChange={(evento) =>
                  actualizarCampo(
                    "proveedor_id",
                    evento.target.value
                  )
                }
              >
                <option value="">
                  Seleccionar proveedor
                </option>

                {proveedores.map((proveedor) => (
                  <option
                    key={proveedor.id}
                    value={proveedor.id}
                  >
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
                type="text"
                value={resultado.numero_albaran}
                onChange={(evento) =>
                  actualizarCampo(
                    "numero_albaran",
                    evento.target.value
                  )
                }
                placeholder="Número del albarán"
              />
            </label>

            <label>
              Fecha del albarán
              <input
                type="date"
                value={resultado.fecha_albaran}
                onChange={(evento) =>
                  actualizarCampo(
                    "fecha_albaran",
                    evento.target.value
                  )
                }
              />
            </label>
          </div>

          <h3>Productos detectados</h3>

          <div className="tabla-responsive">
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                  <th>Precio unitario</th>
                  <th>IVA</th>
                  <th>Total línea</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {resultado.lineas.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      No se han detectado productos.
                      Puedes añadirlos manualmente.
                    </td>
                  </tr>
                )}

                {resultado.lineas.map(
                  (linea, indice) => {
                    const cantidad = Number(
                      linea.cantidad || 0
                    );

                    const precioUnitario = Number(
                      linea.precio_unitario || 0
                    );

                    const totalLinea =
                      cantidad * precioUnitario;

                    return (
                      <tr key={indice}>
                        <td>
                          <input
                            type="text"
                            value={
                              linea.descripcion || ""
                            }
                            onChange={(evento) =>
                              actualizarLinea(
                                indice,
                                "descripcion",
                                evento.target.value
                              )
                            }
                            placeholder="Descripción"
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={
                              linea.cantidad ?? ""
                            }
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
                            type="text"
                            value={
                              linea.unidad ||
                              "unidad"
                            }
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
                            value={
                              linea.precio_unitario ??
                              ""
                            }
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
                            value={linea.iva ?? 10}
                            onChange={(evento) =>
                              actualizarLinea(
                                indice,
                                "iva",
                                evento.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          {totalLinea.toLocaleString(
                            "es-ES",
                            {
                              style: "currency",
                              currency: "EUR",
                            }
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="boton-peligro"
                            onClick={() =>
                              eliminarLinea(indice)
                            }
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={añadirLinea}
          >
            + Añadir línea
          </button>

          <div className="totales-importador">
            <p>
              Base imponible:{" "}
              <strong>
                {totalesCalculados.base_imponible.toLocaleString(
                  "es-ES",
                  {
                    style: "currency",
                    currency: "EUR",
                  }
                )}
              </strong>
            </p>

            <p>
              IVA:{" "}
              <strong>
                {totalesCalculados.total_iva.toLocaleString(
                  "es-ES",
                  {
                    style: "currency",
                    currency: "EUR",
                  }
                )}
              </strong>
            </p>

            <p>
              Total:{" "}
              <strong>
                {totalesCalculados.total.toLocaleString(
                  "es-ES",
                  {
                    style: "currency",
                    currency: "EUR",
                  }
                )}
              </strong>
            </p>
          </div>

          <button
            type="button"
            className="boton-principal"
            disabled={
              guardando || procesandoArchivo
            }
            onClick={guardarAlbaran}
          >
            {guardando
              ? "Guardando..."
              : "Guardar albarán para revisión"}
          </button>
        </div>
      )}
    </section>
  );
}

export default ImportadorAlbaranes;