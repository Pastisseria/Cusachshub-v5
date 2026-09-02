import {
  HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { useState } from "react";

import Sidebar from "./components/Sidebar.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";
import { useAuth } from "./auth/useAuth.js";

import Dashboard from "./pages/dashboard.jsx";
import Clientes from "./pages/clientespages.jsx";
import FichaCliente from "./pages/FichaCliente.jsx";
import Productos from "./pages/productos.jsx";
import Presupuestos from "./pages/presupuestos.jsx";
import PresupuestosEstandar from "./pages/presupuestosestandar.jsx";
import Catering from "./pages/catering.jsx";
import Menaje from "./pages/menaje.jsx";
import Bebidas from "./pages/bebidas.jsx";
import Produccion from "./pages/produccion.jsx";
import Ingredientes from "./pages/ingredientes.jsx";
import Escandallos from "./pages/escandallos.jsx";
import Recetas from "./pages/recetas.jsx";
import DietarioAnual from "./pages/dietarioanual.jsx";
import HorarioPersonal from "./pages/horariopersonal.jsx";
import Proveedores from "./pages/proveedores.jsx";
import CatalogoProveedores from "./pages/catalogoproveedores.jsx";
import ComparadorPrecios from "./pages/comparadorprecios.jsx";
import Compras from "./pages/compras.jsx";
import ImportadorAlbaranes from "./pages/ImportadorAlbaranes.jsx";
import ImportadorAlbaranesV3 from "./pages/ImportadorAlbaranesV3.jsx";
import Albaranes from "./pages/albaranes.jsx";
import VisitadoresMedicos from "./pages/visitadoresmedicos.jsx";
import FichaVisitador from "./pages/fichavisitador.jsx";
import ImportadorEmails from "./pages/ImportadorEmails.jsx";
import Facturacion from "./pages/facturacion.jsx";
import Estadisticas from "./pages/estadisticas.jsx";
import ModuloPendiente from "./pages/modulopendiente.jsx";
import Acceso from "./pages/acceso.jsx";
import Espacios from "./pages/espacios.jsx";
import Higiene from "./pages/higiene.jsx";
import RestablecerClave from "./pages/restablecerClave.jsx";

import "./App.css";

function Inicio() {
  const { usuario, rol, cargando, recuperandoClave } = useAuth();
  if (cargando) return <div className="pantalla-carga">Preparando Cusachs Hub…</div>;
  if (!usuario) return <Navigate to="/acceso" replace />;
  if (recuperandoClave) return <Navigate to="/restablecer-clave" replace />;
  return <Navigate to={rol === "administrador" ? "/espacios" : "/catering"} replace />;
}

function MarcoERP({ children }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="app">
        <button
          type="button"
          className="boton-menu-tablet"
          aria-label="Abrir menú principal"
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto(true)}
        >
          <span aria-hidden="true">☰</span>
          Menú
        </button>

        <Sidebar
          abierto={menuAbierto}
          onCerrar={() => setMenuAbierto(false)}
        />

        {menuAbierto && (
          <button
            type="button"
            className="fondo-menu-tablet"
            aria-label="Cerrar menú principal"
            onClick={() => setMenuAbierto(false)}
          />
        )}

        <main className="contenido">
          {children}
        </main>
      </div>
  );
}

const protegida = (componente, soloAdministrador = false) => (
  <RutaProtegida soloAdministrador={soloAdministrador}>
    <MarcoERP>{componente}</MarcoERP>
  </RutaProtegida>
);

function App() {
  return (
    <HashRouter>
      <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/acceso" element={<Acceso />} />
            <Route path="/restablecer-clave" element={<RestablecerClave />} />
            <Route path="/espacios" element={protegida(<Espacios />, true)} />
            <Route path="/higiene" element={protegida(<Higiene />, true)} />
            <Route path="/higiene/proveedores" element={protegida(<Proveedores />, true)} />
            <Route path="/higiene/catalogo-proveedores" element={protegida(<CatalogoProveedores />, true)} />
            <Route path="/higiene/comparador-precios" element={protegida(<ComparadorPrecios />, true)} />
            <Route path="/higiene/compras" element={protegida(<Compras />, true)} />
            <Route path="/higiene/importar-albaranes" element={protegida(<ImportadorAlbaranes />, true)} />
            <Route path="/higiene/importador-albaranes-v3" element={protegida(<ImportadorAlbaranesV3 />, true)} />
            <Route path="/higiene/albaranes" element={protegida(<Albaranes />, true)} />
            <Route path="/dashboard" element={protegida(<Dashboard />, true)} />

            {/* COMERCIAL */}
            <Route path="/clientes" element={protegida(<Clientes />)} />
            <Route path="/clientes/:id" element={protegida(<FichaCliente />)} />
            <Route path="/productos" element={protegida(<Productos />)} />
            <Route path="/presupuestos" element={protegida(<Presupuestos />)} />
            <Route path="/presupuestos-estandar" element={protegida(<PresupuestosEstandar />)} />

            {/* CATERING */}
            <Route path="/catering" element={protegida(<Catering />)} />
            <Route path="/menaje" element={protegida(<Menaje />)} />
            <Route path="/bebidas" element={protegida(<Bebidas />)} />

            {/* PRODUCCIÓN */}
            <Route path="/produccion" element={protegida(<Produccion />)} />
            <Route path="/ingredientes" element={protegida(<Ingredientes />, true)} />
            <Route path="/escandallos" element={protegida(<Escandallos />, true)} />
            <Route path="/recetas" element={protegida(<Recetas />, true)} />
            <Route path="/dietario" element={protegida(<DietarioAnual />, true)} />

            {/* PERSONAL */}
            <Route path="/horario-personal" element={protegida(<HorarioPersonal />, true)} />

            {/* COMPRAS */}
            <Route path="/proveedores" element={protegida(<Proveedores />, true)} />
            <Route path="/catalogo-proveedores" element={protegida(<CatalogoProveedores />, true)} />
            <Route path="/comparador-precios" element={protegida(<ComparadorPrecios />, true)} />
            <Route path="/compras" element={protegida(<Compras />, true)} />

            {/* LECTOR CLÁSICO */}
            <Route path="/importar-albaranes" element={protegida(<ImportadorAlbaranes />, true)} />

            {/* LECTOR INTELIGENTE V3 */}
            <Route path="/importador-albaranes-v3" element={protegida(<ImportadorAlbaranesV3 />, true)} />

            {/* HISTORIAL */}
            <Route path="/albaranes" element={protegida(<Albaranes />, true)} />

            {/* VISITADORES */}
            <Route path="/visitadores" element={protegida(<VisitadoresMedicos />, true)} />
            <Route path="/visitadores/:id" element={protegida(<FichaVisitador />, true)} />
            <Route path="/visitadores-medicos" element={protegida(<VisitadoresMedicos />, true)} />
            <Route path="/visitadores-medicos/:id" element={protegida(<FichaVisitador />, true)} />

            {/* ADMINISTRACIÓN */}
            <Route path="/importar-emails" element={protegida(<ImportadorEmails />, true)} />
            <Route path="/facturacion" element={protegida(<Facturacion />, true)} />
            <Route path="/estadisticas" element={protegida(<Estadisticas />, true)} />
            <Route
              path="/configuracion"
              element={protegida(<ModuloPendiente titulo="Configuración" />, true)}
            />

            {/* RUTA NO ENCONTRADA */}
            <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
