import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const EQUIPOS = [
  ["Equipos de frío", "Mensual / Semestral / Anual", "Control visual general; luces y protectores; gomas y cierres; aislamiento térmico; nivel de gas; limpieza de condensadores y evaporadores; ciclos de descarche; calibración de sondas", "Empresa frigorista Servifred"],
  ["Maquinaria", "Semestral / Anual", "Cambio de correas; revisión de comandos; estado general; termostato de freidoras", "Personal interno"],
  ["Termómetros y básculas", "Anual", "Calibración", ""],
  ["Instalaciones de agua y fregaderos", "Mensual", "Ausencia de fugas y corrosión; estado de juntas, tuberías y desagües", "Fontanería"],
  ["Instalaciones de luz", "Semanal", "Ausencia de bombillas o fluorescentes fundidos; estado de protectores", "Personal interno"],
  ["Descalcificador del lavaplatos", "Mensual / Semestral", "Nivel de sal; cambio de filtros", ""],
  ["Mesas y soportes de trabajo", "Semestral", "Estado general", ""],
  ["Paredes, suelos y techos", "Anual", "Estado general", ""],
  ["Sanitarios, vestuarios y anexos", "Trimestral", "Estado general", ""],
  ["Utillaje, contenedores plásticos y cubos", "Trimestral", "Retirar y renovar los elementos deteriorados", ""],
  ["Isotermos de transporte", "Semestral", "Estado general", ""],
  ["Estado del vestuario", "Anual", "Estado general", ""],
  ["Furgoneta de transporte", "Trimestral", "Aceite y filtro; filtros; frenos; suspensión y dirección; neumáticos; batería; fluidos; diagnóstico OBD; luces y señalización; correas y mangueras; sistema de escape", ""],
];

export default function PlanMantenimiento() {
  const [revisiones, setRevisiones] = useState({});
  const realizadas = useMemo(() => Object.values(revisiones).filter(Boolean).length, [revisiones]);
  return <div style={{padding:24,maxWidth:1400,margin:"0 auto"}}>
    <div className="no-print" style={{marginBottom:20}}><Link to="/higiene">← Volver a Buenas Prácticas</Link></div>
    <header style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"end",marginBottom:24}}><div><p style={{fontWeight:800,color:"#6b4aa0"}}>PR-MANT-01 · BUENAS PRÁCTICAS</p><h1 style={{margin:"4px 0"}}>🔧 Plan de mantenimiento preventivo</h1><p>Control periódico de equipos, instalaciones y transporte.</p></div><div className="no-print" style={{padding:16,border:"1px solid #ddd",borderRadius:12}}><b>{realizadas}/{EQUIPOS.length}</b><div>revisiones marcadas</div></div></header>
    <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",background:"white"}}><thead><tr>{["Equipamiento","Frecuencia","Revisión de funcionamiento","Responsable","Realizado"].map(x=><th key={x} style={{border:"1px solid #bbb",padding:10,textAlign:"left"}}>{x}</th>)}</tr></thead><tbody>{EQUIPOS.map((r,i)=><tr key={r[0]}><td style={{border:"1px solid #ccc",padding:10,fontWeight:700}}>{r[0]}</td><td style={{border:"1px solid #ccc",padding:10}}>{r[1]}</td><td style={{border:"1px solid #ccc",padding:10}}>{r[2]}</td><td style={{border:"1px solid #ccc",padding:10}}>{r[3]||"—"}</td><td className="no-print" style={{border:"1px solid #ccc",padding:10,textAlign:"center"}}><input type="checkbox" checked={!!revisiones[i]} onChange={e=>setRevisiones({...revisiones,[i]:e.target.checked})}/></td></tr>)}</tbody></table></div>
    <button className="no-print" onClick={()=>window.print()} style={{marginTop:20,padding:"12px 18px",fontWeight:800}}>🖨️ Imprimir plan</button>
  </div>;
}
