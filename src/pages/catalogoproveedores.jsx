import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const ARTICULO_VACIO = {
  proveedor_id: "",
  categoria: "",
  producto: "",
  codigo_proveedor: "",
  cantidad_formato: "",
  unidad: "",
  precio_sin_iva: "",
  iva: "",
  precio_con_iva: "",
  precio_unitario: "",
  observaciones: "",
  activo: true,
};

function CatalogoProveedores() {
  const [articulos, setArticulos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [formulario, setFormulario] = useState(ARTICULO_VACIO);
  const [editando, setEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarDatos() {
    setCargando(true);
    setError("");

    const [respuestaCatalogo, respuestaProveedores] = await Promise.all([
      supabase
        .from("catalogo_proveedores")
        .select("*, proveedores(nombre, nombre_comercial)")
        .order("producto", { ascending: true }),
      supabase
        .from("proveedores")
        .select("id, nombre, nombre_comercial, activo")
        .order("nombre", { ascending: true }),
    ]);

    if (respuestaCatalogo.error) {
      setError(respuestaCatalogo.error.message);
      setArticulos([]);
    } else {
      setArticulos(respuestaCatalogo.data ?? []);
    }

    if (respuestaProveedores.error) {
      setError((anterior) => anterior || respuestaProveedores.error.message);
      setProveedores([]);
    } else {
      setProveedores(respuestaProveedores.data ?? []);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const categorias = useMemo(
    () =>
      [...new Set(articulos.map((articulo) => articulo.categoria).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "es")),
    [articulos],
  );

  const articulosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return articulos.filter((articulo) => {
      const nombreProveedor = obtenerNombreProveedor(articulo);
      const coincideTexto =
        !texto ||
        [
          articulo.producto,
          articulo.categoria,
          articulo.codigo_proveedor,
          nombreProveedor,
          articulo.observaciones,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(texto);

      const coincideProveedor =
        !filtroProveedor || articulo.proveedor_id === filtroProveedor;
      const coincideCategoria =
        !filtroCategoria || articulo.categoria === filtroCategoria;

      return coincideTexto && coincideProveedor && coincideCategoria;
    });
  }, [articulos, busqueda, filtroProveedor, filtroCategoria]);

  function cambiarCampo(event) {
    const { name, value, type, checked } = event.target;

    setFormulario((anterior) => {
      const siguiente = {
        ...anterior,
        [name]: type === "checkbox" ? checked : value,
      };

      if (["precio_sin_iva", "iva", "cantidad_formato"].includes(name)) {
        const precio = numeroSeguro(
          name === "precio_sin_iva" ? value : siguiente.precio_sin_iva,
        );
        const iva = numeroSeguro(name === "iva" ? value : siguiente.iva);
        const cantidad = numeroSeguro(
          name === "cantidad_formato" ? value : siguiente.cantidad_formato,
        );
        const total = precio > 0 ? precio * (1 + iva / 100) : 0;

        siguiente.precio_con_iva = total ? total.toFixed(4) : "";
        siguiente.precio_unitario =
          total && cantidad > 0 ? (total / cantidad).toFixed(6) : "";
      }

      return siguiente;
    });
  }

  function nuevoArticulo() {
    setFormulario(ARTICULO_VACIO);
    setEditando(null);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editarArticulo(articulo) {
    setEditando(articulo);
    setFormulario({
      proveedor_id: articulo.proveedor_id ?? "",
      categoria: articulo.categoria ?? "",
      producto: articulo.producto ?? "",
      codigo_proveedor: articulo.codigo_proveedor ?? "",
      cantidad_formato: articulo.cantidad_formato ?? "",
      unidad: articulo.unidad ?? "",
      precio_sin_iva: articulo.precio_sin_iva ?? "",
      iva:
        articulo.iva === null || articulo.iva === undefined
          ? ""
          : Number(articulo.iva) * 100,
      precio_con_iva: articulo.precio_con_iva ?? "",
      precio_unitario: articulo.precio_unitario ?? "",
      observaciones: articulo.observaciones ?? "",
      activo: articulo.activo !== false,
    });
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarFormulario() {
    setFormulario(ARTICULO_VACIO);
    setEditando(null);
    setMostrarFormulario(false);
    setError("");
  }

  async function guardarArticulo(event) {
    event.preventDefault();

    if (!formulario.proveedor_id) {
      setError("Selecciona un proveedor.");
      return;
    }

    if (!formulario.producto.trim()) {
      setError("El nombre del artículo es obligatorio.");
      return;
    }

    const precioSinIva = numeroONull(formulario.precio_sin_iva);
    const porcentajeIva = numeroONull(formulario.iva);
    const iva = porcentajeIva === null ? null : porcentajeIva / 100;
    const cantidad = numeroONull(formulario.cantidad_formato);
    let precioConIva = numeroONull(formulario.precio_con_iva);
    let precioUnitario = numeroONull(formulario.precio_unitario);

    if (precioConIva === null && precioSinIva !== null) {
      precioConIva = precioSinIva * (1 + (iva ?? 0));
    }

    if (precioUnitario === null && precioConIva !== null && cantidad) {
      precioUnitario = precioConIva / cantidad;
    }

    const datos = {
      proveedor_id: formulario.proveedor_id,
      categoria: formulario.categoria.trim() || "Sin categoría",
      producto: formulario.producto.trim(),
      codigo_proveedor: textoONull(formulario.codigo_proveedor),
      cantidad_formato: cantidad,
      unidad: textoONull(formulario.unidad),
      precio_sin_iva: precioSinIva,
      iva,
      precio_con_iva: precioConIva,
      precio_unitario: precioUnitario,
      observaciones: textoONull(formulario.observaciones),
      activo: formulario.activo,
      fecha_precio: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    };

    setGuardando(true);
    setError("");
    setMensaje("");

    const consulta = editando
      ? supabase.from("catalogo_proveedores").update(datos).eq("id", editando.id)
      : supabase.from("catalogo_proveedores").insert(datos);

    const { error: supabaseError } = await consulta;

    if (supabaseError) {
      setError(supabaseError.message);
    } else {
      setMensaje(editando ? "Artículo actualizado." : "Artículo creado.");
      setFormulario(ARTICULO_VACIO);
      setEditando(null);
      setMostrarFormulario(false);
      await cargarDatos();
    }

    setGuardando(false);
  }

  async function eliminarArticulo(articulo) {
    if (!window.confirm(`¿Eliminar “${articulo.producto}” del catálogo?`)) return;

    const { error: supabaseError } = await supabase
      .from("catalogo_proveedores")
      .delete()
      .eq("id", articulo.id);

    if (supabaseError) {
      setError(supabaseError.message);
    } else {
      setMensaje("Artículo eliminado.");
      await cargarDatos();
    }
  }

  function exportarExcel() {
    const cabeceras = [
      "Proveedor",
      "Categoría",
      "Producto",
      "Código proveedor",
      "Cantidad formato",
      "Unidad",
      "Precio sin IVA",
      "IVA %",
      "Precio con IVA",
      "Precio unitario",
      "Observaciones",
      "Activo",
    ];

    const filas = articulosFiltrados.map((articulo) => [
      obtenerNombreProveedor(articulo),
      articulo.categoria ?? "",
      articulo.producto ?? "",
      articulo.codigo_proveedor ?? "",
      articulo.cantidad_formato ?? "",
      articulo.unidad ?? "",
      articulo.precio_sin_iva ?? "",
      articulo.iva === null || articulo.iva === undefined
        ? ""
        : Number(articulo.iva) * 100,
      articulo.precio_con_iva ?? "",
      articulo.precio_unitario ?? "",
      articulo.observaciones ?? "",
      articulo.activo === false ? "No" : "Sí",
    ]);

    const csv = [cabeceras, ...filas]
      .map((fila) => fila.map(escaparCSV).join(";"))
      .join("\n");
    const blob = new Blob(["\ufeff", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `catalogo_proveedores_${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  return (
    <section className="panel catalogo-proveedores-page">
      <div className="catalogo-cabecera">
        <div>
          <p className="etiqueta-modulo">COMPRAS</p>
          <h1>📚 Catálogo de proveedores</h1>
          <p className="texto-secundario">
            {articulos.length} artículos cargados · {proveedores.length} proveedores
          </p>
        </div>
        <div className="catalogo-acciones">
          <button className="boton-secundario" type="button" onClick={exportarExcel}>
            📤 Exportar Excel
          </button>
          <button className="boton-principal" type="button" onClick={nuevoArticulo}>
            ＋ Nuevo artículo
          </button>
        </div>
      </div>

      {error && <div className="aviso-error">{error}</div>}
      {mensaje && <div className="aviso-exito">{mensaje}</div>}

      {mostrarFormulario && (
        <form className="catalogo-formulario" onSubmit={guardarArticulo}>
          <div className="catalogo-formulario-cabecera">
            <h2>{editando ? "Editar artículo" : "Nuevo artículo"}</h2>
            <button type="button" className="boton-cerrar" onClick={cancelarFormulario}>×</button>
          </div>

          <div className="catalogo-grid-formulario">
            <label>
              Proveedor *
              <select name="proveedor_id" value={formulario.proveedor_id} onChange={cambiarCampo} required>
                <option value="">Seleccionar proveedor</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre ?? proveedor.nombre_comercial}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Categoría
              <input name="categoria" value={formulario.categoria} onChange={cambiarCampo} list="categorias-catalogo" />
              <datalist id="categorias-catalogo">
                {categorias.map((categoria) => <option key={categoria} value={categoria} />)}
              </datalist>
            </label>

            <label className="campo-doble">
              Producto *
              <input name="producto" value={formulario.producto} onChange={cambiarCampo} required />
            </label>

            <label>
              Código del proveedor
              <input name="codigo_proveedor" value={formulario.codigo_proveedor} onChange={cambiarCampo} />
            </label>

            <label>
              Cantidad del formato
              <input name="cantidad_formato" type="number" min="0" step="0.0001" value={formulario.cantidad_formato} onChange={cambiarCampo} />
            </label>

            <label>
              Unidad
              <select name="unidad" value={formulario.unidad} onChange={cambiarCampo}>
                <option value="">Sin indicar</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="ud">ud</option>
                <option value="caja">caja</option>
                <option value="paquete">paquete</option>
              </select>
            </label>

            <label>
              Precio sin IVA (€)
              <input name="precio_sin_iva" type="number" min="0" step="0.0001" value={formulario.precio_sin_iva} onChange={cambiarCampo} />
            </label>

            <label>
              IVA (%)
              <input name="iva" type="number" min="0" step="0.01" value={formulario.iva} onChange={cambiarCampo} />
            </label>

            <label>
              Precio con IVA (€)
              <input name="precio_con_iva" type="number" min="0" step="0.0001" value={formulario.precio_con_iva} onChange={cambiarCampo} />
            </label>

            <label>
              Precio unitario (€)
              <input name="precio_unitario" type="number" min="0" step="0.000001" value={formulario.precio_unitario} onChange={cambiarCampo} />
            </label>

            <label className="campo-doble">
              Observaciones
              <textarea name="observaciones" rows="3" value={formulario.observaciones} onChange={cambiarCampo} />
            </label>

            <label className="catalogo-check">
              <input name="activo" type="checkbox" checked={formulario.activo} onChange={cambiarCampo} />
              Artículo activo
            </label>
          </div>

          <div className="catalogo-formulario-acciones">
            <button type="button" className="boton-secundario" onClick={cancelarFormulario}>Cancelar</button>
            <button type="submit" className="boton-principal" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar artículo"}
            </button>
          </div>
        </form>
      )}

      <div className="catalogo-filtros">
        <input
          type="search"
          placeholder="🔎 Buscar producto, proveedor o categoría..."
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />

        <select value={filtroProveedor} onChange={(event) => setFiltroProveedor(event.target.value)}>
          <option value="">Todos los proveedores</option>
          {proveedores.map((proveedor) => (
            <option key={proveedor.id} value={proveedor.id}>
              {proveedor.nombre ?? proveedor.nombre_comercial}
            </option>
          ))}
        </select>

        <select value={filtroCategoria} onChange={(event) => setFiltroCategoria(event.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
        </select>

        <span className="catalogo-resultados">{articulosFiltrados.length} resultados</span>
      </div>

      <div className="tabla-responsive">
        {cargando ? (
          <p className="estado-carga">Cargando catálogo...</p>
        ) : articulosFiltrados.length === 0 ? (
          <p className="estado-carga">No hay artículos que coincidan con los filtros.</p>
        ) : (
          <table className="tabla-catalogo">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Categoría</th>
                <th>Producto</th>
                <th>Formato</th>
                <th>Sin IVA</th>
                <th>IVA</th>
                <th>Con IVA</th>
                <th>Precio unitario</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {articulosFiltrados.map((articulo) => (
                <tr key={articulo.id}>
                  <td className="catalogo-proveedor">{obtenerNombreProveedor(articulo)}</td>
                  <td><span className="catalogo-categoria">{articulo.categoria || "—"}</span></td>
                  <td>
                    <strong>{articulo.producto}</strong>
                    {articulo.codigo_proveedor && <small>Cód. {articulo.codigo_proveedor}</small>}
                  </td>
                  <td>{formatearFormato(articulo)}</td>
                  <td>{formatearMoneda(articulo.precio_sin_iva)}</td>
                  <td>{formatearPorcentaje(articulo.iva)}</td>
                  <td>{formatearMoneda(articulo.precio_con_iva)}</td>
                  <td>{formatearMoneda(articulo.precio_unitario, 4)}</td>
                  <td>
                    <span className={articulo.activo === false ? "estado-inactivo" : "estado-activo"}>
                      {articulo.activo === false ? "Inactivo" : "Activo"}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-tabla">
                      <button type="button" onClick={() => editarArticulo(articulo)} title="Editar">✏️</button>
                      <button type="button" onClick={() => eliminarArticulo(articulo)} title="Eliminar">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function obtenerNombreProveedor(articulo) {
  return articulo.proveedores?.nombre ?? articulo.proveedores?.nombre_comercial ?? "Sin proveedor";
}

function textoONull(valor) {
  const texto = String(valor ?? "").trim();
  return texto || null;
}

function numeroSeguro(valor) {
  const numero = Number(String(valor ?? "").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
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

function formatearPorcentaje(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return `${(Number(valor) * 100).toLocaleString("es-ES", { maximumFractionDigits: 2 })} %`;
}

function formatearFormato(articulo) {
  if (!articulo.cantidad_formato && !articulo.unidad) return "—";
  return `${articulo.cantidad_formato ?? ""} ${articulo.unidad ?? ""}`.trim();
}

function escaparCSV(valor) {
  const texto = String(valor ?? "").replaceAll('"', '""');
  return `"${texto}"`;
}
export default CatalogoProveedores;