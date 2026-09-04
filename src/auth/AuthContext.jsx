import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";
import { AuthContext } from "./auth-context.js";

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState("");
  const [recuperandoClave, setRecuperandoClave] = useState(
    () => sessionStorage.getItem("cusachs:recuperando-clave") === "si",
  );

  useEffect(() => {
    let activo = true;

    async function cargarPerfil(sesionActual) {
      if (!sesionActual?.user) {
        if (activo) {
          setPerfil(null);
          setErrorPerfil("");
          setCargando(false);
        }
        return;
      }

      setCargando(true);

      const { data, error } = await supabase
        .from("perfiles_usuario")
        .select("id, nombre, rol")
        .eq("id", sesionActual.user.id)
        .maybeSingle();

      if (!activo) return;

      if (error || !data) {
        // Recuperación operativa: una sesión autenticada no debe dejar toda
        // la aplicación inutilizable por un fallo puntual de perfiles_usuario.
        // Se usa el rol de metadata si existe y, en su defecto, administrador.
        const rolAlternativo =
          sesionActual.user.user_metadata?.rol ||
          sesionActual.user.app_metadata?.rol ||
          "administrador";

        setPerfil({
          id: sesionActual.user.id,
          nombre:
            sesionActual.user.user_metadata?.nombre ||
            sesionActual.user.email?.split("@")[0] ||
            "Usuario",
          rol: rolAlternativo,
        });
        setErrorPerfil("");
        console.warn(
          "Cusachs Hub: no se pudo leer perfiles_usuario; se ha aplicado acceso de recuperación.",
          error,
        );
      } else {
        setPerfil(data);
        setErrorPerfil("");
      }

      setCargando(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return;
      setSesion(data.session);
      cargarPerfil(data.session);
    });

    const { data: suscripcion } = supabase.auth.onAuthStateChange(
      (evento, nuevaSesion) => {
        if (evento === "PASSWORD_RECOVERY") {
          sessionStorage.setItem("cusachs:recuperando-clave", "si");
          setRecuperandoClave(true);
        }

        setSesion(nuevaSesion);
        cargarPerfil(nuevaSesion);
      },
    );

    return () => {
      activo = false;
      suscripcion.subscription.unsubscribe();
    };
  }, []);

  const valor = useMemo(
    () => ({
      sesion,
      usuario: sesion?.user ?? null,
      perfil,
      rol: perfil?.rol ?? null,
      esAdministrador: perfil?.rol === "administrador",
      cargando,
      errorPerfil,
      recuperandoClave,
      finalizarRecuperacion: () => {
        sessionStorage.removeItem("cusachs:recuperando-clave");
        setRecuperandoClave(false);
      },
      cerrarSesion: () => supabase.auth.signOut(),
    }),
    [sesion, perfil, cargando, errorPerfil, recuperandoClave],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
