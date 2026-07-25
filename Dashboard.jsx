import { Link } from "react-router-dom";
import { Users, CalendarDays, Factory, Receipt, ArrowRight } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";

const cards=[
  ["Clientes", "Gestiona contactos y datos fiscales", "/clientes", Users],
  ["Catering", "Consulta y organiza próximos eventos", "/catering", CalendarDays],
  ["Producción", "Planifica pedidos y elaboraciones", "/produccion", Factory],
  ["Facturación", "Controla documentos pendientes", "/facturacion", Receipt],
];
export default function Dashboard(){return <><PageHeader eyebrow="Bienvenido" title="Panel de control" description="Todo el negocio organizado desde un único lugar."/><div className="hero"><div><span className="eyebrow">CUSACHS HUB V3</span><h2>Gestión clara para cada día</h2><p>Clientes, catering, producción, compras y facturación conectados en una interfaz pensada para tablet y ordenador.</p><Link className="btn" to="/catering">Ver calendario <ArrowRight size={17}/></Link></div><div className="hero-number"><strong>20</strong><span>módulos incluidos</span></div></div><div className="dashboard-grid">{cards.map(([t,d,r,I])=><Link className="dashboard-card" to={r} key={r}><I/><div><h3>{t}</h3><p>{d}</p></div><ArrowRight size={18}/></Link>)}</div><section className="panel"><h2>Primeros pasos</h2><ol className="steps"><li>Configura el archivo <code>.env</code> con tus claves de Supabase.</li><li>Crea las tablas usando el archivo <code>supabase-schema.sql</code>.</li><li>Empieza por Clientes, Productos y Proveedores.</li></ol></section></>}
