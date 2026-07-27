import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const FORMULARIO_INICIAL = {
  nombre: "",
  categoria: "",
  tipo: "reutilizable",
  referencia: "",
  stock_total: "",
  stock_reservado: "",
  stock_minimo: "",
  precio_coste: "",
  precio_alquiler: "",
  observaciones: "",
  activo: true,
};

function Menaje() {
  const [articulos, setArticulos] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarMenaje();
  }, []);

  async function cargarMenaje() {
    setCargando(true);
    setError("");

    const { data, error: supabaseError } = await supabase
      .from("menaje")
      .select("*")
      .order("nombre", { ascending: true });

    if (supabaseError) {
      setError(supabaseError.message);
      setArticulos([]);
    } else {
      setArticulos(data ?? []);
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

  function prepararEdicion(articulo) {
    setEditandoId(articulo.id);
    setFormulario({
      nombre: articulo.nombre ?? "",
      categoria: articulo.categoria ?? "",
      tipo: articulo.tipo ?? "reutilizable",
      referencia: articulo.referencia ?? "",
      stock_total: articulo.stock_total ?? "",
      stock_reservado: articulo.stock_reservado ?? "",
      stock_minimo: articulo.stock_minimo ?? "",
      precio_coste: articulo.precio_coste ?? "",
      precio_alquiler: articulo.precio_alquiler ?? "",
      observaciones: articulo.observaciones ?? "",
      activo: articulo.activo ?? true,
    });

    setMensaje("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setFormulario(FORMULARIO_INICIAL);
    setError("");
    setMensaje("");
  }

  async function guardarArticulo(evento) {
    evento.preventDefault();

    if (!formulario.nombre.trim()) {
      setError("El nombre del artículo es obligatorio.");
      return;
    }

    const stockTotal = Number(formulario.stock_total || 0);
    const stockReservado = Number(formulario.stock_reservado || 0);
    const stockMinimo = Number(formulario.stock_minimo || 0);
    const precioCoste = Number(formulario.precio_coste || 0);
    const precioAlquiler = Number(formulario.precio_alquiler || 0);

    if (
      [stockTotal, stockReservado, stockMinimo, precioCoste, precioAlquiler].some(
        (valor) => Number.isNaN(valor) || valor < 0,
      )
    ) {
      setError("Los valores numéricos deben ser iguales o mayores que cero.");
      return;
    }

    if (stockReservado > stockTotal) {
      setError("El stock reservado no puede ser mayor que el stock total.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const datos = {
      nombre: formulario.nombre.trim(),
      categoria: formulario.categoria.trim() || null,
      tipo: formulario.tipo,
      referencia: formulario.referencia.trim() || null,
      stock_total: stockTotal,
      stock_reservado: stockReservado,
      stock_minimo: stockMinimo,
      precio_coste: precioCoste,
      precio_alquiler: precioAlquiler,
      observaciones: formulario.observaciones.trim() || null,
      activo: formulario.activo,
      updated_at: new Date().toISOString(),
    };

    let resultado;

    if (editandoId) {
      resultado = await supabase
        .from("menaje")
        .update(datos)
        .eq("id", editandoId);
    } else {
      resultado = await supabase.from("menaje").insert(datos);
    }

    if (resultado.error) {
      setError(resultado.error.message);
      setGuardando(false);
      return;
    }

    setMensaje(
      editandoId
        ? "Artículo actualizado correctamente."
        : "Artículo creado correctamente.",
    );

    setFormulario(FORMULARIO_INICIAL);
    setEditandoId(null);
    setGuardando(false);
    await cargarMenaje();
  }

  async function eliminarArticulo(articulo) {
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar "${articulo.nombre}"?`,
    );

    if (!confirmar) {
      return;
    }

    setError("");
    setMensaje("");

    const { error: supabaseError } = await supabase
      .from("menaje")
      .delete()
      .eq("id", articulo.id);

    if (supabaseError) {
      setError(supabaseError.message);
      return;
    }

    setMensaje("Artículo eliminado correctamente.");

    if (editandoId === articulo.id) {
      cancelarEdicion();
    }

    await cargarMenaje();
  }

  const articulosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return articulos.filter((articulo) => {
      const coincideTipo =
        filtroTipo === "todos" || articulo.tipo === filtroTipo;

      const coincideBusqueda =
        !texto ||
        articulo.nombre?.toLowerCase().includes(texto) ||
        articulo.categoria?.toLowerCase().includes(texto) ||
        articulo.referencia?.toLowerCase().includes(texto);

      return coincideTipo && coincideBusqueda;
    });
  }, [articulos, busqueda, filtroTipo]);

  const resumen = useMemo(() => {
    return articulos.reduce(
      (acumulado, articulo) => {
        const stockTotal = Number(articulo.stock_total || 0);
        const stockReservado = Number(articulo.stock_reservado || 0);
        const disponible = stockTotal - stockReservado;

        acumulado.totalArticulos += 1;
        acumulado.stockTotal += stockTotal;
        acumulado.stockReservado += stockReservado;
        acumulado.stockDisponible += disponible;

        if (disponible <= Number(articulo.stock_minimo || 0)) {
          acumulado.stockBajo += 1;
        }

        return acumulado;
      },
      {
        totalArticulos: 0,
        stockTotal: 0,
        stockReservado: 0,
        stockDisponible: 0,
        stockBajo: 0,
      },
    );
  }, [articulos]);

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Inventario</p>
          <h2>Menaje</h2>
          <p>
            Controla el menaje disponible, reservado y pendiente de reposición.
          </p>
        </div>

        <span className="contador">{articulos.length} artículos</span>
      </div>

      <div style={estiloResumen}>
        <TarjetaResumen titulo="Artículos" valor={resumen.totalArticulos} />
        <TarjetaResumen titulo="Stock total" valor={resumen.stockTotal} />
        <TarjetaResumen
          titulo="Stock reservado"
          valor={resumen.stockReservado}
        />
        <TarjetaResumen
          titulo="Stock disponible"
          valor={resumen.stockDisponible}
        />
        <TarjetaResumen titulo="Stock bajo" valor={resumen.stockBajo} />
      </div>

      <form onSubmit={guardarArticulo} style={estiloFormulario}>
        <div style={estiloCabeceraFormulario}>
          <div>
            <h3 style={{ margin: 0 }}>
              {editandoId ? "Editar artículo" : "Nuevo artículo"}
            </h3>
            <p style={{ margin: "6px 0 0", opacity: 0.75 }}>
              Añade los datos básicos y el stock disponible.
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
              placeholder="Ej. Copa de vino"
              style={estiloCampo}
            />
          </label>

          <label>
            Categoría
            <input
              name="categoria"
              value={formulario.categoria}
              onChange={actualizarCampo}
              placeholder="Ej. Copas, platos, cubiertos..."
              style={estiloCampo}
            />
          </label>

          <label>
            Tipo
            <select
              name="tipo"
              value={formulario.tipo}
              onChange={actualizarCampo}
              style={estiloCampo}
            >
              <option value="reutilizable">Reutilizable</option>
              <option value="consumible">Consumible</option>
              <option value="alquiler">Alquiler</option>
            </select>
          </label>

          <label>
            Referencia
            <input
              name="referencia"
              value={formulario.referencia}
              onChange={actualizarCampo}
              placeholder="Código interno"
              style={estiloCampo}
            />
          </label>

          <label>
            Stock total
            <input
              type="number"
              min="0"
              step="1"
              name="stock_total"
              value={formulario.stock_total}
              onChange={actualizarCampo}
              style={estiloCampo}
            />
          </label>

          <label>
            Stock reservado
            <input
              type="number"
              min="0"
              step="1"
              name="stock_reservado"
              value={formulario.stock_reservado}
              onChange={actualizarCampo}
              style={estiloCampo}
            />
          </label>

          <label>
            Stock mínimo
            <input
              type="number"
              min="0"
              step="1"
              name="stock_minimo"
              value={formulario.stock_minimo}
              onChange={actualizarCampo}
              style={estiloCampo}
            />
          </label>

          <label>
            Precio de coste
            <input
              type="number"
              min="0"
              step="0.01"
              name="precio_coste"
              value={formulario.precio_coste}
              onChange={actualizarCampo}
              style={estiloCampo}
            />
          </label>

          <label>
            Precio de alquiler
            <input
              type="number"
              min="0"
              step="0.01"
              name="precio_alquiler"
              value={formulario.precio_alquiler}
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
            Artículo activo
          </label>
        </div>

        <label style={{ display: "block", marginTop: "18px" }}>
          Observaciones
          <textarea
            name="observaciones"
            value={formulario.observaciones}
            onChange={actualizarCampo}
            placeholder="Estado, ubicación, indicaciones de uso..."
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
                : "Añadir artículo"}
          </button>
        </div>
      </form>

      <div style={estiloFiltros}>
        <input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre, categoría o referencia..."
          style={{ ...estiloCampo, marginTop: 0, flex: "1 1 280px" }}
        />

        <select
          value={filtroTipo}
          onChange={(evento) => setFiltroTipo(evento.target.value)}
          style={{ ...estiloCampo, marginTop: 0, maxWidth: "220px" }}
        >
          <option value="todos">Todos los tipos</option>
          <option value="reutilizable">Reutilizable</option>
          <option value="consumible">Consumible</option>
          <option value="alquiler">Alquiler</option>
        </select>
      </div>

      {cargando ? (
        <p>Cargando menaje...</p>
      ) : articulosFiltrados.length === 0 ? (
        <p>No hay artículos que coincidan con la búsqueda.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={estiloTabla}>
            <thead>
              <tr>
                <th style={estiloCabecera}>Artículo</th>
                <th style={estiloCabecera}>Tipo</th>
                <th style={estiloCabecera}>Categoría</th>
                <th style={estiloCabecera}>Total</th>
                <th style={estiloCabecera}>Reservado</th>
                <th style={estiloCabecera}>Disponible</th>
                <th style={estiloCabecera}>Mínimo</th>
                <th style={estiloCabecera}>Coste</th>
                <th style={estiloCabecera}>Alquiler</th>
                <th style={estiloCabecera}>Estado</th>
                <th style={estiloCabecera}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {articulosFiltrados.map((articulo) => {
                const disponible =
                  Number(articulo.stock_total || 0) -
                  Number(articulo.stock_reservado || 0);

                const stockBajo =
                  disponible <= Number(articulo.stock_minimo || 0);

                return (
                  <tr key={articulo.id}>
                    <td style={estiloCelda}>
                      <strong>{articulo.nombre}</strong>
                      {articulo.referencia && (
                        <div style={{ opacity: 0.65, marginTop: "4px" }}>
                          Ref. {articulo.referencia}
                        </div>
                      )}
                    </td>

                    <td style={estiloCelda}>
                      {formatearTipo(articulo.tipo)}
                    </td>

                    <td style={estiloCelda}>
                      {articulo.categoria || "—"}
                    </td>

                    <td style={estiloCelda}>{articulo.stock_total}</td>
                    <td style={estiloCelda}>{articulo.stock_reservado}</td>

                    <td style={estiloCelda}>
                      <strong>{disponible}</strong>
                      {stockBajo && (
                        <div style={estiloAvisoStock}>Stock bajo</div>
                      )}
                    </td>

                    <td style={estiloCelda}>{articulo.stock_minimo}</td>

                    <td style={estiloCelda}>
                      {formatearEuros(articulo.precio_coste)}
                    </td>

                    <td style={estiloCelda}>
                      {formatearEuros(articulo.precio_alquiler)}
                    </td>

                    <td style={estiloCelda}>
                      {articulo.activo ? "Activo" : "Inactivo"}
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
                          onClick={() => prepararEdicion(articulo)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="boton-cancelar"
                          onClick={() => eliminarArticulo(articulo)}
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
      <strong style={{ fontSize: "26px" }}>{valor}</strong>
    </div>
  );
}

function formatearEuros(valor) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(valor || 0));
}

function formatearTipo(tipo) {
  const tipos = {
    reutilizable: "Reutilizable",
    consumible: "Consumible",
    alquiler: "Alquiler",
  };

  return tipos[tipo] || tipo || "—";
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
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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
  minWidth: "1150px",
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

const estiloError = {
  marginTop: "16px",
  color: "#ff9b9b",
};

const estiloMensaje = {
  marginTop: "16px",
  color: "#9fe1ae",
};

export default Menaje;