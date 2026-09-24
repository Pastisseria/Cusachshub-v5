// Producción Cusachs: mostrar la hora de preparación 1 hora antes del catering.
// Regla definitiva: nunca mostrar una hora de preparación anterior a las 07:30.

function horaPreparacion(horaOriginal) {
  const coincidencia = String(horaOriginal || "").match(/(\d{1,2}):(\d{2})/);
  if (!coincidencia) return "";

  const horas = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2]);
  const minutosCatering = horas * 60 + minutos;
  const minimoPreparacion = 7 * 60 + 30;
  const minutosPreparacion = Math.max(minimoPreparacion, minutosCatering - 60);

  const hora = Math.floor(minutosPreparacion / 60);
  const minuto = minutosPreparacion % 60;
  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
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

function forzarA5Vertical() {
  let estilo = document.getElementById("cusachs-produccion-a5-vertical");
  if (!estilo) {
    estilo = document.createElement("style");
    estilo.id = "cusachs-produccion-a5-vertical";
    document.head.appendChild(estilo);
  }

  // Se inserta al final del <head> para que esta regla gane a los @page A4
  // incluidos dentro de produccion.jsx, sin alterar el diseño de la ficha.
  estilo.textContent = `
    @media print {
      body.imprimiendo-zona-diaria .zona-diaria-hoja-print,
      body.imprimiendo-zona-diaria .zona-diaria-pedido-print {
        page: cusachs-produccion-a5;
      }
    }
    @page cusachs-produccion-a5 {
      size: A5 portrait;
      margin: 7mm;
    }
  `;
}

let programado = false;
const observador = new MutationObserver(() => {
  if (programado) return;
  programado = true;
  requestAnimationFrame(() => {
    programado = false;
    aplicarHoraPreparacion();
    forzarA5Vertical();
  });
});

function iniciar() {
  aplicarHoraPreparacion();
  forzarA5Vertical();
  observador.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar, { once: true });
} else {
  iniciar();
}

window.addEventListener("beforeprint", () => {
  aplicarHoraPreparacion();
  forzarA5Vertical();
});
