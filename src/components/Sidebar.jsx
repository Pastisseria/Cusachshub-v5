import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";

function Sidebar({ abierto = false, onCerrar }) {
  const { perfil, usuario, esAdministrador, cerrarSesion } = useAuth();
  const claseEnlace = ({ isActive }) =>
    isActive ? "menu-item active" : "menu-item";

  function mostrarListadoPresupuestos() {
    window.dispatchEvent(new CustomEvent("cusachs:mostrar-listado-presupuestos"));
  }

  return (
    <aside
      className={`sidebar${abierto ? " sidebar-abierta" : ""}`}
      aria-label="Menú principal"
      onClick={(event) => {
        if (event.target.closest("a")) onCerrar?.();
      }}
    >
      <div className="logo">
        <h2>CUSACHS HUB</h2>
        <button
          type="button"
          className="cerrar-menu-tablet"
          aria-label="Cerrar menú principal"
          onClick={onCerrar}
        >
          ×
        </button>
      </div>

      {/* INICIO */}
      <div className="menu-section">
        <h4>INICIO</h4>

        <NavLink to={esAdministrador ? "/espacios" : "/catering"} className={claseEnlace}>
          🏠 Inicio
        </NavLink>

        {esAdministrador && (
          <NavLink to="/dashboard" className={claseEnlace}>
            📊 Dashboard
          </NavLink>
        )}
      </div>

      {/* COMERCIAL */}
      <div className="menu-section">
        <h4>COMERCIAL</h4>

        <NavLink to="/clientes" className={claseEnlace}>
          👥 Clientes
        </NavLink>

        <NavLink to="/productos" className={claseEnlace}>
          🍰 Productos
        </NavLink>

        <NavLink
          to="/presupuestos"
          className={claseEnlace}
          onClick={mostrarListadoPresupuestos}
        >
          📄 Presupuestos
        </NavLink>

        <NavLink
          to="/presupuestos-estandar"
          className={claseEnlace}
        >
          ⭐ Presupuestos estándar
        </NavLink>
      </div>

      {/* CATERING */}
      <div className="menu-section">
        <h4>CATERING</h4>

        <NavLink to="/catering" className={claseEnlace}>
          🍽 Catering
        </NavLink>

        <NavLink to="/menaje" className={claseEnlace}>
          🍴 Menaje
        </NavLink>

        <NavLink to="/bebidas" className={claseEnlace}>
          🥤 Bebidas
        </NavLink>
      </div>

      {/* PRODUCCIÓN */}
      <div className="menu-section">
        <h4>PRODUCCIÓN</h4>

        <NavLink to="/produccion" className={claseEnlace}>
          🏭 Producción
        </NavLink>

        {esAdministrador && <>
          <NavLink to="/ingredientes" className={claseEnlace}>
            🧂 Ingredientes
          </NavLink>

          <NavLink to="/escandallos" className={claseEnlace}>
            📊 Escandallos
          </NavLink>

          <NavLink to="/recetas" className={claseEnlace}>
            📖 Recetas
          </NavLink>

          <NavLink to="/dietario" className={claseEnlace}>
            📅 Dietario
          </NavLink>
        </>}
      </div>

      {esAdministrador && <>
      {/* PERSONAL */}
      <div className="menu-section">
        <h4>PERSONAL</h4>

        <NavLink
          to="/horario-personal"
          className={claseEnlace}
        >
          👥 Horario de personal
        </NavLink>
      </div>

      {/* COMPRAS */}
      <div className="menu-section">
        <h4>COMPRAS</h4>

        <NavLink to="/proveedores" className={claseEnlace}>
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

        <NavLink to="/compras" className={claseEnlace}>
          🛒 Compras
        </NavLink>

        <hr
          style={{
            margin: "12px 0",
            opacity: 0.25,
          }}
        />

        <NavLink
          to="/importar-albaranes"
          className={claseEnlace}
        >
          📄 Lector clásico
        </NavLink>

        <NavLink
          to="/importador-albaranes-v3"
          className={claseEnlace}
        >
          🧠 Lector Inteligente V3
        </NavLink>

        <NavLink to="/albaranes" className={claseEnlace}>
          🗂️ Historial de albaranes
        </NavLink>
      </div>

      {/* VISITADORES */}
      <div className="menu-section">
        <h4>VISITADORES</h4>

        <NavLink to="/visitadores" className={claseEnlace}>
          🩺 Visitadores Médicos
        </NavLink>
      </div>

      {/* ADMINISTRACIÓN */}
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
      </>}

      {esAdministrador && (
        <div className="menu-section">
          <h4>HIGIENE</h4>
          <NavLink to="/higiene" className={claseEnlace}>
            🧼 Bones pràctiques
          </NavLink>
        </div>
      )}

      <div className="sesion-sidebar">
        <strong>{perfil?.nombre || usuario?.email}</strong>
        <span>{esAdministrador ? "Administrador" : "Catering"}</span>
        <button type="button" onClick={cerrarSesion}>Cerrar sesión</button>
      </div>
    </aside>
  );
}

export default Sidebar;
