import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function Dashboard() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [presupuestos, setPresupuestos] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { cargarMes(); }, [mes, anio]);

  async function cargarMes() {
    setCargando(true); setError("");
    try {
      const mm = String(mes).padStart(2,"0");
      const ultimo = new Date(anio, mes, 0).getDate();
      const inicio = `${anio}-${mm}-01`;
      const fin = `${anio}-${mm}-${String(ultimo).padStart(2,"0")}`;
      const [pRes, fRes] = await Promise.all([
        supabase.from("presupuestos").select("id,numero,fecha,estado,tipo_documento,subtotal,iva_total,total,facturado_externamente,fecha_facturacion,factura_id,cliente_id,clientes(id,nombre,empresa)").gte("fecha",inicio).lte("fecha",fin).order("fecha",{ascending:true}),
        supabase.from("facturas").select("id,numero,presupuesto_id,fecha_factura,total,estado,nombre_cliente,fecha_pago").gte("fecha_factura",inicio).lte("fecha_factura",fin)
      ]);
      if (pRes.error) throw pRes.error;
      if (fRes.error) throw fRes.error;
      setPresupuestos((pRes.data || []).filter(esCatering));
      setFacturas((fRes.data || []).filter(f => normalizar(f.estado) !== "anulada"));
    } catch (e) { setError(e?.message || "No se ha podido cargar el Dashboard."); }
    finally { setCargando(false); }
  }

  const filas = useMemo(() => {
    const mapa = new Map(facturas.filter(f => f.presupuesto_id).map(f => [String(f.presupuesto_id), f]));
    return presupuestos.map(p => {
      const factura = mapa.get(String(p.id)) || null;
      return {...p, factura, estadoControl: factura ? "Facturado" : obtenerEstado(p)};
    });
  }, [presupuestos, facturas]);

  const resumen = useMemo(() => {
    const facturasValidas = facturas.filter(f => normalizar(f.estado) !== "anulada");
    const dinero = facturasValidas.reduce((s,f) => s + Number(f.total || 0), 0);
    const cobrado = facturasValidas
      .filter(f => normalizar(f.estado) === "pagada" || Boolean(f.fecha_pago))
      .reduce((s,f) => s + Number(f.total || 0), 0);
    return {
      presupuestados: filas.length,
      aceptados: filas.filter(p => ["Facturado","Aceptado · pendiente de facturar"].includes(p.estadoControl)).length,
      pendientes: filas.filter(p => p.estadoControl === "Aceptado · pendiente de facturar").length,
      facturados: filas.filter(p => p.estadoControl === "Facturado").length,
      cancelados: filas.filter(p => p.estadoControl === "Cancelado").length,
      dinero,
      cobrado,
      pendienteCobro: Math.max(0, dinero - cobrado)
    };
  }, [filas, facturas]);

  const visibles = filas.filter(p => filtro === "todos" || (filtro === "pendientes" && p.estadoControl === "Aceptado · pendiente de facturar") || (filtro === "facturados" && ["Facturado","Pagado"].includes(p.estadoControl)) || (filtro === "cancelados" && p.estadoControl === "Cancelado"));

  return <section className="dm-wrap">
    <style>{CSS}</style>
    <header className="dm-header">
      <div><p className="dm-kicker">CUSACHS HUB · CONTROL COMERCIAL</p><h1>Dashboard mensual de Catering</h1><p>Presupuestos, facturación y estado de todos los caterings del mes.</p></div>
      <button className="dm-refresh" onClick={cargarMes} disabled={cargando}>{cargando ? "Actualizando..." : "↻ Actualizar"}</button>
    </header>

    <div className="dm-selectores">
      <label>Mes <select value={mes} onChange={e=>setMes(Number(e.target.value))}>{MESES.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></label>
      <label>Año <select value={anio} onChange={e=>setAnio(Number(e.target.value))}>{Array.from({length:6},(_,i)=>hoy.getFullYear()-i).map(a=><option key={a}>{a}</option>)}</select></label>
    </div>

    {error && <div className="dm-error">{error}</div>}
    {cargando ? <div className="dm-cargando">Cargando el mes completo...</div> : <>
      <div className="dm-cards">
        <Card titulo="Caterings presupuestados" valor={resumen.presupuestados}/><Card titulo="Aceptados" valor={resumen.aceptados}/><Card titulo="Pendientes de facturar" valor={resumen.pendientes}/><Card titulo="Caterings facturados" valor={resumen.facturados}/><Card titulo="Cancelados" valor={resumen.cancelados}/><Card titulo="Facturación real" valor={euros(resumen.dinero)}/><Card titulo="Cobrado" valor={euros(resumen.cobrado)}/><Card titulo="Pendiente de cobro" valor={euros(resumen.pendienteCobro)}/>
      </div>

      <section className="dm-listado">
        <div className="dm-listado-head"><div><p className="dm-kicker">MES COMPLETO</p><h2>Todos los caterings de {MESES[mes-1]} {anio}</h2><p>{visibles.length} de {filas.length} caterings.</p></div>
          <div className="dm-filtros">{[["todos","Todos"],["pendientes","Pendientes de facturar"],["facturados","Facturados"],["cancelados","Cancelados"]].map(([v,t])=><button key={v} className={filtro===v?"activo":""} onClick={()=>setFiltro(v)}>{t}</button>)}</div>
        </div>
        <div className="dm-tabla-wrap"><table><thead><tr><th>Fecha catering</th><th>Nº presupuesto</th><th>Cliente</th><th>Importe</th><th>Estado</th><th>Nº factura</th><th></th></tr></thead><tbody>
          {visibles.length===0 ? <tr><td colSpan="7" className="dm-vacio">No hay caterings con este estado en el mes seleccionado.</td></tr> : visibles.map(p => <tr key={p.id}><td><strong>{fecha(p.fecha)}</strong></td><td>{p.numero || "—"}</td><td>{p.clientes?.empresa || p.clientes?.nombre || p.factura?.nombre_cliente || "Sin cliente"}</td><td><strong>{euros(p.total || p.subtotal)}</strong></td><td><span className={`dm-estado ${clase(p.estadoControl)}`}>{p.estadoControl}</span></td><td>{p.factura?.numero || (p.estadoControl==="Facturado"?"Facturado":"—")}</td><td><a href={`${import.meta.env.BASE_URL}#/presupuestos`}>Abrir</a></td></tr>)}
        </tbody></table></div>
      </section>
    </>}
  </section>;
}

function Card({titulo,valor}) { return <div className="dm-card"><span>{titulo}</span><strong>{valor}</strong></div>; }
function normalizar(v){return String(v||"").trim().toLowerCase();}
function esCatering(p){return !["visitador médico","visitador medico","tienda"].includes(normalizar(p.tipo_documento));}
function obtenerEstadoReal(p){if(normalizar(p.estado)==="cancelado")return"Cancelado";if(normalizar(p.estado)==="aceptado"||p.facturado_externamente||p.fecha_facturacion||normalizar(p.estado).includes("factur"))return"Aceptado · pendiente de facturar";if(normalizar(p.estado)==="enviado")return"Enviado";if(normalizar(p.estado)==="borrador")return"Borrador";return p.estado||"Sin estado";}
function clase(e){e=normalizar(e);if(e.startsWith("facturado")||e==="pagado")return"facturado";if(e.startsWith("cancelado"))return"cancelado";if(e.includes("pendiente de facturar"))return"pendiente";if(e==="enviado")return"enviado";return"borrador";}
function euros(v){return Number(v||0).toLocaleString("es-ES",{style:"currency",currency:"EUR"});}
function fecha(v){if(!v)return"—";const[y,m,d]=String(v).slice(0,10).split("-");return `${d}/${m}/${y}`;}

const CSS=`
.dm-wrap{padding:30px}.dm-header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap}.dm-header h1,.dm-listado h2{margin:0;color:#21162a}.dm-header p,.dm-listado p{color:#766d7a}.dm-kicker{margin:0 0 7px!important;color:#6d2f8e!important;font-size:12px;font-weight:900;letter-spacing:2px}.dm-refresh{padding:11px 15px;border:0;border-radius:10px;background:#6d2f8e;color:#fff;font-weight:800}.dm-selectores{display:flex;gap:12px;margin:22px 0}.dm-selectores label{font-weight:800;color:#5c257c}.dm-selectores select{margin-left:7px;padding:9px 12px;border:1px solid #d8cadd;border-radius:9px;background:#fff}.dm-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.dm-card{padding:18px;border:1px solid #e2d6e7;border-radius:16px;background:#fff}.dm-card span{display:block;color:#765d7f;font-size:11px;font-weight:900;text-transform:uppercase}.dm-card strong{display:block;margin-top:7px;color:#5c257c;font-size:25px}.dm-listado{margin-top:28px;padding:24px;border:1px solid #ddcfe3;border-radius:20px;background:#fff}.dm-listado-head{display:flex;justify-content:space-between;align-items:flex-end;gap:15px;flex-wrap:wrap;margin-bottom:16px}.dm-filtros{display:flex;gap:8px;flex-wrap:wrap}.dm-filtros button{padding:8px 12px;border:1px solid #d8cadd;border-radius:999px;background:#fff;color:#5c257c;font-weight:800}.dm-filtros button.activo{background:#5c257c;color:#fff}.dm-tabla-wrap{overflow:auto;border:1px solid #eee7f0;border-radius:14px}.dm-tabla-wrap table{width:100%;min-width:900px;border-collapse:collapse}.dm-tabla-wrap th{padding:11px 12px;text-align:left;background:#f7f2f9;color:#5c257c;font-size:12px;text-transform:uppercase}.dm-tabla-wrap td{padding:12px;border-top:1px solid #eee7f0}.dm-tabla-wrap a{padding:7px 10px;border-radius:8px;background:#5c257c;color:#fff;text-decoration:none;font-weight:800}.dm-estado{display:inline-flex;padding:6px 9px;border-radius:999px;font-size:12px;font-weight:900;white-space:nowrap}.dm-estado.facturado{background:#e6f5ea;color:#26733c}.dm-estado.cancelado{background:#fde7ec;color:#a42f46}.dm-estado.pendiente{background:#fff1c9;color:#805b00}.dm-estado.enviado{background:#e8f1ff;color:#285a9d}.dm-estado.borrador{background:#efedf0;color:#655d68}.dm-vacio,.dm-cargando{text-align:center;padding:30px;color:#766d7a}.dm-error{padding:14px;background:#fde7ec;color:#a42f46;border-radius:10px}@media(max-width:1100px){.dm-cards{grid-template-columns:repeat(3,1fr)}}@media(max-width:700px){.dm-wrap{padding:16px}.dm-cards{grid-template-columns:repeat(2,1fr)}.dm-listado{padding:15px}}
`;
