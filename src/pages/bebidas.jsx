import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const FORMULARIO_INICIAL = {
  nombre: "",
  marca: "",
  categoria: "",
  formato: "",
  unidades_por_caja: "1",
  stock_total: "",
  stock_reservado: "",
  stock_minimo: "",
  precio_coste: "",
  precio_venta: "",
  iva: "21",
  observaciones: "",
  activo: true,
};

function Bebidas() {
  const [bebidas, setBebidas] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarBebidas();
  }, []);

  async function cargarBebidas() {
    setCargando(true);
    setError("");

    const { data, error: supabaseError } = await supabase
      .from("bebidas")
      .select("*")
      .order("nombre", { ascending: true });

    if (supabaseError) {
      setError(supabaseError.message);
      setBebidas([]);
    } else {
      setBebidas(data ?? []);
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

  function prepararEdicion(bebida) {
    setEditandoId(bebida.id);

    setFormulario({
      nombre: bebida.nombre ?? "",
      marca: bebida.marca ?? "",
      categoria: bebida.categoria ?? "",
      formato: bebida.formato ?? "",
      unidades_por_caja: bebida.unidades_por_caja ?? "1",
      stock_total: bebida.stock_total ?? "",
      stock_reservado: bebida.stock_reservado ?? "",
      stock_minimo: bebida.stock_minimo ?? "",
      precio_coste: bebida.precio_coste ?? "",
      precio_venta: bebida.precio_venta ?? "",
      iva: bebida.iva ?? "21",
      observaciones: bebida.observaciones ?? "",
      activo: bebida.activo ?? true,
    });

    setError("");
    setMensaje("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setFormulario(FORMULARIO_INICIAL);
    setError("");
    setMensaje("");
  }

  async function guardarBebida(evento) {
    evento.preventDefault();

    if (!formulario.nombre.trim()) {
      setError("El nombre de la bebida es obligatorio.");
      return;
    }

    const unidadesPorCaja = Number(formulario.unidades_por_caja || 1);
    const stockTotal = Number(formulario.stock_total || 0);
    const stockReservado = Number(formulario.stock_reservado || 0);
    const stockMinimo = Number(formulario.stock_minimo || 0);
    const precioCoste = Number(formulario.precio_coste || 0);
    const precioVenta = Number(formulario.precio_venta || 0);
    const iva = Number(formulario.iva || 0);

    if (!Number.isInteger(unidadesPorCaja) || unidadesPorCaja <= 0) {
      setError("Las unidades por caja deben ser un número entero mayor que cero.");
      return;
    }

    if (
      [stockTotal, stockReservado, stockMinimo, precioCoste, precioVenta, iva].some(
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

    if (iva > 100) {
      setError("El IVA no puede ser superior al 100 %.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const datos = {
      nombre: formulario.nombre.trim(),
      marca: formulario.marca.trim() || null,
      categoria: formulario.categoria.trim() || null,
      formato: formulario.formato.trim() || null,
      unidades_por_caja: unidadesPorCaja,
      stock_total: stockTotal,
      stock_reservado: stockReservado,
      stock_minimo: stockMinimo,
      precio_coste: precioCoste,
      precio_venta: precioVenta,
      iva,
      observaciones: formulario.observaciones.trim() || null,
      activo: formulario.activo,
      updated_at: new Date().toISOString(),
    };

    let resultado;

    if (editandoId) {
      resultado = await supabase
        .from("bebidas")
        .update(datos)
        .eq("id", editandoId);
    } else {
      resultado = await supabase.from("bebidas").insert(datos);
    }

    if (resultado.error) {
      setError(resultado.error.message);
      setGuardando(false);
      return;
    }

    setMensaje(
      editandoId
        ? "Bebida actualizada correctamente."
        : "Bebida añadida correctamente.",
    );

    setFormulario(FORMULARIO_INICIAL);
    setEditandoId(null);
    setGuardando(false);

    await cargarBebidas();
  }

  async function eliminarBebida(bebida) {
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar "${bebida.nombre}"?`,
    );

    if (!confirmar) {
      return;
    }

    setError("");
    setMensaje("");

    const { error: supabaseError } = await supabase
      .from("bebidas")
      .delete()
      .eq("id", bebida.id);

    if (supabaseError) {
      setError(supabaseError.message);
      return;
    }

    setMensaje("Bebida eliminada correctamente.");

    if (editandoId === bebida.id) {
      cancelarEdicion();
    }

    await cargarBebidas();
  }

  const categorias = useMemo(() => {
    return [
      ...new Set(
        bebidas
          .map((bebida) => bebida.categoria)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "es")),
      ),
    ];
  }, [bebidas]);

  const bebidasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return bebidas.filter((bebida) => {
      const coincideCategoria =
        filtroCategoria === "todas" || bebida.categoria === filtroCategoria;

      const coincideBusqueda =
        !texto ||
        bebida.nombre?.toLowerCase().includes(texto) ||
        bebida.marca?.toLowerCase().includes(texto) ||
        bebida.categoria?.toLowerCase().includes(texto) ||
        bebida.formato?.toLowerCase().includes(texto);

      return coincideCategoria && coincideBusqueda;
    });
  }, [bebidas, busqueda, filtroCategoria]);

  const resumen = useMemo(() => {
    return bebidas.reduce(
      (acumulado, bebida) => {
        const stockTotal = Number(bebida.stock_total || 0);
        const stockReservado = Number(bebida.stock_reservado || 0);
        const stockDisponible = stockTotal - stockReservado;

        acumulado.totalBebidas += 1;
        acumulado.stockTotal += stockTotal;
        acumulado.stockReservado += stockReservado;
        acumulado.stockDisponible += stockDisponible;

        if (stockDisponible <= Number(bebida.stock_minimo || 0)) {
          acumulado.stockBajo += 1;
        }

        return acumulado;
      },
      {
        totalBebidas: 0,
        stockTotal: 0,
        stockReservado: 0,
        stockDisponible: 0,
        stockBajo: 0,
      },
    );
  }, [bebidas]);

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Inventario</p>
          <h2>Bebidas</h2>
          <p>
            Controla el stock disponible, reservado y pendiente de reposición.
          </p>
        </div>

        <span className="contador">{bebidas.length} bebidas</span>
      </div>

      <div style={estiloResumen}>
        <TarjetaResumen titulo="Bebidas" valor={resumen.totalBebidas} />
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

      <form onSubmit={guardarBebida} style={estiloFormulario}>
        <div style={estiloCabeceraFormulario}>
          <div>
            <h3 style={{ margin: 0 }}>
              {editandoId ? "Editar bebida" : "Nueva bebida"}
            </h3>
            <p style={{ margin: "6px 0 0", opacity: 0.75 }}>
              Añade la información comercial y el stock.
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
              placeholder="Ej. Agua mineral"
              style={estiloCampo}
            />
          </label>

          <label>
            Marca
            <input
              name="marca"
              value={formulario.marca}
              onChange={actualizarCampo}
              placeholder="Ej. Font Vella"
              style={estiloCampo}
            />
          </label>

          <label>
            Categoría
            <input
              name="categoria"
              value={formulario.categoria}
              onChange={actualizarCampo}
              placeholder="Agua, refresco, cava..."
              style={estiloCampo}
            />
          </label>

          <label>
            Formato
            <input
              name="formato"
              value={formulario.formato}
              onChange={actualizarCampo}
              placeholder="Ej. Botella 50 cl"
              style={estiloCampo}
            />
          </label>

          <label>
            Unidades por caja
            <input
              type="number"
              min="1"
              step="1"
              name="unidades_por_caja"
              value={formulario.unidades_por_caja}
              onChange={actualizarCampo}
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
            Precio de venta
            <input
              type="number"
              min="0"
              step="0.01"
              name="precio_venta"
              value={formulario.precio_venta}
              onChange={actualizarCampo}
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
            Bebida activa
          </label>
        </div>

        <label style={{ display: "block", marginTop: "18px" }}>
          Observaciones
          <textarea
            name="observaciones"
            value={formulario.observaciones}
            onChange={actualizarCampo}
            placeholder="Ubicación, instrucciones, caducidad..."
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
                : "Añadir bebida"}
          </button>
        </div>
      </form>

      <div style={estiloFiltros}>
        <input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre, marca, categoría o formato..."
          style={{ ...estiloCampo, marginTop: 0, flex: "1 1 320px" }}
        />

        <select
          value={filtroCategoria}
          onChange={(evento) => setFiltroCategoria(evento.target.value)}
          style={{ ...estiloCampo, marginTop: 0, maxWidth: "240px" }}
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
        <p>Cargando bebidas...</p>
      ) : bebidasFiltradas.length === 0 ? (
        <p>No hay bebidas que coincidan con la búsqueda.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={estiloTabla}>
            <thead>
              <tr>
                <th style={estiloCabecera}>Bebida</th>
                <th style={estiloCabecera}>Categoría</th>
                <th style={estiloCabecera}>Formato</th>
                <th style={estiloCabecera}>Uds./caja</th>
                <th style={estiloCabecera}>Total</th>
                <th style={estiloCabecera}>Reservado</th>
                <th style={estiloCabecera}>Disponible</th>
                <th style={estiloCabecera}>Mínimo</th>
                <th style={estiloCabecera}>Coste</th>
                <th style={estiloCabecera}>Venta</th>
                <th style={estiloCabecera}>IVA</th>
                <th style={estiloCabecera}>Estado</th>
                <th style={estiloCabecera}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {bebidasFiltradas.map((bebida) => {
                const disponible =
                  Number(bebida.stock_total || 0) -
                  Number(bebida.stock_reservado || 0);

                const stockBajo =
                  disponible <= Number(bebida.stock_minimo || 0);

                const cajasDisponibles =
                  Number(bebida.unidades_por_caja || 1) > 0
                    ? disponible / Number(bebida.unidades_por_caja || 1)
                    : 0;

                return (
                  <tr key={bebida.id}>
                    <td style={estiloCelda}>
                      <strong>{bebida.nombre}</strong>

                      {bebida.marca && (
                        <div style={{ opacity: 0.65, marginTop: "4px" }}>
                          {bebida.marca}
                        </div>
                      )}
                    </td>

                    <td style={estiloCelda}>{bebida.categoria || "—"}</td>
                    <td style={estiloCelda}>{bebida.formato || "—"}</td>
                    <td style={estiloCelda}>{bebida.unidades_por_caja}</td>
                    <td style={estiloCelda}>{bebida.stock_total}</td>
                    <td style={estiloCelda}>{bebida.stock_reservado}</td>

                    <td style={estiloCelda}>
                      <strong>{disponible}</strong>

                      <div style={{ opacity: 0.65, marginTop: "4px" }}>
                        {formatearNumero(cajasDisponibles)} cajas
                      </div>

                      {stockBajo && (
                        <div style={estiloAvisoStock}>Stock bajo</div>
                      )}
                    </td>

                    <td style={estiloCelda}>{bebida.stock_minimo}</td>

                    <td style={estiloCelda}>
                      {formatearEuros(bebida.precio_coste)}
                    </td>

                    <td style={estiloCelda}>
                      {formatearEuros(bebida.precio_venta)}
                    </td>

                    <td style={estiloCelda}>
                      {formatearNumero(bebida.iva)} %
                    </td>

                    <td style={estiloCelda}>
                      {bebida.activo ? "Activa" : "Inactiva"}
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
                          onClick={() => prepararEdicion(bebida)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="boton-cancelar"
                          onClick={() => eliminarBebida(bebida)}
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

export default Bebidas;