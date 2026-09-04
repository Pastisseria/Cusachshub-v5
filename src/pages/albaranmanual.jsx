import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase.js";

function hoy() { return new Date().toISOString().slice(0, 10); }
function numero(valor) { if (valor === null || valor === undefined || valor === "") return 0; const n = Number(String(valor).trim().replace(/\s/g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; }
function redondear(valor) { return Math.round((numero(valor) + Number.EPSILON) * 100) / 100; }
function nuevaLinea() { return { idTemporal: `${Date.now()}-${Math.random()}`, catalogo_id: "", descripcion: "", codigo: "", categoria: "Sin categoría", cantidad: "1", unidad: "unidad", precio_unitario: "", iva: "10" }; }
function nombreProveedor(p) { return p?.nombre_comercial || p?.nombre || "Proveedor"; }

export default function AlbaranManual() {
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState([]); const [proveedorId, setProveedorId] = useState(""); const [catalogo, setCatalogo] = useState([]);
  const [numeroAlbaran, setNumeroAlbaran] = useState(""); const [fechaAlbaran, setFechaAlbaran] = useState(hoy()); const [lineas, setLineas] = useState([nuevaLinea()]); const [busquedas, setBusquedas] = useState({});
  const [cargando, setCargando] = useState(true); const [guardando, setGuardando] = useState(false); const [error, setError] = useState(""); const [mensaje, setMensaje] = useState("");

  useEffect(() => { cargarProveedores(); }, []);
  useEffect(() => { if (!proveedorId) { setCatalogo([]); return; } cargarCatalogo(proveedorId); }, [proveedorId]);

  async function cargarProveedores() { setCargando(true); const { data, error: err } = await supabase.from("proveedores").select("id, nombre, nombre_comercial, activo").order("nombre", { ascending: true }); if (err) setError(err.message); else setProveedores((data || []).filter((p) => p.activo !== false)); setCargando(false); }
  async function cargarCatalogo(id) { const { data, error: err } = await supabase.from("catalogo_proveedores").select("*").eq("proveedor_id", id).eq("activo", true).order("producto", { ascending: true }); if (err) setError(err.message); else setCatalogo(data || []); }
  function cambiarLinea(id, campo, valor) { setLineas((xs) => xs.map((x) => x.idTemporal === id ? { ...x, [campo]: valor } : x)); }
  function seleccionarArticulo(id, a) { setLineas((xs) => xs.map((x) => x.idTemporal !== id ? x : { ...x, catalogo_id: a.id, descripcion: a.producto || "", codigo: a.codigo_proveedor || "", categoria: a.categoria || "Sin categoría", unidad: a.unidad || "unidad", precio_unitario: String(a.precio_sin_iva ?? a.precio_unitario ?? ""), iva: String(numero(a.iva) > 0 && numero(a.iva) <= 1 ? numero(a.iva) * 100 : numero(a.iva) || 10) })); setBusquedas((b) => ({ ...b, [id]: a.producto || "" })); }
  function agregarLinea() { setLineas((l) => [...l, nuevaLinea()]); }
  function eliminarLinea(id) { setLineas((l) => l.length === 1 ? l : l.filter((x) => x.idTemporal !== id)); }

  const totales = useMemo(() => lineas.reduce((a, l) => { const base = redondear(numero(l.cantidad) * numero(l.precio_unitario)); const iva = redondear(base * numero(l.iva) / 100); a.base += base; a.iva += iva; a.total += base + iva; return a; }, { base: 0, iva: 0, total: 0 }), [lineas]);

  async function guardarArticuloCatalogo(linea) {
    const precioSinIva = redondear(linea.precio_unitario); const ivaDecimal = numero(linea.iva) / 100; const precioConIva = redondear(precioSinIva * (1 + ivaDecimal));
    const datos = { proveedor_id: proveedorId, categoria: linea.categoria?.trim() || "Sin categoría", producto: linea.descripcion.trim(), codigo_proveedor: linea.codigo.trim() || null, cantidad_formato: 1, unidad: linea.unidad || "unidad", precio_sin_iva: precioSinIva, iva: ivaDecimal, precio_con_iva: precioConIva, precio_unitario: precioConIva, activo: true, fecha_precio: fechaAlbaran || hoy(), updated_at: new Date().toISOString(), observaciones: "Guardado desde albarán manual en Bones pràctiques." };
    if (linea.catalogo_id) { const { error: err } = await supabase.from("catalogo_proveedores").update(datos).eq("id", linea.catalogo_id); if (err) throw err; return linea.catalogo_id; }
    const existente = catalogo.find((a) => String(a.producto || "").trim().toLowerCase() === linea.descripcion.trim().toLowerCase());
    if (existente) { const { error: err } = await supabase.from("catalogo_proveedores").update(datos).eq("id", existente.id); if (err) throw err; return existente.id; }
    const { data, error: err } = await supabase.from("catalogo_proveedores").insert(datos).select("id").single(); if (err) throw err; return data?.id || "";
  }

  async function guardarAlbaran() {
    setError(""); setMensaje(""); if (!proveedorId) return setError("Selecciona un proveedor."); const validas = lineas.filter((l) => l.descripcion.trim()); if (!validas.length) return setError("Añade al menos un producto al albarán."); setGuardando(true);
    try {
      if (numeroAlbaran.trim()) { const { data: repetido, error: eb } = await supabase.from("importaciones_albaran_v3").select("id").eq("proveedor_id", proveedorId).eq("numero_albaran", numeroAlbaran.trim()).limit(1).maybeSingle(); if (eb) throw eb; if (repetido) throw new Error("Este número de albarán ya está guardado para este proveedor."); }
      const lineasGuardadas = [];
      for (const l of validas) { const catalogoId = await guardarArticuloCatalogo(l); const base = redondear(numero(l.cantidad) * numero(l.precio_unitario)); lineasGuardadas.push({ catalogo_id: catalogoId, producto_id: null, descripcion: l.descripcion.trim(), codigo: l.codigo.trim() || null, categoria: l.categoria?.trim() || "Sin categoría", cantidad: numero(l.cantidad), cantidad_formato: 1, unidad: l.unidad || "unidad", precio_unitario: redondear(l.precio_unitario), iva: numero(l.iva), total_linea: base, confirmado: true, origen: "manual_bones_practiques" }); }
      const proveedor = proveedores.find((p) => String(p.id) === String(proveedorId));
      const { error: ea } = await supabase.from("importaciones_albaran_v3").insert({ proveedor_id: proveedorId, proveedor_nombre: nombreProveedor(proveedor), numero_albaran: numeroAlbaran.trim() || null, fecha_albaran: fechaAlbaran || null, archivo_nombre: "Entrada manual", archivo_tipo: "manual", archivo_tamano: 0, texto_original: "Albarán introducido manualmente desde Bones pràctiques.", texto_normalizado: null, lineas_detectadas: lineasGuardadas, lineas_confirmadas: lineasGuardadas, base_imponible: redondear(totales.base), total_iva: redondear(totales.iva), total: redondear(totales.total), calidad_lectura: 100, confianza_parser: 100, articulos_detectados: lineasGuardadas.length, articulos_creados: 0, precios_actualizados: 0, errores_detectados: 0, catalogo_actualizado: true, necesita_revision: false, estado: "importado", errores: [], version_lector: "manual-1.1" }); if (ea) throw ea;
      setMensaje("Albarán guardado. Los productos ya quedan asociados a este proveedor para próximos albaranes."); setNumeroAlbaran(""); setFechaAlbaran(hoy()); setLineas([nuevaLinea()]); setBusquedas({}); await cargarCatalogo(proveedorId);
    } catch (err) { setError(err.message || "No se ha podido guardar el albarán."); } finally { setGuardando(false); }
  }

  if (cargando) return <section className="panel"><p>Cargando proveedores...</p></section>;
  return <section className="panel">
    <div className="titulo-seccion"><div><p className="etiqueta">Bones pràctiques · Recepció</p><h2>📦 Albarà manual</h2><p>Selecciona el proveïdor, busca productes ja guardats o escriu-ne de nous. Els nous quedaran guardats per al pròxim albarà.</p></div><button type="button" className="boton-cancelar" onClick={() => navigate("/higiene")}>← Tornar</button></div>
    {error && <p style={{ color: "#ff8c8c", fontWeight: 700 }}>{error}</p>}{mensaje && <p style={{ color: "#75d69c", fontWeight: 700 }}>{mensaje}</p>}
    <div className="formulario" style={{ marginBottom: 18 }}><div className="rejilla-formulario">
      <label>Proveïdor<select value={proveedorId} onChange={(e) => { setProveedorId(e.target.value); setLineas([nuevaLinea()]); setBusquedas({}); }}><option value="">— Seleccionar proveïdor —</option>{proveedores.map((p) => <option key={p.id} value={p.id}>{nombreProveedor(p)}</option>)}</select></label>
      <label>Número d'albarà<input value={numeroAlbaran} onChange={(e) => setNumeroAlbaran(e.target.value)} placeholder="Ex. 45872" /></label><label>Data<input type="date" value={fechaAlbaran} onChange={(e) => setFechaAlbaran(e.target.value)} /></label>
    </div></div>
    {!proveedorId ? <div className="formulario"><strong>Selecciona primer un proveïdor.</strong></div> : <><div className="formulario"><h3>Productes de l'albarà</h3><p className="texto-secundario">Comença a escriure el producte i podràs escollir entre els articles ja guardats d'aquest proveïdor.</p><div className="tabla-responsive"><table><thead><tr><th style={{ minWidth: 260 }}>Producte</th><th>Categoria</th><th>Codi</th><th>Quantitat</th><th>Unitat</th><th>Preu s/IVA</th><th>IVA %</th><th>Import</th><th></th></tr></thead><tbody>
      {lineas.map((l) => { const texto = busquedas[l.idTemporal] ?? l.descripcion; const coincidencias = texto.trim() ? catalogo.filter((a) => String(a.producto || "").toLowerCase().includes(texto.toLowerCase())).slice(0,8) : []; const importe = redondear(numero(l.cantidad) * numero(l.precio_unitario)); return <tr key={l.idTemporal}>
        <td style={{position:"relative"}}><input value={texto} onChange={(e)=>{setBusquedas((b)=>({...b,[l.idTemporal]:e.target.value}));cambiarLinea(l.idTemporal,"descripcion",e.target.value);cambiarLinea(l.idTemporal,"catalogo_id","");}} placeholder="Buscar o escriure producte..." autoComplete="off"/>{coincidencias.length>0 && texto!==l.descripcion && <div style={{position:"absolute",zIndex:20,left:4,right:4,top:"100%",background:"white",color:"#222",border:"1px solid #d7cbdc",borderRadius:8,maxHeight:240,overflowY:"auto"}}>{coincidencias.map((a)=><button key={a.id} type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>seleccionarArticulo(l.idTemporal,a)} style={{width:"100%",textAlign:"left",padding:"9px 11px",border:0,borderBottom:"1px solid #eee",background:"white",color:"#222"}}><strong>{a.producto}</strong></button>)}</div>}</td>
        <td><input value={l.categoria} onChange={(e)=>cambiarLinea(l.idTemporal,"categoria",e.target.value)} placeholder="Sin categoría" /></td><td><input value={l.codigo} onChange={(e)=>cambiarLinea(l.idTemporal,"codigo",e.target.value)}/></td><td><input type="number" min="0" step="0.01" value={l.cantidad} onChange={(e)=>cambiarLinea(l.idTemporal,"cantidad",e.target.value)}/></td><td><input value={l.unidad} onChange={(e)=>cambiarLinea(l.idTemporal,"unidad",e.target.value)}/></td><td><input type="number" min="0" step="0.01" value={l.precio_unitario} onChange={(e)=>cambiarLinea(l.idTemporal,"precio_unitario",e.target.value)}/></td><td><input type="number" min="0" step="1" value={l.iva} onChange={(e)=>cambiarLinea(l.idTemporal,"iva",e.target.value)}/></td><td><strong>{importe.toLocaleString("es-ES",{style:"currency",currency:"EUR"})}</strong></td><td><button type="button" className="boton-peligro" onClick={()=>eliminarLinea(l.idTemporal)}>×</button></td>
      </tr>;})}
    </tbody></table></div><button type="button" className="boton-secundario" style={{marginTop:12}} onClick={agregarLinea}>＋ Afegir producte</button></div>
    <div className="formulario" style={{marginTop:18}}><div style={{display:"flex",gap:24,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}><div><div>Base: <strong>{redondear(totales.base).toLocaleString("es-ES",{style:"currency",currency:"EUR"})}</strong></div><div>IVA: <strong>{redondear(totales.iva).toLocaleString("es-ES",{style:"currency",currency:"EUR"})}</strong></div><div style={{fontSize:22}}>TOTAL: <strong>{redondear(totales.total).toLocaleString("es-ES",{style:"currency",currency:"EUR"})}</strong></div></div><button type="button" className="boton-exito" onClick={guardarAlbaran} disabled={guardando}>{guardando?"Guardant...":"💾 Guardar albarà i productes"}</button></div></div></>}
  </section>;
}
