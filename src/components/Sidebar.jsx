import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">
        <h2>CUSACHS HUB</h2>
      </div>

      <div className="menu-section">
        <h4>INICIO</h4>
        <NavLink to="/dashboard" className="menu-item">
          📊 Dashboard
        </NavLink>
      </div>

      {/* COMERCIAL */}
      <div className="menu-section">
        <h4>COMERCIAL</h4>

        <NavLink to="/clientes" className="menu-item">
          👥 Clientes
        </NavLink>

        <NavLink to="/productos" className="menu-item">
          🍰 Productos
        </NavLink>

        <NavLink to="/presupuestos" className="menu-item">
          📄 Presupuestos
        </NavLink>
      </div>

      {/* CATERING */}
      <div className="menu-section">
        <h4>CATERING</h4>

        <NavLink to="/catering" className="menu-item">
          🍽 Catering
        </NavLink>

        <NavLink to="/menaje" className="menu-item">
          🍴 Menaje
        </NavLink>

        <NavLink to="/bebidas" className="menu-item">
          🥤 Bebidas
        </NavLink>
      </div>

      {/* PRODUCCIÓN */}
      <div className="menu-section">
        <h4>PRODUCCIÓN</h4>

        <NavLink to="/produccion" className="menu-item">
          🏭 Producción
        </NavLink>

        <NavLink to="/ingredientes" className="menu-item">
          🧂 Ingredientes
        </NavLink>

        <NavLink to="/escandallos" className="menu-item">
          📊 Escandallos
        </NavLink>

        <NavLink to="/dietario" className="menu-item">
          📅 Dietario
        </NavLink>
      </div>

      {/* COMPRAS */}
      <div className="menu-section">
        <h4>COMPRAS</h4>

        <NavLink to="/proveedores" className="menu-item">
          🚚 Proveedores
        </NavLink>

        <NavLink to="/catalogo-proveedores" className="menu-item">
          📚 Catálogo proveedores
        </NavLink>

        <NavLink to="/comparador-precios" className="menu-item">
          💶 Comparador precios
        </NavLink>

        <NavLink to="/compras" className="menu-item">
          🛒 Compras
        </NavLink>
      </div>

      {/* VISITADORES */}
      <div className="menu-section">
        <h4>VISITADORES</h4>

        <NavLink to="/visitadores" className="menu-item">
          🩺 Visitadores Médicos
        </NavLink>
      </div>

      {/* ADMINISTRACIÓN */}
      <div className="menu-section">
        <h4>ADMINISTRACIÓN</h4>

        <NavLink to="/importar-emails" className="menu-item">
          📥 Importar emails
        </NavLink>

        <NavLink to="/facturacion" className="menu-item">
          💳 Facturación
        </NavLink>

        <NavLink to="/estadisticas" className="menu-item">
          📈 Estadísticas
        </NavLink>

        <NavLink to="/configuracion" className="menu-item">
          ⚙ Configuración
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;