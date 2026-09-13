import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PreparacionSanidad from "./preparacionsanidad.jsx";

export default function PreparacionSanidadEtiquetas() {
  const navigate = useNavigate();

  useEffect(() => {
    function abrirFormato13(event) {
      const enlace = event.target.closest?.("a");
      if (!enlace) return;
      const tarjeta = enlace.closest(".sanidad-formatos-grid article");
      if (!tarjeta || !tarjeta.textContent?.includes("FORMATO 13")) return;
      event.preventDefault();
      event.stopPropagation();
      navigate("/higiene/modelos-etiquetas");
    }
    document.addEventListener("click", abrirFormato13, true);
    return () => document.removeEventListener("click", abrirFormato13, true);
  }, [navigate]);

  return <PreparacionSanidad />;
}
