import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PreparacionSanidad from "./preparacionsanidad.jsx";

export default function PreparacionSanidadEtiquetas() {
  const navigate = useNavigate();

  useEffect(() => {
    function gestionarAcciones(event) {
      const objetivo = event.target.closest?.("button, a");
      if (!objetivo) return;

      const texto = objetivo.textContent?.trim() || "";
      const tarjeta = objetivo.closest?.(".sanidad-formatos-grid article");
      const textoTarjeta = tarjeta?.textContent || "";

      // El registro trimestral ya no se monta dentro de Preparación Sanidad.
      // Se abre como una ruta React independiente para evitar bloqueos.
      if (texto === "Registre trimestral" || (texto === "Abrir formato" && textoTarjeta.includes("FORMATO 3"))) {
        event.preventDefault();
        event.stopPropagation();
        navigate("/higiene/registro-trimestral");
        return;
      }

      // Mantiene el acceso correcto del formato 13 al módulo de etiquetas.
      if (textoTarjeta.includes("FORMATO 13")) {
        event.preventDefault();
        event.stopPropagation();
        navigate("/higiene/modelos-etiquetas");
      }
    }

    document.addEventListener("click", gestionarAcciones, true);
    return () => document.removeEventListener("click", gestionarAcciones, true);
  }, [navigate]);

  return <PreparacionSanidad />;
}
