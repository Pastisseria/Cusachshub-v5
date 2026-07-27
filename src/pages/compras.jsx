import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const CABECERA_VACIA = {
  proveedor_id: "",
  fecha: new Date().toISOString().slice(0, 10),
  fecha_entrega_prevista: "",
  estado: "borrador",
  referencia_proveedor: "",
  observaciones: "",
};

const LINEA_VACIA = {
  catalogo_id: "",
  producto: "",
  codigo_proveedor: "",
  cantidad: 1,
  unidad: "",
  precio_unitario: "",
  iva: 0.1,
  observaciones: "",
};

const ESTADOS = [
  ["borrador", "Borrador"],
  ["enviado", "Enviado"],
  ["confirmado", "Confirmado"],
  ["recibido_parcial", "Recibido parcial"],
  ["recibido", "Recibido"],
  ["cancelado", "Cancelado"],
];

function Compras() {
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [cabecera, setCabecera] = useState(CABECERA_VACIA);
  const [lineas, setLineas] = useState([]);
  const [linea, setLinea] = useState(LINEA_VACIA);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [compraAbierta, setCompraAbierta] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setCargando(true);
    setError("");

    const [rCompras, rProveedores, rCatalogo] = await Promise.all([
      supabase
        .from("compras")
        .select(`
          *,
          proveedores(nombre, nombre_comercial),
          compras_lineas(*)
        `)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("proveedores")
        .select("id, nombre, nombre_comercial, activo")
        .order("nombre", { ascending: true }),
      supabase
        .from("catalogo_proveedores")
        .select(`
          id,
          proveedor_id,
          producto,
          codigo_proveedor,
          cantidad_formato,
          unidad,
          precio_sin_iva,
          iva,
          activo
        `)
        .eq("activo", true)
        .order("producto", { ascending: true }),
    ]);

    const errores = [rCompras.error, rProveedores.error, rCatalogo.error].filter(Boolean);

    if (errores.length) {
      setError(errores.map((item) => item.message).join(" · "));
    }

    setCompras(rCompras.data ?? []);
    setProveedores(rProveedores.data ?? []);
    setCatalogo(rCatalogo.data ?? []);
    setCargando(false);
  }

  const articulosProveedor = useMemo(
    () => catalogo.filter((articulo) => articulo.proveedor_id === cabecera.proveedor_id),
    [catalogo, cabecera.proveedor_id],
  );

  const totalesFormulario = useMemo(
    () => calcularTotales(lineas),
    [lineas],
  );

  const comprasFiltradas = useMemo(() => {
    const texto = normalizar(busqueda);

    return compras.filter((compra) => {
      const proveedor = nombreProveedor(compra);
      const contenido = normalizar(
        [
          compra.numero,
          proveedor,
          compra.referencia_proveedor,
          compra.observaciones,
          ...(compra.compras_lineas ?? []).map((item) => item.producto),
        ].filter(Boolean).join(" "),
      );

      return (
        (!texto || contenido.includes(texto)) &&
        (!filtroEstado || compra.estado === filtroEstado) &&
        (!filtroProveedor || compra.proveedor_id === filtroProveedor)
      );
    });
  }, [compras, busqueda, filtroEstado, filtroProveedor]);

  const resumen = useMemo(() => {
    const pendientes = compras.filter(
      (compra) => !["recibido", "cancelado"].includes(compra.estado),
    );
    const totalMes = compras
      .filter((compra) => {
        const hoy = new Date();
        const fecha = new Date(`${compra.fecha}T00:00:00`);
        return (
          fecha.getMonth() === hoy.getMonth() &&
          fecha.getFullYear() === hoy.getFullYear() &&
          compra.estado !== "cancelado"
        );
      })
      .reduce((suma, compra) => suma + Number(compra.total || 0), 0);

    return {
      pedidos: compras.length,
      pendientes: pendientes.length,
      totalMes,
      proveedores: new Set(compras.map((compra) => compra.proveedor_id)).size,
    };
  }, [compras]);

  function nuevaCompra() {
    setCabecera({
      ...CABECERA_VACIA,
      fecha: new Date().toISOString().slice(0, 10),
    });
    setLineas([]);
    setLinea(LINEA_VACIA);
    setCompraAbierta(null);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarFormulario() {
    setMostrarFormulario(false);
    setLineas([]);
    setLinea(LINEA_VACIA);
    setError("");
  }

  function cambiarCabecera(event) {
    const { name, value } = event.target;

    setCabecera((anterior) => ({
      ...anterior,
      [name]: value,
    }));

    if (name === "proveedor_id") {
      setLineas([]);
      setLinea(LINEA_VACIA);
    }
  }

  function seleccionarArticulo(event) {
    const catalogoId = event.target.value;
    const articulo = articulosProveedor.find((item) => item.id === catalogoId);

    if (!articulo) {
      setLinea(LINEA_VACIA);
      return;
    }

    setLinea({
      catalogo_id: articulo.id,
      producto: articulo.producto ?? "",
      codigo_proveedor: articulo.codigo_proveedor ?? "",
      cantidad: 1,
      unidad: articulo.unidad ?? "",
      precio_unitario: articulo.precio_sin_iva ?? "",
      iva: articulo.iva ?? 0,
      observaciones: "",
    });
  }

  function cambiarLinea(event) {
    const { name, value } = event.target;
    setLinea((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  function añadirLinea() {
    if (!cabecera.proveedor_id) {
      setError("Selecciona primero un proveedor.");
      return;
    }

    if (!linea.producto.trim()) {
      setError("Selecciona o escribe un producto.");
      return;
    }

    const cantidad = numero(linea.cantidad);
    const precio = numero(linea.precio_unitario);

    if (cantidad <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }

    if (precio < 0) {
      setError("El precio no puede ser negativo.");
      return;
    }

    setLineas((anteriores) => [
      ...anteriores,
      {
        ...linea,
        clave_temporal: crypto.randomUUID(),
        cantidad,
        precio_unitario: precio,
        iva: normalizarIva(linea.iva),
      },
    ]);

    setLinea(LINEA_VACIA);
    setError("");
  }

  function eliminarLinea(clave) {
    setLineas((anteriores) =>
      anteriores.filter((item) => item.clave_temporal !== clave),
    );
  }

  async function guardarCompra(event) {
    event.preventDefault();

    if (!cabecera.proveedor_id) {
      setError("Selecciona un proveedor.");
      return;
    }

    if (lineas.length === 0) {
      setError("Añade al menos una línea al pedido.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const numeroCompra = generarNumeroCompra();
    const totales = calcularTotales(lineas);

    const { data: compraCreada, error: errorCompra } = await supabase
      .from("compras")
      .insert({
        numero: numeroCompra,
        proveedor_id: cabecera.proveedor_id,
        fecha: cabecera.fecha,
        fecha_entrega_prevista: cabecera.fecha_entrega_prevista || null,
        estado: cabecera.estado,
        referencia_proveedor: textoONull(cabecera.referencia_proveedor),
        observaciones: textoONull(cabecera.observaciones),
        subtotal: totales.subtotal,
        total_iva: totales.totalIva,
        total: totales.total,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (errorCompra) {
      setError(errorCompra.message);
      setGuardando(false);
      return;
    }

    const lineasGuardar = lineas.map((item) => {
      const calculo = calcularLinea(item);

      return {
        compra_id: compraCreada.id,
        catalogo_id: item.catalogo_id || null,
        producto: item.producto.trim(),
        codigo_proveedor: textoONull(item.codigo_proveedor),
        cantidad: numero(item.cantidad),
        unidad: textoONull(item.unidad),
        precio_unitario: numero(item.precio_unitario),
        iva: normalizarIva(item.iva),
        subtotal: calculo.subtotal,
        total_iva: calculo.totalIva,
        total: calculo.total,
        observaciones: textoONull(item.observaciones),
      };
    });

    const { error: errorLineas } = await supabase
      .from("compras_lineas")
      .insert(lineasGuardar);

    if (errorLineas) {
      await supabase.from("compras").delete().eq("id", compraCreada.id);
      setError(`No se pudieron guardar las líneas: ${errorLineas.message}`);
      setGuardando(false);
      return;
    }

    setMensaje(`Pedido ${numeroCompra} creado correctamente.`);
    setMostrarFormulario(false);
    setLineas([]);
    setLinea(LINEA_VACIA);
    await cargarTodo();
    setGuardando(false);
  }

  async function cambiarEstado(compra, nuevoEstado) {
    const { error: supabaseError } = await supabase
      .from("compras")
      .update({
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", compra.id);

    if (supabaseError) {
      setError(supabaseError.message);
      return;
    }

    setMensaje(`El pedido ${compra.numero} ahora está ${etiquetaEstado(nuevoEstado).toLowerCase()}.`);
    await cargarTodo();
  }

  async function eliminarCompra(compra) {
    if (!window.confirm(`¿Eliminar el pedido ${compra.numero}? También se eliminarán sus líneas.`)) {
      return;
    }

    const { error: supabaseError } = await supabase
      .from("compras")
      .delete()
      .eq("id", compra.id);

    if (supabaseError) {
      setError(supabaseError.message);
      return;
    }

    setCompraAbierta(null);
    setMensaje("Pedido eliminado.");
    await cargarTodo();
  }

  function exportarExcel() {
    const cabeceras = [
      "Número",
      "Fecha",
      "Entrega prevista",
      "Proveedor",
      "Estado",
      "Referencia proveedor",
      "Subtotal",
      "IVA",
      "Total",
      "Producto",
      "Cantidad",
      "Unidad",
      "Precio unitario",
      "Total línea",
    ];

    const filas = comprasFiltradas.flatMap((compra) => {
      const lineasCompra = compra.compras_lineas ?? [];

      if (lineasCompra.length === 0) {
        return [[
          compra.numero,
          compra.fecha,
          compra.fecha_entrega_prevista ?? "",
          nombreProveedor(compra),
          etiquetaEstado(compra.estado),
          compra.referencia_proveedor ?? "",
          compra.subtotal ?? "",
          compra.total_iva ?? "",
          compra.total ?? "",
          "",
          "",
          "",
          "",
          "",
        ]];
      }

      return lineasCompra.map((item) => [
        compra.numero,
        compra.fecha,
        compra.fecha_entrega_prevista ?? "",
        nombreProveedor(compra),
        etiquetaEstado(compra.estado),
        compra.referencia_proveedor ?? "",
        compra.subtotal ?? "",
        compra.total_iva ?? "",
        compra.total ?? "",
        item.producto,
        item.cantidad,
        item.unidad ?? "",
        item.precio_unitario,
        item.total,
      ]);
    });

    const csv = [cabeceras, ...filas]
      .map((fila) => fila.map(escaparCSV).join(";"))
      .join("\n");

    const blob = new Blob(["\ufeff", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `compras_${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  return (
    <section className="panel compras-page">
      <div className="compras-cabecera">
        <div>
          <p className="etiqueta-modulo">COMPRAS</p>
          <h1>🛒 Compras</h1>
          <p className="texto-secundario">
            Crea pedidos a proveedores y controla su estado hasta la recepción.
          </p>
        </div>

        <div className="compras-acciones-cabecera">
          <button
            type="button"
            className="boton-secundario"
            onClick={exportarExcel}
            disabled={comprasFiltradas.length === 0}
          >
            📤 Exportar Excel
          </button>
          <button type="button" className="boton-principal" onClick={nuevaCompra}>
            ＋ Nueva compra
          </button>
        </div>
      </div>

      {error && <div className="aviso-error">{error}</div>}
      {mensaje && <div className="aviso-exito">{mensaje}</div>}

      {mostrarFormulario && (
        <form className="compras-formulario" onSubmit={guardarCompra}>
          <div className="compras-formulario-titulo">
            <h2>Nuevo pedido de compra</h2>
            <button type="button" className="boton-cerrar" onClick={cancelarFormulario}>
              ×
            </button>
          </div>

          <div className="compras-grid-cabecera">
            <label>
              Proveedor *
              <select
                name="proveedor_id"
                value={cabecera.proveedor_id}
                onChange={cambiarCabecera}
                required
              >
                <option value="">Seleccionar proveedor</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre ?? proveedor.nombre_comercial}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fecha *
              <input
                name="fecha"
                type="date"
                value={cabecera.fecha}
                onChange={cambiarCabecera}
                required
              />
            </label>

            <label>
              Entrega prevista
              <input
                name="fecha_entrega_prevista"
                type="date"
                value={cabecera.fecha_entrega_prevista}
                onChange={cambiarCabecera}
              />
            </label>

            <label>
              Estado
              <select name="estado" value={cabecera.estado} onChange={cambiarCabecera}>
                {ESTADOS.map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>{etiqueta}</option>
                ))}
              </select>
            </label>

            <label>
              Referencia del proveedor
              <input
                name="referencia_proveedor"
                value={cabecera.referencia_proveedor}
                onChange={cambiarCabecera}
              />
            </label>

            <label className="campo-doble">
              Observaciones
              <input
                name="observaciones"
                value={cabecera.observaciones}
                onChange={cambiarCabecera}
              />
            </label>
          </div>

          <div className="compras-linea-editor">
            <h3>Añadir productos</h3>

            <div className="compras-grid-linea">
              <label className="campo-doble">
                Artículo del catálogo
                <select
                  value={linea.catalogo_id}
                  onChange={seleccionarArticulo}
                  disabled={!cabecera.proveedor_id}
                >
                  <option value="">
                    {cabecera.proveedor_id
                      ? "Seleccionar artículo"
                      : "Selecciona primero un proveedor"}
                  </option>
                  {articulosProveedor.map((articulo) => (
                    <option key={articulo.id} value={articulo.id}>
                      {articulo.producto}
                      {articulo.cantidad_formato
                        ? ` · ${articulo.cantidad_formato} ${articulo.unidad ?? ""}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="campo-doble">
                Producto
                <input
                  name="producto"
                  value={linea.producto}
                  onChange={cambiarLinea}
                  placeholder="También puedes escribir un artículo manual"
                />
              </label>

              <label>
                Cantidad
                <input
                  name="cantidad"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={linea.cantidad}
                  onChange={cambiarLinea}
                />
              </label>

              <label>
                Unidad
                <input
                  name="unidad"
                  value={linea.unidad}
                  onChange={cambiarLinea}
                />
              </label>

              <label>
                Precio sin IVA
                <input
                  name="precio_unitario"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={linea.precio_unitario}
                  onChange={cambiarLinea}
                />
              </label>

              <label>
                IVA
                <select name="iva" value={linea.iva} onChange={cambiarLinea}>
                  <option value="0">0 %</option>
                  <option value="0.04">4 %</option>
                  <option value="0.1">10 %</option>
                  <option value="0.21">21 %</option>
                </select>
              </label>

              <button
                type="button"
                className="boton-añadir-linea"
                onClick={añadirLinea}
              >
                ＋ Añadir
              </button>
            </div>
          </div>

          <div className="tabla-responsive">
            <table className="tabla-compras-lineas">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>IVA</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lineas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="compras-sin-lineas">
                      Todavía no has añadido productos.
                    </td>
                  </tr>
                ) : (
                  lineas.map((item) => {
                    const calculo = calcularLinea(item);

                    return (
                      <tr key={item.clave_temporal}>
                        <td>
                          <strong>{item.producto}</strong>
                          {item.codigo_proveedor && (
                            <small>Cód. {item.codigo_proveedor}</small>
                          )}
                        </td>
                        <td>{formatearNumero(item.cantidad)} {item.unidad}</td>
                        <td>{moneda(item.precio_unitario, 4)}</td>
                        <td>{formatearPorcentaje(item.iva)}</td>
                        <td>{moneda(calculo.total)}</td>
                        <td>
                          <button
                            type="button"
                            className="boton-eliminar-linea"
                            onClick={() => eliminarLinea(item.clave_temporal)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="compras-total-formulario">
            <span>Subtotal: <strong>{moneda(totalesFormulario.subtotal)}</strong></span>
            <span>IVA: <strong>{moneda(totalesFormulario.totalIva)}</strong></span>
            <span className="compras-total-destacado">
              Total: <strong>{moneda(totalesFormulario.total)}</strong>
            </span>
          </div>

          <div className="compras-formulario-acciones">
            <button type="button" className="boton-secundario" onClick={cancelarFormulario}>
              Cancelar
            </button>
            <button type="submit" className="boton-principal" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar pedido"}
            </button>
          </div>
        </form>
      )}

      <div className="compras-resumen">
        <article><span>Pedidos</span><strong>{resumen.pedidos}</strong></article>
        <article><span>Pendientes</span><strong>{resumen.pendientes}</strong></article>
        <article><span>Compras del mes</span><strong>{moneda(resumen.totalMes)}</strong></article>
        <article><span>Proveedores usados</span><strong>{resumen.proveedores}</strong></article>
      </div>

      <div className="compras-filtros">
        <input
          type="search"
          placeholder="🔎 Buscar pedido, proveedor o producto..."
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />

        <select
          value={filtroProveedor}
          onChange={(event) => setFiltroProveedor(event.target.value)}
        >
          <option value="">Todos los proveedores</option>
          {proveedores.map((proveedor) => (
            <option key={proveedor.id} value={proveedor.id}>
              {proveedor.nombre ?? proveedor.nombre_comercial}
            </option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={(event) => setFiltroEstado(event.target.value)}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>{etiqueta}</option>
          ))}
        </select>

        <span>{comprasFiltradas.length} resultados</span>
      </div>

      <div className="tabla-responsive">
        {cargando ? (
          <p className="estado-carga">Cargando compras...</p>
        ) : comprasFiltradas.length === 0 ? (
          <p className="estado-carga">Todavía no hay pedidos de compra.</p>
        ) : (
          <table className="tabla-compras">
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Estado</th>
                <th>Líneas</th>
                <th>Total</th>
                <th>Entrega prevista</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {comprasFiltradas.map((compra) => (
                <tr key={compra.id}>
                  <td><strong>{compra.numero}</strong></td>
                  <td>{fechaEspañola(compra.fecha)}</td>
                  <td className="compras-proveedor">{nombreProveedor(compra)}</td>
                  <td>
                    <select
                      className={`estado-select estado-${compra.estado}`}
                      value={compra.estado}
                      onChange={(event) => cambiarEstado(compra, event.target.value)}
                    >
                      {ESTADOS.map(([valor, etiqueta]) => (
                        <option key={valor} value={valor}>{etiqueta}</option>
                      ))}
                    </select>
                  </td>
                  <td>{compra.compras_lineas?.length ?? 0}</td>
                  <td><strong>{moneda(compra.total)}</strong></td>
                  <td>{fechaEspañola(compra.fecha_entrega_prevista)}</td>
                  <td>
                    <div className="acciones-tabla">
                      <button
                        type="button"
                        title="Ver pedido"
                        onClick={() =>
                          setCompraAbierta(
                            compraAbierta?.id === compra.id ? null : compra,
                          )
                        }
                      >
                        👁️
                      </button>
                      <button
                        type="button"
                        title="Eliminar"
                        onClick={() => eliminarCompra(compra)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {compraAbierta && (
        <div className="compra-detalle">
          <div className="compra-detalle-cabecera">
            <div>
              <p className="etiqueta-modulo">PEDIDO</p>
              <h2>{compraAbierta.numero}</h2>
              <p>{nombreProveedor(compraAbierta)} · {fechaEspañola(compraAbierta.fecha)}</p>
            </div>
            <button type="button" className="boton-cerrar" onClick={() => setCompraAbierta(null)}>
              ×
            </button>
          </div>

          <div className="tabla-responsive">
            <table className="tabla-compras-lineas">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>IVA</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(compraAbierta.compras_lineas ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.producto}</td>
                    <td>{formatearNumero(item.cantidad)} {item.unidad}</td>
                    <td>{moneda(item.precio_unitario, 4)}</td>
                    <td>{formatearPorcentaje(item.iva)}</td>
                    <td>{moneda(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="compras-total-formulario">
            <span>Subtotal: <strong>{moneda(compraAbierta.subtotal)}</strong></span>
            <span>IVA: <strong>{moneda(compraAbierta.total_iva)}</strong></span>
            <span className="compras-total-destacado">
              Total: <strong>{moneda(compraAbierta.total)}</strong>
            </span>
          </div>

          {compraAbierta.observaciones && (
            <p className="compra-observaciones">
              <strong>Observaciones:</strong> {compraAbierta.observaciones}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function calcularLinea(linea) {
  const cantidad = numero(linea.cantidad);
  const precio = numero(linea.precio_unitario);
  const iva = normalizarIva(linea.iva);
  const subtotal = cantidad * precio;
  const totalIva = subtotal * iva;

  return {
    subtotal,
    totalIva,
    total: subtotal + totalIva,
  };
}

function calcularTotales(lineas) {
  return lineas.reduce(
    (acumulado, linea) => {
      const calculo = calcularLinea(linea);
      acumulado.subtotal += calculo.subtotal;
      acumulado.totalIva += calculo.totalIva;
      acumulado.total += calculo.total;
      return acumulado;
    },
    { subtotal: 0, totalIva: 0, total: 0 },
  );
}

function generarNumeroCompra() {
  const ahora = new Date();
  const fecha = ahora.toISOString().slice(0, 10).replaceAll("-", "");
  const hora = ahora.toTimeString().slice(0, 8).replaceAll(":", "");
  const aleatorio = Math.floor(Math.random() * 90 + 10);
  return `COM-${fecha}-${hora}-${aleatorio}`;
}

function nombreProveedor(compra) {
  return (
    compra.proveedores?.nombre ??
    compra.proveedores?.nombre_comercial ??
    "Sin proveedor"
  );
}

function etiquetaEstado(valor) {
  return ESTADOS.find(([estado]) => estado === valor)?.[1] ?? valor;
}

function normalizar(valor) {
  return String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function numero(valor) {
  const resultado = Number(String(valor ?? "").replace(",", "."));
  return Number.isFinite(resultado) ? resultado : 0;
}

function normalizarIva(valor) {
  const resultado = numero(valor);
  return resultado > 1 ? resultado / 100 : resultado;
}

function textoONull(valor) {
  const texto = String(valor ?? "").trim();
  return texto || null;
}

function moneda(valor, decimales = 2) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(numero(valor));
}

function formatearNumero(valor) {
  return numero(valor).toLocaleString("es-ES", {
    maximumFractionDigits: 4,
  });
}

function formatearPorcentaje(valor) {
  return `${(normalizarIva(valor) * 100).toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  })} %`;
}

function fechaEspañola(valor) {
  if (!valor) return "—";
  const [anyo, mes, dia] = String(valor).split("-");
  return anyo && mes && dia ? `${dia}/${mes}/${anyo}` : valor;
}

function escaparCSV(valor) {
  const texto = String(valor ?? "").replaceAll('"', '""');
  return `"${texto}"`;
}

export default Compras;
