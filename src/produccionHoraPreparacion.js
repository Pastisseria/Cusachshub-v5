// Producción Cusachs: hora de preparación 1 hora antes del catering.
// Nunca mostrar una hora de preparación anterior a las 07:30.
// Impresión: UNA hoja A4 vertical por cliente/pedido y sin observaciones bajo productos.

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
  const viejo = document.getElementById("cusachs-produccion-a5-vertical");
  if (viejo) viejo.remove();

  let estilo = document.getElementById("cusachs-produccion-print-a4");
  if (!estilo) {
    estilo = document.createElement("style");
    estilo.id = "cusachs-produccion-print-a4";
    document.head.appendChild(estilo);
  }

  estilo.textContent = `
    @media print {
      body.imprimiendo-zona-diaria .zona-diaria-hoja-print,
      body.imprimiendo-zona-diaria .zona-diaria-pedido-print {
        page: cusachs-produccion-a4 !important;
      }
      body.imprimiendo-zona-diaria .zona-diaria-pedidos-print {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      body.imprimiendo-zona-diaria .zona-diaria-pedido-print {
        display: block !important;
        box-sizing: border-box !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        break-inside: avoid-page !important;
        page-break-inside: avoid !important;
        break-after: page !important;
        page-break-after: always !important;
      }
      body.imprimiendo-zona-diaria .zona-diaria-pedido-print:last-child {
        break-after: auto !important;
        page-break-after: auto !important;
      }
      body.imprimiendo-zona-diaria .zona-diaria-titulo-pedido-print h2 {
        font-size: 20px !important;
        line-height: 1.05 !important;
        margin: 2px 0 !important;
      }
      body.imprimiendo-zona-diaria .zona-diaria-titulo-pedido-print strong { font-size: 11px !important; }
      body.imprimiendo-zona-diaria .zona-diaria-titulo-pedido-print > span { font-size: 12px !important; }
      body.imprimiendo-zona-diaria .zona-diaria-pedido-cabecera-print {
        margin-top: 4px !important;
        padding: 5px 7px !important;
      }
      body.imprimiendo-zona-diaria .zona-diaria-pedido-cabecera-print strong {
        font-size: 14px !important;
        line-height: 1.1 !important;
        white-space: normal !important;
        overflow: visible !important;
      }
      body.imprimiendo-zona-diaria .zona-diaria-pedido-cabecera-print div span {
        font-size: 11px !important;
        line-height: 1.1 !important;
      }
      body.imprimiendo-zona-diaria .zona-diaria-hora-catering-print {
        font-size: 12px !important;
        line-height: 1.1 !important;
        font-weight: 800 !important;
      }
      body.imprimiendo-zona-diaria .zona-diaria-lineas-print { padding: 2px 7px !important; }
      body.imprimiendo-zona-diaria .zona-diaria-linea-print {
        grid-template-columns: 18px 92px minmax(0, 1fr) !important;
        gap: 5px !important;
        padding: 4px 0 !important;
        font-size: 12px !important;
        line-height: 1.08 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      body.imprimiendo-zona-diaria .zona-diaria-linea-print strong {
        font-size: 12px !important;
        line-height: 1.08 !important;
      }
      /* No imprimir observaciones/notas debajo del producto */
      body.imprimiendo-zona-diaria .zona-diaria-linea-print small {
        display: none !important;
      }
      body.imprimiendo-zona-diaria .zona-diaria-check-print { font-size: 14px !important; }
    }
    @page cusachs-produccion-a4 {
      size: A4 portrait;
      margin: 8mm;
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
