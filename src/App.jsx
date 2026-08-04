import {
  HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Sidebar from "./components/Sidebar.jsx";

import Dashboard from "./pages/dashboard.jsx";
import Clientes from "./pages/clientespages.jsx";
import Productos from "./pages/productos.jsx";
import Presupuestos from "./pages/presupuestos.jsx";
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
import VisitadoresMedicos from "./pages/visitadoresmedicos.jsx";
import Facturacion from "./pages/facturacion.jsx";
import ImportadorEmails from "./pages/ImportadorEmails.jsx";
import ImportadorAlbaranes from "./pages/ImportadorAlbaranes.jsx";
import Albaranes from "./pages/albaranes.jsx";
import ModuloPendiente from "./pages/modulopendiente.jsx";

import "./App.css";

function App() {
  return (
    <HashRouter>
      <div className="app">
        <Sidebar />

        <main className="contenido">
          <Routes>
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

            <Route
              path="/clientes"
              element={<Clientes />}
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

            <Route
              path="/horario-personal"
              element={<HorarioPersonal />}
            />

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

            <Route
              path="/importar-albaranes"
              element={<ImportadorAlbaranes />}
            />

            <Route
              path="/albaranes"
              element={<Albaranes />}
            />

            <Route
              path="/visitadores"
              element={<VisitadoresMedicos />}
            />

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