import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";

export default function RutaProtegida({ children, soloAdministrador = false }) {
  const { usuario, esAdministrador, cargando, errorPerfil } = useAuth();
  const location = useLocation();

  if (cargando) {
    return <div className="pantalla-carga">Preparando Cusachs Hub…</div>;
  }

  if (!usuario) {
    return <Navigate to="/acceso" state={{ desde: location.pathname }} replace />;
  }

  if (errorPerfil) {
    return (
      <div className="pantalla-error-acceso">
        <h1>No podemos abrir tu perfil</h1>
        <p>{errorPerfil}</p>
      </div>
    );
  }

  if (soloAdministrador && !esAdministrador) {
    return <Navigate to="/catering" replace />;
  }

  return children;
}
