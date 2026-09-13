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

      if (texto === "Registre trimestral" || (texto === "Abrir formato" && textoTarjeta.includes("FORMATO 3"))) {
        event.preventDefault();
        event.stopPropagation();
        const url = `${window.location.origin}${window.location.pathname}#/higiene/registro-trimestral`;
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

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
