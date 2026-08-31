import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../supabase.js";
import { useAuth } from "../auth/useAuth.js";
import logo from "../assets/logo-cusachs.png";

export default function RestablecerClave() {
  const navigate = useNavigate();
  const { usuario, cargando, recuperandoClave, finalizarRecuperacion } = useAuth();
  const [password, setPassword] = useState("");
  const [repeticion, setRepeticion] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (cargando) return <div className="pantalla-carga">Validando el enlace…</div>;
  if (!usuario || !recuperandoClave) return <Navigate to="/acceso" replace />;

  async function guardar(event) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== repeticion) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    const { error: errorCambio } = await supabase.auth.updateUser({ password });
    if (errorCambio) {
      setError("No se ha podido cambiar la contraseña. Solicita un enlace nuevo.");
      setGuardando(false);
      return;
    }

    finalizarRecuperacion();
    await supabase.auth.signOut();
    navigate("/acceso", { replace: true });
  }

  return (
    <main className="pagina-acceso">
      <section className="tarjeta-acceso">
        <img src={logo} alt="Pastisseria Cusachs" className="logo-acceso" />
        <p className="etiqueta-acceso">CUSACHS HUB</p>
        <h1>Crea una contraseña nueva</h1>
        <p className="texto-acceso">Utiliza al menos 8 caracteres.</p>
        <form onSubmit={guardar} className="formulario-acceso">
          <label>
            Nueva contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label>
            Repetir contraseña
            <input type="password" value={repeticion} onChange={(e) => setRepeticion(e.target.value)} required />
          </label>
          {error && <p className="error-acceso" role="alert">{error}</p>}
          <button type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar nueva contraseña"}
          </button>
        </form>
      </section>
    </main>
  );
}
