import {
  HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Sidebar from "./components/Sidebar.jsx";

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
import DietarioAnual from "./pages/dietarioanual.jsx";

import HorarioPersonal from "./pages/horariopersonal.jsx";

import Proveedores from "./pages/proveedores.jsx";
import CatalogoProveedores from "./pages/catalogoproveedores.jsx";
import ComparadorPrecios from "./pages/comparadorprecios.jsx";
import Compras from "./pages/compras.jsx";

import ImportadorAlbaranes from "./pages/ImportadorAlbaranes.jsx";
import Albaranes from "./pages/albaranes.jsx";

import VisitadoresMedicos from "./pages/visitadoresmedicos.jsx";

import ImportadorEmails from "./pages/ImportadorEmails.jsx";
import Facturacion from "./pages/facturacion.jsx";

import ModuloPendiente from "./pages/modulopendiente.jsx";

import "./App.css";

function App() {
  return (
    <HashRouter>
      <div className="app">
        <Sidebar />

        <main className="contenido">
          <Routes>
            {/* INICIO */}
            <Route
              path="/"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            {/* COMERCIAL */}
            <Route
              path="/clientes"
              element={<Clientes />}
            />

            <Route
              path="/clientes/:id"
              element={<FichaCliente />}
            />

            <Route
              path="/productos"
              element={<Productos />}
            />

            <Route
              path="/presupuestos"
              element={<Presupuestos />}
            />

            <Route
              path="/presupuestos-estandar"
              element={<PresupuestosEstandar />}
            />

            {/* CATERING */}
            <Route
              path="/catering"
              element={<Catering />}
            />

            <Route
              path="/menaje"
              element={<Menaje />}
            />

            <Route
              path="/bebidas"
              element={<Bebidas />}
            />

            {/* PRODUCCIÓN */}
            <Route
              path="/produccion"
              element={<Produccion />}
            />

            <Route
              path="/ingredientes"
              element={<Ingredientes />}
            />

            <Route
              path="/escandallos"
              element={<Escandallos />}
            />

            <Route
              path="/dietario"
              element={<DietarioAnual />}
            />

            {/* PERSONAL */}
            <Route
              path="/horario-personal"
              element={<HorarioPersonal />}
            />

            {/* COMPRAS */}
            <Route
              path="/proveedores"
              element={<Proveedores />}
            />

            <Route
              path="/catalogo-proveedores"
              element={<CatalogoProveedores />}
            />

            <Route
              path="/comparador-precios"
              element={<ComparadorPrecios />}
            />

            <Route
              path="/compras"
              element={<Compras />}
            />

            {/* LECTOR ANTIGUO */}
            <Route
              path="/importar-albaranes"
              element={<ImportadorAlbaranes />}
            />


            <Route
              path="/albaranes"
              element={<Albaranes />}
            />

            {/* VISITADORES */}
            <Route
              path="/visitadores"
              element={<VisitadoresMedicos />}
            />

            {/* ADMINISTRACIÓN */}
            <Route
              path="/importar-emails"
              element={<ImportadorEmails />}
            />

            <Route
              path="/facturacion"
              element={<Facturacion />}
            />

            <Route
              path="/estadisticas"
              element={
                <ModuloPendiente titulo="Estadísticas" />
              }
            />

            <Route
              path="/configuracion"
              element={
                <ModuloPendiente titulo="Configuración" />
              }
            />

            {/* RUTA NO ENCONTRADA */}
            <Route
              path="*"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;