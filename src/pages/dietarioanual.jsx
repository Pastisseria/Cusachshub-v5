import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

// Productos del dietario actualizados el 04/09/2026.
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
      "Croissants",
      "Ensaimades",
      "Brioix",
      "Croissant de xocolata",
      "Croissants de mantega",
      "Coca crema",
      "Coca d'anís",
      "Cholita",
      "Xuixo",
      "Brioix con piñones",
      "Mini croissant",
      "Mini croissants de chocolate",
      "Mini ensaimada",
      "Mini chucho",
      "Croissant salat",
      "Croissants xoco blanca",
      "Croissant Nutella",
      "Palmera choco",
      "Palmera choco blanca",
    ],
  },
  {
    titulo: "Bandes",
    productos: [
      "Nius de crema",
      "Banda de fruita",
    ],
  },
  {
    titulo: "Braços i coques",
    productos: [
      "Bracet de nata",
      "Bracet de crema",
      "Braç crema petit",
      "Coca de crema",
      "Coca de xocolata",
    ],
  },
  {
    titulo: "Altres",
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
    titulo: "Salat",
    productos: [
      "Emparedados",
      "Coca de verdures",
    ],
  },
  {
    titulo: "Pastissos",
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
      "Croissants",
      "Ensaimades",
      "Brioix",
      "Croissant de xocolata",
      "Croissants de mantega",
      "Coca crema",
      "Coca d'anís",
      "Cholita",
      "Xuixo",
      "Brioix con piñones",
      "Mini croissant",
      "Mini croissants de chocolate",
      "Mini ensaimada",
      "Mini chucho",
      "Croissant salat",
      "Croissants xoco blanca",
      "Croissant Nutella",
      "Palmera choco",
      "Palmera choco blanca",
    ],
  },
  {
    titulo: "Bandes",
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
    titulo: "Braços",
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
    titulo: "Pastissos",
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
    titulo: "Altres",
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
  const [registros, setRegistros] = useState({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [notas, setNotas] = useState("");

  const esFinDeSemana = useMemo(() => {
    if (!fecha) return false;
    const fechaSeleccionada = new Date(`${fecha}T12:00:00`);
    const diaSemana = fechaSeleccionada.getDay();
    return diaSemana === 0 || diaSemana === 6;
  }, [fecha]);

  const plantillaCompleta = esFinDeSemana || festivo;
  const grupos = plantillaCompleta
    ? PRODUCTOS_FIN_SEMANA
    : PRODUCTOS_LABORABLES;

  const productosVisibles = useMemo(
    () => grupos.flatMap((grupo) => grupo.productos),
    [grupos],
  );

  useEffect(() => {
    async function cargarDatos() {
      if (!fecha) return;

      setCargando(true);
      setError("");
      setMensaje("");

      const { data, error: supabaseError } = await supabase
        .from("dietario_unidades")
        .select(
          "producto, unidades, manana, tarde, sobrante, nota_producto",
        )
        .eq("fecha", fecha);

      if (supabaseError) {
        setError(supabaseError.message);
        setRegistros({});
      } else {
        const guardados = {};

        (data ?? []).forEach((fila) => {
          guardados[fila.producto] = {
            manana:
              fila.manana ?? fila.unidades ?? "",
            tarde: fila.tarde ?? "",
            sobrante: fila.sobrante ?? "",
            nota_producto: fila.nota_producto ?? "",
          };
        });

        setRegistros(guardados);
      }

      const { data: notaGuardada, error: errorNota } = await supabase
        .from("dietario_notas")
        .select("notas")
        .eq("fecha", fecha)
        .maybeSingle();

      if (errorNota) {
        setError((anterior) =>
          anterior
            ? `${anterior} · ${errorNota.message}`
            : errorNota.message,
        );
        setNotas("");
      } else {
        setNotas(notaGuardada?.notas ?? "");
      }

      setCargando(false);
    }

    cargarDatos();
  }, [fecha]);

  function obtenerRegistro(producto) {
    return (
      registros[producto] ?? {
        manana: "",
        tarde: "",
        sobrante: "",
        nota_producto: "",
      }
    );
  }

  function numero(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
  }

  function cambiarCampo(producto, campo, valor) {
    setRegistros((anteriores) => ({
      ...anteriores,
      [producto]: {
        ...obtenerRegistroDesde(anteriores, producto),
        [campo]: valor,
      },
    }));
  }

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

    const filas = Object.entries(registros)
      .filter(([producto, registro]) => {
        if (!productosVisibles.includes(producto)) return false;

        return (
          numero(registro.manana) > 0 ||
          numero(registro.tarde) > 0 ||
          numero(registro.sobrante) > 0 ||
          String(registro.nota_producto ?? "").trim() !== ""
        );
      })
      .map(([producto, registro]) => {
        const manana = numero(registro.manana);
        const tarde = numero(registro.tarde);

        return {
          fecha,
          producto,
          unidades: manana + tarde,
          manana,
          tarde,
          sobrante: numero(registro.sobrante),
          nota_producto: String(registro.nota_producto ?? "").trim(),
          updated_at: new Date().toISOString(),
        };
      });

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

    setMensaje("Dietario guardado correctamente.");
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

    const nombreCampo = evento.currentTarget.dataset.campo;
    const campos = Array.from(
      document.querySelectorAll(
        `.dietario-input[data-campo="${nombreCampo}"]`,
      ),
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
    if (!fecha) return;

    const fechaActual = new Date(`${fecha}T12:00:00`);
    fechaActual.setDate(fechaActual.getDate() + numeroDias);

    setFecha(obtenerFechaLocal(fechaActual));
    setFestivo(false);
    setRegistros({});
    setNotas("");
  }

  function irAHoy() {
    setFecha(obtenerFechaLocal(new Date()));
    setFestivo(false);
    setRegistros({});
    setNotas("");
  }

  function limpiarLista() {
    const confirmar = window.confirm(
      "¿Seguro que quieres borrar todas las cantidades y notas del día?",
    );

    if (confirmar) {
      setRegistros({});
      setNotas("");
    }
  }

  function imprimirLista() {
    window.print();
  }

  const totales = useMemo(() => {
    return productosVisibles.reduce(
      (acumulado, producto) => {
        const registro = registros[producto] ?? {};
        const manana = numeroSeguro(registro.manana);
        const tarde = numeroSeguro(registro.tarde);
        const sobrante = numeroSeguro(registro.sobrante);
        const total = manana + tarde;
        const vendido = Math.max(total - sobrante, 0);

        acumulado.manana += manana;
        acumulado.tarde += tarde;
        acumulado.total += total;
        acumulado.sobrante += sobrante;
        acumulado.vendido += vendido;

        return acumulado;
      },
      {
        manana: 0,
        tarde: 0,
        total: 0,
        sobrante: 0,
        vendido: 0,
      },
    );
  }, [productosVisibles, registros]);

  const porcentajeVendido =
    totales.total > 0
      ? ((totales.vendido / totales.total) * 100).toFixed(1)
      : "0.0";

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Producción</p>
          <h2>Dietario anual</h2>
          <p>
            Producción prevista, sobrante de noche y venta real por producto.
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
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
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

        <label style={{ minWidth: "210px" }}>
          Día
          <input
            type="date"
            value={fecha}
            onChange={(event) => {
              setFecha(event.target.value);
              setFestivo(false);
              setRegistros({});
              setNotas("");
            }}
            style={estiloCampo}
          />
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minHeight: "44px",
          }}
        >
          <input
            type="checkbox"
            checked={festivo}
            onChange={(event) => {
              setFestivo(event.target.checked);
              setRegistros({});
            }}
            style={{
              width: "20px",
              height: "20px",
            }}
          />
          Marcar como festivo
        </label>

        <button
          type="button"
          onClick={guardarUnidades}
          disabled={guardando || cargando}
        >
          {guardando ? "Guardando..." : "💾 Guardar dietario"}
        </button>

        <button type="button" onClick={imprimirLista}>
          🖨️ Imprimir
        </button>

        <button
          type="button"
          className="boton-cancelar"
          onClick={limpiarLista}
        >
          Limpiar
        </button>
      </div>

      {cargando && <p>Cargando dietario...</p>}
      {error && <p style={{ color: "#ff8c8c" }}>Error: {error}</p>}
      {mensaje && <p>{mensaje}</p>}

      <p style={{ marginBottom: "12px", opacity: 0.75 }}>
        Escribe mañana y tarde durante el día. Al cerrar, anota
        únicamente lo que queda. El vendido se calcula automáticamente.
      </p>

      <div
        className="hoja-dietario"
        style={{
          background: "white",
          color: "#18131b",
          borderRadius: "14px",
          padding: "18px",
          border: "1px solid #ddd5e2",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "14px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: "#18131b",
                textTransform: "uppercase",
                fontSize: "22px",
              }}
            >
              Llista Pastisseria
            </h2>

            <p style={{ margin: "5px 0 0" }}>
              Plantilla:{" "}
              <strong>
                {plantillaCompleta
                  ? "Caps de setmana i festius"
                  : "Dilluns a divendres"}
              </strong>
            </p>
          </div>

          <div>
            <strong>Dia:</strong> {formatearFecha(fecha)}
          </div>
        </div>

        <table
          style={{
            width: "100%",
            minWidth: "1000px",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr>
              <th style={{ ...estiloCabecera, width: "23%" }}>
                Producto
              </th>
              <th style={{ ...estiloCabecera, width: "9%" }}>
                Mañana
              </th>
              <th style={{ ...estiloCabecera, width: "9%" }}>
                Tarde
              </th>
              <th style={{ ...estiloCabecera, width: "10%" }}>
                Total hecho
              </th>
              <th
                style={{
                  ...estiloCabecera,
                  width: "11%",
                  background: "#fff3d6",
                }}
              >
                Queda noche
              </th>
              <th
                style={{
                  ...estiloCabecera,
                  width: "10%",
                  background: "#eaf7ec",
                }}
              >
                Vendido
              </th>
              <th style={{ ...estiloCabecera, width: "28%" }}>
                Notas / observaciones
              </th>
            </tr>
          </thead>

          <tbody>
            {grupos.map((grupo, indiceGrupo) => (
              <TablaGrupo
                key={`${grupo.titulo}-${indiceGrupo}`}
                grupo={grupo}
                registros={registros}
                cambiarCampo={cambiarCampo}
                moverCampo={moverCampo}
              />
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td style={estiloTotal}>TOTALES DEL DÍA</td>
              <td style={estiloTotal}>{totales.manana}</td>
              <td style={estiloTotal}>{totales.tarde}</td>
              <td style={estiloTotal}>{totales.total}</td>
              <td
                style={{
                  ...estiloTotal,
                  background: "#fff3d6",
                }}
              >
                {totales.sobrante}
              </td>
              <td
                style={{
                  ...estiloTotal,
                  background: "#eaf7ec",
                }}
              >
                {totales.vendido}
              </td>
              <td
                style={{
                  ...estiloTotal,
                  textAlign: "left",
                  background: "#f3f8ef",
                }}
              >
                % vendido: {porcentajeVendido}%
              </td>
            </tr>
          </tfoot>
        </table>

        <div
          style={{
            marginTop: "18px",
            breakInside: "avoid",
          }}
        >
          <h3
            style={{
              margin: "0 0 8px",
              textTransform: "uppercase",
              color: "#18131b",
              fontSize: "16px",
            }}
          >
            Notes generals del dia
          </h3>

          <textarea
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
            placeholder="Encargos especiales, incidencias o notas generales..."
            rows="4"
            style={{
              width: "100%",
              boxSizing: "border-box",
              resize: "vertical",
              border: "1px solid #bbb2c2",
              borderRadius: "8px",
              padding: "10px",
              fontSize: "14px",
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

function TablaGrupo({
  grupo,
  registros,
  cambiarCampo,
  moverCampo,
}) {
  return (
    <>
      {grupo.titulo && (
        <tr>
          <td
            colSpan="7"
            style={{
              padding: "7px 9px",
              fontWeight: 800,
              textTransform: "uppercase",
              background: "#f1e8f4",
              border: "1px solid #d9cddd",
              fontSize: "13px",
            }}
          >
            {grupo.titulo}
          </td>
        </tr>
      )}

      {grupo.productos.map((producto) => {
        const registro =
          registros[producto] ?? {
            manana: "",
            tarde: "",
            sobrante: "",
            nota_producto: "",
          };

        const manana = numeroSeguro(registro.manana);
        const tarde = numeroSeguro(registro.tarde);
        const sobrante = numeroSeguro(registro.sobrante);
        const total = manana + tarde;
        const vendido = Math.max(total - sobrante, 0);

        return (
          <tr key={producto}>
            <td style={estiloCeldaProducto}>{producto}</td>

            <td style={estiloCelda}>
              <input
                className="dietario-input"
                data-campo="manana"
                type="number"
                min="0"
                step="1"
                value={registro.manana ?? ""}
                onChange={(event) =>
                  cambiarCampo(
                    producto,
                    "manana",
                    event.target.value,
                  )
                }
                onKeyDown={moverCampo}
                style={estiloInputNumero}
              />
            </td>

            <td style={estiloCelda}>
              <input
                className="dietario-input"
                data-campo="tarde"
                type="number"
                min="0"
                step="1"
                value={registro.tarde ?? ""}
                onChange={(event) =>
                  cambiarCampo(
                    producto,
                    "tarde",
                    event.target.value,
                  )
                }
                onKeyDown={moverCampo}
                style={estiloInputNumero}
              />
            </td>

            <td style={estiloCeldaCalculada}>{total}</td>

            <td
              style={{
                ...estiloCelda,
                background: "#fffaf0",
              }}
            >
              <input
                className="dietario-input"
                data-campo="sobrante"
                type="number"
                min="0"
                step="1"
                value={registro.sobrante ?? ""}
                onChange={(event) =>
                  cambiarCampo(
                    producto,
                    "sobrante",
                    event.target.value,
                  )
                }
                onKeyDown={moverCampo}
                style={estiloInputNumero}
              />
            </td>

            <td
              style={{
                ...estiloCeldaCalculada,
                background: "#f3faf4",
                fontWeight: 800,
              }}
            >
              {vendido}
            </td>

            <td style={estiloCelda}>
              <input
                className="dietario-input"
                type="text"
                value={registro.nota_producto ?? ""}
                onChange={(event) =>
                  cambiarCampo(
                    producto,
                    "nota_producto",
                    event.target.value,
                  )
                }
                style={estiloInputTexto}
              />
            </td>
          </tr>
        );
      })}
    </>
  );
}

function obtenerRegistroDesde(registros, producto) {
  return (
    registros[producto] ?? {
      manana: "",
      tarde: "",
      sobrante: "",
      nota_producto: "",
    }
  );
}

function numeroSeguro(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

const estiloCampo = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: "6px",
  minHeight: "42px",
  padding: "0 12px",
  borderRadius: "10px",
  border: "1px solid #4b4453",
  background: "#151319",
  color: "white",
  fontSize: "15px",
};

const estiloCabecera = {
  border: "1px solid #cfc5d4",
  padding: "7px 6px",
  fontSize: "13px",
  background: "#f3ebf5",
  textAlign: "center",
};

const estiloCelda = {
  border: "1px solid #ddd5e2",
  padding: "3px 5px",
  fontSize: "13px",
  height: "34px",
};

const estiloCeldaProducto = {
  ...estiloCelda,
  paddingLeft: "9px",
  fontWeight: 600,
};

const estiloCeldaCalculada = {
  ...estiloCelda,
  textAlign: "center",
  background: "#faf8fb",
  fontWeight: 700,
};

const estiloInputNumero = {
  width: "100%",
  minHeight: "27px",
  boxSizing: "border-box",
  border: "1px solid #e2dbe6",
  borderRadius: "6px",
  outline: "none",
  textAlign: "center",
  fontSize: "13px",
  background: "white",
  color: "#18131b",
};

const estiloInputTexto = {
  width: "100%",
  minHeight: "27px",
  boxSizing: "border-box",
  border: "1px solid #e2dbe6",
  borderRadius: "6px",
  outline: "none",
  padding: "0 7px",
  fontSize: "13px",
  background: "white",
  color: "#18131b",
};

const estiloTotal = {
  border: "1px solid #cfc5d4",
  padding: "9px 7px",
  fontSize: "13px",
  fontWeight: 800,
  textAlign: "center",
  background: "#f1e8f4",
};

function formatearFecha(fecha) {
  if (!fecha) return "—";

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
