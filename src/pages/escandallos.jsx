import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const ESCANDALLO_INICIAL = {
  nombre: "",
  categoria: "",
  unidades_producidas: "1",
  precio_venta: "",
  margen_objetivo: "70",
  observaciones: "",
  activo: true,
};

const LINEA_INICIAL = {
  ingrediente_id: "",
  cantidad: "",
};

function Escandallos() {
  const [escandallos, setEscandallos] = useState([]);
  const [ingredientes, setIngredientes] = useState([]);
  const [lineas, setLineas] = useState([]);

  const [formulario, setFormulario] = useState(ESCANDALLO_INICIAL);
  const [nuevaLinea, setNuevaLinea] = useState(LINEA_INICIAL);
  const [editandoId, setEditandoId] = useState(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setError("");

    const [respuestaEscandallos, respuestaIngredientes] = await Promise.all([
      supabase
        .from("escandallos")
        .select(`
          *,
          escandallo_ingredientes (
            id,
            escandallo_id,
            ingrediente_id,
            cantidad,
            ingredientes (
              id,
              nombre,
              unidad,
              precio_coste,
              activo
            )
          )
        `)
        .order("nombre", { ascending: true }),

      supabase
        .from("ingredientes")
        .select("*")
        .eq("activo", true)
        .order("nombre", { ascending: true }),
    ]);

    if (respuestaEscandallos.error) {
      setError(respuestaEscandallos.error.message);
      setEscandallos([]);
    } else {
      setEscandallos(respuestaEscandallos.data ?? []);
    }

    if (respuestaIngredientes.error) {
      setError((anterior) =>
        anterior
          ? `${anterior} | ${respuestaIngredientes.error.message}`
          : respuestaIngredientes.error.message,
      );
      setIngredientes([]);
    } else {
      setIngredientes(respuestaIngredientes.data ?? []);
    }

    setCargando(false);
  }

  function actualizarFormulario(evento) {
    const { name, value, type, checked } = evento.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function actualizarNuevaLinea(evento) {
    const { name, value } = evento.target;

    setNuevaLinea((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  function añadirIngrediente() {
    setError("");
    setMensaje("");

    if (!nuevaLinea.ingrediente_id) {
      setError("Selecciona un ingrediente.");
      return;
    }

    const cantidad = Number(nuevaLinea.cantidad);

    if (!cantidad || cantidad <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }

    const ingrediente = ingredientes.find(
      (item) => String(item.id) === String(nuevaLinea.ingrediente_id),
    );

    if (!ingrediente) {
      setError("No se ha encontrado el ingrediente seleccionado.");
      return;
    }

    const yaExiste = lineas.some(
      (linea) =>
        String(linea.ingrediente_id) === String(nuevaLinea.ingrediente_id),
    );

    if (yaExiste) {
      setLineas((anteriores) =>
        anteriores.map((linea) =>
          String(linea.ingrediente_id) === String(nuevaLinea.ingrediente_id)
            ? {
                ...linea,
                cantidad: Number(linea.cantidad) + cantidad,
              }
            : linea,
        ),
      );
    } else {
      setLineas((anteriores) => [
        ...anteriores,
        {
          id_temporal: crypto.randomUUID(),
          ingrediente_id: ingrediente.id,
          cantidad,
          ingrediente,
        },
      ]);
    }

    setNuevaLinea(LINEA_INICIAL);
  }

  function actualizarCantidadLinea(idTemporal, valor) {
    setLineas((anteriores) =>
      anteriores.map((linea) =>
        linea.id_temporal === idTemporal
          ? { ...linea, cantidad: valor }
          : linea,
      ),
    );
  }

  function eliminarLinea(idTemporal) {
    setLineas((anteriores) =>
      anteriores.filter((linea) => linea.id_temporal !== idTemporal),
    );
  }

  function limpiarFormulario() {
    setFormulario(ESCANDALLO_INICIAL);
    setNuevaLinea(LINEA_INICIAL);
    setLineas([]);
    setEditandoId(null);
  }

  function cancelarEdicion() {
    limpiarFormulario();
    setError("");
    setMensaje("");
  }

  function prepararEdicion(escandallo) {
    setFormulario({
      nombre: escandallo.nombre ?? "",
      categoria: escandallo.categoria ?? "",
      unidades_producidas: escandallo.unidades_producidas ?? "1",
      precio_venta: escandallo.precio_venta ?? "",
      margen_objetivo: escandallo.margen_objetivo ?? "70",
      observaciones: escandallo.observaciones ?? "",
      activo: escandallo.activo ?? true,
    });

    const lineasPreparadas = (escandallo.escandallo_ingredientes ?? []).map(
      (linea) => ({
        id: linea.id,
        id_temporal: crypto.randomUUID(),
        ingrediente_id: linea.ingrediente_id,
        cantidad: Number(linea.cantidad || 0),
        ingrediente: linea.ingredientes,
      }),
    );

    setLineas(lineasPreparadas);
    setEditandoId(escandallo.id);
    setError("");
    setMensaje("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarEscandallo(evento) {
    evento.preventDefault();

    setError("");
    setMensaje("");

    if (!formulario.nombre.trim()) {
      setError("El nombre del escandallo es obligatorio.");
      return;
    }

    const unidadesProducidas = Number(formulario.unidades_producidas || 0);
    const precioVenta = Number(formulario.precio_venta || 0);
    const margenObjetivo = Number(formulario.margen_objetivo || 0);

    if (!unidadesProducidas || unidadesProducidas <= 0) {
      setError("Las unidades producidas deben ser mayores que cero.");
      return;
    }

    if (precioVenta < 0 || margenObjetivo < 0 || margenObjetivo > 100) {
      setError("Revisa el precio de venta y el margen objetivo.");
      return;
    }

    if (lineas.length === 0) {
      setError("Añade al menos un ingrediente al escandallo.");
      return;
    }

    const hayCantidadInvalida = lineas.some(
      (linea) => !Number(linea.cantidad) || Number(linea.cantidad) <= 0,
    );

    if (hayCantidadInvalida) {
      setError("Todas las cantidades deben ser mayores que cero.");
      return;
    }

    setGuardando(true);

    const datosEscandallo = {
      nombre: formulario.nombre.trim(),
      categoria: formulario.categoria.trim() || null,
      unidades_producidas: unidadesProducidas,
      precio_venta: precioVenta,
      margen_objetivo: margenObjetivo,
      observaciones: formulario.observaciones.trim() || null,
      activo: formulario.activo,
      updated_at: new Date().toISOString(),
    };

    let escandalloId = editandoId;

    if (editandoId) {
      const { error: errorActualizar } = await supabase
        .from("escandallos")
        .update(datosEscandallo)
        .eq("id", editandoId);

      if (errorActualizar) {
        setError(errorActualizar.message);
        setGuardando(false);
        return;
      }

      const { error: errorBorrarLineas } = await supabase
        .from("escandallo_ingredientes")
        .delete()
        .eq("escandallo_id", editandoId);

      if (errorBorrarLineas) {
        setError(errorBorrarLineas.message);
        setGuardando(false);
        return;
      }
    } else {
      const { data: nuevoEscandallo, error: errorInsertar } = await supabase
        .from("escandallos")
        .insert(datosEscandallo)
        .select("id")
        .single();

      if (errorInsertar) {
        setError(errorInsertar.message);
        setGuardando(false);
        return;
      }

      escandalloId = nuevoEscandallo.id;
    }

    const lineasParaGuardar = lineas.map((linea) => ({
      escandallo_id: escandalloId,
      ingrediente_id: linea.ingrediente_id,
      cantidad: Number(linea.cantidad),
    }));

    const { error: errorLineas } = await supabase
      .from("escandallo_ingredientes")
      .insert(lineasParaGuardar);

    if (errorLineas) {
      setError(errorLineas.message);
      setGuardando(false);
      return;
    }

    setMensaje(
      editandoId
        ? "Escandallo actualizado correctamente."
        : "Escandallo creado correctamente.",
    );

    limpiarFormulario();
    setGuardando(false);
    await cargarDatos();
  }

  async function eliminarEscandallo(escandallo) {
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar el escandallo "${escandallo.nombre}"?`,
    );

    if (!confirmar) return;

    setError("");
    setMensaje("");

    const { error: errorLineas } = await supabase
      .from("escandallo_ingredientes")
      .delete()
      .eq("escandallo_id", escandallo.id);

    if (errorLineas) {
      setError(errorLineas.message);
      return;
    }

    const { error: errorEscandallo } = await supabase
      .from("escandallos")
      .delete()
      .eq("id", escandallo.id);

    if (errorEscandallo) {
      setError(errorEscandallo.message);
      return;
    }

    setMensaje("Escandallo eliminado correctamente.");

    if (editandoId === escandallo.id) {
      limpiarFormulario();
    }

    await cargarDatos();
  }

  const costeTotalFormulario = useMemo(() => {
    return lineas.reduce((total, linea) => {
      const precio = Number(linea.ingrediente?.precio_coste || 0);
      const cantidad = Number(linea.cantidad || 0);
      return total + precio * cantidad;
    }, 0);
  }, [lineas]);

  const costeUnidadFormulario =
    Number(formulario.unidades_producidas || 0) > 0
      ? costeTotalFormulario / Number(formulario.unidades_producidas)
      : 0;

  const margenRealFormulario =
    Number(formulario.precio_venta || 0) > 0
      ? ((Number(formulario.precio_venta) - costeUnidadFormulario) /
          Number(formulario.precio_venta)) *
        100
      : 0;

  const precioRecomendadoFormulario =
    Number(formulario.margen_objetivo || 0) < 100
      ? costeUnidadFormulario /
        (1 - Number(formulario.margen_objetivo || 0) / 100)
      : 0;

  const categorias = useMemo(() => {
    return [
      ...new Set(
        escandallos
          .map((item) => item.categoria)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "es")),
      ),
    ];
  }, [escandallos]);

  const escandallosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return escandallos.filter((escandallo) => {
      const coincideCategoria =
        filtroCategoria === "todas" ||
        escandallo.categoria === filtroCategoria;

      const coincideBusqueda =
        !texto ||
        escandallo.nombre?.toLowerCase().includes(texto) ||
        escandallo.categoria?.toLowerCase().includes(texto);

      return coincideCategoria && coincideBusqueda;
    });
  }, [escandallos, busqueda, filtroCategoria]);

  const resumen = useMemo(() => {
    return escandallos.reduce(
      (acumulado, escandallo) => {
        const calculos = calcularEscandallo(escandallo);

        acumulado.total += 1;
        acumulado.activos += escandallo.activo ? 1 : 0;
        acumulado.valorCostes += calculos.costeTotal;

        if (calculos.margenReal < Number(escandallo.margen_objetivo || 0)) {
          acumulado.margenBajo += 1;
        }

        return acumulado;
      },
      {
        total: 0,
        activos: 0,
        valorCostes: 0,
        margenBajo: 0,
      },
    );
  }, [escandallos]);

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Producción y costes</p>
          <h2>Escandallos</h2>
          <p>
            Calcula el coste de cada receta, el coste por unidad y el margen de
            venta.
          </p>
        </div>

        <span className="contador">{escandallos.length} escandallos</span>
      </div>

      <div style={estiloResumen}>
        <TarjetaResumen titulo="Escandallos" valor={resumen.total} />
        <TarjetaResumen titulo="Activos" valor={resumen.activos} />
        <TarjetaResumen
          titulo="Coste acumulado"
          valor={formatearEuros(resumen.valorCostes)}
        />
        <TarjetaResumen titulo="Margen bajo" valor={resumen.margenBajo} />
      </div>

      <form onSubmit={guardarEscandallo} style={estiloFormulario}>
        <div style={estiloCabeceraFormulario}>
          <div>
            <h3 style={{ margin: 0 }}>
              {editandoId ? "Editar escandallo" : "Nuevo escandallo"}
            </h3>
            <p style={{ margin: "6px 0 0", opacity: 0.75 }}>
              Define la receta, las unidades producidas y el precio de venta.
            </p>
          </div>

          {editandoId && (
            <button
              type="button"
              className="boton-cancelar"
              onClick={cancelarEdicion}
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div style={estiloGridFormulario}>
          <label>
            Nombre *
            <input
              name="nombre"
              value={formulario.nombre}
              onChange={actualizarFormulario}
              placeholder="Ej. Croissant de mantequilla"
              style={estiloCampo}
            />
          </label>

          <label>
            Categoría
            <input
              name="categoria"
              value={formulario.categoria}
              onChange={actualizarFormulario}
              placeholder="Pastelería, catering..."
              style={estiloCampo}
            />
          </label>

          <label>
            Unidades producidas
            <input
              type="number"
              min="0.01"
              step="0.01"
              name="unidades_producidas"
              value={formulario.unidades_producidas}
              onChange={actualizarFormulario}
              style={estiloCampo}
            />
          </label>

          <label>
            Precio de venta por unidad
            <input
              type="number"
              min="0"
              step="0.01"
              name="precio_venta"
              value={formulario.precio_venta}
              onChange={actualizarFormulario}
              style={estiloCampo}
            />
          </label>

          <label>
            Margen objetivo (%)
            <input
              type="number"
              min="0"
              max="99.99"
              step="0.01"
              name="margen_objetivo"
              value={formulario.margen_objetivo}
              onChange={actualizarFormulario}
              style={estiloCampo}
            />
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              minHeight: "48px",
              marginTop: "24px",
            }}
          >
            <input
              type="checkbox"
              name="activo"
              checked={formulario.activo}
              onChange={actualizarFormulario}
              style={{ width: "22px", height: "22px" }}
            />
            Escandallo activo
          </label>
        </div>

        <label style={{ display: "block", marginTop: "18px" }}>
          Observaciones
          <textarea
            name="observaciones"
            value={formulario.observaciones}
            onChange={actualizarFormulario}
            placeholder="Indicaciones de producción, rendimiento, mermas..."
            rows="3"
            style={{
              ...estiloCampo,
              padding: "12px 14px",
              resize: "vertical",
            }}
          />
        </label>

        <div style={estiloBloqueIngredientes}>
          <h3 style={{ marginTop: 0 }}>Ingredientes de la receta</h3>

          <div style={estiloAñadirIngrediente}>
            <select
              name="ingrediente_id"
              value={nuevaLinea.ingrediente_id}
              onChange={actualizarNuevaLinea}
              style={{ ...estiloCampo, marginTop: 0 }}
            >
              <option value="">Selecciona un ingrediente</option>

              {ingredientes.map((ingrediente) => (
                <option key={ingrediente.id} value={ingrediente.id}>
                  {ingrediente.nombre} · {formatearEuros(ingrediente.precio_coste)}
                  /{ingrediente.unidad || "ud."}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="0.0001"
              step="0.0001"
              name="cantidad"
              value={nuevaLinea.cantidad}
              onChange={actualizarNuevaLinea}
              placeholder="Cantidad"
              style={{ ...estiloCampo, marginTop: 0 }}
            />

            <button type="button" onClick={añadirIngrediente}>
              Añadir ingrediente
            </button>
          </div>

          {lineas.length === 0 ? (
            <p style={{ opacity: 0.7 }}>
              Todavía no se han añadido ingredientes.
            </p>
          ) : (
            <div style={{ overflowX: "auto", marginTop: "18px" }}>
              <table style={{ ...estiloTabla, minWidth: "760px" }}>
                <thead>
                  <tr>
                    <th style={estiloCabecera}>Ingrediente</th>
                    <th style={estiloCabecera}>Unidad</th>
                    <th style={estiloCabecera}>Precio unitario</th>
                    <th style={estiloCabecera}>Cantidad</th>
                    <th style={estiloCabecera}>Coste</th>
                    <th style={estiloCabecera}>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {lineas.map((linea) => {
                    const costeLinea =
                      Number(linea.cantidad || 0) *
                      Number(linea.ingrediente?.precio_coste || 0);

                    return (
                      <tr key={linea.id_temporal}>
                        <td style={estiloCelda}>
                          <strong>
                            {linea.ingrediente?.nombre || "Ingrediente"}
                          </strong>
                        </td>

                        <td style={estiloCelda}>
                          {linea.ingrediente?.unidad || "ud."}
                        </td>

                        <td style={estiloCelda}>
                          {formatearEuros(
                            linea.ingrediente?.precio_coste || 0,
                          )}
                        </td>

                        <td style={estiloCelda}>
                          <input
                            type="number"
                            min="0.0001"
                            step="0.0001"
                            value={linea.cantidad}
                            onChange={(evento) =>
                              actualizarCantidadLinea(
                                linea.id_temporal,
                                evento.target.value,
                              )
                            }
                            style={{
                              ...estiloCampo,
                              marginTop: 0,
                              minWidth: "120px",
                            }}
                          />
                        </td>

                        <td style={estiloCelda}>
                          <strong>{formatearEuros(costeLinea)}</strong>
                        </td>

                        <td style={estiloCelda}>
                          <button
                            type="button"
                            className="boton-cancelar"
                            onClick={() => eliminarLinea(linea.id_temporal)}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={estiloCalculos}>
          <TarjetaCalculo
            titulo="Coste total de receta"
            valor={formatearEuros(costeTotalFormulario)}
          />
          <TarjetaCalculo
            titulo="Coste por unidad"
            valor={formatearEuros(costeUnidadFormulario)}
          />
          <TarjetaCalculo
            titulo="Margen real"
            valor={`${formatearNumero(margenRealFormulario)} %`}
          />
          <TarjetaCalculo
            titulo="Precio recomendado"
            valor={formatearEuros(precioRecomendadoFormulario)}
          />
        </div>

        {error && <p style={estiloError}>Error: {error}</p>}
        {mensaje && <p style={estiloMensaje}>{mensaje}</p>}

        <div style={{ marginTop: "18px" }}>
          <button type="submit" disabled={guardando}>
            {guardando
              ? "Guardando..."
              : editandoId
                ? "Guardar cambios"
                : "Crear escandallo"}
          </button>
        </div>
      </form>

      <div style={estiloFiltros}>
        <input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar escandallo..."
          style={{ ...estiloCampo, marginTop: 0, flex: "1 1 320px" }}
        />

        <select
          value={filtroCategoria}
          onChange={(evento) => setFiltroCategoria(evento.target.value)}
          style={{ ...estiloCampo, marginTop: 0, maxWidth: "260px" }}
        >
          <option value="todas">Todas las categorías</option>

          {categorias.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
      </div>

      {cargando ? (
        <p>Cargando escandallos...</p>
      ) : escandallosFiltrados.length === 0 ? (
        <p>No hay escandallos que coincidan con la búsqueda.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={estiloTabla}>
            <thead>
              <tr>
                <th style={estiloCabecera}>Producto</th>
                <th style={estiloCabecera}>Categoría</th>
                <th style={estiloCabecera}>Ingredientes</th>
                <th style={estiloCabecera}>Rendimiento</th>
                <th style={estiloCabecera}>Coste total</th>
                <th style={estiloCabecera}>Coste unidad</th>
                <th style={estiloCabecera}>Venta</th>
                <th style={estiloCabecera}>Margen</th>
                <th style={estiloCabecera}>Recomendado</th>
                <th style={estiloCabecera}>Estado</th>
                <th style={estiloCabecera}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {escandallosFiltrados.map((escandallo) => {
                const calculos = calcularEscandallo(escandallo);
                const margenBajo =
                  calculos.margenReal <
                  Number(escandallo.margen_objetivo || 0);

                return (
                  <tr key={escandallo.id}>
                    <td style={estiloCelda}>
                      <strong>{escandallo.nombre}</strong>
                    </td>

                    <td style={estiloCelda}>
                      {escandallo.categoria || "—"}
                    </td>

                    <td style={estiloCelda}>
                      {(escandallo.escandallo_ingredientes ?? []).length}
                    </td>

                    <td style={estiloCelda}>
                      {formatearNumero(escandallo.unidades_producidas)} uds.
                    </td>

                    <td style={estiloCelda}>
                      {formatearEuros(calculos.costeTotal)}
                    </td>

                    <td style={estiloCelda}>
                      <strong>{formatearEuros(calculos.costeUnidad)}</strong>
                    </td>

                    <td style={estiloCelda}>
                      {formatearEuros(escandallo.precio_venta)}
                    </td>

                    <td style={estiloCelda}>
                      <strong>{formatearNumero(calculos.margenReal)} %</strong>

                      {margenBajo && (
                        <div style={estiloAvisoMargen}>Margen bajo</div>
                      )}
                    </td>

                    <td style={estiloCelda}>
                      {formatearEuros(calculos.precioRecomendado)}
                    </td>

                    <td style={estiloCelda}>
                      {escandallo.activo ? "Activo" : "Inactivo"}
                    </td>

                    <td style={estiloCelda}>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => prepararEdicion(escandallo)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="boton-cancelar"
                          onClick={() => eliminarEscandallo(escandallo)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function calcularEscandallo(escandallo) {
  const costeTotal = (escandallo.escandallo_ingredientes ?? []).reduce(
    (total, linea) => {
      const cantidad = Number(linea.cantidad || 0);
      const precio = Number(linea.ingredientes?.precio_coste || 0);
      return total + cantidad * precio;
    },
    0,
  );

  const unidades = Number(escandallo.unidades_producidas || 0);
  const costeUnidad = unidades > 0 ? costeTotal / unidades : 0;

  const precioVenta = Number(escandallo.precio_venta || 0);
  const margenReal =
    precioVenta > 0 ? ((precioVenta - costeUnidad) / precioVenta) * 100 : 0;

  const margenObjetivo = Number(escandallo.margen_objetivo || 0);
  const precioRecomendado =
    margenObjetivo < 100
      ? costeUnidad / (1 - margenObjetivo / 100)
      : 0;

  return {
    costeTotal,
    costeUnidad,
    margenReal,
    precioRecomendado,
  };
}

function TarjetaResumen({ titulo, valor }) {
  return (
    <div style={estiloTarjeta}>
      <span style={{ opacity: 0.7 }}>{titulo}</span>
      <strong style={{ fontSize: "26px" }}>{valor}</strong>
    </div>
  );
}

function TarjetaCalculo({ titulo, valor }) {
  return (
    <div style={estiloTarjetaCalculo}>
      <span style={{ opacity: 0.72 }}>{titulo}</span>
      <strong style={{ fontSize: "22px" }}>{valor}</strong>
    </div>
  );
}

function formatearEuros(valor) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(valor || 0));
}

function formatearNumero(valor) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(Number(valor || 0));
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

const estiloFormulario = {
  marginBottom: "28px",
  padding: "22px",
  border: "1px solid #3a3440",
  borderRadius: "16px",
  background: "rgba(255, 255, 255, 0.02)",
};

const estiloCabeceraFormulario = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const estiloGridFormulario = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "16px",
};

const estiloResumen = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "14px",
  marginBottom: "24px",
};

const estiloTarjeta = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "16px",
  border: "1px solid #3a3440",
  borderRadius: "14px",
  background: "rgba(255, 255, 255, 0.03)",
};

const estiloBloqueIngredientes = {
  marginTop: "22px",
  padding: "18px",
  border: "1px solid #3a3440",
  borderRadius: "14px",
  background: "rgba(255, 255, 255, 0.02)",
};

const estiloAñadirIngrediente = {
  display: "grid",
  gridTemplateColumns: "minmax(280px, 2fr) minmax(150px, 1fr) auto",
  gap: "12px",
  alignItems: "center",
};

const estiloCalculos = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  marginTop: "20px",
};

const estiloTarjetaCalculo = {
  display: "flex",
  flexDirection: "column",
  gap: "7px",
  padding: "15px",
  borderRadius: "13px",
  background: "rgba(131, 78, 160, 0.14)",
  border: "1px solid rgba(189, 143, 214, 0.35)",
};

const estiloFiltros = {
  display: "flex",
  gap: "14px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const estiloTabla = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1400px",
};

const estiloCabecera = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #4b4453",
  whiteSpace: "nowrap",
};

const estiloCelda = {
  padding: "12px",
  borderBottom: "1px solid #2f2a34",
  verticalAlign: "top",
};

const estiloAvisoMargen = {
  display: "inline-block",
  marginTop: "5px",
  padding: "3px 7px",
  borderRadius: "999px",
  background: "#7a2633",
  color: "white",
  fontSize: "12px",
};

const estiloError = {
  marginTop: "16px",
  color: "#ff9b9b",
};

const estiloMensaje = {
  marginTop: "16px",
  color: "#9fe1ae",
};

export default Escandallos;