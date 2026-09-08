import { supabase } from "./supabase.js";

const MESES = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
};

function escapar(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function moneda(valor) {
  const n = Number(valor || 0);
  return Number.isFinite(n)
    ? n.toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 })
    : "0,00 €";
}

function fechaES(valor) {
  if (!valor) return "";
  const [a, m, d] = String(valor).slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : String(valor);
}

function leerLineas(valor) {
  if (Array.isArray(valor)) return valor;
  if (typeof valor === "string") {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function periodoDesdeTexto(texto = "") {
  const limpio = String(texto).toLowerCase();
  const mes = Object.keys(MESES).find((m) => limpio.includes(m));
  const anio = limpio.match(/20\d{2}/)?.[0];
  if (!mes || !anio) return null;
  return { mes: MESES[mes], anio };
}

function formaPagoEtiqueta(valor = "") {
  const v = String(valor).toLowerCase();
  if (v.includes("tarjeta")) return "tarjeta";
  if (v.includes("efectivo")) return "efectivo";
  return "transferencia";
}

async function aplicarFormato() {
  if (!location.hash.includes("/facturacion")) return;

  const detalle = document.querySelector(".facturacion-page .factura-vista-completa");
  const documento = detalle?.querySelector(".factura-documento");
  if (!detalle || !documento || documento.dataset.formatoFicha === "1") return;

  const cliente = documento.querySelector("h2")?.textContent?.trim();
  const periodoTexto = documento.querySelector("p")?.textContent || "";
  const periodo = periodoDesdeTexto(periodoTexto);
  if (!cliente) return;

  documento.dataset.formatoFicha = "cargando";

  let consulta = supabase
    .from("facturas")
    .select("*")
    .eq("nombre_cliente", cliente)
    .order("fecha_factura", { ascending: true });

  const { data, error } = await consulta;
  if (error) {
    console.warn("No se ha podido cargar el formato de datos para factura", error);
    documento.dataset.formatoFicha = "";
    return;
  }

  let registros = data || [];
  if (periodo) {
    registros = registros.filter((r) => String(r.fecha_factura || "").startsWith(`${periodo.anio}-${periodo.mes}`));
  }
  if (!registros.length) {
    documento.dataset.formatoFicha = "";
    return;
  }

  const principal = registros[0];
  const importe = registros.reduce((suma, r) => suma + Number(r.total ?? r.importe ?? 0), 0);
  const ivaIncluido = registros.every((r) => Boolean(r.iva_incluido));
  const formas = [...new Set(registros.map((r) => formaPagoEtiqueta(r.forma_pago)))];
  const forma = formas.length === 1 ? formas[0] : "varias";

  const conceptos = registros.flatMap((r) => {
    const lineas = leerLineas(r.lineas);
    if (!lineas.length) {
      return [{ descripcion: "Servicio", total: Number(r.total ?? r.importe ?? 0), fecha: r.fecha_factura }];
    }
    return lineas.map((l) => ({
      descripcion: l.descripcion || "Concepto",
      total: Number(l.cantidad || 0) * Number(l.precio_unitario || 0) * (1 + Number(l.iva || 0) / 100),
      fecha: r.fecha_factura,
    }));
  });

  const direccionCompleta = [principal.direccion, principal.codigo_postal, principal.poblacion, principal.provincia]
    .filter(Boolean)
    .join(" · ");

  const fechaFactura = registros.length === 1
    ? fechaES(principal.fecha_factura)
    : `${fechaES(registros[0].fecha_factura)} - ${fechaES(registros[registros.length - 1].fecha_factura)}`;

  documento.innerHTML = `
    <div class="datos-factura-ficha">
      <h1>DATOS PARA FACTURA</h1>

      <section class="datos-factura-bloque">
        <h3>Datos Cliente</h3>
        <div class="datos-factura-campo"><strong>Nombre:</strong><span>${escapar(principal.nombre_cliente || cliente)}</span></div>
        <div class="datos-factura-campo"><strong>CIF:</strong><span>${escapar(principal.cif || "")}</span></div>
        <div class="datos-factura-campo"><strong>Dirección:</strong><span>${escapar(direccionCompleta)}</span></div>
        <div class="datos-factura-campo"><strong>e-mail:</strong><span>${escapar(principal.email || "")}</span></div>
        <div class="datos-factura-campo"><strong>Fecha Factura:</strong><span>${escapar(fechaFactura)}</span></div>
      </section>

      <section class="datos-factura-bloque datos-factura-conceptos">
        <h3>Detalle Concepto Factura</h3>
        <div class="datos-factura-listado">
          ${conceptos.map((c) => `
            <div class="datos-factura-linea">
              <span>${escapar(c.descripcion)}</span>
              <strong>${moneda(c.total)}</strong>
            </div>`).join("")}
        </div>
      </section>

      <section class="datos-factura-bloque datos-factura-totales">
        <div class="datos-factura-campo importe"><strong>Importe:</strong><span>${moneda(importe)}</span></div>
        <div class="datos-factura-campo"><strong>IVA Incluído:</strong><span><b>SI</b> ${ivaIncluido ? "☒" : "☐"} &nbsp;&nbsp;&nbsp; <b>No</b> ${ivaIncluido ? "☐" : "☒"}</span></div>
        <div class="datos-factura-campo"><strong>Forma de Pago:</strong><span></span></div>
        <div class="datos-factura-pagos">
          <span><b>Transferencia</b> ${forma === "transferencia" ? "☒" : "☐"}</span>
          <span><b>Tarjeta</b> ${forma === "tarjeta" ? "☒" : "☐"}</span>
          <span><b>Efectivo</b> ${forma === "efectivo" ? "☒" : "☐"}</span>
        </div>
      </section>
    </div>
  `;

  documento.dataset.formatoFicha = "1";
}

function instalarEstilos() {
  if (document.getElementById("datos-factura-formato-estilos")) return;
  const style = document.createElement("style");
  style.id = "datos-factura-formato-estilos";
  style.textContent = `
    .datos-factura-ficha{max-width:900px;margin:0 auto;color:#22152a}
    .datos-factura-ficha h1{margin:0 0 28px!important;font-size:30px!important;color:#3d004f!important;font-style:italic}
    .datos-factura-bloque{padding:0 0 22px;margin-bottom:18px;border-bottom:1px solid #e5dce9}
    .datos-factura-bloque h3{margin:0 0 18px;font-size:18px;color:#3d004f}
    .datos-factura-campo{display:grid;grid-template-columns:180px 1fr;gap:18px;min-height:34px;align-items:start;margin:5px 0}
    .datos-factura-conceptos{min-height:260px}
    .datos-factura-listado{display:flex;flex-direction:column;gap:10px;margin-top:12px}
    .datos-factura-linea{display:grid;grid-template-columns:1fr 130px;gap:18px;padding:8px 0;border-bottom:1px dotted #ddd}
    .datos-factura-linea strong{text-align:right}
    .datos-factura-totales{border-bottom:0}
    .datos-factura-campo.importe span{font-weight:800}
    .datos-factura-pagos{display:flex;gap:36px;flex-wrap:wrap;margin-top:10px;padding-left:198px}
    @media print{
      .datos-factura-ficha{max-width:none!important;width:100%!important}
      .datos-factura-ficha h1{font-size:22pt!important;margin-bottom:10mm!important}
      .datos-factura-campo{grid-template-columns:45mm 1fr!important;min-height:8mm!important;font-size:11pt!important}
      .datos-factura-conceptos{min-height:110mm!important}
      .datos-factura-linea{grid-template-columns:1fr 35mm!important;font-size:11pt!important}
      .datos-factura-pagos{padding-left:45mm!important;font-size:11pt!important}
    }
  `;
  document.head.appendChild(style);
}

let timer = null;
function programar() {
  clearTimeout(timer);
  timer = setTimeout(aplicarFormato, 120);
}

function iniciar() {
  instalarEstilos();
  const obs = new MutationObserver(programar);
  obs.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("hashchange", programar);
  programar();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar, { once: true });
} else {
  iniciar();
}
