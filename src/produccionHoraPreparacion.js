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

function aplicarImpresionProduccion() {
  let estilo = document.getElementById("cusachs-produccion-a5-vertical");
  if (!estilo) {
    estilo = document.createElement("style");
    estilo.id = "cusachs-produccion-a5-vertical";
    document.head.appendChild(estilo);
  }

  estilo.textContent = `
    @media print {
      body.imprimiendo-zona-diaria .zona-diaria-hoja-print,
      body.imprimiendo-zona-diaria .zona-diaria-pedido-print { page: cusachs-produccion-a5 !important; }
      body.imprimiendo-zona-diaria .zona-diaria-titulo-pedido-print h2 { font-size: 31px !important; }
      body.imprimiendo-zona-diaria .zona-diaria-titulo-pedido-print strong { font-size: 16px !important; }
      body.imprimiendo-zona-diaria .zona-diaria-titulo-pedido-print > span { font-size: 20px !important; }
      body.imprimiendo-zona-diaria .zona-diaria-pedido-cabecera-print strong { font-size: 22px !important; }
      body.imprimiendo-zona-diaria .zona-diaria-pedido-cabecera-print div span { font-size: 18px !important; }
      body.imprimiendo-zona-diaria .zona-diaria-hora-catering-print { font-size: 20px !important; font-weight: 800 !important; }
      body.imprimiendo-zona-diaria .zona-diaria-linea-print { font-size: 20px !important; line-height: 1.28 !important; }
      body.imprimiendo-zona-diaria .zona-diaria-linea-print small { font-size: 16px !important; }
      body.imprimiendo-zona-diaria .zona-diaria-check-print { font-size: 23px !important; }
    }
    @page cusachs-produccion-a5 { size: A5 portrait; margin: 7mm; }
  `;
}

let programado = false;
const observador = new MutationObserver(() => {
  if (programado) return;
  programado = true;
  requestAnimationFrame(() => {
    programado = false;
    aplicarHoraPreparacion();
    aplicarImpresionProduccion();
  });
});

function iniciar() {
  aplicarHoraPreparacion();
  aplicarImpresionProduccion();
  observador.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
else iniciar();

window.addEventListener("beforeprint", () => {
  aplicarHoraPreparacion();
  aplicarImpresionProduccion();
});
