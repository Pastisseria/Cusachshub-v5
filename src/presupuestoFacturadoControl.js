import { supabase } from "./supabase.js";

let procesando = false;
let observer = null;

function enPresupuestos() {
  return String(location.hash || "").startsWith("#/presupuestos");
}

function fechaES(valor) {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

async function marcarFacturado(id, boton) {
  if (!id || procesando) return;
  procesando = true;
  boton.disabled = true;
  boton.textContent = "Guardando...";
  try {
    const ahora = new Date().toISOString();
    const { error } = await supabase
      .from("presupuestos")
      .update({ facturado_externamente: true, updated_at: ahora })
      .eq("id", id)
      .eq("facturado_externamente", false);
    if (error) throw error;
    boton.replaceWith(crearEtiqueta(ahora));
  } catch (error) {
    console.error("No se pudo marcar como facturado:", error);
    boton.disabled = false;
    boton.textContent = "✓ Pasar a facturado";
    alert(`No se ha podido marcar como facturado: ${error?.message || error}`);
  } finally {
    procesando = false;
  }
}

function crearEtiqueta(fecha) {
  const span = document.createElement("span");
  span.className = "control-facturado-etiqueta";
  span.textContent = `✓ FACTURADO — ${fechaES(fecha)}`;
  span.title = "Este presupuesto ya se pasó a facturar y queda bloqueado para evitar duplicados.";
  return span;
}

async function sincronizar() {
  if (!enPresupuestos()) return;
  const filas = [...document.querySelectorAll("table tbody tr")];
  if (!filas.length) return;

  const numeros = filas.map((fila) => fila.querySelector("td")?.textContent?.trim()).filter(Boolean);
  if (!numeros.length) return;

  const { data, error } = await supabase
    .from("presupuestos")
    .select("id, numero, facturado_externamente, updated_at")
    .in("numero", numeros);
  if (error) return;

  const porNumero = new Map((data || []).map((p) => [String(p.numero || "").trim(), p]));

  filas.forEach((fila) => {
    if (fila.querySelector(".control-facturado")) return;
    const numero = fila.querySelector("td")?.textContent?.trim();
    const p = porNumero.get(numero);
    if (!p) return;
    const acciones = fila.querySelector("td:last-child");
    if (!acciones) return;

    const cont = document.createElement("span");
    cont.className = "control-facturado";
    if (p.facturado_externamente) {
      cont.appendChild(crearEtiqueta(p.updated_at));
    } else {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "control-facturado-boton";
      boton.textContent = "✓ Pasar a facturado";
      boton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        marcarFacturado(p.id, boton);
      });
      cont.appendChild(boton);
    }
    acciones.appendChild(cont);
  });
}

function iniciar() {
  const style = document.createElement("style");
  style.textContent = `.control-facturado{display:inline-flex;margin-left:6px;vertical-align:middle}.control-facturado-boton,.control-facturado-etiqueta{display:inline-flex;align-items:center;min-height:34px;padding:7px 11px;border-radius:9px;font-size:12px;font-weight:900;white-space:nowrap}.control-facturado-boton{border:1px solid #237a47;background:#237a47;color:#fff;cursor:pointer}.control-facturado-boton:disabled{opacity:.55;cursor:default}.control-facturado-etiqueta{background:#dff5e7;color:#176b3a;border:1px solid #b9e3c8}`;
  document.head.appendChild(style);
  window.addEventListener("hashchange", () => setTimeout(sincronizar, 120));
  observer = new MutationObserver(() => { if (enPresupuestos()) setTimeout(sincronizar, 30); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(sincronizar, 150);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
else iniciar();
