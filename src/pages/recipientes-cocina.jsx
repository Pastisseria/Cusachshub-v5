import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";
import { determinarZonaProduccion } from "./produccion.jsx";
import { calcularRecipientes, resumirRecipientes, calcularFaltantes } from "../lib/compras-recipientes.js";

async function leer(consulta) {
  const filas = [];
  for (let i=0; ; i+=500) {
    const {data, error} = await consulta().range(i,i+499);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < 500) return filas;
  }
}
export default function RecipientesCocina({datos, dias, tipo}) {
  const [reglas, setReglas] = useState({});
  const [borradores, setBorradores] = useState({});
  const [menaje, setMenaje] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [proveedoresEditados, setProveedoresEditados] = useState({});
  const [vinculos, setVinculos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState("");
  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const reglas = await leer(() => supabase.from("compras_recipientes").select("producto_clave, recipiente, activo, menaje_id").order("producto_clave"));
        if (!activo) return;
        setReglas(Object.fromEntries(reglas.map(r => [r.producto_clave,r])));
        const menaje = await leer(() => supabase.from("menaje").select("id, nombre, stock_total, stock_reservado, proveedor_id, activo").order("id"));
        if (activo) setMenaje(menaje);
        const proveedores = await leer(() => supabase.from("proveedores").select("id, nombre, nombre_comercial").order("id"));
        if (activo) setProveedores(proveedores);
      } catch (err) { if (activo) setError(err.message || "No se pudieron cargar los recipientes."); }
      finally { if (activo) setCargando(false); }
    }
    cargar();
    return () => { activo = false; };
  }, []);
  const filas = useMemo(() => calcularRecipientes(datos,tipo,determinarZonaProduccion), [datos,tipo]);
  const resumen = useMemo(() => resumirRecipientes(filas,reglas), [filas,reglas]);
  const compras = useMemo(() => {
    const confirmados = tipo === "previsiones" ? resumirRecipientes(calcularRecipientes(datos,"confirmados",determinarZonaProduccion),reglas) : [];
    return calcularFaltantes(resumen,menaje,confirmados);
  }, [resumen,menaje,datos,tipo,reglas]);
  const pendientes = filas.filter(f => !reglas[f.clave]?.activo).length;
  async function guardar(fila) {
    const menajeId = vinculos[fila.clave] ?? reglas[fila.clave]?.menaje_id ?? "";
    const articulo = menaje.find(m => String(m.id) === String(menajeId));
    const recipiente = articulo?.nombre || (borradores[fila.clave] ?? reglas[fila.clave]?.recipiente ?? "").trim();
    if (!recipiente) { setError("Escribe o selecciona el recipiente antes de guardar."); return; }
    setGuardando(fila.clave); setError(""); setMensaje("");
    try {
      const regla = {producto_clave:fila.clave, recipiente, menaje_id:menajeId || null, unidades_por_recipiente:1, activo:true, updated_at:new Date().toISOString()};
      const {data, error} = await supabase.from("compras_recipientes").upsert(regla, {onConflict:"producto_clave"}).select("producto_clave, recipiente, activo, menaje_id").single();
      if (error) throw error;
      setReglas(r => ({...r,[fila.clave]:data}));
      setMensaje("Recipiente guardado. Se aplicará también a las próximas semanas.");
    } catch (err) { setError(err.message || "No se pudo guardar el recipiente."); }
    finally { setGuardando(""); }
  }
  async function guardarProveedor(r) {
    setGuardando(r.clave); setError(""); setMensaje("");
    try {
      const proveedor_id = proveedoresEditados[r.clave] ?? r.proveedor_id ?? "";
      const {data,error} = await supabase.from("menaje").update({proveedor_id:proveedor_id || null, updated_at:new Date().toISOString()}).eq("id",r.menaje_id).select("id, nombre, stock_total, stock_reservado, proveedor_id, activo").single();
      if (error) throw error;
      setMenaje(items => items.map(m => String(m.id) === String(data.id) ? data : m));
      setMensaje("Proveedor guardado para este recipiente.");
    } catch (err) { setError(err.message || "No se pudo guardar el proveedor."); }
    finally { setGuardando(""); }
  }
  return <section style={{marginTop:28, padding:20, border:"1px solid #d8cedd", borderRadius:16}}>
    <h3>Recipientes de Cocina</h3>
    <p>1 recipiente por cada pieza. Elige el vaso, recipiente o caja de cada producto y guarda la asociación para las próximas semanas.</p>
    <p>{tipo === "confirmados" ? "Necesidades confirmadas" : "Previsiones sin confirmar"}</p>
    <p>Vincula el recipiente con un artículo de <Link to="/menaje">Menaje</Link> para usar su stock. Disponible = total menos reservado, en piezas. Puedes actualizar las existencias en Menaje.</p>
    {tipo === "previsiones" && <p>Los faltantes de previsiones se calculan con el stock que quedaría tras cubrir las necesidades confirmadas.</p>}
    <p>Este cálculo no descuenta ni reserva existencias automáticamente.</p>
    {error && <p role="alert">{error}</p>}
    {mensaje && <p role="status">{mensaje}</p>}
    {cargando ? <p>Cargando recipientes…</p> : <>
      {pendientes > 0 && <p>{pendientes} producto(s) pendientes de asignar recipiente; todavía no se incluyen en el resumen.</p>}
      <datalist id="recipientes-menaje">{menaje.map(m => <option value={m.nombre} key={m.id}/>)}</datalist>
      <div style={{overflowX:"auto"}}>
        <table className="produccion-totales-tabla"><thead><tr><th>Producto</th><th>Piezas / recipientes</th><th>Recipiente que usamos</th><th>Guardar</th></tr></thead>
          <tbody>{filas.map(f => <tr key={f.clave}><th scope="row">{f.nombre}<small style={{display:"block"}}>Unidad del presupuesto: {f.unidad}</small></th><td>{f.total}</td>
            <td><select aria-label={"Artículo de menaje para " + f.nombre} value={String(vinculos[f.clave] ?? reglas[f.clave]?.menaje_id ?? "")} onChange={e => setVinculos(v => ({...v,[f.clave]:e.target.value}))}>
              <option value="">Sin vincular a stock</option>
              {menaje.map(m => <option key={m.id} value={String(m.id)}>{m.nombre}{m.activo === false ? " (inactivo)" : ""}</option>)}
            </select><input disabled={!!(vinculos[f.clave] ?? reglas[f.clave]?.menaje_id)} aria-label={"Recipiente para " + f.nombre} list="recipientes-menaje" placeholder="Ej. Vaso de ensalada" style={{minWidth:250,width:"100%"}} value={borradores[f.clave] ?? reglas[f.clave]?.recipiente ?? ""} onChange={e => setBorradores(b => ({...b,[f.clave]:e.target.value}))}/></td>
            <td><button disabled={!!guardando} onClick={() => guardar(f)}>{guardando===f.clave ? "Guardando…" : "Guardar"}</button></td></tr>)}</tbody>
        </table>
      </div>
      {!filas.length && <p>No hay productos de Cocina para esta semana y selección.</p>}
      <h4>Resumen semanal de recipientes</h4>
      {resumen.length === 0 ? <p>Asigna los recipientes de los productos para ver las cantidades.</p> :
        <div style={{overflowX:"auto"}}><table className="produccion-totales-tabla">
          <thead><tr><th>Recipiente</th>{dias.map(d => <th key={d}>{d.slice(8)}/{d.slice(5,7)}</th>)}<th>Necesarios</th><th>Disponible</th>{tipo === "previsiones" && <th>Tras confirmados</th>}<th>Faltan por comprar</th><th>Proveedor</th></tr></thead>
          <tbody>{compras.map(r => <tr key={r.clave}><th scope="row">{r.nombre}</th>{dias.map(d => <td key={d}>{r.dias[d] || "—"}</td>)}<td><strong>{r.total}</strong></td><td>{r.disponible ?? "Sin vincular"}</td>
            {tipo === "previsiones" && <td>{r.trasConfirmados ?? "—"}</td>}
            <td><strong>{r.comprar ?? "Vincula el menaje"}</strong></td>
            <td>{r.articulo ? <><select aria-label={"Proveedor de " + r.nombre} value={proveedoresEditados[r.clave] ?? r.proveedor_id ?? ""} onChange={e => setProveedoresEditados(p => ({...p,[r.clave]:e.target.value}))}>
              <option value="">Sin proveedor</option>{proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre_comercial || p.nombre}</option>)}
            </select><button disabled={!!guardando} onClick={() => guardarProveedor(r)}>Guardar proveedor</button></> : "Vincula el menaje"}</td></tr>)}</tbody>
        </table></div>}
    </>}
  </section>;
}
