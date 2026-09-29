import { useNavigate } from "react-router-dom";

const modulosHigiene = [
  ["🩺", "Preparación para Sanidad", "Cuestionarios oficiales, carencias documentales y seguimiento de lo pendiente.", "/higiene/preparacion-sanidad"],
  ["🌡️", "Temperaturas", "Registro de cámaras, congeladores y elaboraciones mediante PDF.", "/higiene/temperaturas"],
  ["🧹", "Limpieza y desinfección", "Plan de tareas, responsables y comprobaciones.", "/higiene/limpieza"],
  ["🔧", "Plan de mantenimiento", "Mantenimiento preventivo de equipos, instalaciones y transporte.", "/higiene/plan-mantenimiento"],
  ["🏷️", "Modelo de etiquetas", "Crear, guardar e imprimir etiquetas de materias primas y elaboraciones.", "/higiene/modelos-etiquetas"],
  ["📦", "Trazabilidad", "Control de lotes, materias primas y destino.", "/higiene/trazabilidad"],
  ["✅", "Control de recepción", "Fotos de albaranes convertidas y archivadas individualmente en PDF.", "/higiene/control-recepcion"],
  ["⚠️", "Incidencias", "Desviaciones detectadas y medidas correctoras.", "/higiene/incidencias"],
  ["🛢️", "Aceite usado", "Recogidas, cantidades y justificantes PDF del gestor.", "/higiene/aceite"],
  ["💧", "Facturas de agua", "Facturas, periodos, consumo e importes.", "/higiene/agua"],
  ["🛡️", "Ibertrac", "Partes de servicio, productos utilizados y fichas técnicas.", "/higiene/ibertrac"],
  ["🦺", "Personal y riesgos laborales", "Fichas del equipo, formaciones, EPIs, certificados y vigilancia de la salud.", "/higiene/personal-riesgos"],
  ["🧂", "Ingredientes", "Materias primas, alérgenos, costes y proveedores.", "/higiene/ingredientes"],
  ["📊", "Escandallos", "Costes de elaboración, márgenes y precios de venta.", "/higiene/escandallos"],
  ["📖", "Recetas", "Fichas de elaboración vinculadas con ingredientes y escandallos.", "/higiene/recetas"],
];

export default function Higiene() {
  const navigate = useNavigate();
  const tarjeta=(icono,titulo,descripcion,ruta)=><article key={titulo} className="tarjeta-higiene" role="button" tabIndex="0" onClick={()=>navigate(ruta)} onKeyDown={e=>e.key==="Enter"&&navigate(ruta)} style={{cursor:"pointer"}}><span>{icono}</span><h2>{titulo}</h2><p>{descripcion}</p><small style={{fontWeight:800}}>ABRIR →</small></article>;
  return <div className="pagina-higiene">
    <header className="cabecera-higiene"><div><p className="etiqueta-acceso">ESPACIO PRIVADO · ADMINISTRADOR</p><h1>Buenas Prácticas de Higiene</h1><p>El espacio de autocontrol de Pastisseria Cusachs.</p></div><span className="sello-higiene">🧼</span></header>
    <section className="aviso-construccion"><strong>Recepción y trazabilidad</strong><p>Puedes introducir los albaranes manualmente y crear un catálogo de productos diferente para cada proveedor.</p></section>
    <div className="rejilla-higiene">
      {tarjeta("📝","Introducir albarán manual","Elige el proveedor, busca sus productos guardados o crea nuevos y guarda el albarán.","/higiene/albaran-manual")}
      {tarjeta("📚","Histórico de albaranes","Consulta los albaranes guardados, tanto manuales como leídos automáticamente.","/higiene/albaranes")}
      {tarjeta("🗂️","Productos por proveedor","Consulta y edita el catálogo de productos guardados para cada proveedor.","/higiene/catalogo-proveedores")}
      {modulosHigiene.map(([i,t,d,r])=>tarjeta(i,t,d,r))}
    </div>
  </div>;
}
