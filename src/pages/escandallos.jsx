import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const ESCANDALLO_INICIAL = {
  nombre: "",
  categoria: "",
  producto_id: "",
  unidades_producidas: "1",
  precio_venta: "",
  margen_objetivo: "55",
  observaciones: "",
  activo: true,
};

const LINEA_INICIAL = { ingrediente_id: "", cantidad: "" };

function Escandallos() {
  const [escandallos, setEscandallos] = useState([]);
  const [ingredientes, setIngredientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [relaciones, setRelaciones] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [formulario, setFormulario] = useState(ESCANDALLO_INICIAL);
  const [nuevaLinea, setNuevaLinea] = useState(LINEA_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    setError("");
    const [rEsc, rIng, rProd, rRel] = await Promise.all([
      supabase.from("escandallos").select(`*, escandallo_ingredientes(id, escandallo_id, ingrediente_id, cantidad, ingredientes(id,nombre,unidad,precio_coste,activo))`).order("nombre"),
      supabase.from("ingredientes").select("*").eq("activo", true).order("nombre"),
      supabase.from("productos").select("id,nombre,activo").order("nombre"),
      supabase.from("producto_buenas_practicas_relaciones").select("*").eq("activo", true),
    ]);
    if (rEsc.error) setError(rEsc.error.message); else setEscandallos(rEsc.data ?? []);
    if (rIng.error) setError((x) => x ? `${x} | ${rIng.error.message}` : rIng.error.message); else setIngredientes(rIng.data ?? []);
    if (rProd.error) setError((x) => x ? `${x} | ${rProd.error.message}` : rProd.error.message); else setProductos((rProd.data ?? []).filter((p) => p.activo !== false));
    if (rRel.error) setError((x) => x ? `${x} | ${rRel.error.message}` : rRel.error.message); else setRelaciones(rRel.data ?? []);
    setCargando(false);
  }

  function actualizarFormulario(e) {
    const { name, value, type, checked } = e.target;
    setFormulario((x) => ({ ...x, [name]: type === "checkbox" ? checked : value }));
  }

  function añadirIngrediente() {
    setError(""); setMensaje("");
    if (!nuevaLinea.ingrediente_id) return setError("Selecciona un producto de Buenas Prácticas.");
    const cantidad = Number(nuevaLinea.cantidad);
    if (!cantidad || cantidad <= 0) return setError("La cantidad debe ser mayor que cero.");
    const ingrediente = ingredientes.find((i) => String(i.id) === String(nuevaLinea.ingrediente_id));
    if (!ingrediente) return setError("No se ha encontrado el producto seleccionado.");
    setLineas((anteriores) => {
      const existe = anteriores.find((l) => String(l.ingrediente_id) === String(ingrediente.id));
      if (existe) return anteriores.map((l) => String(l.ingrediente_id) === String(ingrediente.id) ? { ...l, cantidad: Number(l.cantidad) + cantidad } : l);
      return [...anteriores, { id_temporal: crypto.randomUUID(), ingrediente_id: ingrediente.id, cantidad, ingrediente }];
    });
    setNuevaLinea(LINEA_INICIAL);
  }

  function limpiarFormulario() {
    setFormulario(ESCANDALLO_INICIAL); setNuevaLinea(LINEA_INICIAL); setLineas([]); setEditandoId(null);
  }

  function prepararEdicion(escandallo) {
    const relacion = relaciones.find((r) => String(r.escandallo_id) === String(escandallo.id));
    setFormulario({
      nombre: escandallo.nombre ?? "", categoria: escandallo.categoria ?? "",
      producto_id: relacion?.producto_id ?? "", unidades_producidas: escandallo.unidades_producidas ?? "1",
      precio_venta: escandallo.precio_venta ?? "", margen_objetivo: escandallo.margen_objetivo ?? "55",
      observaciones: escandallo.observaciones ?? "", activo: escandallo.activo ?? true,
    });
    setLineas((escandallo.escandallo_ingredientes ?? []).map((l) => ({ id: l.id, id_temporal: crypto.randomUUID(), ingrediente_id: l.ingrediente_id, cantidad: Number(l.cantidad || 0), ingrediente: l.ingredientes })));
    setEditandoId(escandallo.id); setError(""); setMensaje(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarEscandallo(e) {
    e.preventDefault(); setError(""); setMensaje("");
    if (!formulario.nombre.trim()) return setError("El nombre del escandallo es obligatorio.");
    if (!formulario.producto_id) return setError("Selecciona el producto de Catering que corresponde a este escandallo.");
    if (!lineas.length) return setError("Añade al menos un producto de Buenas Prácticas.");
    const unidades = Number(formulario.unidades_producidas || 0);
    if (unidades <= 0) return setError("Las unidades producidas deben ser mayores que cero.");
    if (lineas.some((l) => Number(l.cantidad) <= 0)) return setError("Revisa las cantidades de los ingredientes.");
    setGuardando(true);
    const datos = { nombre: formulario.nombre.trim(), categoria: formulario.categoria.trim() || null, unidades_producidas: unidades, precio_venta: Number(formulario.precio_venta || 0), margen_objetivo: Number(formulario.margen_objetivo || 55), observaciones: formulario.observaciones.trim() || null, activo: formulario.activo, updated_at: new Date().toISOString() };
    let escandalloId = editandoId;
    if (editandoId) {
      const { error: e1 } = await supabase.from("escandallos").update(datos).eq("id", editandoId);
      if (e1) { setGuardando(false); return setError(e1.message); }
      const { error: e2 } = await supabase.from("escandallo_ingredientes").delete().eq("escandallo_id", editandoId);
      if (e2) { setGuardando(false); return setError(e2.message); }
      const { error: e3 } = await supabase.from("producto_buenas_practicas_relaciones").delete().eq("escandallo_id", editandoId);
      if (e3) { setGuardando(false); return setError(e3.message); }
    } else {
      const { data, error: e1 } = await supabase.from("escandallos").insert(datos).select("id").single();
      if (e1) { setGuardando(false); return setError(e1.message); }
      escandalloId = data.id;
    }
    const { error: eLineas } = await supabase.from("escandallo_ingredientes").insert(lineas.map((l) => ({ escandallo_id: escandalloId, ingrediente_id: l.ingrediente_id, cantidad: Number(l.cantidad) })));
    if (eLineas) { setGuardando(false); return setError(eLineas.message); }
    const relacionesGuardar = lineas.map((l, index) => ({ producto_id: formulario.producto_id, ingrediente_id: l.ingrediente_id, escandallo_id: escandalloId, tipo_relacion: "ingrediente", cantidad_por_unidad: Number(l.cantidad) / unidades, unidad: l.ingrediente?.unidad || "ud", merma_pct: 0, es_principal: index === 0, activo: true }));
    const { error: eRel } = await supabase.from("producto_buenas_practicas_relaciones").insert(relacionesGuardar);
    if (eRel) { setGuardando(false); return setError(`Escandallo guardado, pero falta la relación con Catering: ${eRel.message}`); }
    setMensaje("Escandallo y relación con Catering guardados correctamente."); limpiarFormulario(); setGuardando(false); await cargarDatos();
  }

  async function eliminarEscandallo(escandallo) {
    if (!window.confirm(`¿Eliminar el escandallo “${escandallo.nombre}”?`)) return;
    await supabase.from("producto_buenas_practicas_relaciones").delete().eq("escandallo_id", escandallo.id);
    await supabase.from("escandallo_ingredientes").delete().eq("escandallo_id", escandallo.id);
    const { error: e } = await supabase.from("escandallos").delete().eq("id", escandallo.id);
    if (e) return setError(e.message);
    if (editandoId === escandallo.id) limpiarFormulario();
    setMensaje("Escandallo eliminado."); await cargarDatos();
  }

  const costeTotal = useMemo(() => lineas.reduce((t, l) => t + Number(l.cantidad || 0) * Number(l.ingrediente?.precio_coste || 0), 0), [lineas]);
  const costeUnidad = Number(formulario.unidades_producidas || 0) > 0 ? costeTotal / Number(formulario.unidades_producidas) : 0;
  const precioVenta = Number(formulario.precio_venta || 0);
  const margenReal = precioVenta > 0 ? ((precioVenta - costeUnidad) / precioVenta) * 100 : 0;
  const margenObjetivo = Number(formulario.margen_objetivo || 55);
  const precioRecomendado = margenObjetivo < 100 ? costeUnidad / (1 - margenObjetivo / 100) : 0;
  const productoSeleccionado = productos.find((p) => String(p.id) === String(formulario.producto_id));

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return escandallos.filter((e) => !q || e.nombre?.toLowerCase().includes(q) || e.categoria?.toLowerCase().includes(q));
  }, [escandallos, busqueda]);

  function nombreProductoCatering(escandalloId) {
    const rel = relaciones.find((r) => String(r.escandallo_id) === String(escandalloId));
    return productos.find((p) => String(p.id) === String(rel?.producto_id))?.nombre || "Sin vincular";
  }

  return (
    <section className="panel">
      <div className="titulo-seccion"><div><p className="etiqueta">Producción, costes y compras</p><h2>Escandallos</h2><p>Relaciona cada producto de Catering con sus productos reales de Buenas Prácticas.</p></div><span className="contador">{escandallos.length} escandallos</span></div>

      <form onSubmit={guardarEscandallo} style={box}>
        <h3>{editandoId ? "Editar escandallo" : "Nuevo escandallo"}</h3>
        <div style={grid}>
          <label>Producto de Catering *<select name="producto_id" value={formulario.producto_id} onChange={actualizarFormulario} style={campo}><option value="">Selecciona producto de Catering</option>{productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
          <label>Nombre del escandallo *<input name="nombre" value={formulario.nombre} onChange={actualizarFormulario} placeholder="Ej. Pan de coca" style={campo}/></label>
          <label>Categoría<input name="categoria" value={formulario.categoria} onChange={actualizarFormulario} style={campo}/></label>
          <label>Unidades producidas<input type="number" min="0.01" step="0.01" name="unidades_producidas" value={formulario.unidades_producidas} onChange={actualizarFormulario} style={campo}/></label>
          <label>Precio venta / unidad<input type="number" min="0" step="0.01" name="precio_venta" value={formulario.precio_venta} onChange={actualizarFormulario} style={campo}/></label>
          <label>Margen objetivo %<input type="number" min="0" max="99.99" step="0.01" name="margen_objetivo" value={formulario.margen_objetivo} onChange={actualizarFormulario} style={campo}/></label>
        </div>

        {productoSeleccionado && <div style={vinculo}>Catering: <strong>{productoSeleccionado.nombre}</strong> → Buenas Prácticas: añade debajo los productos reales que utiliza.</div>}

        <div style={{...box, marginTop:18, marginBottom:0}}>
          <h3>Productos / ingredientes de Buenas Prácticas</h3>
          <div style={gridLinea}>
            <select value={nuevaLinea.ingrediente_id} onChange={(e) => setNuevaLinea((x) => ({...x, ingrediente_id:e.target.value}))} style={campo}><option value="">Selecciona producto real</option>{ingredientes.map((i) => <option key={i.id} value={i.id}>{i.nombre} · {euros(i.precio_coste)}/{i.unidad || "ud"}</option>)}</select>
            <input type="number" min="0.0001" step="0.0001" value={nuevaLinea.cantidad} onChange={(e) => setNuevaLinea((x) => ({...x, cantidad:e.target.value}))} placeholder="Cantidad" style={campo}/>
            <button type="button" onClick={añadirIngrediente}>Añadir</button>
          </div>
          {lineas.map((l) => <div key={l.id_temporal} style={fila}><strong>{l.ingrediente?.nombre}</strong><span>{l.ingrediente?.unidad || "ud"}</span><input type="number" min="0.0001" step="0.0001" value={l.cantidad} onChange={(e) => setLineas((xs) => xs.map((x) => x.id_temporal === l.id_temporal ? {...x,cantidad:e.target.value}:x))} style={{...campo,marginTop:0,maxWidth:140}}/><span>{euros(Number(l.cantidad||0)*Number(l.ingrediente?.precio_coste||0))}</span><button type="button" className="boton-cancelar" onClick={() => setLineas((xs) => xs.filter((x) => x.id_temporal !== l.id_temporal))}>Quitar</button></div>)}
        </div>

        <div style={calculos}><Tarjeta t="Coste receta" v={euros(costeTotal)}/><Tarjeta t="Coste unidad" v={euros(costeUnidad)}/><Tarjeta t="Margen real" v={`${numero(margenReal)} %`}/><Tarjeta t="Precio recomendado" v={euros(precioRecomendado)}/></div>
        <label style={{display:"block",marginTop:18}}>Observaciones<textarea name="observaciones" value={formulario.observaciones} onChange={actualizarFormulario} rows="3" style={{...campo,padding:12}}/></label>
        {margenReal > 0 && margenReal < 55 && <p style={{color:"#ffb0b0",fontWeight:700}}>⚠ Margen inferior al mínimo del 55 %.</p>}
        {error && <p style={{color:"#ff9b9b"}}>Error: {error}</p>}{mensaje && <p style={{color:"#9fe1ae"}}>{mensaje}</p>}
        <div style={{display:"flex",gap:10,marginTop:18}}><button type="submit" disabled={guardando}>{guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear escandallo"}</button>{editandoId && <button type="button" className="boton-cancelar" onClick={() => {limpiarFormulario();setError("");setMensaje("");}}>Cancelar</button>}</div>
      </form>

      <input value={busqueda} onChange={(e)=>setBusqueda(e.target.value)} placeholder="Buscar escandallo..." style={{...campo,marginBottom:18}}/>
      {cargando ? <p>Cargando...</p> : <div style={{overflowX:"auto"}}><table style={tabla}><thead><tr><th style={th}>Producto Catering</th><th style={th}>Escandallo</th><th style={th}>Ingredientes</th><th style={th}>Coste unidad</th><th style={th}>Venta</th><th style={th}>Margen</th><th style={th}>Acciones</th></tr></thead><tbody>{filtrados.map((e) => { const c=calcular(e); return <tr key={e.id}><td style={td}><strong>{nombreProductoCatering(e.id)}</strong></td><td style={td}>{e.nombre}</td><td style={td}>{(e.escandallo_ingredientes??[]).length}</td><td style={td}>{euros(c.costeUnidad)}</td><td style={td}>{euros(e.precio_venta)}</td><td style={td}><strong>{numero(c.margenReal)} %</strong>{c.margenReal < 55 && <div style={{color:"#ff9b9b"}}>Margen bajo</div>}</td><td style={td}><div style={{display:"flex",gap:8}}><button type="button" onClick={()=>prepararEdicion(e)}>Editar</button><button type="button" className="boton-cancelar" onClick={()=>eliminarEscandallo(e)}>Eliminar</button></div></td></tr>; })}</tbody></table></div>}
    </section>
  );
}

function calcular(e) { const costeTotal=(e.escandallo_ingredientes??[]).reduce((t,l)=>t+Number(l.cantidad||0)*Number(l.ingredientes?.precio_coste||0),0); const u=Number(e.unidades_producidas||0); const costeUnidad=u>0?costeTotal/u:0; const p=Number(e.precio_venta||0); return {costeUnidad,margenReal:p>0?((p-costeUnidad)/p)*100:0}; }
function Tarjeta({t,v}) { return <div style={{padding:14,border:"1px solid #4b4453",borderRadius:12}}><div style={{opacity:.7}}>{t}</div><strong style={{fontSize:22}}>{v}</strong></div>; }
function euros(v){return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(Number(v||0));}
function numero(v){return new Intl.NumberFormat("es-ES",{maximumFractionDigits:2}).format(Number(v||0));}
const campo={display:"block",width:"100%",boxSizing:"border-box",marginTop:8,minHeight:46,padding:"0 12px",borderRadius:10,border:"1px solid #4b4453",background:"#151319",color:"white",fontSize:16};
const box={marginBottom:26,padding:20,border:"1px solid #3a3440",borderRadius:16,background:"rgba(255,255,255,.02)"};
const grid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14};
const gridLinea={display:"grid",gridTemplateColumns:"minmax(280px,2fr) minmax(140px,1fr) auto",gap:10,alignItems:"end"};
const vinculo={marginTop:18,padding:14,borderRadius:12,background:"rgba(131,78,160,.14)",border:"1px solid rgba(189,143,214,.35)"};
const fila={display:"grid",gridTemplateColumns:"minmax(220px,2fr) 80px 140px 120px auto",gap:10,alignItems:"center",padding:"10px 0",borderBottom:"1px solid #2f2a34"};
const calculos={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginTop:18};
const tabla={width:"100%",borderCollapse:"collapse",minWidth:900}; const th={textAlign:"left",padding:12,borderBottom:"1px solid #4b4453"}; const td={padding:12,borderBottom:"1px solid #2f2a34",verticalAlign:"top"};
export default Escandallos;
