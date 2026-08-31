import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";

export default function Espacios() {
  const navigate = useNavigate();
  const { esAdministrador } = useAuth();

  if (!esAdministrador) return <Navigate to="/catering" replace />;

  return (
    <div className="pagina-espacios">
      <header>
        <p className="etiqueta-acceso">CUSACHS HUB</p>
        <h1>¿Qué espacio quieres abrir?</h1>
        <p>Los dos apartados están dentro del mismo ERP y comparten una sola sesión.</p>
      </header>

      <div className="rejilla-espacios">
        <button className="tarjeta-espacio catering" onClick={() => navigate("/catering")}>
          <span className="icono-espacio">🍽️</span>
          <span>
            <strong>Catering</strong>
            <small>Eventos, clientes, presupuestos, productos y producción.</small>
          </span>
          <span className="flecha-espacio">→</span>
        </button>

        <button className="tarjeta-espacio higiene" onClick={() => navigate("/higiene")}>
          <span className="icono-espacio">🧼</span>
          <span>
            <strong>Bones pràctiques d’higiene</strong>
            <small>Controles, trazabilidad, limpieza e incidencias de pastelería.</small>
          </span>
          <span className="flecha-espacio">→</span>
        </button>
      </div>
    </div>
  );
}
