import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const FORMULARIO_INICIAL = {
  nombre: "",
  familia: "",
  codigo_interno: "",
  unidad: "kg",
  precio_coste: "",
  iva: "10",
  proveedor_habitual: "",
  stock_total: "",
  stock_minimo: "",
  fecha_caducidad: "",
  observaciones: "",
  activo: true,
};

const UNIDADES = [
  "kg",
  "g",
  "l",
  "ml",
  "ud.",
  "caja",
  "paquete",
  "bandeja",
];

function Ingredientes() {
  const [ingredientes, setIngredientes] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [editandoId, setEditandoId] = useState(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroFamilia, setFiltroFamilia] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarIngredientes();
  }, []);

  async function cargarIngredientes() {
    setCargando(true);
    setError("");

    const { data, error: supabaseError } = await supabase
      .from("ingredientes")
      .select("*")
      .order("nombre", { ascending: true });

    if (supabaseError) {
      setError(supabaseError.message);
      setIngredientes([]);
    } else {
      setIngredientes(data ?? []);
    }

    setCargando(false);
  }

  function actualizarCampo(evento) {
    const { name, value, type, checked } = evento.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function limpiarFormulario() {
    setFormulario(FORMULARIO_INICIAL);
    setEditandoId(null);
  }

  function cancelarEdicion() {
    limpiarFormulario();
    setError("");
    setMensaje("");
  }

  function prepararEdicion(ingrediente) {
    setFormulario({
      nombre: ingrediente.nombre ?? "",
      familia: ingrediente.familia ?? "",
      codigo_interno: ingrediente.codigo_interno ?? "",
      unidad: ingrediente.unidad ?? "kg",
      precio_coste: ingrediente.precio_coste ?? "",
      iva: ingrediente.iva ?? "10",
      proveedor_habitual: ingrediente.proveedor_habitual ?? "",
      stock_total: ingrediente.stock_total ?? "",
      stock_minimo: ingrediente.stock_minimo ?? "",
      fecha_caducidad: ingrediente.fecha_caducidad ?? "",
      observaciones: ingrediente.observaciones ?? "",
      activo: ingrediente.activo ?? true,
    });

    setEditandoId(ingrediente.id);
    setError("");
    setMensaje("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarIngrediente(evento) {
    evento.preventDefault();

    setError("");
    setMensaje("");

    if (!formulario.nombre.trim()) {
      setError("El nombre del ingrediente es obligatorio.");
      return;
    }

    if (!formulario.unidad.trim()) {
      setError("La unidad de medida es obligatoria.");
      return;
    }

    const precioCoste = Number(formulario.precio_coste || 0);
    const iva = Number(formulario.iva || 0);
    const stockTotal = Number(formulario.stock_total || 0);
    const stockMinimo = Number(formulario.stock_minimo || 0);

    if (
      [precioCoste, iva, stockTotal, stockMinimo].some(
        (valor) => Number.isNaN(valor) || valor < 0,
      )
    ) {
      setError("Los importes y cantidades deben ser iguales o mayores que cero.");
      return;
    }

    if (iva > 100) {
      setError("El IVA no puede ser superior al 100 %.");
      return;
    }

    setGuardando(true);

    const datos = {
      nombre: formulario.nombre.trim(),
      familia: formulario.familia.trim() || null,
      codigo_interno: formulario.codigo_interno.trim() || null,
      unidad: formulario.unidad.trim(),
      precio_coste: precioCoste,
      iva,
      proveedor_habitual: formulario.proveedor_habitual.trim() || null,
      stock_total: stockTotal,
      stock_minimo: stockMinimo,
      fecha_caducidad: formulario.fecha_caducidad || null,
      observaciones: formulario.observaciones.trim() || null,
      activo: formulario.activo,
      updated_at: new Date().toISOString(),
    };

    let resultado;

    if (editandoId) {
      resultado = await supabase
        .from("ingredientes")
        .update(datos)
        .eq("id", editandoId);
    } else {
      resultado = await supabase.from("ingredientes").insert(datos);
    }

    if (resultado.error) {
      setError(resultado.error.message);
      setGuardando(false);
      return;
    }

    setMensaje(
      editandoId
        ? "Ingrediente actualizado correctamente."
        : "Ingrediente añadido correctamente.",
    );

    limpiarFormulario();
    setGuardando(false);
    await cargarIngredientes();
  }

  async function eliminarIngrediente(ingrediente) {
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar "${ingrediente.nombre}"?`,
    );

    if (!confirmar) return;

    setError("");
    setMensaje("");

    const { error: supabaseError } = await supabase
      .from("ingredientes")
      .delete()
      .eq("id", ingrediente.id);

    if (supabaseError) {
      setError(
        `${supabaseError.message}. Si este ingrediente está usado en un escandallo, desactívalo en lugar de eliminarlo.`,
      );
      return;
    }

    setMensaje("Ingrediente eliminado correctamente.");

    if (editandoId === ingrediente.id) {
      limpiarFormulario();
    }

    await cargarIngredientes();
  }

  const familias = useMemo(() => {
    return [
      ...new Set(
        ingredientes
          .map((ingrediente) => ingrediente.familia)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "es")),
      ),
    ];
  }, [ingredientes]);

  const ingredientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return ingredientes.filter((ingrediente) => {
      const coincideBusqueda =
        !texto ||
        ingrediente.nombre?.toLowerCase().includes(texto) ||
        ingrediente.familia?.toLowerCase().includes(texto) ||
        ingrediente.codigo_interno?.toLowerCase().includes(texto) ||
        ingrediente.proveedor_habitual?.toLowerCase().includes(texto);

      const coincideFamilia =
        filtroFamilia === "todas" ||
        ingrediente.familia === filtroFamilia;

      const stockBajo =
        Number(ingrediente.stock_total || 0) <=
        Number(ingrediente.stock_minimo || 0);

      const caducado = ingrediente.fecha_caducidad
        ? new Date(`${ingrediente.fecha_caducidad}T23:59:59`) < new Date()
        : false;

      const coincideEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "activos" && ingrediente.activo) ||
        (filtroEstado === "inactivos" && !ingrediente.activo) ||
        (filtroEstado === "stock-bajo" && stockBajo) ||
        (filtroEstado === "caducados" && caducado);

      return coincideBusqueda && coincideFamilia && coincideEstado;
    });
  }, [ingredientes, busqueda, filtroFamilia, filtroEstado]);

  const resumen = useMemo(() => {
    return ingredientes.reduce(
      (acumulado, ingrediente) => {
        const stockTotal = Number(ingrediente.stock_total || 0);
        const stockMinimo = Number(ingrediente.stock_minimo || 0);
        const precioCoste = Number(ingrediente.precio_coste || 0);

        acumulado.total += 1;
        acumulado.activos += ingrediente.activo ? 1 : 0;
        acumulado.valorStock += stockTotal * precioCoste;

        if (stockTotal <= stockMinimo) {
          acumulado.stockBajo += 1;
        }

        if (
          ingrediente.fecha_caducidad &&
          new Date(`${ingrediente.fecha_caducidad}T23:59:59`) < new Date()
        ) {
          acumulado.caducados += 1;
        }

        return acumulado;
      },
      {
        total: 0,
        activos: 0,
        stockBajo: 0,
        caducados: 0,
        valorStock: 0,
      },
    );
  }, [ingredientes]);

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Producción y costes</p>
          <h2>Ingredientes</h2>
          <p>
            Gestiona materias primas, precios de coste, stock y caducidades.
          </p>
        </div>

        <span className="contador">{ingredientes.length} ingredientes</span>
      </div>

      <div style={estiloResumen}>
        <TarjetaResumen titulo="Ingredientes" valor={resumen.total} />
        <TarjetaResumen titulo="Activos" valor={resumen.activos} />
        <TarjetaResumen titulo="Stock bajo" valor={resumen.stockBajo} />
        <TarjetaResumen titulo="Caducados" valor={resumen.caducados} />
        <TarjetaResumen
          titulo="Valor del stock"
          valor={formatearEuros(resumen.valorStock)}
        />
      </div>

      <form onSubmit={guardarIngrediente} style={estiloFormulario}>
        <div style={estiloCabeceraFormulario}>
          <div>
            <h3 style={{ margin: 0 }}>
              {editandoId ? "Editar ingrediente" : "Nuevo ingrediente"}
            </h3>
            <p style={{ margin: "6px 0 0", opacity: 0.75 }}>
              Introduce los datos de compra, stock y unidad de medida.
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
              onChange={actualizarCampo}
              placeholder="Ej. Harina de fuerza"
              style={estiloCampo}
            />
          </label>

          <label>
            Familia
            <input
              name="familia"
              value={formulario.familia}
              onChange={actualizarCampo}
              placeholder="Harinas, lácteos, chocolates..."
              style={estiloCampo}
            />
          </label>

          <label>
            Código interno
            <input
              name="codigo_interno"
              value={formulario.codigo_interno}
              onChange={actualizarCampo}
              placeholder="Ej. ING-001"
              style={estiloCampo}
            />
          </label>

          <label>
            Unidad de medida *
            <select
              name="unidad"
              value={formulario.unidad}
              onChange={actualizarCampo}
              style={estiloCampo}
            >
              {UNIDADES.map((unidad) => (
                <option key={unidad} value={unidad}>
                  {unidad}
                </option>
              ))}
            </select>
          </label>

          <label>
            Precio de coste por unidad
            <input
              type="number"
              min="0"
              step="0.0001"
              name="precio_coste"
              value={formulario.precio_coste}
              onChange={actualizarCampo}
              placeholder="0,00"
              style={estiloCampo}
            />
          </label>

          <label>
            IVA (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              name="iva"
              value={formulario.iva}
              onChange={actualizarCampo}
              style={estiloCampo}
            />
          </label>

          <label>
            Proveedor habitual
            <input
              name="proveedor_habitual"
              value={formulario.proveedor_habitual}
              onChange={actualizarCampo}
              placeholder="Nombre del proveedor"
              style={estiloCampo}
            />
          </label>

          <label>
            Stock total
            <input
              type="number"
              min="0"
              step="0.0001"
              name="stock_total"
              value={formulario.stock_total}
              onChange={actualizarCampo}
              style={estiloCampo}
            />
          </label>

          <label>
            Stock mínimo
            <input
              type="number"
              min="0"
              step="0.0001"
              name="stock_minimo"
              value={formulario.stock_minimo}
              onChange={actualizarCampo}
              style={estiloCampo}
            />
          </label>

          <label>
            Fecha de caducidad
            <input
              type="date"
              name="fecha_caducidad"
              value={formulario.fecha_caducidad}
              onChange={actualizarCampo}
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
              onChange={actualizarCampo}
              style={{ width: "22px", height: "22px" }}
            />
            Ingrediente activo
          </label>
        </div>

        <label style={{ display: "block", marginTop: "18px" }}>
          Observaciones
          <textarea
            name="observaciones"
            value={formulario.observaciones}
            onChange={actualizarCampo}
            placeholder="Condiciones de conservación, formato de compra..."
            rows="4"
            style={{
              ...estiloCampo,
              padding: "12px 14px",
              resize: "vertical",
            }}
          />
        </label>

        {error && <p style={estiloError}>Error: {error}</p>}
        {mensaje && <p style={estiloMensaje}>{mensaje}</p>}

        <div style={{ marginTop: "18px" }}>
          <button type="submit" disabled={guardando}>
            {guardando
              ? "Guardando..."
              : editandoId
                ? "Guardar cambios"
                : "Añadir ingrediente"}
          </button>
        </div>
      </form>

      <div style={estiloFiltros}>
        <input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre, familia, código o proveedor..."
          style={{ ...estiloCampo, marginTop: 0, flex: "1 1 330px" }}
        />

        <select
          value={filtroFamilia}
          onChange={(evento) => setFiltroFamilia(evento.target.value)}
          style={{ ...estiloCampo, marginTop: 0, maxWidth: "240px" }}
        >
          <option value="todas">Todas las familias</option>

          {familias.map((familia) => (
            <option key={familia} value={familia}>
              {familia}
            </option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={(evento) => setFiltroEstado(evento.target.value)}
          style={{ ...estiloCampo, marginTop: 0, maxWidth: "220px" }}
        >
          <option value="todos">Todos los estados</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="stock-bajo">Stock bajo</option>
          <option value="caducados">Caducados</option>
        </select>
      </div>

      {cargando ? (
        <p>Cargando ingredientes...</p>
      ) : ingredientesFiltrados.length === 0 ? (
        <p>No hay ingredientes que coincidan con los filtros.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={estiloTabla}>
            <thead>
              <tr>
                <th style={estiloCabecera}>Ingrediente</th>
                <th style={estiloCabecera}>Familia</th>
                <th style={estiloCabecera}>Código</th>
                <th style={estiloCabecera}>Unidad</th>
                <th style={estiloCabecera}>Precio coste</th>
                <th style={estiloCabecera}>IVA</th>
                <th style={estiloCabecera}>Proveedor</th>
                <th style={estiloCabecera}>Stock</th>
                <th style={estiloCabecera}>Mínimo</th>
                <th style={estiloCabecera}>Caducidad</th>
                <th style={estiloCabecera}>Estado</th>
                <th style={estiloCabecera}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {ingredientesFiltrados.map((ingrediente) => {
                const stockTotal = Number(ingrediente.stock_total || 0);
                const stockMinimo = Number(ingrediente.stock_minimo || 0);
                const stockBajo = stockTotal <= stockMinimo;

                const caducado = ingrediente.fecha_caducidad
                  ? new Date(`${ingrediente.fecha_caducidad}T23:59:59`) <
                    new Date()
                  : false;

                return (
                  <tr key={ingrediente.id}>
                    <td style={estiloCelda}>
                      <strong>{ingrediente.nombre}</strong>
                    </td>

                    <td style={estiloCelda}>{ingrediente.familia || "—"}</td>
                    <td style={estiloCelda}>
                      {ingrediente.codigo_interno || "—"}
                    </td>
                    <td style={estiloCelda}>{ingrediente.unidad}</td>

                    <td style={estiloCelda}>
                      {formatearEuros(ingrediente.precio_coste)}
                    </td>

                    <td style={estiloCelda}>
                      {formatearNumero(ingrediente.iva)} %
                    </td>

                    <td style={estiloCelda}>
                      {ingrediente.proveedor_habitual || "—"}
                    </td>

                    <td style={estiloCelda}>
                      <strong>
                        {formatearNumero(stockTotal)} {ingrediente.unidad}
                      </strong>

                      {stockBajo && (
                        <div style={estiloAvisoStock}>Stock bajo</div>
                      )}
                    </td>

                    <td style={estiloCelda}>
                      {formatearNumero(stockMinimo)} {ingrediente.unidad}
                    </td>

                    <td style={estiloCelda}>
                      {ingrediente.fecha_caducidad
                        ? formatearFecha(ingrediente.fecha_caducidad)
                        : "—"}

                      {caducado && (
                        <div style={estiloAvisoCaducidad}>Caducado</div>
                      )}
                    </td>

                    <td style={estiloCelda}>
                      {ingrediente.activo ? "Activo" : "Inactivo"}
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
                          onClick={() => prepararEdicion(ingrediente)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="boton-cancelar"
                          onClick={() => eliminarIngrediente(ingrediente)}
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

function TarjetaResumen({ titulo, valor }) {
  return (
    <div style={estiloTarjeta}>
      <span style={{ opacity: 0.7 }}>{titulo}</span>
      <strong style={{ fontSize: "25px" }}>{valor}</strong>
    </div>
  );
}

function formatearEuros(valor) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(valor || 0));
}

function formatearNumero(valor) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 4,
  }).format(Number(valor || 0));
}

function formatearFecha(fecha) {
  return new Intl.DateTimeFormat("es-ES").format(
    new Date(`${fecha}T12:00:00`),
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

const estiloFiltros = {
  display: "flex",
  gap: "14px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const estiloTabla = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1450px",
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

const estiloAvisoStock = {
  display: "inline-block",
  marginTop: "5px",
  padding: "3px 7px",
  borderRadius: "999px",
  background: "#7a2633",
  color: "white",
  fontSize: "12px",
};

const estiloAvisoCaducidad = {
  display: "inline-block",
  marginTop: "5px",
  padding: "3px 7px",
  borderRadius: "999px",
  background: "#8a4d15",
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

export default Ingredientes;