import { readLocal, writeLocal, setLocalUser } from '../lib/local-data.js';
import { useEffect, useMemo, useState } from "react";
import { supabase, authStorageKey } from "../supabase.js";
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

    let revision=0;
    const savedSession=()=>{const s=readLocal(authStorageKey);return s?.user?.id&&s?.access_token?s:null};
    async function cargarPerfil(sesionActual) {
      const turno=++revision;
      const id=sesionActual?.user?.id;
      setLocalUser(id);
      if(!id){setPerfil(null);setErrorPerfil('');setCargando(false);return}
      const key='cusachs:perfil:'+authStorageKey+':'+id;
      const cached=readLocal(key);
      const local=cached?.id===id?cached:null;
      setPerfil(local);setCargando(!local&&navigator.onLine);
      if(!navigator.onLine){setErrorPerfil(local?'':'Conecta a Internet para cargar tu perfil por primera vez.');setCargando(false);return}
      const controller=new AbortController();let timer;
      try {
        const {data,error}=await Promise.race([supabase.from('perfiles_usuario').select('id, nombre, rol').eq('id',id).abortSignal(controller.signal).maybeSingle(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Tiempo de espera agotado'))},8000)})]);
        if(!activo||turno!==revision)return;
        if(!error&&data){writeLocal(key,data);setPerfil(data);setErrorPerfil('')}
        else if(!error||[401,403].includes(error.status)){writeLocal(key,null);setPerfil(null);setErrorPerfil('No existe un perfil autorizado para esta cuenta.')}
        else {setPerfil(local);setErrorPerfil(local?'':'No se pudo cargar tu perfil. Comprueba la conexión y vuelve a abrir la aplicación.')}
      } catch {if(activo&&turno===revision){setPerfil(local);setErrorPerfil(local?'':'No se pudo cargar tu perfil. Conecta a Internet y vuelve a intentarlo.')}}
      finally {clearTimeout(timer);if(activo&&turno===revision)setCargando(false)}
    }
    function aplicar(session){if(!activo)return;setSesion(session);void cargarPerfil(session)}
    // Bootstrap offline without waiting for refresh of an expired token.
    if(!navigator.onLine)aplicar(savedSession());
    else {
      const timer=setTimeout(()=>aplicar(savedSession()),9000);
      supabase.auth.getSession().then(({data})=>{clearTimeout(timer);aplicar(data.session)}).catch(()=>{clearTimeout(timer);aplicar(savedSession())});
    }
    const reconectar=()=>{supabase.auth.getSession().then(({data})=>aplicar(data.session)).catch(()=>{})};
    window.addEventListener('online',reconectar);

    const { data: suscripcion } = supabase.auth.onAuthStateChange(
      (evento, nuevaSesion) => {
        if (evento === "PASSWORD_RECOVERY") {
          sessionStorage.setItem("cusachs:recuperando-clave", "si");
          setRecuperandoClave(true);
        }

        if(evento==='SIGNED_OUT')setLocalUser(null);
        setTimeout(()=>aplicar(nuevaSesion),0);
      },
    );

    return () => {
      activo = false;
      window.removeEventListener('online', reconectar);
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
      cerrarSesion: async () => {
        if(!navigator.onLine){localStorage.removeItem(authStorageKey);setLocalUser(null);window.location.reload();return}
        return supabase.auth.signOut();
      },
    }),
    [sesion, perfil, cargando, errorPerfil, recuperandoClave],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
