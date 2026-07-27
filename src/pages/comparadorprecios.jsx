import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

function ComparadorPrecios() {
  const [articulos, setArticulos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidad, setUnidad] = useState("");
  const [tipoPrecio, setTipoPrecio] = useState("sin_iva");
  const [soloActivos, setSoloActivos] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarCatalogo();
  }, []);

  async function cargarCatalogo() {
    setCargando(true);
    setError("");

    const { data, error: supabaseError } = await supabase
      .from("catalogo_proveedores")
      .select(`
        id,
        proveedor_id,
        categoria,
        producto,
        codigo_proveedor,
        cantidad_formato,
        unidad,
        precio_sin_iva,
        iva,
        precio_con_iva,
        precio_unitario,
        fecha_precio,
        observaciones,
        activo,
        proveedores (
          nombre,
          nombre_comercial
        )
      `)
      .order("producto", { ascending: true });

    if (supabaseError) {
      setError(supabaseError.message);
      setArticulos([]);
    } else {
      setArticulos(data ?? []);
    }

    setCargando(false);
  }

  const categorias = useMemo(() => {
    return [...new Set(articulos.map((articulo) => articulo.categoria).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [articulos]);

  const unidades = useMemo(() => {
    return [...new Set(articulos.map((articulo) => normalizarUnidad(articulo.unidad)).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [articulos]);

  const resultados = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    return articulos
      .filter((articulo) => {
        const proveedor = obtenerNombreProveedor(articulo);
        const textoArticulo = normalizarTexto(
          [
            articulo.producto,
            articulo.categoria,
            articulo.codigo_proveedor,
            proveedor,
            articulo.observaciones,
          ]
            .filter(Boolean)
            .join(" "),
        );

        const coincideBusqueda = !texto || textoArticulo.includes(texto);
        const coincideCategoria = !categoria || articulo.categoria === categoria;
        const coincideUnidad =
          !unidad || normalizarUnidad(articulo.unidad) === unidad;
        const coincideEstado = !soloActivos || articulo.activo !== false;

        return (
          coincideBusqueda &&
          coincideCategoria &&
          coincideUnidad &&
          coincideEstado
        );
      })
      .map((articulo) => {
        const comparacion = calcularPrecioComparable(articulo, tipoPrecio);

        return {
          ...articulo,
          proveedor_nombre: obtenerNombreProveedor(articulo),
          precio_comparable: comparacion.precio,
          unidad_comparacion: comparacion.unidad,
          comparable: comparacion.comparable,
        };
      })
      .sort((a, b) => {
        if (a.comparable && !b.comparable) return -1;
        if (!a.comparable && b.comparable) return 1;
        if (a.precio_comparable === null) return 1;
        if (b.precio_comparable === null) return -1;
        return a.precio_comparable - b.precio_comparable;
      });
  }, [articulos, busqueda, categoria, unidad, tipoPrecio, soloActivos]);

  const resultadosComparables = useMemo(
    () =>
      resultados.filter(
        (articulo) =>
          articulo.comparable &&
          articulo.precio_comparable !== null &&
          articulo.precio_comparable > 0,
      ),
    [resultados],
  );

  const mejorPrecio =
    resultadosComparables.length > 0
      ? resultadosComparables[0].precio_comparable
      : null;

  const precioMasAlto =
    resultadosComparables.length > 0
      ? Math.max(
          ...resultadosComparables.map((articulo) => articulo.precio_comparable),
        )
      : null;

  const ahorro =
    mejorPrecio !== null && precioMasAlto !== null
      ? precioMasAlto - mejorPrecio
      : null;

  const proveedoresDistintos = new Set(
    resultados.map((articulo) => articulo.proveedor_id).filter(Boolean),
  ).size;

  function limpiarFiltros() {
    setBusqueda("");
    setCategoria("");
    setUnidad("");
    setTipoPrecio("sin_iva");
    setSoloActivos(true);
  }

  function exportarComparacion() {
    const cabeceras = [
      "Posición",
      "Proveedor",
      "Categoría",
      "Producto",
      "Código proveedor",
      "Formato",
      tipoPrecio === "sin_iva" ? "Precio sin IVA" : "Precio con IVA",
      "IVA %",
      "Precio comparable",
      "Unidad comparación",
      "Fecha precio",
      "Estado",
    ];

    const filas = resultados.map((articulo, indice) => [
      indice + 1,
      articulo.proveedor_nombre,
      articulo.categoria ?? "",
      articulo.producto ?? "",
      articulo.codigo_proveedor ?? "",
      formatearFormato(articulo),
      tipoPrecio === "sin_iva"
        ? articulo.precio_sin_iva ?? ""
        : obtenerPrecioConIva(articulo) ?? "",
      articulo.iva === null || articulo.iva === undefined
        ? ""
        : Number(articulo.iva) * 100,
      articulo.precio_comparable ?? "",
      articulo.unidad_comparacion ?? "",
      articulo.fecha_precio ?? "",
      articulo.activo === false ? "Inactivo" : "Activo",
    ]);

    const csv = [cabeceras, ...filas]
      .map((fila) => fila.map(escaparCSV).join(";"))
      .join("\n");

    const blob = new Blob(["\ufeff", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `comparador_precios_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  return (
    <section className="panel comparador-page">
      <div className="comparador-cabecera">
        <div>
          <p className="etiqueta-modulo">COMPRAS</p>
          <h1>💶 Comparador de precios</h1>
          <p className="texto-secundario">
            Busca un producto y compara automáticamente el precio normalizado
            por kg, litro o unidad.
          </p>
        </div>

        <button
          type="button"
          className="boton-secundario"
          onClick={exportarComparacion}
          disabled={resultados.length === 0}
        >
          📤 Exportar Excel
        </button>
      </div>

      {error && <div className="aviso-error">{error}</div>}

      <div className="comparador-buscador-principal">
        <label>
          Buscar producto
          <input
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Ejemplo: mantequilla, nata, chocolate, harina..."
            autoFocus
          />
        </label>
      </div>

      <div className="comparador-filtros">
        <label>
          Categoría
          <select
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </label>

        <label>
          Unidad
          <select
            value={unidad}
            onChange={(event) => setUnidad(event.target.value)}
          >
            <option value="">Todas las unidades</option>
            {unidades.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </label>

        <label>
          Comparar usando
          <select
            value={tipoPrecio}
            onChange={(event) => setTipoPrecio(event.target.value)}
          >
            <option value="sin_iva">Precio sin IVA</option>
            <option value="con_iva">Precio con IVA</option>
          </select>
        </label>

        <label className="comparador-check">
          <input
            type="checkbox"
            checked={soloActivos}
            onChange={(event) => setSoloActivos(event.target.checked)}
          />
          Solo artículos activos
        </label>

        <button
          type="button"
          className="boton-secundario"
          onClick={limpiarFiltros}
        >
          Limpiar filtros
        </button>
      </div>

      <div className="comparador-resumen">
        <article>
          <span>Resultados</span>
          <strong>{resultados.length}</strong>
        </article>

        <article>
          <span>Proveedores</span>
          <strong>{proveedoresDistintos}</strong>
        </article>

        <article>
          <span>Mejor precio</span>
          <strong>
            {mejorPrecio === null
              ? "—"
              : `${formatearMoneda(mejorPrecio, 4)} / ${
                  resultadosComparables[0]?.unidad_comparacion ?? "ud"
                }`}
          </strong>
        </article>

        <article>
          <span>Ahorro posible</span>
          <strong>
            {ahorro === null ? "—" : formatearMoneda(ahorro, 4)}
          </strong>
        </article>
      </div>

      <div className="comparador-aviso">
        El sistema convierte gramos a kg y mililitros a litros. Los formatos sin
        cantidad o con unidades no equivalentes aparecen como “No comparable”.
      </div>

      <div className="tabla-responsive">
        {cargando ? (
          <p className="estado-carga">Cargando precios...</p>
        ) : resultados.length === 0 ? (
          <p className="estado-carga">
            {busqueda || categoria || unidad
              ? "No hay artículos que coincidan con la búsqueda."
              : "Escribe un producto para empezar a comparar."}
          </p>
        ) : (
          <table className="tabla-comparador">
            <thead>
              <tr>
                <th>#</th>
                <th>Proveedor</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Formato</th>
                <th>Precio envase</th>
                <th>Precio comparable</th>
                <th>Diferencia</th>
                <th>Fecha</th>
              </tr>
            </thead>

            <tbody>
              {resultados.map((articulo, indice) => {
                const esMejor =
                  articulo.comparable &&
                  mejorPrecio !== null &&
                  articulo.precio_comparable === mejorPrecio;

                const diferencia =
                  articulo.comparable && mejorPrecio !== null
                    ? articulo.precio_comparable - mejorPrecio
                    : null;

                const porcentaje =
                  diferencia !== null && mejorPrecio > 0
                    ? (diferencia / mejorPrecio) * 100
                    : null;

                return (
                  <tr
                    key={articulo.id}
                    className={esMejor ? "comparador-mejor-fila" : ""}
                  >
                    <td>
                      <span
                        className={
                          esMejor
                            ? "comparador-posicion mejor"
                            : "comparador-posicion"
                        }
                      >
                        {esMejor ? "🏆" : indice + 1}
                      </span>
                    </td>

                    <td className="comparador-proveedor">
                      {articulo.proveedor_nombre}
                    </td>

                    <td>
                      <strong>{articulo.producto}</strong>
                      {articulo.codigo_proveedor && (
                        <small>Cód. {articulo.codigo_proveedor}</small>
                      )}
                    </td>

                    <td>
                      <span className="catalogo-categoria">
                        {articulo.categoria || "—"}
                      </span>
                    </td>

                    <td>{formatearFormato(articulo)}</td>

                    <td>
                      {formatearMoneda(
                        tipoPrecio === "sin_iva"
                          ? articulo.precio_sin_iva
                          : obtenerPrecioConIva(articulo),
                      )}
                      <small>
                        {tipoPrecio === "sin_iva" ? "sin IVA" : "con IVA"}
                      </small>
                    </td>

                    <td>
                      {articulo.comparable ? (
                        <strong className={esMejor ? "precio-mejor" : ""}>
                          {formatearMoneda(articulo.precio_comparable, 4)} /{" "}
                          {articulo.unidad_comparacion}
                        </strong>
                      ) : (
                        <span className="no-comparable">No comparable</span>
                      )}
                    </td>

                    <td>
                      {esMejor ? (
                        <span className="comparador-etiqueta-mejor">
                          Mejor precio
                        </span>
                      ) : diferencia !== null ? (
                        <div className="comparador-diferencia">
                          <span>+{formatearMoneda(diferencia, 4)}</span>
                          <small>
                            {porcentaje?.toLocaleString("es-ES", {
                              maximumFractionDigits: 1,
                            })}
                            % más
                          </small>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td>{formatearFecha(articulo.fecha_precio)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function obtenerNombreProveedor(articulo) {
  return (
    articulo.proveedores?.nombre ??
    articulo.proveedores?.nombre_comercial ??
    "Sin proveedor"
  );
}

function calcularPrecioComparable(articulo, tipoPrecio) {
  const cantidad = numeroONull(articulo.cantidad_formato);
  const unidad = normalizarUnidad(articulo.unidad);
  const precio =
    tipoPrecio === "sin_iva"
      ? numeroONull(articulo.precio_sin_iva)
      : obtenerPrecioConIva(articulo);

  if (precio === null || precio <= 0 || cantidad === null || cantidad <= 0) {
    return { precio: null, unidad: null, comparable: false };
  }

  if (unidad === "kg") {
    return {
      precio: precio / cantidad,
      unidad: "kg",
      comparable: true,
    };
  }

  if (unidad === "g") {
    return {
      precio: precio / (cantidad / 1000),
      unidad: "kg",
      comparable: true,
    };
  }

  if (unidad === "l") {
    return {
      precio: precio / cantidad,
      unidad: "l",
      comparable: true,
    };
  }

  if (unidad === "ml") {
    return {
      precio: precio / (cantidad / 1000),
      unidad: "l",
      comparable: true,
    };
  }

  if (["ud", "unidad", "unidades"].includes(unidad)) {
    return {
      precio: precio / cantidad,
      unidad: "ud",
      comparable: true,
    };
  }

  return { precio: null, unidad: null, comparable: false };
}

function obtenerPrecioConIva(articulo) {
  const precioConIva = numeroONull(articulo.precio_con_iva);
  if (precioConIva !== null) return precioConIva;

  const precioSinIva = numeroONull(articulo.precio_sin_iva);
  const iva = numeroONull(articulo.iva);

  if (precioSinIva === null) return null;
  return precioSinIva * (1 + (iva ?? 0));
}

function normalizarUnidad(valor) {
  const unidad = normalizarTexto(valor).replaceAll(".", "");

  const equivalencias = {
    kilo: "kg",
    kilos: "kg",
    kilogramo: "kg",
    kilogramos: "kg",
    gramo: "g",
    gramos: "g",
    litro: "l",
    litros: "l",
    lt: "l",
    mililitro: "ml",
    mililitros: "ml",
    unidad: "ud",
    unidades: "ud",
    uds: "ud",
    u: "ud",
  };

  return equivalencias[unidad] ?? unidad;
}

function normalizarTexto(valor) {
  return String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function numeroONull(valor) {
  if (valor === "" || valor === null || valor === undefined) return null;
  const numero = Number(String(valor).replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

function formatearMoneda(valor, decimales = 2) {
  if (valor === null || valor === undefined || valor === "") return "—";

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(Number(valor));
}

function formatearFormato(articulo) {
  if (!articulo.cantidad_formato && !articulo.unidad) return "—";

  return `${articulo.cantidad_formato ?? ""} ${
    articulo.unidad ?? ""
  }`.trim();
}

function formatearFecha(valor) {
  if (!valor) return "—";
  const [anyo, mes, dia] = String(valor).split("-");
  return anyo && mes && dia ? `${dia}/${mes}/${anyo}` : valor;
}

function escaparCSV(valor) {
  const texto = String(valor ?? "").replaceAll('"', '""');
  return `"${texto}"`;
}

export default ComparadorPrecios;