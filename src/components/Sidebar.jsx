import { NavLink } from "react-router-dom";

function Sidebar() {
  const claseEnlace = ({ isActive }) =>
    isActive
      ? "menu-item active"
      : "menu-item";

  return (
    <aside className="sidebar">
      <div className="logo">
        <h2>CUSACHS HUB</h2>
      </div>

      <div className="menu-section">
        <h4>INICIO</h4>

        <NavLink
          to="/dashboard"
          className={claseEnlace}
        >
          📊 Dashboard
        </NavLink>
      </div>

      <div className="menu-section">
        <h4>COMERCIAL</h4>

        <NavLink
          to="/clientes"
          className={claseEnlace}
        >
          👥 Clientes
        </NavLink>

        <NavLink
          to="/productos"
          className={claseEnlace}
        >
          🍰 Productos
        </NavLink>

        <NavLink
          to="/presupuestos"
          className={claseEnlace}
        >
          📄 Presupuestos
        </NavLink>
      </div>

      <div className="menu-section">
        <h4>CATERING</h4>

        <NavLink
          to="/catering"
          className={claseEnlace}
        >
          🍽 Catering
        </NavLink>

        <NavLink
          to="/menaje"
          className={claseEnlace}
        >
          🍴 Menaje
        </NavLink>

        <NavLink
          to="/bebidas"
          className={claseEnlace}
        >
          🥤 Bebidas
        </NavLink>
      </div>

      <div className="menu-section">
        <h4>PRODUCCIÓN</h4>

        <NavLink
          to="/produccion"
          className={claseEnlace}
        >
          🏭 Producción
        </NavLink>

        <NavLink
          to="/ingredientes"
          className={claseEnlace}
        >
          🧂 Ingredientes
        </NavLink>

        <NavLink
          to="/escandallos"
          className={claseEnlace}
        >
          📊 Escandallos
        </NavLink>

        <NavLink
          to="/dietario"
          className={claseEnlace}
        >
          📅 Dietario
        </NavLink>
      </div>

      <div className="menu-section">
        <h4>PERSONAL</h4>

        <NavLink
          to="/horario-personal"
          className={claseEnlace}
        >
          👥 Horario de personal
        </NavLink>
      </div>

      <div className="menu-section">
        <h4>COMPRAS</h4>

        <NavLink
          to="/proveedores"
          className={claseEnlace}
        >
          🚚 Proveedores
        </NavLink>

        <NavLink
          to="/catalogo-proveedores"
          className={claseEnlace}
        >
          📚 Catálogo proveedores
        </NavLink>

        <NavLink
          to="/comparador-precios"
          className={claseEnlace}
        >
          💶 Comparador precios
        </NavLink>

        <NavLink
          to="/compras"
          className={claseEnlace}
        >
          🛒 Compras
        </NavLink>

        <NavLink
          to="/importar-albaranes"
          className={claseEnlace}
        >
          📄 Leer albaranes
        </NavLink>
      </div>

      <div className="menu-section">
        <h4>VISITADORES</h4>

        <NavLink
          to="/visitadores"
          className={claseEnlace}
        >
          🩺 Visitadores Médicos
        </NavLink>
      </div>

      <div className="menu-section">
        <h4>ADMINISTRACIÓN</h4>

        <NavLink
          to="/importar-emails"
          className={claseEnlace}
        >
          📥 Importar emails
        </NavLink>

        <NavLink
          to="/facturacion"
          className={claseEnlace}
        >
          💳 Facturación
        </NavLink>

        <NavLink
          to="/estadisticas"
          className={claseEnlace}
        >
          📈 Estadísticas
        </NavLink>

        <NavLink
          to="/configuracion"
          className={claseEnlace}
        >
          ⚙ Configuración
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;