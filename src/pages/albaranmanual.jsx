import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase.js";

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;
  const limpio = String(valor).trim().replace(/\s/g, "").replace(",", ".");
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}

function redondear(valor) {
  return Math.round((numero(valor) + Number.EPSILON) * 100) / 100;
}

function nuevaLinea() {
  return {
    idTemporal: `${Date.now()}-${Math.random()}`,
    catalogo_id: "",
    descripcion: "",
    codigo: "",
    cantidad: "1",
    unidad: "unidad",
    precio_unitario: "",
    iva: "10",
  };
}

function nombreProveedor(proveedor) {
  return proveedor?.nombre_comercial || proveedor?.nombre || "Proveedor";
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
    setLineas((anteriores) =>
      anteriores.map((linea) => {
        if (linea.idTemporal !== idTemporal) return linea;
        return {
          ...linea,
          catalogo_id: articulo.id,
          descripcion: articulo.producto || "",
          codigo: articulo.codigo_proveedor || "",
          unidad: articulo.unidad || "unidad",
          precio_unitario: String(
            articulo.precio_sin_iva ?? articulo.precio_unitario ?? "",
          ),
          iva: String(
            numero(articulo.iva) > 0 && numero(articulo.iva) <= 1
              ? numero(articulo.iva) * 100
              : numero(articulo.iva) || 10,
          ),
        };
      }),
    );
    setBusquedas((b) => ({ ...b, [idTemporal]: articulo.producto || "" }));
  }

  function agregarLinea() {
    setLineas((l) => [...l, nuevaLinea()]);
  }

  function eliminarLinea(idTemporal) {
    setLineas((l) => (l.length === 1 ? l : l.filter((x) => x.idTemporal !== idTemporal)));
  }

  const totales = useMemo(() => {
    return lineas.reduce(
      (acc, linea) => {
        const base = redondear(numero(linea.cantidad) * numero(linea.precio_unitario));
        const iva = redondear(base * (numero(linea.iva) / 100));
        acc.base += base;
        acc.iva += iva;
        acc.total += base + iva;
        return acc;
      },
      { base: 0, iva: 0, total: 0 },
    );
  }, [lineas]);

  async function guardarArticuloCatalogo(linea) {
    const precioSinIva = redondear(linea.precio_unitario);
    const ivaDecimal = numero(linea.iva) / 100;
    const precioConIva = redondear(precioSinIva * (1 + ivaDecimal));
    const datos = {
      proveedor_id: proveedorId,
      producto: linea.descripcion.trim(),
      codigo_proveedor: linea.codigo.trim() || null,
      cantidad_formato: 1,
      unidad: linea.unidad || "unidad",
      precio_sin_iva: precioSinIva,
      iva: ivaDecimal,
      precio_con_iva: precioConIva,
      precio_unitario: precioConIva,
      activo: true,
      fecha_precio: fechaAlbaran || hoy(),
      updated_at: new Date().toISOString(),
      observaciones: "Guardado desde albarán manual en Bones pràctiques.",
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
      (a) =>
        String(a.producto || "").trim().toLowerCase() ===
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

  async function guardarAlbaran() {
    setError("");
    setMensaje("");

    if (!proveedorId) {
      setError("Selecciona un proveedor.");
      return;
    }

    const validas = lineas.filter((l) => l.descripcion.trim());
    if (!validas.length) {
      setError("Añade al menos un producto al albarán.");
      return;
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
        if (repetido) throw new Error("Este número de albarán ya está guardado para este proveedor.");
      }

      const lineasGuardadas = [];
      for (const linea of validas) {
        const catalogoId = await guardarArticuloCatalogo(linea);
        const base = redondear(numero(linea.cantidad) * numero(linea.precio_unitario));
        lineasGuardadas.push({
          catalogo_id: catalogoId,
          producto_id: null,
          descripcion: linea.descripcion.trim(),
          codigo: linea.codigo.trim() || null,
          cantidad: numero(linea.cantidad),
          cantidad_formato: 1,
          unidad: linea.unidad || "unidad",
          precio_unitario: redondear(linea.precio_unitario),
          iva: numero(linea.iva),
          total_linea: base,
          confirmado: true,
          origen: "manual_bones_practiques",
        });
      }

      const proveedor = proveedores.find((p) => String(p.id) === String(proveedorId));
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
          articulos_creados: lineasGuardadas.filter((l) => !l.catalogo_id).length,
          precios_actualizados: 0,
          errores_detectados: 0,
          catalogo_actualizado: true,
          necesita_revision: false,
          estado: "importado",
          errores: [],
          version_lector: "manual-1.0",
        });

      if (errorAlbaran) throw errorAlbaran;

      setMensaje("Albarán guardado. Los productos ya quedan asociados a este proveedor para próximos albaranes.");
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

  if (cargando) return <section className="panel"><p>Cargando proveedores...</p></section>;

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Bones pràctiques · Recepció</p>
          <h2>📦 Albarà manual</h2>
          <p>
            Selecciona el proveïdor, busca productes ja guardats o escriu-ne de nous. Els nous quedaran guardats per al pròxim albarà.
          </p>
        </div>
        <button type="button" className="boton-cancelar" onClick={() => navigate("/higiene")}>← Tornar</button>
      </div>

      {error && <p style={{ color: "#ff8c8c", fontWeight: 700 }}>{error}</p>}
      {mensaje && <p style={{ color: "#75d69c", fontWeight: 700 }}>{mensaje}</p>}

      <div className="formulario" style={{ marginBottom: 18 }}>
        <div className="rejilla-formulario">
          <label>
            Proveïdor
            <select value={proveedorId} onChange={(e) => { setProveedorId(e.target.value); setLineas([nuevaLinea()]); setBusquedas({}); }}>
              <option value="">— Seleccionar proveïdor —</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{nombreProveedor(p)}</option>)}
            </select>
          </label>
          <label>
            Número d'albarà
            <input value={numeroAlbaran} onChange={(e) => setNumeroAlbaran(e.target.value)} placeholder="Ex. 45872" />
          </label>
          <label>
            Data
            <input type="date" value={fechaAlbaran} onChange={(e) => setFechaAlbaran(e.target.value)} />
          </label>
        </div>
      </div>

      {!proveedorId ? (
        <div className="formulario"><strong>Selecciona primer un proveïdor.</strong></div>
      ) : (
        <>
          <div className="formulario">
            <h3>Productes de l'albarà</h3>
            <p className="texto-secundario">
              Comença a escriure el producte i podràs escollir entre els articles ja guardats d'aquest proveïdor.
            </p>

            <div className="tabla-responsive">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 260 }}>Producte</th>
                    <th>Codi</th>
                    <th>Quantitat</th>
                    <th>Unitat</th>
                    <th>Preu s/IVA</th>
                    <th>IVA %</th>
                    <th>Import</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((linea) => {
                    const texto = busquedas[linea.idTemporal] ?? linea.descripcion;
                    const coincidencias = texto.trim().length >= 1
                      ? catalogo
                          .filter((a) => String(a.producto || "").toLowerCase().includes(texto.toLowerCase()))
                          .slice(0, 8)
                      : [];
                    const importe = redondear(numero(linea.cantidad) * numero(linea.precio_unitario));
                    return (
                      <tr key={linea.idTemporal}>
                        <td style={{ position: "relative" }}>
                          <input
                            value={texto}
                            onChange={(e) => {
                              setBusquedas((b) => ({ ...b, [linea.idTemporal]: e.target.value }));
                              cambiarLinea(linea.idTemporal, "descripcion", e.target.value);
                              cambiarLinea(linea.idTemporal, "catalogo_id", "");
                            }}
                            placeholder="Buscar o escriure producte..."
                            autoComplete="off"
                          />
                          {coincidencias.length > 0 && texto !== linea.descripcion && (
                            <div style={{ position: "absolute", zIndex: 20, left: 4, right: 4, top: "100%", background: "white", color: "#222", border: "1px solid #d7cbdc", borderRadius: 8, boxShadow: "0 8px 18px rgba(0,0,0,.15)", maxHeight: 240, overflowY: "auto" }}>
                              {coincidencias.map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => seleccionarArticulo(linea.idTemporal, a)}
                                  style={{ width: "100%", textAlign: "left", padding: "9px 11px", border: 0, borderBottom: "1px solid #eee", background: "white", color: "#222", cursor: "pointer" }}
                                >
                                  <strong>{a.producto}</strong>
                                  <small style={{ display: "block", opacity: .7 }}>
                                    {numero(a.precio_sin_iva ?? a.precio_unitario).toLocaleString("es-ES", { style: "currency", currency: "EUR" })} · {a.unidad || "unidad"}
                                  </small>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td><input value={linea.codigo} onChange={(e) => cambiarLinea(linea.idTemporal, "codigo", e.target.value)} /></td>
                        <td><input type="number" min="0" step="0.01" value={linea.cantidad} onChange={(e) => cambiarLinea(linea.idTemporal, "cantidad", e.target.value)} /></td>
                        <td><input value={linea.unidad} onChange={(e) => cambiarLinea(linea.idTemporal, "unidad", e.target.value)} /></td>
                        <td><input type="number" min="0" step="0.01" value={linea.precio_unitario} onChange={(e) => cambiarLinea(linea.idTemporal, "precio_unitario", e.target.value)} /></td>
                        <td><input type="number" min="0" step="1" value={linea.iva} onChange={(e) => cambiarLinea(linea.idTemporal, "iva", e.target.value)} /></td>
                        <td><strong>{importe.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong></td>
                        <td><button type="button" className="boton-peligro" onClick={() => eliminarLinea(linea.idTemporal)}>×</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button type="button" className="boton-secundario" style={{ marginTop: 12 }} onClick={agregarLinea}>＋ Afegir producte</button>
          </div>

          <div className="formulario" style={{ marginTop: 18 }}>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div>Base: <strong>{redondear(totales.base).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong></div>
                <div>IVA: <strong>{redondear(totales.iva).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong></div>
                <div style={{ fontSize: 22 }}>TOTAL: <strong>{redondear(totales.total).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong></div>
              </div>
              <button type="button" className="boton-exito" onClick={guardarAlbaran} disabled={guardando}>
                {guardando ? "Guardant..." : "💾 Guardar albarà i productes"}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
