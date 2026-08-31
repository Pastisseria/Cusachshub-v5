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
        .single();

      if (!activo) return;

      if (error) {
        setPerfil(null);
        setErrorPerfil(
          "No se ha podido cargar tu perfil. Comprueba que la configuración de acceso se haya aplicado en Supabase.",
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
