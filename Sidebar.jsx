import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, FileText, CalendarDays, Factory,
  BookOpen, Armchair, GlassWater, Wheat, Calculator, Truck, Tags,
  Scale, ShoppingCart, Stethoscope, ClipboardList, Receipt, Files,
  Menu, X
} from "lucide-react";

const grupos = [
  { titulo: "Principal", items: [
    ["/dashboard", "Dashboard", LayoutDashboard],
    ["/clientes", "Clientes", Users],
    ["/productos", "Productos", Package],
    ["/presupuestos", "Presupuestos", FileText],
  ]},
  { titulo: "Operaciones", items: [
    ["/catering", "Catering", CalendarDays],
    ["/produccion", "Producción", Factory],
    ["/dietario", "Dietario anual", BookOpen],
    ["/menaje", "Menaje", Armchair],
    ["/bebidas", "Bebidas", GlassWater],
  ]},
  { titulo: "Costes y compras", items: [
    ["/ingredientes", "Ingredientes", Wheat],
    ["/escandallos", "Escandallos", Calculator],
    ["/proveedores", "Proveedores", Truck],
    ["/catalogo-proveedores", "Catálogo proveedores", Tags],
    ["/comparador", "Comparador precios", Scale],
    ["/compras", "Compras", ShoppingCart],
  ]},
  { titulo: "Administración", items: [
    ["/visitadores-medicos", "Visitadores médicos", Stethoscope],
    ["/fichas-tecnicas", "Fichas técnicas", ClipboardList],
    ["/facturacion", "Facturación", Receipt],
    ["/motor-documentos", "Motor de documentos", Files],
  ]},
];

export default function Sidebar({ abierto, onToggle }) {
  return <>
    <button className="mobile-menu" onClick={onToggle} aria-label="Abrir menú">
      {abierto ? <X /> : <Menu />}
    </button>
    <aside className={`sidebar ${abierto ? "abierto" : ""}`}>
      <div className="brand">
        <div className="brand-mark">C</div>
        <div><strong>PASTISSERIA CUSACHS</strong><span>Cusachs Hub · Gestión integral</span></div>
      </div>
      <nav>
        {grupos.map((grupo) => <div className="nav-group" key={grupo.titulo}>
          <div className="nav-title">{grupo.titulo}</div>
          {grupo.items.map(([ruta, texto, Icon]) => (
            <NavLink key={ruta} to={ruta} onClick={onToggle} className={({isActive}) => isActive ? "active" : ""}>
              <Icon size={18}/><span>{texto}</span>
            </NavLink>
          ))}
        </div>)}
      </nav>
      <div className="sidebar-footer">Versión 3.0</div>
    </aside>
  </>;
}
