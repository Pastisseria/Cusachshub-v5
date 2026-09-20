import { supabase } from "./supabase.js";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

let cargando = false;
let observer = null;

function estaEnDashboard() {
  return location.hash === "#/" || location.hash.startsWith("#/dashboard");
}

function crearPanel() {
  const dashboard = document.querySelector(".dashboard-direccion");
  if (!dashboard || document.getElementById("estadisticas-catering-dashboard")) return null;

  const panel = document.createElement("section");
  panel.id = "estadisticas-catering-dashboard";
  panel.className = "dashboard-estadisticas-catering";
  panel.innerHTML = `
    <style>
      .dashboard-estadisticas-catering{margin-top:28px;padding:24px;border:1px solid #ddd2e2;border-radius:20px;background:#fff}
      .dashboard-estadisticas-cabecera{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}
      .dashboard-estadisticas-cabecera h2{margin:0}.dashboard-estadisticas-cabecera p{margin:6px 0 0;color:#766d7a}
      .dashboard-estadisticas-selector{display:flex;align-items:center;gap:8px;font-weight:800;color:#5c257c}
      .dashboard-estadisticas-selector select{min-height:40px;padding:0 12px;border:1px solid #d8cadd;border-radius:10px;background:#fff;font:inherit}
      .dashboard-estadisticas-resumen{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:20px}
      .dashboard-estadisticas-dato{padding:16px;border-radius:14px;background:#f7f2f9}.dashboard-estadisticas-dato span{display:block;color:#765d7f;font-size:12px;font-weight:800;text-transform:uppercase}.dashboard-estadisticas-dato strong{display:block;margin-top:5px;color:#5c257c;font-size:25px}
      .dashboard-estadisticas-meses{display:grid;grid-template-columns:repeat(12,minmax(48px,1fr));align-items:end;gap:8px;min-height:240px;margin-top:24px;padding:18px 12px 0;border-top:1px solid #eee7f0;overflow-x:auto}
      .dashboard-estadisticas-mes{min-width:48px;text-align:center}.dashboard-estadisticas-numero{display:block;margin-bottom:6px;color:#5c257c;font-weight:900}.dashboard-estadisticas-barra-wrap{height:150px;display:flex;align-items:flex-end;justify-content:center}.dashboard-estadisticas-barra{width:70%;min-height:4px;border-radius:8px 8px 2px 2px;background:#8f63a8}.dashboard-estadisticas-mes small{display:block;margin-top:7px;color:#766d7a;font-weight:800}
      .dashboard-estadisticas-error{margin-top:16px;padding:12px;border-radius:10px;background:#fde7ec;color:#a42f46}
      @media(max-width:800px){.dashboard-estadisticas-resumen{grid-template-columns:1fr}.dashboard-estadisticas-meses{grid-template-columns:repeat(12,58px)}}
    </style>
    <div class="dashboard-estadisticas-cabecera">
      <div><p class="dashboard-etiqueta">ESTADÍSTICAS</p><h2>Caterings por mes</h2><p>Servicios realizados desde Cusachs Hub, sin contar anulados ni duplicar presupuesto + catering.</p></div>
      <label class="dashboard-estadisticas-selector">Año <select data-estadisticas-anio></select></label>
    </div>
    <div data-estadisticas-contenido><p style="margin-top:20px">Cargando estadísticas...</p></div>
  `;

  const referencia = dashboard.querySelector(".dashboard-hoy");
  if (referencia) dashboard.insertBefore(panel, referencia);
  else dashboard.appendChild(panel);

  const select = panel.querySelector("[data-estadisticas-anio]");
  const actual = new Date().getFullYear();
  for (let anio = actual; anio >= 2024; anio -= 1) {
    const option = document.createElement("option");
    option.value = String(anio);
    option.textContent = String(anio);
    select.appendChild(option);
  }
  select.value = String(actual);
  select.addEventListener("change", () => cargarEstadisticas(Number(select.value), panel));
  cargarEstadisticas(actual, panel);
  return panel;
}

async function cargarEstadisticas(anio, panel) {
  if (cargando || !panel?.isConnected) return;
  cargando = true;
  const contenido = panel.querySelector("[data-estadisticas-contenido]");
  contenido.innerHTML = `<p style="margin-top:20px">Cargando estadísticas de ${anio}...</p>`;

  try {
    const inicio = `${anio}-01-01`;
    const fin = `${anio}-12-31`;
    const [presupuestosRes, cateringsRes] = await Promise.all([
      supabase.from("presupuestos").select("id, fecha, estado, tipo_documento").gte("fecha", inicio).lte("fecha", fin).eq("estado", "Aceptado"),
      supabase.from("caterings").select("id, presupuesto_id, fecha, estado").gte("fecha", inicio).lte("fecha", fin).neq("estado", "Cancelado"),
    ]);
    if (presupuestosRes.error) throw presupuestosRes.error;
    if (cateringsRes.error) throw cateringsRes.error;

    const porMes = Array(12).fill(0);
    const idsContados = new Set();

    (presupuestosRes.data || []).forEach((p) => {
      if (!p.fecha) return;
      const mes = Number(String(p.fecha).slice(5, 7)) - 1;
      if (mes < 0 || mes > 11) return;
      porMes[mes] += 1;
      idsContados.add(String(p.id));
    });

    (cateringsRes.data || []).forEach((c) => {
      if (!c.fecha) return;
      if (c.presupuesto_id && idsContados.has(String(c.presupuesto_id))) return;
      const mes = Number(String(c.fecha).slice(5, 7)) - 1;
      if (mes < 0 || mes > 11) return;
      porMes[mes] += 1;
    });

    const total = porMes.reduce((a, b) => a + b, 0);
    const maximo = Math.max(...porMes, 1);
    const mesActual = new Date().getFullYear() === anio ? new Date().getMonth() : 11;
    const acumuladoHastaMes = porMes.slice(0, mesActual + 1).reduce((a, b) => a + b, 0);
    const promedio = mesActual >= 0 ? acumuladoHastaMes / (mesActual + 1) : 0;

    contenido.innerHTML = `
      <div class="dashboard-estadisticas-resumen">
        <div class="dashboard-estadisticas-dato"><span>Total ${anio}</span><strong>${total}</strong></div>
        <div class="dashboard-estadisticas-dato"><span>Este mes</span><strong>${porMes[new Date().getFullYear() === anio ? new Date().getMonth() : 11] || 0}</strong></div>
        <div class="dashboard-estadisticas-dato"><span>Media mensual</span><strong>${promedio.toLocaleString("es-ES", {maximumFractionDigits:1})}</strong></div>
      </div>
      <div class="dashboard-estadisticas-meses">
        ${porMes.map((cantidad, i) => `<div class="dashboard-estadisticas-mes" title="${MESES[i]}: ${cantidad} caterings"><span class="dashboard-estadisticas-numero">${cantidad}</span><div class="dashboard-estadisticas-barra-wrap"><div class="dashboard-estadisticas-barra" style="height:${Math.max(4, Math.round((cantidad / maximo) * 150))}px"></div></div><small>${MESES[i].slice(0,3)}</small></div>`).join("")}
      </div>
    `;
  } catch (error) {
    contenido.innerHTML = `<div class="dashboard-estadisticas-error">No se han podido cargar las estadísticas: ${String(error?.message || error)}</div>`;
  } finally {
    cargando = false;
  }
}

function sincronizar() {
  if (!estaEnDashboard()) return;
  crearPanel();
}

function iniciar() {
  window.addEventListener("hashchange", () => setTimeout(sincronizar, 80));
  observer = new MutationObserver(() => sincronizar());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(sincronizar, 100);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
else iniciar();
