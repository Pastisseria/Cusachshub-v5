import { supabase } from "./supabase.js";

const MESES = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

let cargando = false;
let temporizador = null;
let firmaAnterior = "";

function normalizar(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function obtenerMesVisible() {
  const titulo = document.querySelector(".catering-barra h3");
  if (!titulo) return null;

  const partes = normalizar(titulo.textContent).split(/\s+/);
  const mes = MESES[partes[0]];
  const anio = Number(partes[1]);
  if (!Number.isInteger(mes) || !Number.isFinite(anio)) return null;
  return { mes, anio };
}

function fechaISO(anio, mes, dia) {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function mapaCeldasMes(mesVisible) {
  const mapa = new Map();
  const celdas = Array.from(document.querySelectorAll(".calendario-dia"));

  for (const celda of celdas) {
    if (celda.classList.contains("calendario-dia-otro-mes")) continue;
    const numero = Number(celda.querySelector(".calendario-numero")?.textContent || 0);
    if (!numero) continue;
    mapa.set(fechaISO(mesVisible.anio, mesVisible.mes, numero), celda);
  }

  return mapa;
}

function limpiarInyectados() {
  document
    .querySelectorAll(".calendario-evento-visitador-inyectado")
    .forEach((elemento) => elemento.remove());
}

async function pintarVisitadores() {
  if (cargando) return;
  if (!location.hash.includes("/catering")) return;

  const mesVisible = obtenerMesVisible();
  if (!mesVisible) return;

  const celdas = mapaCeldasMes(mesVisible);
  if (!celdas.size) return;

  cargando = true;
  try {
    const inicio = fechaISO(mesVisible.anio, mesVisible.mes, 1);
    const ultimoDia = new Date(mesVisible.anio, mesVisible.mes + 1, 0).getDate();
    const fin = fechaISO(mesVisible.anio, mesVisible.mes, ultimoDia);

    const { data, error } = await supabase
      .from("presupuestos")
      .select("id, numero, fecha, hora_entrega, estado, visitador_nombre, laboratorio")
      .eq("tipo_documento", "Visitador médico")
      .gte("fecha", inicio)
      .lte("fecha", fin)
      .neq("estado", "Cancelado")
      .order("fecha", { ascending: true })
      .order("hora_entrega", { ascending: true });

    if (error) {
      console.warn("No se han podido cargar los visitadores en Catering", error);
      return;
    }

    const firma = JSON.stringify((data || []).map((p) => [p.id, p.fecha, p.hora_entrega, p.estado, p.visitador_nombre]));
    const yaPintados = document.querySelectorAll(".calendario-evento-visitador-inyectado").length;
    if (firma === firmaAnterior && yaPintados === (data || []).length) return;

    limpiarInyectados();
    firmaAnterior = firma;

    for (const presupuesto of data || []) {
      const celda = celdas.get(presupuesto.fecha);
      const contenedor = celda?.querySelector(".calendario-eventos");
      if (!contenedor) continue;

      const evento = document.createElement("span");
      evento.className = "calendario-evento calendario-evento-visitador-inyectado";
      evento.title = `${presupuesto.visitador_nombre || "Visitador médico"} · ${presupuesto.numero || ""}`;

      const hora = String(presupuesto.hora_entrega || "").slice(0, 5);
      if (hora) {
        const fuerte = document.createElement("strong");
        fuerte.textContent = hora;
        evento.appendChild(fuerte);
      }

      const nombre = document.createElement("span");
      nombre.textContent = presupuesto.visitador_nombre || presupuesto.laboratorio || "Visitador médico";
      evento.appendChild(nombre);

      contenedor.appendChild(evento);
    }
  } finally {
    cargando = false;
  }
}

function imprimirMes() {
  document.body.classList.add("imprimiendo-mes-catering");
  const limpiar = () => {
    document.body.classList.remove("imprimiendo-mes-catering");
    window.removeEventListener("afterprint", limpiar);
  };
  window.addEventListener("afterprint", limpiar);
  window.print();
  setTimeout(limpiar, 1500);
}

function asegurarBotonImprimir() {
  if (!location.hash.includes("/catering")) return;
  if (document.getElementById("boton-imprimir-mes-catering")) return;

  const acciones = document.querySelector(".catering-acciones-cabecera");
  if (!acciones) return;

  const boton = document.createElement("button");
  boton.id = "boton-imprimir-mes-catering";
  boton.type = "button";
  boton.className = "boton-secundario";
  boton.textContent = "🖨 Imprimir mes";
  boton.addEventListener("click", imprimirMes);

  const nuevo = Array.from(acciones.querySelectorAll("button")).find((b) =>
    normalizar(b.textContent).includes("nuevo catering"),
  );
  if (nuevo) acciones.insertBefore(boton, nuevo);
  else acciones.appendChild(boton);
}

function instalarEstilos() {
  if (document.getElementById("estilos-catering-visitadores")) return;
  const estilo = document.createElement("style");
  estilo.id = "estilos-catering-visitadores";
  estilo.textContent = `
    .calendario-evento-visitador-inyectado {
      background: #ead7ff !important;
      color: #5f2388 !important;
      border: 1px solid #c590ef !important;
      text-decoration: none !important;
    }
    .calendario-evento-visitador-inyectado strong {
      color: #4f176f !important;
    }

    @media print {
      @page {
        size: A4 landscape;
        margin: 8mm;
      }

      body.imprimiendo-mes-catering {
        background: #fff !important;
      }

      body.imprimiendo-mes-catering .sidebar,
      body.imprimiendo-mes-catering aside,
      body.imprimiendo-mes-catering .catering-acciones-cabecera,
      body.imprimiendo-mes-catering .catering-navegacion,
      body.imprimiendo-mes-catering .catering-contador,
      body.imprimiendo-mes-catering .catering-leyenda,
      body.imprimiendo-mes-catering .catering-error,
      body.imprimiendo-mes-catering .catering-mensaje,
      body.imprimiendo-mes-catering .catering-semana,
      body.imprimiendo-mes-catering .no-imprimir {
        display: none !important;
      }

      body.imprimiendo-mes-catering main,
      body.imprimiendo-mes-catering .main-content,
      body.imprimiendo-mes-catering .contenido,
      body.imprimiendo-mes-catering .app-content {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: none !important;
      }

      body.imprimiendo-mes-catering .catering-panel {
        display: block !important;
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        box-shadow: none !important;
      }

      body.imprimiendo-mes-catering .catering-cabecera {
        display: block !important;
        margin: 0 0 5mm !important;
      }

      body.imprimiendo-mes-catering .catering-cabecera h2 {
        margin: 0 !important;
        font-size: 18pt !important;
      }

      body.imprimiendo-mes-catering .catering-descripcion,
      body.imprimiendo-mes-catering .catering-etiqueta {
        display: none !important;
      }

      body.imprimiendo-mes-catering .catering-barra {
        display: flex !important;
        justify-content: center !important;
        margin: 0 0 4mm !important;
      }

      body.imprimiendo-mes-catering .catering-barra h3 {
        display: block !important;
        font-size: 17pt !important;
      }

      body.imprimiendo-mes-catering .calendario-contenedor {
        display: block !important;
        width: 100% !important;
        overflow: visible !important;
        border: 1px solid #bbb !important;
        border-radius: 0 !important;
      }

      body.imprimiendo-mes-catering .calendario-semana,
      body.imprimiendo-mes-catering .calendario-rejilla {
        display: grid !important;
        grid-template-columns: repeat(7, 1fr) !important;
        min-width: 0 !important;
        width: 100% !important;
      }

      body.imprimiendo-mes-catering .calendario-nombre-dia {
        padding: 2.5mm 1mm !important;
        font-size: 9pt !important;
        background: #f2eaf6 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      body.imprimiendo-mes-catering .calendario-nombre-dia span {
        display: inline !important;
      }

      body.imprimiendo-mes-catering .calendario-nombre-dia::after {
        display: none !important;
      }

      body.imprimiendo-mes-catering .calendario-dia {
        min-height: 27mm !important;
        height: 27mm !important;
        padding: 8mm 1.5mm 1.5mm !important;
        overflow: hidden !important;
        page-break-inside: avoid !important;
        background: #fff !important;
      }

      body.imprimiendo-mes-catering .calendario-numero {
        top: 1.5mm !important;
        left: 1.5mm !important;
        width: 6mm !important;
        height: 6mm !important;
        font-size: 8pt !important;
      }

      body.imprimiendo-mes-catering .calendario-eventos {
        gap: 1mm !important;
      }

      body.imprimiendo-mes-catering .calendario-evento {
        padding: 1mm !important;
        border-radius: 1.5mm !important;
        font-size: 7.2pt !important;
        line-height: 1.15 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      body.imprimiendo-mes-catering .calendario-evento strong {
        font-size: 7.2pt !important;
      }

      body.imprimiendo-mes-catering .calendario-mas {
        font-size: 7pt !important;
      }
    }
  `;
  document.head.appendChild(estilo);
}

function programar() {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    asegurarBotonImprimir();
    pintarVisitadores();
  }, 180);
}

function iniciar() {
  instalarEstilos();
  const observador = new MutationObserver(programar);
  observador.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener("hashchange", () => {
    firmaAnterior = "";
    programar();
  });
  programar();
  setTimeout(programar, 700);
  setTimeout(programar, 1800);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar, { once: true });
} else {
  iniciar();
}
