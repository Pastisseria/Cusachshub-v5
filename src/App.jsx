import {
  HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Sidebar from "./components/Sidebar.jsx";
import "./App.css";

function PaginaPrueba({ titulo }) {
  return (
    <section className="panel">
      <h1>{titulo}</h1>
      <p>La aplicación Cusachs Hub funciona correctamente.</p>
    </section>
  );
}

function App() {
  return (
    <HashRouter>
      <div className="app">
        <Sidebar />

        <main className="contenido">
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />

            <Route
              path="/dashboard"
              element={<PaginaPrueba titulo="Dashboard" />}
            />

            <Route
              path="/clientes"
              element={<PaginaPrueba titulo="Clientes" />}
            />

            <Route
              path="/productos"
              element={<PaginaPrueba titulo="Productos" />}
            />

            <Route
              path="/presupuestos"
              element={<PaginaPrueba titulo="Presupuestos" />}
            />

            <Route
              path="/catering"
              element={<PaginaPrueba titulo="Catering" />}
            />

            <Route
              path="/menaje"
              element={<PaginaPrueba titulo="Menaje" />}
            />

            <Route
              path="/bebidas"
              element={<PaginaPrueba titulo="Bebidas" />}
            />

            <Route
              path="/produccion"
              element={<PaginaPrueba titulo="Producción" />}
            />

            <Route
              path="/ingredientes"
              element={<PaginaPrueba titulo="Ingredientes" />}
            />

            <Route
              path="/escandallos"
              element={<PaginaPrueba titulo="Escandallos" />}
            />

            <Route
              path="/dietario"
              element={<PaginaPrueba titulo="Dietario anual" />}
            />

            <Route
              path="/proveedores"
              element={<PaginaPrueba titulo="Proveedores" />}
            />

            <Route
              path="/catalogo-proveedores"
              element={<PaginaPrueba titulo="Catálogo de proveedores" />}
            />

            <Route
              path="/comparador-precios"
              element={<PaginaPrueba titulo="Comparador de precios" />}
            />

            <Route
              path="/compras"
              element={<PaginaPrueba titulo="Compras" />}
            />

            <Route
              path="/visitadores"
              element={<PaginaPrueba titulo="Visitadores médicos" />}
            />

            <Route
              path="/importar-emails"
              element={<PaginaPrueba titulo="Importar emails" />}
            />

            <Route
              path="/facturacion"
              element={<PaginaPrueba titulo="Facturación" />}
            />

            <Route
              path="/estadisticas"
              element={<PaginaPrueba titulo="Estadísticas" />}
            />

            <Route
              path="/configuracion"
              element={<PaginaPrueba titulo="Configuración" />}
            />

            <Route
              path="*"
              element={<Navigate to="/dashboard" replace />}
            />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;