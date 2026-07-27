import {
  DIAS_SEMANA,
  crearDiasCalendario,
  esMismoDia,
  fechaISO,
  formatearHora,
} from "../utils/calendario.js";

function Calendario({
  fechaVisible,
  caterings,
  onSeleccionarDia,
  onAbrirCatering,
}) {
  const dias = crearDiasCalendario(fechaVisible);
  const hoy = new Date();

  return (
    <div className="calendario">
      <div className="calendario-semana">
        {DIAS_SEMANA.map((dia) => (
          <div key={dia} className="calendario-dia-semana">
            {dia}
          </div>
        ))}
      </div>

      <div className="calendario-mes">
        {dias.map((dia) => {
          const iso = fechaISO(dia);
          const esMesActual = dia.getMonth() === fechaVisible.getMonth();
          const eventosDia = caterings
            .filter((evento) => evento.fecha === iso)
            .sort((a, b) =>
              String(a.hora_inicio || "").localeCompare(
                String(b.hora_inicio || ""),
              ),
            );

          return (
            <button
              type="button"
              key={iso}
              className={[
                "calendario-celda",
                !esMesActual ? "calendario-celda-otro-mes" : "",
                esMismoDia(dia, hoy) ? "calendario-celda-hoy" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSeleccionarDia(iso)}
            >
              <span className="calendario-numero-dia">{dia.getDate()}</span>

              <div className="calendario-eventos">
                {eventosDia.slice(0, 4).map((evento) => (
                  <span
                    key={evento.id}
                    role="button"
                    tabIndex={0}
                    className={`calendario-evento estado-${normalizarClase(
                      evento.estado,
                    )}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onAbrirCatering(evento);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        onAbrirCatering(evento);
                      }
                    }}
                    title={`${evento.titulo} · ${evento.estado}`}
                  >
                    {formatearHora(evento.hora_inicio) && (
                      <strong>{formatearHora(evento.hora_inicio)}</strong>
                    )}
                    <span>{evento.titulo}</span>
                  </span>
                ))}

                {eventosDia.length > 4 && (
                  <span className="calendario-mas-eventos">
                    +{eventosDia.length - 4} más
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function normalizarClase(texto) {
  return String(texto || "pendiente")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

export default Calendario;
