import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabase.js";

const PRODUCTO_VACIO = {
  nombre: "",
  referencia: "",
  categoria: "",
  unidad: "unidad",
  coste: "",
  precio_venta: "",
  iva: "10",
  observaciones: "",
  activo: true,
};

const TAMANO_LOTE = 50;

function Productos() {
  const [productos, setProductos] = useState([]);
  const [formulario, setFormulario] = useState(PRODUCTO_VACIO);
  const [productoEditando, setProductoEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const inputExcelRef = useRef(null);

  async function cargarProductos() {
    setCargando(true);
    setError("");

    try {
      const { data, error: supabaseError } = await supabase
        .from("productos")
        .select("*")
        .order("nombre", { ascending: true });

      if (supabaseError) throw supabaseError;
      setProductos(data ?? []);
    } catch (err) {
      setProductos([]);
      setError(err.message || "No se han podido cargar los productos.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarProductos();
  }, []);

  const productosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);
    if (!texto) return productos;

    return productos.filter((producto) =>
      [producto.nombre, producto.referencia, producto.categoria, producto.unidad]
        .filter(Boolean)
        .some((valor) => normalizarTexto(valor).includes(texto)),
    );
  }, [productos, busqueda]);

  function cambiarCampo(event) {
    const { name, value, type, checked } = event.target;
    setFormulario((anterior) => ({
      ...anterior,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function nuevoProducto() {
    setFormulario(PRODUCTO_VACIO);
    setProductoEditando(null);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editarProducto(producto) {
    setProductoEditando(producto);
    setFormulario({
      nombre: producto.nombre ?? "",
      referencia: producto.referencia ?? "",
      categoria: producto.categoria ?? "",
      unidad: producto.unidad ?? "unidad",
      coste: producto.coste ?? "",
      precio_venta: producto.precio_venta ?? "",
      iva: producto.iva ?? "10",
      observaciones: producto.observaciones ?? "",
      activo: producto.activo ?? true,
    });
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarFormulario() {
    setFormulario(PRODUCTO_VACIO);
    setProductoEditando(null);
    setMostrarFormulario(false);
    setError("");
  }

  async function guardarProducto(event) {
    event.preventDefault();
    const nombreLimpio = formulario.nombre.trim();

    if (!nombreLimpio) {
      setError("El nombre del producto es obligatorio.");
      return;
    }

    const coste = convertirNumero(formulario.coste);
    const precioVenta = convertirNumero(formulario.precio_venta);
    const iva = convertirNumero(formulario.iva);

    if (coste < 0 || precioVenta < 0 || iva < 0) {
      setError("Los importes no pueden ser negativos.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const datosProducto = {
      nombre: nombreLimpio,
      referencia: formulario.referencia.trim() || null,
      categoria: formulario.categoria.trim() || null,
      unidad: formulario.unidad.trim() || "unidad",
      coste,
      precio_venta: precioVenta,
      iva,
      observaciones: formulario.observaciones.trim() || null,
      activo: formulario.activo,
      updated_at: new Date().toISOString(),
    };

    try {
      if (productoEditando) {
        const { error: supabaseError } = await supabase
          .from("productos")
          .update(datosProducto)
          .eq("id", productoEditando.id);
        if (supabaseError) throw supabaseError;
        setMensaje("Producto actualizado correctamente.");
      } else {
        const { error: supabaseError } = await supabase
          .from("productos")
          .insert(datosProducto);
        if (supabaseError) throw supabaseError;
        setMensaje("Producto creado correctamente.");
      }

      setFormulario(PRODUCTO_VACIO);
      setProductoEditando(null);
      setMostrarFormulario(false);
      await cargarProductos();
    } catch (err) {
      setError(err.message || "No se ha podido guardar el producto.");
    } finally {
      setGuardando(false);
    }
  }

  function abrirSelectorExcel() {
    setError("");
    setMensaje("");
    inputExcelRef.current?.click();
  }

  async function importarExcel(event) {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;

    setImportando(true);
    setError("");
    setMensaje("Leyendo el archivo Excel...");

    try {
      const buffer = await archivo.arrayBuffer();
      const libro = XLSX.read(buffer, { type: "array" });
      const nombreHoja = libro.SheetNames.includes("Hoja 1")
        ? "Hoja 1"
        : libro.SheetNames[0];

      if (!nombreHoja) throw new Error("El Excel no contiene ninguna hoja.");

      const filas = XLSX.utils.sheet_to_json(libro.Sheets[nombreHoja], {
        defval: "",
        raw: true,
      });

      const productosExcel = filas
        .map(convertirFilaExcel)
        .filter(Boolean);

      if (productosExcel.length === 0) {
        throw new Error(
          "No se han encontrado productos. El Excel debe incluir las columnas Categoría, Producto y Precio (€).",
        );
      }

      const productosSinDuplicados = Array.from(
        new Map(
          productosExcel.map((producto) => [
            normalizarTexto(producto.nombre),
            producto,
          ]),
        ).values(),
      );

      const { data: existentes, error: errorConsulta } = await supabase
        .from("productos")
        .select("id,nombre");

      if (errorConsulta) throw errorConsulta;

      const existentesPorNombre = new Map(
        (existentes ?? []).map((producto) => [
          normalizarTexto(producto.nombre),
          producto,
        ]),
      );

      const paraInsertar = [];
      const paraActualizar = [];

      productosSinDuplicados.forEach((producto) => {
        const existente = existentesPorNombre.get(normalizarTexto(producto.nombre));
        if (existente) {
          paraActualizar.push({ ...producto, id: existente.id });
        } else {
          paraInsertar.push(producto);
        }
      });

      for (let i = 0; i < paraInsertar.length; i += TAMANO_LOTE) {
        const lote = paraInsertar.slice(i, i + TAMANO_LOTE);
        const { error: errorInsertar } = await supabase
          .from("productos")
          .insert(lote);
        if (errorInsertar) throw errorInsertar;
      }

      for (let i = 0; i < paraActualizar.length; i += TAMANO_LOTE) {
        const lote = paraActualizar.slice(i, i + TAMANO_LOTE);
        const resultados = await Promise.all(
          lote.map(({ id, ...datos }) =>
            supabase.from("productos").update(datos).eq("id", id),
          ),
        );
        const resultadoConError = resultados.find((resultado) => resultado.error);
        if (resultadoConError?.error) throw resultadoConError.error;
      }

      setMensaje(
        `Importación terminada: ${paraInsertar.length} productos creados y ${paraActualizar.length} actualizados.`,
      );
      await cargarProductos();
    } catch (err) {
      setError(err.message || "No se ha podido importar el archivo Excel.");
      setMensaje("");
    } finally {
      setImportando(false);
    }
  }

  async function eliminarProducto(producto) {
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar "${producto.nombre}"?`,
    );
    if (!confirmar) return;

    setError("");
    setMensaje("");

    try {
      const { error: supabaseError } = await supabase
        .from("productos")
        .delete()
        .eq("id", producto.id);
      if (supabaseError) throw supabaseError;

      setMensaje("Producto eliminado correctamente.");
      await cargarProductos();
    } catch (err) {
      setError(err.message || "No se ha podido eliminar el producto.");
    }
  }

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Módulo</p>
          <h2>Productos</h2>
        </div>
        <span className="contador">
          {productos.length} {productos.length === 1 ? "producto" : "productos"}
        </span>
      </div>

      <div style={barraHerramientas}>
        <input
          type="search"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar producto, referencia o categoría..."
          style={{ ...estiloCampo, flex: "1 1 320px", marginTop: 0 }}
        />

        <input
          ref={inputExcelRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={importarExcel}
          style={{ display: "none" }}
        />

        <button type="button" onClick={abrirSelectorExcel} disabled={importando}>
          {importando ? "Importando..." : "📥 Importar Excel"}
        </button>

        <button type="button" onClick={nuevoProducto} disabled={importando}>
          + Nuevo producto
        </button>
      </div>

      <p style={{ marginTop: "-10px", marginBottom: "22px", opacity: 0.75 }}>
        El importador reconoce las columnas Categoría, Producto y Precio (€).
        Los productos con el mismo nombre se actualizan y no se duplican.
      </p>

      {mostrarFormulario && (
        <form className="formulario" onSubmit={guardarProducto}>
          <h3>{productoEditando ? "Editar producto" : "Crear nuevo producto"}</h3>

          <div style={rejillaFormulario}>
            <Campo etiqueta="Nombre *" name="nombre" value={formulario.nombre} onChange={cambiarCampo} disabled={guardando} required />
            <Campo etiqueta="Referencia" name="referencia" value={formulario.referencia} onChange={cambiarCampo} disabled={guardando} />
            <Campo etiqueta="Categoría" name="categoria" value={formulario.categoria} onChange={cambiarCampo} disabled={guardando} placeholder="Bollería, bocadillos, bebidas..." />

            <label>
              Unidad de venta
              <select name="unidad" value={formulario.unidad} onChange={cambiarCampo} disabled={guardando} style={estiloCampo}>
                <option value="unidad">Unidad</option>
                <option value="kg">Kilogramo</option>
                <option value="bandeja">Bandeja</option>
                <option value="caja">Caja</option>
                <option value="ración">Ración</option>
                <option value="servicio">Servicio</option>
              </select>
            </label>

            <Campo etiqueta="Coste sin IVA" name="coste" type="number" step="0.01" min="0" value={formulario.coste} onChange={cambiarCampo} disabled={guardando} />
            <Campo etiqueta="Precio de venta sin IVA" name="precio_venta" type="number" step="0.01" min="0" value={formulario.precio_venta} onChange={cambiarCampo} disabled={guardando} />

            <label>
              IVA
              <select name="iva" value={formulario.iva} onChange={cambiarCampo} disabled={guardando} style={estiloCampo}>
                <option value="0">0 %</option>
                <option value="4">4 %</option>
                <option value="10">10 %</option>
                <option value="21">21 %</option>
              </select>
            </label>
          </div>

          <label style={{ display: "block", marginTop: "18px" }}>
            Observaciones
            <textarea name="observaciones" value={formulario.observaciones} onChange={cambiarCampo} disabled={guardando} rows="4" style={{ ...estiloCampo, padding: "14px", resize: "vertical" }} />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "18px" }}>
            <input name="activo" type="checkbox" checked={formulario.activo} onChange={cambiarCampo} disabled={guardando} style={{ width: "22px", height: "22px" }} />
            Producto activo
          </label>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
            <button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : productoEditando ? "💾 Guardar cambios" : "Crear producto"}
            </button>
            <button type="button" className="boton-cancelar" onClick={cancelarFormulario} disabled={guardando}>Cancelar</button>
          </div>
        </form>
      )}

      {error && <p className="mensaje-error">Error: {error}</p>}
      {mensaje && <p className="mensaje">{mensaje}</p>}
      {cargando && <p className="mensaje">Cargando productos...</p>}

      {!cargando && productosFiltrados.length === 0 && (
        <div className="estado-vacio">
          <h3>No se han encontrado productos</h3>
          <p>Pulsa “Nuevo producto” o “Importar Excel”.</p>
        </div>
      )}

      {!cargando && productosFiltrados.length > 0 && (
        <div className="lista-clientes">
          {productosFiltrados.map((producto) => {
            const margen = calcularMargen(producto.coste, producto.precio_venta);
            return (
              <article className="cliente" key={producto.id}>
                <div className="avatar">📦</div>
                <div className="cliente-info">
                  <h3>{producto.nombre}</h3>
                  <p>{producto.categoria || "Sin categoría"}{producto.referencia ? ` · Ref. ${producto.referencia}` : ""}</p>
                  <p>Venta: <strong>{formatearEuros(producto.precio_venta)}</strong> + {Number(producto.iva || 0)} % IVA</p>
                  <p>Coste: {formatearEuros(producto.coste)} · Margen: {margen === null ? "—" : `${margen.toFixed(1)} %`}</p>
                  <p>Unidad: {producto.unidad || "unidad"} · {producto.activo === false ? "Inactivo" : "Activo"}</p>
                  <div className="acciones">
                    <button type="button" onClick={() => editarProducto(producto)}>✏️ Editar</button>
                    <button type="button" onClick={() => eliminarProducto(producto)}>🗑️ Eliminar</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function convertirFilaExcel(fila) {
  const nombre = buscarValor(fila, ["Producto", "producto", "Nombre", "nombre"]);
  const categoria = buscarValor(fila, ["Categoría", "Categoria", "categoría", "categoria"]);
  const precio = buscarValor(fila, ["Precio (€)", "Precio", "precio", "precio_venta"]);

  if (!String(nombre || "").trim()) return null;

  return {
    nombre: String(nombre).trim(),
    referencia: null,
    categoria: String(categoria || "").trim() || null,
    unidad: deducirUnidad(categoria, nombre),
    coste: 0,
    precio_venta: convertirNumero(precio),
    iva: 10,
    observaciones: "Importado desde Excel de catering",
    activo: true,
    updated_at: new Date().toISOString(),
  };
}

function buscarValor(fila, nombres) {
  for (const nombre of nombres) {
    if (Object.prototype.hasOwnProperty.call(fila, nombre)) return fila[nombre];
  }
  return "";
}

function deducirUnidad(categoria, nombre) {
  const texto = normalizarTexto(`${categoria || ""} ${nombre || ""}`);
  if (texto.includes("bandeja")) return "bandeja";
  if (texto.includes("kg") || texto.includes("kilogram")) return "kg";
  if (texto.includes("racion")) return "ración";
  if (texto.includes("servicio")) return "servicio";
  if (texto.includes("caja")) return "caja";
  return "unidad";
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

const barraHerramientas = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "22px",
};

const rejillaFormulario = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

function Campo({ etiqueta, name, value, onChange, type = "text", disabled = false, required = false, placeholder = "", step, min }) {
  return (
    <label>
      {etiqueta}
      <input name={name} type={type} value={value} onChange={onChange} disabled={disabled} required={required} placeholder={placeholder} step={step} min={min} style={estiloCampo} />
    </label>
  );
}

function convertirNumero(valor) {
  const numero = Number(String(valor ?? "0").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatearEuros(valor) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(valor || 0));
}

function calcularMargen(coste, precioVenta) {
  const costeNumero = Number(coste || 0);
  const ventaNumero = Number(precioVenta || 0);
  if (ventaNumero <= 0) return null;
  return ((ventaNumero - costeNumero) / ventaNumero) * 100;
}

export default Productos;