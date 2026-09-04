import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase.js";

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;
  const n = Number(String(valor).trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function redondear(valor, decimales = 2) {
  const factor = 10 ** decimales;
  return Math.round((numero(valor) + Number.EPSILON) * factor) / factor;
}

function nuevaLinea() {
  return {
    idTemporal: `${Date.now()}-${Math.random()}`,
    catalogo_id: "",
    descripcion: "",
    codigo: "",
    categoria: "Sin categoría",
    cajas: "1",
    unidades_por_caja: "1",
    precio_caja: "",
    iva: "10",
    es_bebida: false,
  };
}

function nombreProveedor(proveedor) {
  return proveedor?.nombre_comercial || proveedor?.nombre || "Proveedor";
}

function pareceBebida(texto = "") {
  return /(bebida|agua|coca.?cola|fanta|sprite|refresco|zumo|juice|cerveza|cava|vino|tonica|tónica|aquarius|nestea)/i.test(texto);
}

export default function AlbaranManual() {
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState([]);
  const [proveedorId, setProveedorId] = useState("");
  const [catalogo, setCatalogo] = useState([]);
  const [numeroAlbaran, setNumeroAlbaran] = useState("");
  const [fechaAlbaran, setFechaAlbaran] = useState(hoy());
  const [lineas, setLineas] = useState([nuevaLinea()]);
  const [busquedas, setBusquedas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarProveedores();
  }, []);

  useEffect(() => {
    if (!proveedorId) {
      setCatalogo([]);
      return;
    }
    cargarCatalogo(proveedorId);
  }, [proveedorId]);

  async function cargarProveedores() {
    setCargando(true);
    const { data, error: err } = await supabase
      .from("proveedores")
      .select("id, nombre, nombre_comercial, activo")
      .order("nombre", { ascending: true });

    if (err) setError(err.message);
    else setProveedores((data || []).filter((p) => p.activo !== false));
    setCargando(false);
  }

  async function cargarCatalogo(id) {
    const { data, error: err } = await supabase
      .from("catalogo_proveedores")
      .select("*")
      .eq("proveedor_id", id)
      .eq("activo", true)
      .order("producto", { ascending: true });

    if (err) setError(err.message);
    else setCatalogo(data || []);
  }

  function cambiarLinea(idTemporal, campo, valor) {
    setLineas((anteriores) =>
      anteriores.map((linea) =>
        linea.idTemporal === idTemporal ? { ...linea, [campo]: valor } : linea,
      ),
    );
  }

  function seleccionarArticulo(idTemporal, articulo) {
    const unidadesCaja = Math.max(1, numero(articulo.cantidad_formato || 1));
    const ivaCatalogo = numero(articulo.iva);

    setLineas((anteriores) =>
      anteriores.map((linea) => {
        if (linea.idTemporal !== idTemporal) return linea;

        return {
          ...linea,
          catalogo_id: articulo.id,
          descripcion: articulo.producto || "",
          codigo: articulo.codigo_proveedor || "",
          categoria: articulo.categoria || "Sin categoría",
          cajas: "1",
          unidades_por_caja: String(unidadesCaja),
          precio_caja: String(articulo.precio_sin_iva ?? ""),
          iva: String(ivaCatalogo > 0 && ivaCatalogo <= 1 ? ivaCatalogo * 100 : ivaCatalogo || 10),
          es_bebida: pareceBebida(`${articulo.categoria || ""} ${articulo.producto || ""}`),
        };
      }),
    );

    setBusquedas((anterior) => ({
      ...anterior,
      [idTemporal]: articulo.producto || "",
    }));
  }

  function agregarLinea() {
    setLineas((anteriores) => [...anteriores, nuevaLinea()]);
  }

  function eliminarLinea(idTemporal) {
    setLineas((anteriores) =>
      anteriores.length === 1
        ? anteriores
        : anteriores.filter((linea) => linea.idTemporal !== idTemporal),
    );
  }

  const totales = useMemo(() => {
    return lineas.reduce(
      (acumulado, linea) => {
        const cajas = numero(linea.cajas);
        const precioCaja = numero(linea.precio_caja);
        const base = redondear(cajas * precioCaja);
        const iva = redondear(base * (numero(linea.iva) / 100));
        acumulado.base += base;
        acumulado.iva += iva;
        acumulado.total += base + iva;
        return acumulado;
      },
      { base: 0, iva: 0, total: 0 },
    );
  }, [lineas]);

  async function guardarArticuloCatalogo(linea) {
    const unidadesCaja = Math.max(1, Math.round(numero(linea.unidades_por_caja || 1)));
    const precioCajaSinIva = redondear(linea.precio_caja);
    const ivaDecimal = numero(linea.iva) / 100;
    const precioCajaConIva = redondear(precioCajaSinIva * (1 + ivaDecimal));
    const precioUnidadConIva = redondear(precioCajaConIva / unidadesCaja, 6);

    const datos = {
      proveedor_id: proveedorId,
      categoria:
        linea.categoria?.trim() || (linea.es_bebida ? "Bebidas" : "Sin categoría"),
      producto: linea.descripcion.trim(),
      codigo_proveedor: linea.codigo.trim() || null,
      cantidad_formato: unidadesCaja,
      unidad: "caja",
      precio_sin_iva: precioCajaSinIva,
      iva: ivaDecimal,
      precio_con_iva: precioCajaConIva,
      precio_unitario: precioUnidadConIva,
      activo: true,
      fecha_precio: fechaAlbaran || hoy(),
      updated_at: new Date().toISOString(),
      observaciones: `Caja de ${unidadesCaja} unidades. Guardado desde albarán manual en Bones pràctiques.`,
    };

    if (linea.catalogo_id) {
      const { error: err } = await supabase
        .from("catalogo_proveedores")
        .update(datos)
        .eq("id", linea.catalogo_id);
      if (err) throw err;
      return linea.catalogo_id;
    }

    const existente = catalogo.find(
      (articulo) =>
        String(articulo.producto || "").trim().toLowerCase() ===
        linea.descripcion.trim().toLowerCase(),
    );

    if (existente) {
      const { error: err } = await supabase
        .from("catalogo_proveedores")
        .update(datos)
        .eq("id", existente.id);
      if (err) throw err;
      return existente.id;
    }

    const { data, error: err } = await supabase
      .from("catalogo_proveedores")
      .insert(datos)
      .select("id")
      .single();

    if (err) throw err;
    return data?.id || "";
  }

  async function sincronizarBebida(linea, proveedor) {
    if (!linea.es_bebida) return;

    const nombre = linea.descripcion.trim();
    const cajasEntrantes = numero(linea.cajas);
    const unidadesCaja = Math.max(1, Math.round(numero(linea.unidades_por_caja || 1)));
    const precioCaja = redondear(linea.precio_caja);
    const precioUnidad = redondear(precioCaja / unidadesCaja, 6);
    const iva = numero(linea.iva);

    const { data: existente, error: errorBuscar } = await supabase
      .from("bebidas")
      .select("*")
      .ilike("nombre", nombre)
      .limit(1)
      .maybeSingle();

    if (errorBuscar) throw errorBuscar;

    if (existente) {
      const nuevoStockCajas = numero(existente.stock_cajas) + cajasEntrantes;
      const { error: errorActualizar } = await supabase
        .from("bebidas")
        .update({
          unidades_por_caja: unidadesCaja,
          stock_cajas: nuevoStockCajas,
          stock_unidades: nuevoStockCajas * unidadesCaja,
          precio_caja: precioCaja,
          precio_unidad: precioUnidad,
          iva,
          categoria: existente.categoria || linea.categoria || "Bebidas",
          formato: existente.formato || `Caja ${unidadesCaja} ud`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existente.id);

      if (errorActualizar) throw errorActualizar;
      return;
    }

    const { error: errorCrear } = await supabase.from("bebidas").insert({
      nombre,
      marca: null,
      categoria: linea.categoria?.trim() || "Bebidas",
      formato: `Caja ${unidadesCaja} ud`,
      unidades_por_caja: unidadesCaja,
      stock_cajas: cajasEntrantes,
      stock_unidades: cajasEntrantes * unidadesCaja,
      stock_reservado_cajas: 0,
      stock_minimo_cajas: 0,
      precio_caja: precioCaja,
      precio_unidad: precioUnidad,
      precio_venta: 0,
      iva,
      observaciones: `Entrada desde albarán ${numeroAlbaran || "manual"} · ${nombreProveedor(proveedor)}`,
      activo: true,
      updated_at: new Date().toISOString(),
    });

    if (errorCrear) throw errorCrear;
  }

  async function guardarAlbaran() {
    setError("");
    setMensaje("");

    if (!proveedorId) {
      setError("Selecciona un proveedor.");
      return;
    }

    const validas = lineas.filter((linea) => linea.descripcion.trim());
    if (!validas.length) {
      setError("Añade al menos un producto al albarán.");
      return;
    }

    for (const linea of validas) {
      if (numero(linea.cajas) <= 0) {
        setError(`Indica las cajas de ${linea.descripcion}.`);
        return;
      }
      if (numero(linea.unidades_por_caja) <= 0) {
        setError(`Indica las unidades por caja de ${linea.descripcion}.`);
        return;
      }
    }

    setGuardando(true);

    try {
      if (numeroAlbaran.trim()) {
        const { data: repetido, error: errorBuscar } = await supabase
          .from("importaciones_albaran_v3")
          .select("id")
          .eq("proveedor_id", proveedorId)
          .eq("numero_albaran", numeroAlbaran.trim())
          .limit(1)
          .maybeSingle();

        if (errorBuscar) throw errorBuscar;
        if (repetido) {
          throw new Error("Este número de albarán ya está guardado para este proveedor.");
        }
      }

      const proveedor = proveedores.find(
        (elemento) => String(elemento.id) === String(proveedorId),
      );

      const lineasGuardadas = [];

      for (const linea of validas) {
        const catalogoId = await guardarArticuloCatalogo(linea);
        const cajas = numero(linea.cajas);
        const unidadesCaja = Math.max(1, Math.round(numero(linea.unidades_por_caja)));
        const precioCaja = redondear(linea.precio_caja);
        const precioUnidadSinIva = redondear(precioCaja / unidadesCaja, 6);
        const base = redondear(cajas * precioCaja);

        lineasGuardadas.push({
          catalogo_id: catalogoId,
          producto_id: null,
          descripcion: linea.descripcion.trim(),
          codigo: linea.codigo.trim() || null,
          categoria: linea.categoria?.trim() || "Sin categoría",
          cantidad: cajas,
          cantidad_formato: unidadesCaja,
          unidad: "caja",
          unidades_totales: cajas * unidadesCaja,
          precio_unitario: precioCaja,
          precio_unidad_sin_iva: precioUnidadSinIva,
          iva: numero(linea.iva),
          total_linea: base,
          es_bebida: Boolean(linea.es_bebida),
          confirmado: true,
          origen: "manual_bones_practiques",
        });

        await sincronizarBebida(linea, proveedor);
      }

      const { error: errorAlbaran } = await supabase
        .from("importaciones_albaran_v3")
        .insert({
          proveedor_id: proveedorId,
          proveedor_nombre: nombreProveedor(proveedor),
          numero_albaran: numeroAlbaran.trim() || null,
          fecha_albaran: fechaAlbaran || null,
          archivo_nombre: "Entrada manual",
          archivo_tipo: "manual",
          archivo_tamano: 0,
          texto_original: "Albarán introducido manualmente desde Bones pràctiques.",
          texto_normalizado: null,
          lineas_detectadas: lineasGuardadas,
          lineas_confirmadas: lineasGuardadas,
          base_imponible: redondear(totales.base),
          total_iva: redondear(totales.iva),
          total: redondear(totales.total),
          calidad_lectura: 100,
          confianza_parser: 100,
          articulos_detectados: lineasGuardadas.length,
          articulos_creados: 0,
          precios_actualizados: 0,
          errores_detectados: 0,
          catalogo_actualizado: true,
          necesita_revision: false,
          estado: "importado",
          errores: [],
          version_lector: "manual-1.2-cajas",
        });

      if (errorAlbaran) throw errorAlbaran;

      setMensaje(
        "Albarán guardado. El precio por unidad queda preparado para el Comparador y las líneas marcadas como bebida se han sumado a Bebidas.",
      );
      setNumeroAlbaran("");
      setFechaAlbaran(hoy());
      setLineas([nuevaLinea()]);
      setBusquedas({});
      await cargarCatalogo(proveedorId);
    } catch (err) {
      setError(err.message || "No se ha podido guardar el albarán.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <section className="panel"><p>Cargando proveedores...</p></section>;
  }

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Bones pràctiques · Recepció</p>
          <h2>📦 Albarà manual</h2>
          <p>
            Introdueix caixes, unitats per caixa i preu de caixa. El sistema calcula el preu per unitat i el guarda per comparar proveïdors.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="boton-secundario" onClick={() => navigate("/bebidas")}>🥤 Veure Bebidas</button>
          <button type="button" className="boton-cancelar" onClick={() => navigate("/higiene")}>← Tornar</button>
        </div>
      </div>

      {error && <p style={{ color: "#ff8c8c", fontWeight: 700 }}>Error: {error}</p>}
      {mensaje && <p style={{ color: "#75d69c", fontWeight: 700 }}>{mensaje}</p>}

      <div className="formulario" style={{ marginBottom: 18 }}>
        <div className="rejilla-formulario">
          <label>
            Proveïdor
            <select
              value={proveedorId}
              onChange={(event) => {
                setProveedorId(event.target.value);
                setLineas([nuevaLinea()]);
                setBusquedas({});
              }}
            >
              <option value="">— Seleccionar proveïdor —</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {nombreProveedor(proveedor)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Número d'albarà
            <input
              value={numeroAlbaran}
              onChange={(event) => setNumeroAlbaran(event.target.value)}
              placeholder="Ex. 45872"
            />
          </label>

          <label>
            Data
            <input
              type="date"
              value={fechaAlbaran}
              onChange={(event) => setFechaAlbaran(event.target.value)}
            />
          </label>
        </div>
      </div>

      {!proveedorId ? (
        <div className="formulario">
          <strong>Selecciona primer un proveïdor.</strong>
        </div>
      ) : (
        <>
          <div className="formulario">
            <h3>Productes de l'albarà</h3>
            <p className="texto-secundario">
              Exemple: 3 caixes × 24 unitats × 18,30 € la caixa. El preu per unitat es calcula automàticament.
            </p>

            <div className="tabla-responsive">
              <table style={{ minWidth: 1450 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 250 }}>Producte</th>
                    <th>Categoria</th>
                    <th>Codi</th>
                    <th>Caixes</th>
                    <th>Unitats/caixa</th>
                    <th>Unitats totals</th>
                    <th>Preu caixa s/IVA</th>
                    <th>Preu/ud s/IVA</th>
                    <th>IVA %</th>
                    <th>Import</th>
                    <th>🥤 Bebida</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((linea) => {
                    const texto = busquedas[linea.idTemporal] ?? linea.descripcion;
                    const coincidencias = texto.trim()
                      ? catalogo
                          .filter((articulo) =>
                            String(articulo.producto || "")
                              .toLowerCase()
                              .includes(texto.toLowerCase()),
                          )
                          .slice(0, 8)
                      : [];

                    const cajas = numero(linea.cajas);
                    const unidadesCaja = Math.max(1, numero(linea.unidades_por_caja || 1));
                    const precioCaja = numero(linea.precio_caja);
                    const unidadesTotales = cajas * unidadesCaja;
                    const precioUnidad = precioCaja / unidadesCaja;
                    const importe = redondear(cajas * precioCaja);

                    return (
                      <tr key={linea.idTemporal}>
                        <td style={{ position: "relative" }}>
                          <input
                            value={texto}
                            onChange={(event) => {
                              const valor = event.target.value;
                              setBusquedas((anterior) => ({
                                ...anterior,
                                [linea.idTemporal]: valor,
                              }));
                              cambiarLinea(linea.idTemporal, "descripcion", valor);
                              cambiarLinea(linea.idTemporal, "catalogo_id", "");
                              if (pareceBebida(valor)) {
                                cambiarLinea(linea.idTemporal, "es_bebida", true);
                                cambiarLinea(linea.idTemporal, "categoria", "Bebidas");
                              }
                            }}
                            placeholder="Buscar o escriure producte..."
                            autoComplete="off"
                          />

                          {coincidencias.length > 0 && texto !== linea.descripcion && (
                            <div
                              style={{
                                position: "absolute",
                                zIndex: 20,
                                left: 4,
                                right: 4,
                                top: "100%",
                                background: "white",
                                color: "#222",
                                border: "1px solid #d7cbdc",
                                borderRadius: 8,
                                maxHeight: 240,
                                overflowY: "auto",
                              }}
                            >
                              {coincidencias.map((articulo) => (
                                <button
                                  key={articulo.id}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => seleccionarArticulo(linea.idTemporal, articulo)}
                                  style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "9px 11px",
                                    border: 0,
                                    borderBottom: "1px solid #eee",
                                    background: "white",
                                    color: "#222",
                                  }}
                                >
                                  <strong>{articulo.producto}</strong>
                                  <small style={{ display: "block", opacity: 0.7 }}>
                                    Caja {articulo.cantidad_formato || 1} ud · {numero(articulo.precio_sin_iva).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                                  </small>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>

                        <td>
                          <input
                            value={linea.categoria}
                            onChange={(event) => cambiarLinea(linea.idTemporal, "categoria", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            value={linea.codigo}
                            onChange={(event) => cambiarLinea(linea.idTemporal, "codigo", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={linea.cajas}
                            onChange={(event) => cambiarLinea(linea.idTemporal, "cajas", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={linea.unidades_por_caja}
                            onChange={(event) => cambiarLinea(linea.idTemporal, "unidades_por_caja", event.target.value)}
                          />
                        </td>
                        <td><strong>{unidadesTotales}</strong></td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={linea.precio_caja}
                            onChange={(event) => cambiarLinea(linea.idTemporal, "precio_caja", event.target.value)}
                          />
                        </td>
                        <td>
                          <strong>
                            {precioUnidad.toLocaleString("es-ES", {
                              style: "currency",
                              currency: "EUR",
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4,
                            })}
                          </strong>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={linea.iva}
                            onChange={(event) => cambiarLinea(linea.idTemporal, "iva", event.target.value)}
                          />
                        </td>
                        <td>
                          <strong>
                            {importe.toLocaleString("es-ES", {
                              style: "currency",
                              currency: "EUR",
                            })}
                          </strong>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={Boolean(linea.es_bebida)}
                            onChange={(event) => {
                              cambiarLinea(linea.idTemporal, "es_bebida", event.target.checked);
                              if (event.target.checked && (!linea.categoria || linea.categoria === "Sin categoría")) {
                                cambiarLinea(linea.idTemporal, "categoria", "Bebidas");
                              }
                            }}
                            title="Sumar estas cajas al stock de Bebidas"
                            style={{ width: 22, height: 22 }}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="boton-peligro"
                            onClick={() => eliminarLinea(linea.idTemporal)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="boton-secundario"
              style={{ marginTop: 12 }}
              onClick={agregarLinea}
            >
              ＋ Afegir producte
            </button>
          </div>

          <div className="formulario" style={{ marginTop: 18 }}>
            <div
              style={{
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div>
                  Base: <strong>{redondear(totales.base).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong>
                </div>
                <div>
                  IVA: <strong>{redondear(totales.iva).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong>
                </div>
                <div style={{ fontSize: 22 }}>
                  TOTAL: <strong>{redondear(totales.total).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong>
                </div>
              </div>

              <button
                type="button"
                className="boton-exito"
                onClick={guardarAlbaran}
                disabled={guardando}
              >
                {guardando ? "Guardant..." : "💾 Guardar albarà, preus i stock"}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
