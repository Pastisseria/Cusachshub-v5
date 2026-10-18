import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";
import { determinarZonaProduccion } from "./produccion.jsx";
import { calcularRecipientes, resumirRecipientes } from "../lib/compras-recipientes.js";

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
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState("");
  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const reglas = await leer(() => supabase.from("compras_recipientes").select("producto_clave, recipiente, activo").order("producto_clave"));
        if (!activo) return;
        setReglas(Object.fromEntries(reglas.map(r => [r.producto_clave,r])));
        const menaje = await leer(() => supabase.from("menaje").select("id, nombre").eq("activo",true).order("id"));
        if (activo) setMenaje(menaje);
      } catch (err) { if (activo) setError(err.message || "No se pudieron cargar los recipientes."); }
      finally { if (activo) setCargando(false); }
    }
    cargar();
    return () => { activo = false; };
  }, []);
  const filas = useMemo(() => calcularRecipientes(datos,tipo,determinarZonaProduccion), [datos,tipo]);
  const resumen = useMemo(() => resumirRecipientes(filas,reglas), [filas,reglas]);
  const pendientes = filas.filter(f => !reglas[f.clave]?.activo).length;
  async function guardar(fila) {
    const recipiente = (borradores[fila.clave] ?? reglas[fila.clave]?.recipiente ?? "").trim();
    if (!recipiente) { setError("Escribe o selecciona el recipiente antes de guardar."); return; }
    setGuardando(fila.clave); setError(""); setMensaje("");
    try {
      const regla = {producto_clave:fila.clave, recipiente, unidades_por_recipiente:1, activo:true, updated_at:new Date().toISOString()};
      const {data, error} = await supabase.from("compras_recipientes").upsert(regla, {onConflict:"producto_clave"}).select("producto_clave, recipiente, activo").single();
      if (error) throw error;
      setReglas(r => ({...r,[fila.clave]:data}));
      setMensaje("Recipiente guardado. Se aplicará también a las próximas semanas.");
    } catch (err) { setError(err.message || "No se pudo guardar el recipiente."); }
    finally { setGuardando(""); }
  }
  return <section style={{marginTop:28, padding:20, border:"1px solid #d8cedd", borderRadius:16}}>
    <h3>Recipientes de Cocina</h3>
    <p>1 recipiente por cada pieza. Elige el vaso, recipiente o caja de cada producto y guarda la asociación para las próximas semanas.</p>
    <p>{tipo === "confirmados" ? "Necesidades confirmadas" : "Previsiones sin confirmar"} · Sin descontar stock.</p>
    {error && <p role="alert">{error}</p>}
    {mensaje && <p role="status">{mensaje}</p>}
    {cargando ? <p>Cargando recipientes…</p> : <>
      {pendientes > 0 && <p>{pendientes} producto(s) pendientes de asignar recipiente; todavía no se incluyen en el resumen.</p>}
      <datalist id="recipientes-menaje">{menaje.map(m => <option value={m.nombre} key={m.id}/>)}</datalist>
      <div style={{overflowX:"auto"}}>
        <table className="produccion-totales-tabla"><thead><tr><th>Producto</th><th>Piezas / recipientes</th><th>Recipiente que usamos</th><th>Guardar</th></tr></thead>
          <tbody>{filas.map(f => <tr key={f.clave}><th scope="row">{f.nombre}<small style={{display:"block"}}>Unidad del presupuesto: {f.unidad}</small></th><td>{f.total}</td>
            <td><input aria-label={"Recipiente para " + f.nombre} list="recipientes-menaje" placeholder="Ej. Vaso de ensalada" style={{minWidth:250,width:"100%"}} value={borradores[f.clave] ?? reglas[f.clave]?.recipiente ?? ""} onChange={e => setBorradores(b => ({...b,[f.clave]:e.target.value}))}/></td>
            <td><button disabled={!!guardando} onClick={() => guardar(f)}>{guardando===f.clave ? "Guardando…" : "Guardar"}</button></td></tr>)}</tbody>
        </table>
      </div>
      {!filas.length && <p>No hay productos de Cocina para esta semana y selección.</p>}
      <h4>Resumen semanal de recipientes</h4>
      {resumen.length === 0 ? <p>Asigna los recipientes de los productos para ver las cantidades.</p> :
        <div style={{overflowX:"auto"}}><table className="produccion-totales-tabla">
          <thead><tr><th>Recipiente</th>{dias.map(d => <th key={d}>{d.slice(8)}/{d.slice(5,7)}</th>)}<th>Total</th></tr></thead>
          <tbody>{resumen.map(r => <tr key={r.clave}><th scope="row">{r.nombre}</th>{dias.map(d => <td key={d}>{r.dias[d] || "—"}</td>)}<td><strong>{r.total}</strong></td></tr>)}</tbody>
        </table></div>}
    </>}
  </section>;
}
