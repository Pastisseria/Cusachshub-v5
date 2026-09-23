// Ajusta únicamente la hora mostrada en la impresión diaria de Producción.
// Regla Cusachs: preparar 1 hora antes del catering, excepto los caterings de las 07:30.

function horaPreparacion(horaOriginal) {
  const coincidencia = String(horaOriginal || "").match(/^(\d{1,2}):(\d{2})/);
  if (!coincidencia) return horaOriginal;

  const horas = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2]);

  if (horas === 7 && minutos === 30) return "07:30";

  const nuevaHora = (horas + 23) % 24;
  return `${String(nuevaHora).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function aplicarHoraPreparacion() {
  document
    .querySelectorAll(".zona-diaria-hora-catering-print")
    .forEach((elemento) => {
      if (!elemento.dataset.textoOriginal) {
        elemento.dataset.textoOriginal = elemento.textContent || "";
      }

      const original = elemento.dataset.textoOriginal;
      const coincidencia = original.match(/(\d{1,2}:\d{2})/);
      if (!coincidencia) return;

      const preparada = horaPreparacion(coincidencia[1]);
      elemento.textContent = `Hora de preparación: ${preparada}`;
    });
}

function restaurarHoraCatering() {
  document
    .querySelectorAll(".zona-diaria-hora-catering-print")
    .forEach((elemento) => {
      if (elemento.dataset.textoOriginal) {
        elemento.textContent = elemento.dataset.textoOriginal;
      }
    });
}

window.addEventListener("beforeprint", aplicarHoraPreparacion);
window.addEventListener("afterprint", restaurarHoraCatering);
