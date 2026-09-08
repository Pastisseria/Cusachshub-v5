function ocultarObservacionesProduccion() {
  if (!location.hash.includes("/produccion")) return;

  document.querySelectorAll(".produccion-producto small").forEach((elemento) => {
    const texto = String(elemento.textContent || "").trim();
    if (!texto.toLowerCase().startsWith("responsable:")) {
      elemento.style.display = "none";
    }
  });

  document.querySelectorAll(".zona-diaria-linea-print small").forEach((elemento) => {
    elemento.style.display = "none";
  });
}

let temporizador = null;

function programarOcultacion() {
  clearTimeout(temporizador);
  temporizador = setTimeout(ocultarObservacionesProduccion, 80);
}

function iniciar() {
  const observador = new MutationObserver(programarOcultacion);
  observador.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  window.addEventListener("hashchange", programarOcultacion);
  programarOcultacion();
  setTimeout(programarOcultacion, 500);
  setTimeout(programarOcultacion, 1400);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar, { once: true });
} else {
  iniciar();
}
