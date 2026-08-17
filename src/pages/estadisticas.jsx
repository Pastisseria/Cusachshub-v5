import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function fechaValida(valor) {
  if (!valor) return null;
  const fecha = new Date(`${String(valor).slice(0, 10)}T12:00:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function clienteActual(row) {
  return (
    row.cliente ||
    row.nombre_cliente ||
    row.empresa ||
    row.nombre ||
    row.titulo ||
    "Cliente sin nombre"
  );
}

function Estadisticas() {
  const [historico, setHistorico] = useState([]);
  const [actuales, setActuales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [vista, setVista] = useState("resumen");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setError("");

    const [historicoResult, actualesResult] = await Promise.all([
      supabase
        .from("caterings_historico")
        .select("fecha, cliente, hora, observaciones, anio, servicio_nro_dia_cliente")
        .eq("anio", 2025)
        .order("fecha", { ascending: true }),
      supabase
        .from("caterings")
        .select("*")
        .gte("fecha", "2026-01-01")
        .lte("fecha", "2026-12-31")
        .order("fecha", { ascending: true }),
    ]);

    if (historicoResult.error) {
      setError(`No se pudo leer el histórico: ${historicoResult.error.message}`);
      setHistorico([]);
    } else {
      setHistorico(historicoResult.data || []);
    }

    if (actualesResult.error) {
      // El histórico sigue siendo utilizable aunque la tabla operativa tenga otro nombre.
      setActuales([]);
    } else {
      setActuales(actualesResult.data || []);
    }

    setCargando(false);
  }

  const estadisticas = useMemo(() => {
    const mensual2025 = Array(12).fill(0);
    const mensual2026 = Array(12).fill(0);
    const diasSemana = Array(7).fill(0);
    const clientes = new Map();

    historico.forEach((row) => {
      const fecha = fechaValida(row.fecha);
      if (!fecha) return;
      mensual2025[fecha.getMonth()] += 1;
      diasSemana[fecha.getDay()] += 1;
      const nombre = row.cliente || "Cliente sin nombre";
      clientes.set(nombre, (clientes.get(nombre) || 0) + 1);
    });

    actuales.forEach((row) => {
      const fecha = fechaValida(row.fecha);
      if (!fecha) return;
      mensual2026[fecha.getMonth()] += 1;
    });

    const topClientes = [...clientes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const diasConCatering = new Set(historico.map((r) => String(r.fecha).slice(0, 10))).size;
    const clientesDistintos = new Set(historico.map((r) => r.cliente).filter(Boolean)).size;
    const sinHora = historico.filter((r) => !r.hora).length;
    const maxMensual = Math.max(1, ...mensual2025, ...mensual2026);

    return {
      mensual2025,
      mensual2026,
      diasSemana,
      topClientes,
      diasConCatering,
      clientesDistintos,
      sinHora,
      maxMensual,
    };
  }, [historico, actuales]);

  const diferencia = actuales.length - historico.length;
  const porcentaje = historico.length ? (diferencia / historico.length) * 100 : 0;

  if (cargando) {
    return <div style={styles.estado}>Cargando estadísticas…</div>;
  }

  return (
    <main style={styles.pagina}>
      <section style={styles.cabecera}>
        <div>
          <div style={styles.etiqueta}>ANÁLISIS</div>
          <h1 style={styles.titulo}>📈 Estadísticas</h1>
          <p style={styles.subtitulo}>Comparativa de caterings y actividad histórica.</p>
        </div>
        <button style={styles.botonActualizar} onClick={cargarDatos}>Actualizar datos</button>
      </section>

      {error && <div style={styles.error}>{error}</div>}

      <nav style={styles.pestanas}>
        <button style={vista === "resumen" ? styles.pestanaActiva : styles.pestana} onClick={() => setVista("resumen")}>Resumen</button>
        <button style={vista === "historico" ? styles.pestanaActiva : styles.pestana} onClick={() => setVista("historico")}>Catering histórico</button>
      </nav>

      {vista === "resumen" ? (
        <>
          <section style={styles.tarjetas}>
            <Tarjeta titulo="Servicios 2025" valor={historico.length} detalle="Histórico importado" />
            <Tarjeta titulo="Servicios 2026" valor={actuales.length} detalle="Calendario actual" />
            <Tarjeta titulo="Diferencia" valor={`${diferencia >= 0 ? "+" : ""}${diferencia}`} detalle={`${porcentaje >= 0 ? "+" : ""}${porcentaje.toFixed(1)} %`} />
            <Tarjeta titulo="Clientes 2025" valor={estadisticas.clientesDistintos} detalle={`${estadisticas.diasConCatering} días con catering`} />
          </section>

          <section style={styles.panel}>
            <div style={styles.panelCabecera}>
              <div>
                <h2 style={styles.panelTitulo}>Caterings por mes</h2>
                <p style={styles.panelTexto}>Comparación del número de servicios registrados.</p>
              </div>
              <div style={styles.leyenda}>
                <span><i style={{ ...styles.punto, background: "#8b5cf6" }} />2025</span>
                <span><i style={{ ...styles.punto, background: "#2dd4bf" }} />2026</span>
              </div>
            </div>
            <div style={styles.grafica}>
              {MESES.map((mes, i) => (
                <div style={styles.columnaMes} key={mes}>
                  <div style={styles.barras}>
                    <div title={`2025: ${estadisticas.mensual2025[i]}`} style={{ ...styles.barra2025, height: `${Math.max(3, estadisticas.mensual2025[i] / estadisticas.maxMensual * 170)}px` }} />
                    <div title={`2026: ${estadisticas.mensual2026[i]}`} style={{ ...styles.barra2026, height: `${Math.max(3, estadisticas.mensual2026[i] / estadisticas.maxMensual * 170)}px` }} />
                  </div>
                  <span style={styles.mes}>{mes}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.dosColumnas}>
            <div style={styles.panel}>
              <h2 style={styles.panelTitulo}>Top clientes 2025</h2>
              <div style={styles.lista}>
                {estadisticas.topClientes.map(([cliente, total], index) => (
                  <div style={styles.filaLista} key={cliente}>
                    <span><b style={styles.posicion}>{index + 1}</b>{cliente}</span>
                    <strong>{total}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.panel}>
              <h2 style={styles.panelTitulo}>Servicios por día</h2>
              <div style={styles.lista}>
                {[1, 2, 3, 4, 5, 6, 0].map((dia) => (
                  <div style={styles.filaLista} key={dia}>
                    <span>{DIAS[dia]}</span>
                    <strong>{estadisticas.diasSemana[dia]}</strong>
                  </div>
                ))}
                <div style={styles.avisoSuave}>{estadisticas.sinHora} servicios históricos no tienen hora indicada.</div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section style={styles.panel}>
          <div style={styles.panelCabecera}>
            <div>
              <h2 style={styles.panelTitulo}>Catering histórico 2025</h2>
              <p style={styles.panelTexto}>{historico.length} servicios conservados como registros independientes.</p>
            </div>
          </div>
          <div style={styles.tablaContenedor}>
            <table style={styles.tabla}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Cliente</th>
                  <th style={styles.th}>Hora</th>
                  <th style={styles.th}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((row, index) => (
                  <tr key={`${row.fecha}-${row.cliente}-${row.hora}-${index}`}>
                    <td style={styles.td}>{String(row.fecha).slice(0, 10)}</td>
                    <td style={styles.td}><strong>{row.cliente}</strong></td>
                    <td style={styles.td}>{row.hora ? String(row.hora).slice(0, 5) : "—"}</td>
                    <td style={styles.td}>{row.observaciones || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function Tarjeta({ titulo, valor, detalle }) {
  return (
    <article style={styles.tarjeta}>
      <span style={styles.tarjetaTitulo}>{titulo}</span>
      <strong style={styles.tarjetaValor}>{valor}</strong>
      <span style={styles.tarjetaDetalle}>{detalle}</span>
    </article>
  );
}

const styles = {
  pagina: { padding: "30px 36px 60px", color: "#20152b", background: "#f3f5fa", minHeight: "100vh", fontFamily: "inherit" },
  cabecera: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 22 },
  etiqueta: { color: "#7c3aad", fontSize: 13, fontWeight: 900, letterSpacing: 2 },
  titulo: { margin: "7px 0 2px", fontSize: 36, lineHeight: 1.1 },
  subtitulo: { margin: 0, color: "#766c80", fontSize: 16 },
  botonActualizar: { border: 0, borderRadius: 14, padding: "13px 19px", background: "#3a0048", color: "white", fontWeight: 800, cursor: "pointer" },
  pestanas: { display: "flex", gap: 10, marginBottom: 18 },
  pestana: { padding: "11px 18px", borderRadius: 12, border: "1px solid #d7c9df", background: "white", color: "#45284e", fontWeight: 800, cursor: "pointer" },
  pestanaActiva: { padding: "11px 18px", borderRadius: 12, border: "1px solid #3a0048", background: "#3a0048", color: "white", fontWeight: 800, cursor: "pointer" },
  tarjetas: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginBottom: 18 },
  tarjeta: { background: "white", border: "1px solid #e8dfed", borderRadius: 20, padding: 20, boxShadow: "0 8px 25px rgba(44, 19, 55, .05)" },
  tarjetaTitulo: { display: "block", color: "#756879", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: .7 },
  tarjetaValor: { display: "block", margin: "8px 0 4px", fontSize: 31 },
  tarjetaDetalle: { color: "#8b7e90", fontSize: 13 },
  panel: { background: "white", border: "1px solid #e8dfed", borderRadius: 20, padding: 22, marginBottom: 18, boxShadow: "0 8px 25px rgba(44, 19, 55, .05)" },
  panelCabecera: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 18 },
  panelTitulo: { margin: 0, fontSize: 20 },
  panelTexto: { margin: "5px 0 0", color: "#807486", fontSize: 14 },
  leyenda: { display: "flex", gap: 16, color: "#6d6272", fontSize: 13 },
  punto: { display: "inline-block", width: 9, height: 9, borderRadius: 9, marginRight: 6 },
  grafica: { height: 220, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", alignItems: "end", gap: 8, borderBottom: "1px solid #ddd2e3", padding: "0 4px" },
  columnaMes: { height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", minWidth: 0 },
  barras: { height: 180, display: "flex", gap: 3, alignItems: "flex-end", width: "100%", justifyContent: "center" },
  barra2025: { width: "36%", maxWidth: 20, borderRadius: "6px 6px 0 0", background: "#8b5cf6" },
  barra2026: { width: "36%", maxWidth: 20, borderRadius: "6px 6px 0 0", background: "#2dd4bf" },
  mes: { fontSize: 11, color: "#776b7d", marginTop: 8, paddingBottom: 7 },
  dosColumnas: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 },
  lista: { marginTop: 14 },
  filaLista: { display: "flex", justifyContent: "space-between", gap: 15, padding: "11px 2px", borderBottom: "1px solid #eee7f1", fontSize: 14 },
  posicion: { display: "inline-grid", placeItems: "center", width: 25, height: 25, borderRadius: 8, background: "#f1e7f6", color: "#6f2d91", marginRight: 10 },
  avisoSuave: { marginTop: 13, padding: 12, borderRadius: 12, background: "#f7f1fa", color: "#765582", fontSize: 13 },
  tablaContenedor: { overflowX: "auto", maxHeight: "65vh" },
  tabla: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  th: { position: "sticky", top: 0, textAlign: "left", padding: "12px 10px", background: "#f2e9f6", color: "#57216f", fontSize: 13, zIndex: 1 },
  td: { padding: "11px 10px", borderBottom: "1px solid #eee7f1", fontSize: 13, verticalAlign: "top" },
  error: { padding: 14, marginBottom: 16, borderRadius: 12, background: "#fff1f2", color: "#9f1239" },
  estado: { padding: 40, fontSize: 18, color: "#5a4562" },
};

export default Estadisticas;

