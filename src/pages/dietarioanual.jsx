import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const PRODUCTOS_LABORABLES = [
  {
    titulo: "Pastisseria",
    productos: [
      "Llacets",
      "Palmiers",
      "Coques de llardons",
      "Bretzels",
      "Bacarissa",
      "Tarta de poma",
    ],
  },
  {
    titulo: "",
    productos: [
      "Nius de crema",
      "Banda de fruita",
    ],
  },
  {
    titulo: "",
    productos: [
      "Bracet de nata",
      "Bracet de crema",
      "Braç crema petit",
      "Coca de crema",
      "Coca de xocolata",
    ],
  },
  {
    titulo: "",
    productos: [
      "Enquesadas",
      "Merengues",
      "Búlgaros",
      "Borratxos",
    ],
  },
  {
    titulo: "Tartaletes",
    productos: [
      "Maduixa",
      "Macedònia",
      "Gerds",
      "Kiwi",
      "Arándanos",
      "Moras",
      "Mandarina",
      "Mango",
      "Flam",
      "Llimona",
      "Llimona merengue",
      "Xocolata",
      "Xocolata nous",
      "Xocolata taronja",
      "Xocolata gerds",
      "Xocolata llet",
      "Músic",
    ],
  },
  {
    titulo: "",
    productos: [
      "Emparedados",
      "Coca de verdures",
    ],
  },
  {
    titulo: "",
    productos: [
      "Sara",
      "Negritos",
      "Pastís Sara",
      "Pastís de formatge",
      "Pastís de formatge i gerds",
    ],
  },
];

const PRODUCTOS_FIN_SEMANA = [
  {
    titulo: "Pastisseria",
    productos: [
      "Llacets",
      "Palmiers",
      "Coques de llardons",
      "Bretzels",
      "Bacarissa",
      "Tarta de poma",
    ],
  },
  {
    titulo: "",
    productos: [
      "Nius de crema",
      "Banda de fruita",
      "Banda fruits vermells nata",
      "Banda fruits vermells crema",
      "Banda maduixetes nata",
      "Banda maduixetes crema",
      "Banda crema sola",
      "Banda figues",
      "Banda profiterols nata",
      "Banda profiterols crema",
      "Banda thailandesa",
      "Banda músic",
      "Banda nata, crema i fresons",
      "Banda de poma",
      "Pasta brisa fruita",
      "Pasta brisa poma",
      "Pasta brisa fruits vermells",
    ],
  },
  {
    titulo: "",
    productos: [
      "Bracet de nata individual",
      "Bracet de crema individual",
      "Braç trufa individual",
      "Braç crema petit",
      "Braç crema gran",
      "Braç nata fresons petit",
      "Braç nata fresons gran",
    ],
  },
  {
    titulo: "Tortell",
    productos: [
      "Crema individual",
      "Crema 2a mida",
      "Cabell d'àngel individual",
      "Cabell d'àngel 2a mida",
      "Massapà individual",
      "Massapà 2a mida",
      "Nata individual",
      "Nata 2a mida",
      "Nata 3a mida",
      "Nata trufa",
    ],
  },
  {
    titulo: "",
    productos: [
      "Sara",
      "Negritos",
      "Pastís Sara",
    ],
  },
  {
    titulo: "Tartaletes",
    productos: [
      "Maduixa",
      "Macedònia",
      "Gerds",
      "Kiwi",
      "Arándanos",
      "Moras",
      "Mandarina",
      "Mango",
      "Flam",
      "Maduixetes",
      "Figues",
      "Xoco llet",
      "Llimona",
      "Llimona merengue",
      "Xocolata",
      "Xocolata nous",
      "Xocolata taronja",
      "Xocolata gerds",
      "Músic",
    ],
  },
  {
    titulo: "",
    productos: [
      "Tarta Tatin individual",
      "Tarta Tatin",
      "Peix de nata",
      "Bismarck de nata",
      "Coca de crema full",
      "Coca de xoco full",
      "Pastís queso fram individual",
      "Pastís queso pasas individual",
      "Formatge gran",
      "Formatge pasas grande",
    ],
  },
];

function DietarioAnual() {
  const hoy = obtenerFechaLocal(new Date());

  const [fecha, setFecha] = useState(hoy);
  const [festivo, setFestivo] = useState(false);
  const [cantidades, setCantidades] = useState({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [notas, setNotas] = useState("");

  const esFinDeSemana = useMemo(() => {
    if (!fecha) {
      return false;
    }

    const fechaSeleccionada = new Date(`${fecha}T12:00:00`);
    const diaSemana = fechaSeleccionada.getDay();

    return diaSemana === 0 || diaSemana === 6;
  }, [fecha]);

  const plantillaCompleta = esFinDeSemana || festivo;

  const grupos = plantillaCompleta
    ? PRODUCTOS_FIN_SEMANA
    : PRODUCTOS_LABORABLES;

  useEffect(() => {
    async function cargarUnidades() {
      if (!fecha) return;

      setCargando(true);
      setError("");
      setMensaje("");

      const { data, error: supabaseError } = await supabase
        .from("dietario_unidades")
        .select("producto, unidades")
        .eq("fecha", fecha);

      if (supabaseError) {
        setError(supabaseError.message);
        setCantidades({});
      } else {
        const guardadas = {};

        (data ?? []).forEach((fila) => {
          guardadas[fila.producto] = fila.unidades;
        });

        setCantidades(guardadas);
      }

      const { data: notaGuardada, error: errorNota } = await supabase
        .from("dietario_notas")
        .select("notas")
        .eq("fecha", fecha)
        .maybeSingle();

      if (errorNota) {
        setError(errorNota.message);
        setNotas("");
      } else {
        setNotas(notaGuardada?.notas ?? "");
      }

      setCargando(false);
    }

    cargarUnidades();
  }, [fecha]);

  async function guardarUnidades() {
    if (!fecha) return;

    setGuardando(true);
    setError("");
    setMensaje("");

    const { error: errorEliminar } = await supabase
      .from("dietario_unidades")
      .delete()
      .eq("fecha", fecha);

    if (errorEliminar) {
      setError(errorEliminar.message);
      setGuardando(false);
      return;
    }

    const filas = Object.entries(cantidades)
      .filter(([, valor]) => Number(valor) > 0)
      .map(([producto, valor]) => ({
        fecha,
        producto,
        unidades: Number(valor),
        updated_at: new Date().toISOString(),
      }));

    if (filas.length > 0) {
      const { error: errorInsertar } = await supabase
        .from("dietario_unidades")
        .insert(filas);

      if (errorInsertar) {
        setError(errorInsertar.message);
        setGuardando(false);
        return;
      }
    }

    const { error: errorGuardarNota } = await supabase
      .from("dietario_notas")
      .upsert(
        {
          fecha,
          notas,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "fecha",
        },
      );

    if (errorGuardarNota) {
      setError(errorGuardarNota.message);
      setGuardando(false);
      return;
    }

    setMensaje("Unidades y notas guardadas correctamente.");
    setGuardando(false);
  }

  function moverCampo(evento) {
    if (
      evento.key !== "Enter" &&
      evento.key !== "ArrowDown" &&
      evento.key !== "ArrowUp"
    ) {
      return;
    }

    evento.preventDefault();

    const campos = Array.from(
      document.querySelectorAll(".cantidad-input"),
    );

    const indice = campos.indexOf(evento.currentTarget);

    const anterior =
      evento.key === "ArrowUp" ||
      (evento.key === "Enter" && evento.shiftKey);

    const siguienteIndice = anterior ? indice - 1 : indice + 1;

    if (siguienteIndice >= 0 && siguienteIndice < campos.length) {
      campos[siguienteIndice].focus();
      campos[siguienteIndice].select();
    }
  }

  function cambiarDia(numeroDias) {
    if (!fecha) {
      return;
    }

    const fechaActual = new Date(`${fecha}T12:00:00`);
    fechaActual.setDate(fechaActual.getDate() + numeroDias);

    setFecha(obtenerFechaLocal(fechaActual));
    setFestivo(false);
    setCantidades({});
  }

  function irAHoy() {
    setFecha(obtenerFechaLocal(new Date()));
    setFestivo(false);
    setCantidades({});
  }

  function cambiarCantidad(producto, valor) {
    setCantidades((anteriores) => ({
      ...anteriores,
      [producto]: valor,
    }));
  }

  function limpiarLista() {
    const confirmar = window.confirm(
      "¿Seguro que quieres borrar todas las cantidades?",
    );

    if (confirmar) {
      setCantidades({});
      setNotas("");
    }
  }

  function imprimirLista() {
    window.print();
  }

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Producción</p>
          <h2>Dietario anual</h2>
          <p>
            Lista diaria de pastelería según el día de la semana.
          </p>
        </div>

        <span className="contador">
          {plantillaCompleta
            ? "Fin de semana / festivo"
            : "Día laborable"}
        </span>
      </div>

      <div
        className="dietario-controles"
        style={{
          display: "flex",
          alignItems: "end",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => cambiarDia(-1)}
            title="Día anterior"
          >
            ←
          </button>

          <button
            type="button"
            className="boton-cancelar"
            onClick={irAHoy}
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => cambiarDia(1)}
            title="Día siguiente"
          >
            →
          </button>
        </div>

        <label style={{ minWidth: "220px" }}>
          Día

          <input
            type="date"
            value={fecha}
            onChange={(event) => {
              setFecha(event.target.value);
              setFestivo(false);
              setCantidades({});
            }}
            style={estiloCampo}
          />
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minHeight: "48px",
          }}
        >
          <input
            type="checkbox"
            checked={festivo}
            onChange={(event) => {
              setFestivo(event.target.checked);
              setCantidades({});
            }}
            style={{
              width: "22px",
              height: "22px",
            }}
          />

          Marcar como festivo
        </label>

        <button
          type="button"
          onClick={guardarUnidades}
          disabled={guardando || cargando}
        >
          {guardando ? "Guardando..." : "💾 Guardar unidades"}
        </button>

        <button type="button" onClick={imprimirLista}>
          🖨️ Imprimir
        </button>

        <button
          type="button"
          className="boton-cancelar"
          onClick={limpiarLista}
        >
          Limpiar cantidades
        </button>
      </div>

      {cargando && <p>Cargando unidades...</p>}
      {error && <p style={{ color: "#ff8c8c" }}>Error: {error}</p>}
      {mensaje && <p>{mensaje}</p>}

      <p style={{ marginBottom: "18px", opacity: 0.75 }}>
        Enter o ↓: siguiente línea · Shift + Enter o ↑: línea anterior
      </p>

      <div
        className="hoja-dietario"
        style={{
          background: "white",
          color: "#18131b",
          borderRadius: "16px",
          padding: "28px",
          border: "1px solid #ddd5e2",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "26px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: "#18131b",
                textTransform: "uppercase",
              }}
            >
              Llista Pastisseria
            </h2>

            <p style={{ margin: "8px 0 0" }}>
              Plantilla:{" "}
              <strong>
                {plantillaCompleta
                  ? "Caps de setmana i festius"
                  : "Dilluns a divendres"}
              </strong>
            </p>
          </div>

          <div>
            <strong>Dia:</strong>{" "}
            {formatearFecha(fecha)}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(380px, 1fr))",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {grupos.map((grupo, indice) => (
            <div
              key={`${grupo.titulo}-${indice}`}
              style={{
                breakInside: "avoid",
              }}
            >
              {grupo.titulo && (
                <h3
                  style={{
                    margin: "0 0 8px",
                    textTransform: "uppercase",
                    color: "#18131b",
                  }}
                >
                  {grupo.titulo}
                </h3>
              )}

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: "18px",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        ...estiloCelda,
                        textAlign: "left",
                      }}
                    >
                      Producto
                    </th>

                    <th
                      style={{
                        ...estiloCelda,
                        width: "120px",
                      }}
                    >
                      Unitats
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {grupo.productos.map((producto) => (
                    <tr key={producto}>
                      <td style={estiloCelda}>
                        {producto}
                      </td>

                      <td style={estiloCelda}>
                        <input
                          className="cantidad-input"
                          type="number"
                          min="0"
                          step="1"
                          value={cantidades[producto] ?? ""}
                          onChange={(event) =>
                            cambiarCantidad(
                              producto,
                              event.target.value,
                            )
                          }
                          onKeyDown={moverCampo}
                          style={{
                            width: "100%",
                            border: "none",
                            outline: "none",
                            textAlign: "center",
                            fontSize: "16px",
                            background: "transparent",
                            color: "#18131b",
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "26px",
            breakInside: "avoid",
          }}
        >
          <h3
            style={{
              margin: "0 0 10px",
              textTransform: "uppercase",
              color: "#18131b",
            }}
          >
            Notes
          </h3>

          <textarea
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
            placeholder="Escribe aquí observaciones, encargos especiales o notas de producción..."
            rows="6"
            style={{
              width: "100%",
              boxSizing: "border-box",
              resize: "vertical",
              border: "1px solid #18131b",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "16px",
              fontFamily: "inherit",
              color: "#18131b",
              background: "white",
            }}
          />
        </div>
      </div>
    </section>
  );
}

const estiloCampo = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: "8px",
  minHeight: "48px",
  padding: "0 14px",
  borderRadius: "12px",
  border: "1px solid #4b4453",
  background: "#151319",
  color: "white",
  fontSize: "16px",
};

const estiloCelda = {
  border: "1px solid #18131b",
  padding: "8px 10px",
  fontSize: "15px",
};

function formatearFecha(fecha) {
  if (!fecha) {
    return "—";
  }

  return new Intl.DateTimeFormat("ca-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${fecha}T12:00:00`));
}

function obtenerFechaLocal(fecha) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${año}-${mes}-${dia}`;
}

export default DietarioAnual;