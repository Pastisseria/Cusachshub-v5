// Producción Cusachs: mostrar la hora de preparación 1 hora antes del catering.
// Excepción: los caterings de las 07:30 se mantienen a las 07:30.

function horaPreparacion(horaOriginal) {
  const coincidencia = String(horaOriginal || "").match(/(\d{1,2}):(\d{2})/);
  if (!coincidencia) return "";

  const horas = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2]);
  if (horas === 7 && minutos === 30) return "07:30";

  return `${String((horas + 23) % 24).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function aplicarHoraPreparacion() {
  document.querySelectorAll(".zona-diaria-hora-catering-print").forEach((elemento) => {
    const texto = elemento.dataset.horaCatering || elemento.textContent || "";
    const coincidencia = texto.match(/(\d{1,2}:\d{2})/);
    if (!coincidencia) return;

    elemento.dataset.horaCatering = coincidencia[1];
    elemento.textContent = `Hora de preparación: ${horaPreparacion(coincidencia[1])}`;
  });
}

// React crea la hoja de impresión después de cargar la pantalla. Observamos el DOM
// para aplicar la regla también a contenido que aparezca o cambie posteriormente.
let programado = false;
const observador = new MutationObserver(() => {
  if (programado) return;
  programado = true;
  requestAnimationFrame(() => {
    programado = false;
    aplicarHoraPreparacion();
  });
});

function iniciar() {
  aplicarHoraPreparacion();
  observador.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar, { once: true });
} else {
  iniciar();
}

window.addEventListener("beforeprint", aplicarHoraPreparacion);
