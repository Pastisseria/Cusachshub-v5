import { supabase } from "./supabase.js";

const MESES = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
};

function escapar(valor = "") {
  return String(valor).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function moneda(valor) {
  const n = Number(valor || 0);
  return Number.isFinite(n) ? n.toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }) : "0,00 €";
}
function fechaES(valor) {
  if (!valor) return "";
  const [a, m, d] = String(valor).slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : String(valor);
}
function leerLineas(valor) {
  if (Array.isArray(valor)) return valor;
  if (typeof valor === "string") { try { const p = JSON.parse(valor); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
}
function periodoDesdeTexto(texto = "") {
  const limpio = String(texto).toLowerCase();
  const mes = Object.keys(MESES).find((m) => limpio.includes(m));
  const anio = limpio.match(/20\d{2}/)?.[0];
  return mes && anio ? { mes: MESES[mes], anio } : null;
}
function formaPagoEtiqueta(valor = "") {
  const v = String(valor).toLowerCase();
  if (v.includes("tarjeta")) return "tarjeta";
  if (v.includes("efectivo")) return "efectivo";
  return "transferencia";
}
async function guardarFormaPago(registros, formaPago, boton) {
  const ids = registros.map((r) => r.id).filter(Boolean);
  if (!ids.length) return;
  const original = boton?.textContent || "Guardar cambios";
  if (boton) { boton.disabled = true; boton.textContent = "Guardando..."; }
  const { error } = await supabase.from("facturas").update({ forma_pago: formaPago, updated_at: new Date().toISOString() }).in("id", ids);
  if (boton) { boton.disabled = false; boton.textContent = error ? "Error al guardar" : "✓ Guardado"; setTimeout(() => { boton.textContent = original; }, 1600); }
  if (error) console.warn("No se ha podido guardar la forma de pago", error);
}

async function aplicarFormato() {
  if (!location.hash.includes("/facturacion")) return;
  const detalle = document.querySelector(".facturacion-page .factura-vista-completa");
  const documento = detalle?.querySelector(".factura-documento");
  if (!detalle || !documento || documento.dataset.formatoFicha === "1") return;
  const cliente = documento.querySelector("h2")?.textContent?.trim();
  const periodo = periodoDesdeTexto(documento.querySelector("p")?.textContent || "");
  if (!cliente) return;
  documento.dataset.formatoFicha = "cargando";

  const { data, error } = await supabase.from("facturas").select("*").eq("nombre_cliente", cliente).order("fecha_factura", { ascending: true });
  if (error) { console.warn("No se ha podido cargar el formato de datos para factura", error); documento.dataset.formatoFicha = ""; return; }
  let registros = data || [];
  if (periodo) registros = registros.filter((r) => String(r.fecha_factura || "").startsWith(`${periodo.anio}-${periodo.mes}`));
  if (!registros.length) { documento.dataset.formatoFicha = ""; return; }

  const principal = registros[0];
  const formas = [...new Set(registros.map((r) => formaPagoEtiqueta(r.forma_pago)))];
  const forma = formas.length === 1 ? formas[0] : "transferencia";
  const conceptos = registros.flatMap((r) => {
    const lineas = leerLineas(r.lineas);
    if (!lineas.length) return [{ descripcion: "Servicio", cantidad: 1, precio: Number(r.total ?? r.importe ?? 0), total: Number(r.total ?? r.importe ?? 0) }];
    return lineas.map((l) => {
      const cantidad = Number(l.cantidad || 0), precio = Number(l.precio_unitario || 0);
      return { descripcion: l.descripcion || "Concepto", cantidad, precio, total: cantidad * precio };
    });
  });
  const baseImponible = conceptos.reduce((s, c) => s + Number(c.total || 0), 0);
  const ivaInicial = 10;
  const direccionCompleta = [principal.direccion, principal.codigo_postal, principal.poblacion, principal.provincia].filter(Boolean).join(" · ");
  const fechaFactura = registros.length === 1 ? fechaES(principal.fecha_factura) : `${fechaES(registros[0].fecha_factura)} - ${fechaES(registros[registros.length - 1].fecha_factura)}`;

  documento.innerHTML = `
    <div class="datos-factura-ficha" data-forma-pago="${forma}">
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
        <h3>Detalle Concepto Factura <small class="no-imprimir">— haz clic sobre el texto para modificarlo</small></h3>
        <div class="datos-factura-tabla-cabecera"><strong>Descripción</strong><strong>Cantidad</strong><strong>Precio (sin IVA)</strong><strong>Importe (sin IVA)</strong></div>
        <div class="datos-factura-listado">
          ${conceptos.map((c) => `<div class="datos-factura-linea">
            <span class="datos-factura-descripcion-editable" contenteditable="true" spellcheck="true" title="Haz clic para editar">${escapar(c.descripcion)}</span>
            <span class="numero">${c.cantidad || ""}</span><span class="numero">${moneda(c.precio)}</span><strong>${moneda(c.total)}</strong>
          </div>`).join("")}
        </div>
      </section>
      <section class="datos-factura-bloque datos-factura-totales">
        <div class="datos-factura-resumen">
          <div><strong>Base imponible (sin IVA)</strong><span>${moneda(baseImponible)}</span></div>
          <div class="fila-iva"><strong>IVA (%)</strong><span class="no-imprimir"><input class="datos-factura-iva-input" type="number" min="0" max="100" step="0.01" value="${ivaInicial}"> %</span><span class="datos-factura-iva-print datos-factura-solo-print">${ivaInicial} %</span><span class="datos-factura-cuota-iva"></span></div>
          <div class="total"><strong>Total</strong><span class="datos-factura-total-final"></span></div>
        </div>
        <div class="datos-factura-editor no-imprimir">
          <div class="datos-factura-editor-grupo"><strong>Forma de Pago:</strong>
            <label><input type="radio" name="forma-pago-manual" value="transferencia" ${forma === "transferencia" ? "checked" : ""}> Transferencia</label>
            <label><input type="radio" name="forma-pago-manual" value="tarjeta" ${forma === "tarjeta" ? "checked" : ""}> Tarjeta</label>
            <label><input type="radio" name="forma-pago-manual" value="efectivo" ${forma === "efectivo" ? "checked" : ""}> Efectivo</label>
          </div>
          <button type="button" class="datos-factura-guardar-opciones">Guardar cambios</button>
        </div>
        <div class="datos-factura-solo-print datos-factura-forma-print"><div class="datos-factura-campo"><strong>Forma de Pago:</strong><span class="datos-factura-forma-pago-print"></span></div></div>
      </section>
    </div>`;

  const ficha = documento.querySelector(".datos-factura-ficha"), ivaInput = documento.querySelector(".datos-factura-iva-input"), ivaPrint = documento.querySelector(".datos-factura-iva-print"), cuotaIva = documento.querySelector(".datos-factura-cuota-iva"), totalFinal = documento.querySelector(".datos-factura-total-final"), formaPrint = documento.querySelector(".datos-factura-forma-pago-print"), botonGuardar = documento.querySelector(".datos-factura-guardar-opciones");
  function refrescarTotales() {
    const porcentaje = Math.max(0, Number(ivaInput?.value || 0)), cuota = baseImponible * porcentaje / 100;
    if (cuotaIva) cuotaIva.textContent = moneda(cuota);
    if (totalFinal) totalFinal.textContent = moneda(baseImponible + cuota);
    if (ivaPrint) ivaPrint.textContent = `${porcentaje.toLocaleString("es-ES")} %`;
  }
  function refrescarFormaPago() {
    const seleccionada = documento.querySelector('input[name="forma-pago-manual"]:checked')?.value || "transferencia";
    ficha.dataset.formaPago = seleccionada;
    if (formaPrint) formaPrint.textContent = seleccionada.charAt(0).toUpperCase() + seleccionada.slice(1);
  }
  ivaInput?.addEventListener("input", refrescarTotales);
  documento.querySelectorAll('input[name="forma-pago-manual"]').forEach((input) => input.addEventListener("change", refrescarFormaPago));
  botonGuardar?.addEventListener("click", async () => { const f = documento.querySelector('input[name="forma-pago-manual"]:checked')?.value || "transferencia"; await guardarFormaPago(registros, f, botonGuardar); refrescarFormaPago(); });
  refrescarTotales(); refrescarFormaPago(); documento.dataset.formatoFicha = "1";
}

function instalarEstilos() {
  if (document.getElementById("datos-factura-formato-estilos")) return;
  const style = document.createElement("style"); style.id = "datos-factura-formato-estilos";
  style.textContent = `
    .datos-factura-ficha{max-width:1000px;margin:0 auto;color:#22152a}.datos-factura-ficha h1{margin:0 0 28px!important;font-size:30px!important;color:#3d004f!important;font-style:italic}
    .datos-factura-bloque{padding:0 0 22px;margin-bottom:18px;border-bottom:1px solid #e5dce9}.datos-factura-bloque h3{margin:0 0 18px;font-size:18px;color:#3d004f}.datos-factura-bloque h3 small{font-size:12px;font-weight:500;color:#765f7e}
    .datos-factura-campo{display:grid;grid-template-columns:180px 1fr;gap:18px;min-height:34px;align-items:start;margin:5px 0}.datos-factura-conceptos{min-height:230px}
    .datos-factura-tabla-cabecera,.datos-factura-linea{display:grid;grid-template-columns:minmax(280px,1fr) 100px 160px 170px;gap:14px;align-items:center}.datos-factura-tabla-cabecera{padding:10px 12px;background:#f6f1f8;border-radius:9px 9px 0 0}.datos-factura-tabla-cabecera strong:not(:first-child),.datos-factura-linea .numero,.datos-factura-linea strong{text-align:right}.datos-factura-listado{display:flex;flex-direction:column}.datos-factura-linea{padding:11px 12px;border-bottom:1px solid #e7e0e9}
    .datos-factura-descripcion-editable{display:block;min-height:24px;padding:5px 7px;margin:-5px -7px;border:1px dashed transparent;border-radius:6px;cursor:text}.datos-factura-descripcion-editable:hover{border-color:#b9a9c0;background:#faf7fb}.datos-factura-descripcion-editable:focus{outline:2px solid #7b3b8f;border-color:transparent;background:#fff}
    .datos-factura-resumen{width:min(560px,100%);margin-left:auto}.datos-factura-resumen>div{display:grid;grid-template-columns:1fr 120px;gap:20px;padding:9px 0;align-items:center}.datos-factura-resumen>div>span:last-child{text-align:right;font-weight:700}.datos-factura-resumen .fila-iva{grid-template-columns:1fr 120px 120px}.datos-factura-iva-input{width:72px;padding:7px 8px;border:1px solid #b9a9c0;border-radius:8px;font:inherit;text-align:right}.datos-factura-resumen .total{margin-top:4px;padding-top:16px;border-top:1px solid #d9cedd;color:#3d004f;font-size:22px}.datos-factura-resumen .total span{font-size:24px}.datos-factura-totales{border-bottom:0}
    .datos-factura-editor{margin-top:22px;padding:18px;border:1px solid #e0d4e5;border-radius:14px;background:#faf7fb}.datos-factura-editor-grupo{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin:8px 0}.datos-factura-editor-grupo>strong{min-width:150px}.datos-factura-editor label{display:inline-flex;align-items:center;gap:7px;font-weight:600}.datos-factura-guardar-opciones{margin-top:14px;padding:11px 18px;border:0;border-radius:10px;background:#3d004f;color:#fff;font-weight:800;cursor:pointer}.datos-factura-solo-print{display:none}
    @media(max-width:800px){.datos-factura-tabla-cabecera{display:none}.datos-factura-linea{grid-template-columns:1fr 90px}.datos-factura-linea .numero{display:none}}
    @media print{.datos-factura-ficha{max-width:none!important;width:100%!important}.datos-factura-ficha h1{font-size:22pt!important;margin-bottom:10mm!important}.datos-factura-campo{grid-template-columns:45mm 1fr!important;min-height:8mm!important;font-size:11pt!important}.datos-factura-conceptos{min-height:85mm!important}.datos-factura-tabla-cabecera,.datos-factura-linea{grid-template-columns:1fr 25mm 35mm 38mm!important;font-size:10pt!important}.datos-factura-descripcion-editable{border:0!important;outline:0!important;background:transparent!important;padding:0!important;margin:0!important}.datos-factura-editor{display:none!important}.datos-factura-solo-print{display:block!important}.datos-factura-resumen .datos-factura-solo-print{display:inline!important}.datos-factura-resumen{width:125mm!important}.datos-factura-forma-print{margin-top:10mm}}
  `;
  document.head.appendChild(style);
}
let timer = null; function programar(){clearTimeout(timer);timer=setTimeout(aplicarFormato,120)}
function iniciar(){instalarEstilos();const obs=new MutationObserver(programar);obs.observe(document.body,{childList:true,subtree:true});window.addEventListener("hashchange",programar);programar()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar,{once:true});else iniciar();
