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

function normalizar(valor) {
  return String(valor || "").trim().toLowerCase();
}

function euros(valor) {
  return Number(valor || 0).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function fechaBonita(valor) {
  if (!valor) return "—";
  const [y, m, d] = String(valor).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : valor;
}

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function esCatering(p) {
  const tipo = normalizar(p.tipo_documento);
  // Los caterings de Cusachs pueden estar clasificados por tipo de cliente.
  // Excluimos únicamente los documentos claramente no-catering.
  return !["visitador médico", "visitador medico", "tienda"].includes(tipo);
}

function estadoControl(p) {
  if (p.facturado_externamente || p.fecha_facturacion || normalizar(p.estado).includes("factur")) return "Facturado";
  if (normalizar(p.estado) === "cancelado") return "Cancelado";
  if (normalizar(p.estado) === "aceptado") return "Aceptado · pendiente de facturar";
  if (normalizar(p.estado) === "enviado") return "Enviado";
  if (normalizar(p.estado) === "borrador") return "Borrador";
  return p.estado || "Sin estado";
}

function claseEstado(estado) {
  const e = normalizar(estado);
  if (e.startsWith("facturado")) return "facturado";
  if (e.startsWith("cancelado")) return "cancelado";
  if (e.includes("pendiente de facturar")) return "pendiente";
  if (e === "enviado") return "enviado";
  return "borrador";
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
      .dashboard-estadisticas-selectores{display:flex;gap:10px;flex-wrap:wrap}
      .dashboard-estadisticas-selector{display:flex;align-items:center;gap:8px;font-weight:800;color:#5c257c}
      .dashboard-estadisticas-selector select{min-height:40px;padding:0 12px;border:1px solid #d8cadd;border-radius:10px;background:#fff;font:inherit}
      .dashboard-estadisticas-resumen{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin-top:20px}
      .dashboard-estadisticas-dato{padding:16px;border-radius:14px;background:#f7f2f9;border:1px solid #eee4f1;cursor:pointer;transition:.15s ease;text-align:left}
      .dashboard-estadisticas-dato:hover{transform:translateY(-1px);border-color:#b99bc8}.dashboard-estadisticas-dato.activo{outline:2px solid #8f63a8;background:#f1e7f5}
      .dashboard-estadisticas-dato span{display:block;color:#765d7f;font-size:11px;font-weight:900;text-transform:uppercase;line-height:1.3}.dashboard-estadisticas-dato strong{display:block;margin-top:6px;color:#5c257c;font-size:25px}
      .dashboard-control{margin-top:26px;border-top:1px solid #eee7f0;padding-top:22px}
      .dashboard-control-cabecera{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px}.dashboard-control-cabecera h3{margin:0}.dashboard-control-cabecera p{margin:5px 0 0;color:#766d7a}
      .dashboard-control-filtros{display:flex;gap:8px;flex-wrap:wrap}.dashboard-control-filtros button{border:1px solid #d8cadd;background:#fff;color:#5c257c;border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer}.dashboard-control-filtros button.activo{background:#5c257c;color:#fff;border-color:#5c257c}
      .dashboard-control-tabla-wrap{overflow:auto;border:1px solid #eee7f0;border-radius:14px}.dashboard-control-tabla{width:100%;border-collapse:collapse;min-width:900px}.dashboard-control-tabla th{padding:11px 12px;text-align:left;background:#f7f2f9;color:#5c257c;font-size:12px;text-transform:uppercase;position:sticky;top:0}.dashboard-control-tabla td{padding:12px;border-top:1px solid #eee7f0;vertical-align:middle}.dashboard-control-tabla tr:hover td{background:#fcfafc}
      .dashboard-estado{display:inline-flex;padding:6px 9px;border-radius:999px;font-size:12px;font-weight:900;white-space:nowrap}.dashboard-estado.facturado{background:#e6f5ea;color:#26733c}.dashboard-estado.cancelado{background:#fde7ec;color:#a42f46}.dashboard-estado.pendiente{background:#fff1c9;color:#805b00}.dashboard-estado.enviado{background:#e8f1ff;color:#285a9d}.dashboard-estado.borrador{background:#efedf0;color:#655d68}
      .dashboard-abrir{display:inline-flex;padding:7px 10px;border-radius:9px;background:#5c257c;color:#fff!important;text-decoration:none;font-weight:800;white-space:nowrap}.dashboard-sin-datos{padding:22px;text-align:center;color:#766d7a}
      .dashboard-estadisticas-error{margin-top:16px;padding:12px;border-radius:10px;background:#fde7ec;color:#a42f46}
      @media(max-width:1100px){.dashboard-estadisticas-resumen{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:700px){.dashboard-estadisticas-resumen{grid-template-columns:repeat(2,minmax(0,1fr))}.dashboard-estadisticas-catering{padding:16px}.dashboard-estadisticas-dato strong{font-size:21px}}
    </style>
    <div class="dashboard-estadisticas-cabecera">
      <div><p class="dashboard-etiqueta">CONTROL COMERCIAL</p><h2>Presupuestos y facturación de Catering</h2><p>Resumen mensual y seguimiento de los presupuestos hasta su facturación.</p></div>
      <div class="dashboard-estadisticas-selectores">
        <label class="dashboard-estadisticas-selector">Mes <select data-estadisticas-mes></select></label>
        <label class="dashboard-estadisticas-selector">Año <select data-estadisticas-anio></select></label>
      </div>
    </div>
    <div data-estadisticas-contenido><p style="margin-top:20px">Cargando control comercial...</p></div>
  `;

  const referencia = dashboard.querySelector(".dashboard-hoy");
  if (referencia) dashboard.insertBefore(panel, referencia);
  else dashboard.appendChild(panel);

  const selectAnio = panel.querySelector("[data-estadisticas-anio]");
  const selectMes = panel.querySelector("[data-estadisticas-mes]");
  const ahora = new Date();
  const actual = ahora.getFullYear();

  MESES.forEach((nombre, i) => {
    const option = document.createElement("option");
    option.value = String(i + 1);
    option.textContent = nombre;
    selectMes.appendChild(option);
  });
  selectMes.value = String(ahora.getMonth() + 1);

  for (let anio = actual; anio >= 2024; anio -= 1) {
    const option = document.createElement("option");
    option.value = String(anio);
    option.textContent = String(anio);
    selectAnio.appendChild(option);
  }
  selectAnio.value = String(actual);

  const recargar = () => cargarEstadisticas(Number(selectAnio.value), Number(selectMes.value), panel);
  selectAnio.addEventListener("change", recargar);
  selectMes.addEventListener("change", recargar);
  recargar();
  return panel;
}

async function cargarEstadisticas(anio, mes, panel) {
  if (cargando || !panel?.isConnected) return;
  cargando = true;
  const contenido = panel.querySelector("[data-estadisticas-contenido]");
  contenido.innerHTML = `<p style="margin-top:20px">Cargando ${MESES[mes - 1].toLowerCase()} de ${anio}...</p>`;

  try {
    const mm = String(mes).padStart(2, "0");
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const inicio = `${anio}-${mm}-01`;
    const fin = `${anio}-${mm}-${String(ultimoDia).padStart(2, "0")}`;

    const [presupuestosRes, facturasRes] = await Promise.all([
      supabase
        .from("presupuestos")
        .select("id, numero, fecha, estado, tipo_documento, subtotal, iva_total, total, facturado_externamente, fecha_facturacion, cliente_id, clientes(id,nombre,empresa)")
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha", { ascending: false }),
      supabase
        .from("facturas")
        .select("id, numero, presupuesto_id, fecha_factura, total, estado, nombre_cliente")
        .gte("fecha_factura", inicio)
        .lte("fecha_factura", fin),
    ]);

    if (presupuestosRes.error) throw presupuestosRes.error;
    if (facturasRes.error) throw facturasRes.error;

    const presupuestos = (presupuestosRes.data || []).filter(esCatering);
    const facturas = (facturasRes.data || []).filter((f) => normalizar(f.estado) !== "anulada");
    const facturasPorPresupuesto = new Map(
      facturas.filter((f) => f.presupuesto_id).map((f) => [String(f.presupuesto_id), f]),
    );

    const filas = presupuestos.map((p) => {
      const factura = facturasPorPresupuesto.get(String(p.id)) || null;
      const estado = factura ? "Facturado" : estadoControl(p);
      return { ...p, factura, estadoControl: estado };
    });

    const facturados = filas.filter((p) => p.estadoControl === "Facturado");
    const pendientes = filas.filter((p) => p.estadoControl === "Aceptado · pendiente de facturar");
    const cancelados = filas.filter((p) => p.estadoControl === "Cancelado");
    const aceptados = filas.filter((p) => ["Facturado", "Aceptado · pendiente de facturar"].includes(p.estadoControl));
    const dineroFacturado = facturas.reduce((suma, f) => suma + Number(f.total || 0), 0);

    contenido.innerHTML = `
      <div class="dashboard-estadisticas-resumen">
        <button class="dashboard-estadisticas-dato activo" data-filtro="todos"><span>Caterings presupuestados</span><strong>${filas.length}</strong></button>
        <button class="dashboard-estadisticas-dato" data-filtro="aceptados"><span>Aceptados</span><strong>${aceptados.length}</strong></button>
        <button class="dashboard-estadisticas-dato" data-filtro="pendientes"><span>Pendientes de facturar</span><strong>${pendientes.length}</strong></button>
        <button class="dashboard-estadisticas-dato" data-filtro="facturados"><span>Caterings facturados</span><strong>${facturados.length}</strong></button>
        <button class="dashboard-estadisticas-dato" data-filtro="cancelados"><span>Cancelados</span><strong>${cancelados.length}</strong></button>
        <button class="dashboard-estadisticas-dato" data-filtro="facturados"><span>Dinero facturado</span><strong>${euros(dineroFacturado)}</strong></button>
      </div>

      <div class="dashboard-control">
        <div class="dashboard-control-cabecera">
          <div><h3>Control de presupuestos</h3><p data-contador>${filas.length} presupuestos en ${MESES[mes - 1].toLowerCase()}.</p></div>
          <div class="dashboard-control-filtros">
            <button class="activo" data-filtro-tabla="todos">Todos</button>
            <button data-filtro-tabla="pendientes">Pendientes de facturar</button>
            <button data-filtro-tabla="facturados">Facturados</button>
            <button data-filtro-tabla="cancelados">Cancelados</button>
          </div>
        </div>
        <div class="dashboard-control-tabla-wrap">
          <table class="dashboard-control-tabla">
            <thead><tr><th>Fecha catering</th><th>Nº presupuesto</th><th>Cliente</th><th>Importe</th><th>Estado</th><th>Nº factura</th><th></th></tr></thead>
            <tbody data-tabla-presupuestos></tbody>
          </table>
        </div>
      </div>
    `;

    const tbody = contenido.querySelector("[data-tabla-presupuestos]");
    const contador = contenido.querySelector("[data-contador]");

    function coincide(p, filtro) {
      if (filtro === "todos") return true;
      if (filtro === "aceptados") return ["Facturado", "Aceptado · pendiente de facturar"].includes(p.estadoControl);
      if (filtro === "pendientes") return p.estadoControl === "Aceptado · pendiente de facturar";
      if (filtro === "facturados") return p.estadoControl === "Facturado";
      if (filtro === "cancelados") return p.estadoControl === "Cancelado";
      return true;
    }

    function pintarTabla(filtro = "todos") {
      const lista = filas.filter((p) => coincide(p, filtro));
      contador.textContent = `${lista.length} presupuesto${lista.length === 1 ? "" : "s"} en ${MESES[mes - 1].toLowerCase()}.`;
      if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="dashboard-sin-datos">No hay presupuestos en este estado para el mes seleccionado.</td></tr>`;
        return;
      }
      tbody.innerHTML = lista.map((p) => {
        const cliente = p.clientes?.empresa || p.clientes?.nombre || p.factura?.nombre_cliente || "Sin cliente";
        const importe = Number(p.total || p.subtotal || 0);
        return `<tr>
          <td>${fechaBonita(p.fecha)}</td>
          <td><strong>${escapar(p.numero || "—")}</strong></td>
          <td>${escapar(cliente)}</td>
          <td><strong>${euros(importe)}</strong></td>
          <td><span class="dashboard-estado ${claseEstado(p.estadoControl)}">${escapar(p.estadoControl)}</span></td>
          <td>${escapar(p.factura?.numero || (p.estadoControl === "Facturado" ? "Facturado" : "—"))}</td>
          <td><a class="dashboard-abrir" href="#/presupuestos">Abrir presupuestos</a></td>
        </tr>`;
      }).join("");
    }

    function activarFiltro(filtro) {
      contenido.querySelectorAll("[data-filtro-tabla]").forEach((b) => b.classList.toggle("activo", b.dataset.filtroTabla === filtro));
      contenido.querySelectorAll("[data-filtro]").forEach((b) => b.classList.toggle("activo", b.dataset.filtro === filtro));
      pintarTabla(filtro);
    }

    contenido.querySelectorAll("[data-filtro-tabla]").forEach((boton) => boton.addEventListener("click", () => activarFiltro(boton.dataset.filtroTabla)));
    contenido.querySelectorAll("[data-filtro]").forEach((boton) => boton.addEventListener("click", () => activarFiltro(boton.dataset.filtro)));
    pintarTabla("todos");
  } catch (error) {
    contenido.innerHTML = `<div class="dashboard-estadisticas-error">No se ha podido cargar el control comercial: ${escapar(error?.message || error)}</div>`;
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
