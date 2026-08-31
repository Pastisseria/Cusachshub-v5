import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../supabase.js";
import { useAuth } from "../auth/useAuth.js";
import logo from "../assets/logo-cusachs.png";

export default function Acceso() {
  const { usuario, rol, cargando } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!cargando && usuario && rol) {
    const destino = location.state?.desde || (rol === "administrador" ? "/espacios" : "/catering");
    return <Navigate to={destino} replace />;
  }

  async function iniciarSesion(event) {
    event.preventDefault();
    setEnviando(true);
    setError("");

    const { error: errorAcceso } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (errorAcceso) {
      setError("El correo o la contraseña no son correctos.");
      setEnviando(false);
    }
  }

  return (
    <main className="pagina-acceso">
      <section className="tarjeta-acceso">
        <img src={logo} alt="Pastisseria Cusachs" className="logo-acceso" />
        <p className="etiqueta-acceso">CUSACHS HUB</p>
        <h1>Bienvenido</h1>
        <p className="texto-acceso">Accede con tu cuenta de administrador o catering.</p>

        <form onSubmit={iniciarSesion} className="formulario-acceso">
          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="error-acceso" role="alert">{error}</p>}
          <button type="submit" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
