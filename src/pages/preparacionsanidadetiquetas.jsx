import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase.js";
import PreparacionSanidad from "./preparacionsanidad.jsx";

const FUENTES_AUTOMATICAS = [
  {
    tabla: "higiene_facturas_agua",
    fecha: "fecha_factura",
    codigos: ["RT7"],
    origen: "Facturas de agua",
  },
  {
    tabla: "higiene_limpieza",
    fecha: "fecha",
    codigos: ["RT13", "RT14", "RT15"],
    origen: "Limpieza",
    preparar: (consulta) => consulta.eq("estado", "Completada"),
  },
  {
    tabla: "higiene_control_recepcion",
    fecha: "fecha_recepcion",
    codigos: ["RT31", "RT33"],
    origen: "Control de recepción",
  },
  {
    tabla: "higiene_aceite_recogidas",
    fecha: "fecha_recogida",
    codigos: ["RT65"],
    origen: "Aceite usado",
  },
  {
    tabla: "higiene_temperaturas",
    fecha: "fecha_inicio",
    codigos: ["RT72"],
    origen: "Temperaturas",
  },
];

function limitesTrimestre(periodo) {
  const match = /^(\d{4})-T([1-4])$/.exec((periodo || "").trim());
  if (!match) return null;
  const anio = Number(match[1]);
  const trimestre = Number(match[2]);
  const mesInicio = (trimestre - 1) * 3;
  const inicio = new Date(Date.UTC(anio, mesInicio, 1)).toISOString().slice(0, 10);
  const fin = new Date(Date.UTC(anio, mesInicio + 3, 1)).toISOString().slice(0, 10);
  return { inicio, fin };
}

function periodoVisible() {
  const toolbar = document.querySelector(".sanidad-cabecera-trimestral");
  const input = toolbar?.querySelector('label:first-child input');
  return input?.value?.trim() || "";
}

async function existeRegistro(fuente, limites) {
  let consulta = supabase
    .from(fuente.tabla)
    .select("id")
    .gte(fuente.fecha, limites.inicio)
    .lt(fuente.fecha, limites.fin)
    .limit(1);
  if (fuente.preparar) consulta = fuente.preparar(consulta);
  const { data, error } = await consulta;
  if (error) return false;
  return Boolean(data?.length);
}

export default function PreparacionSanidadEtiquetas() {
  const navigate = useNavigate();

  useEffect(() => {
    function abrirFormato13(event) {
      const enlace = event.target.closest?.("a");
      if (!enlace) return;
      const tarjeta = enlace.closest(".sanidad-formatos-grid article");
      if (!tarjeta || !tarjeta.textContent?.includes("FORMATO 13")) return;
      event.preventDefault();
      event.stopPropagation();
      navigate("/higiene/modelos-etiquetas");
    }
    document.addEventListener("click", abrirFormato13, true);
    return () => document.removeEventListener("click", abrirFormato13, true);
  }, [navigate]);

  useEffect(() => {
    let cancelado = false;
    let mostrarCompletados = false;
    let sincronizando = false;
    let ultimoPeriodo = "";
    const automaticos = new Map();

    function esVistaTrimestral() {
      return Boolean(document.querySelector(".sanidad-cabecera-trimestral"));
    }

    function codigoArticulo(articulo) {
      return articulo.querySelector(".sanidad-pregunta > span")?.textContent?.trim() || "";
    }

    function aplicarVista() {
      if (!esVistaTrimestral()) return;

      const textoToolbar = document.querySelector(".sanidad-toolbar > div:first-child p");
      if (textoToolbar) {
        textoToolbar.textContent = "Los controles ya realizados en otros módulos se completan automáticamente. Un ‘No’ solo requiere incidencia cuando exista una desviación real que deba corregirse.";
      }

      const articulos = [...document.querySelectorAll(".sanidad-cuestionario article")];
      let completados = 0;
      articulos.forEach((articulo) => {
        const codigo = codigoArticulo(articulo);
        const seleccionada = articulo.querySelector(".sanidad-opciones button.seleccionada")?.dataset?.respuesta;
        const completo = seleccionada === "Sí" || seleccionada === "No aplica";
        if (completo) completados += 1;
        articulo.style.display = completo && !mostrarCompletados ? "none" : "";

        const origen = automaticos.get(codigo);
        const pregunta = articulo.querySelector(".sanidad-pregunta > div");
        if (pregunta) {
          let aviso = pregunta.querySelector(".sanidad-auto-origen");
          if (origen && !aviso) {
            aviso = document.createElement("small");
            aviso.className = "sanidad-auto-origen";
            aviso.textContent = `✓ Completado automáticamente desde ${origen}`;
            aviso.style.display = "inline-block";
            aviso.style.marginTop = "8px";
            aviso.style.fontWeight = "700";
            aviso.style.color = "#177245";
            pregunta.appendChild(aviso);
          } else if (!origen && aviso) {
            aviso.remove();
          }
        }
      });

      const resumen = document.querySelector(".sanidad-resumen");
      if (resumen) {
        let boton = resumen.querySelector(".sanidad-ver-completados-trimestral");
        if (!boton) {
          boton = document.createElement("button");
          boton.type = "button";
          boton.className = "sanidad-mostrar-completados sanidad-ver-completados-trimestral";
          boton.addEventListener("click", () => {
            mostrarCompletados = !mostrarCompletados;
            aplicarVista();
          });
          resumen.appendChild(boton);
        }
        boton.textContent = mostrarCompletados
          ? "Ocultar completados"
          : `Ver completados (${completados})`;
      }

      if (!mostrarCompletados && articulos.length > 0 && articulos.every((a) => a.style.display === "none")) {
        let todo = document.querySelector(".sanidad-todo-completo-trimestral");
        if (!todo) {
          todo = document.createElement("section");
          todo.className = "sanidad-todo-completo sanidad-todo-completo-trimestral";
          todo.innerHTML = "<strong>✓ No queda ningún punto pendiente</strong><p>Los controles realizados en sus módulos correspondientes ya están contabilizados.</p>";
          document.querySelector(".sanidad-cuestionario")?.before(todo);
        }
      } else {
        document.querySelector(".sanidad-todo-completo-trimestral")?.remove();
      }
    }

    async function sincronizar() {
      if (cancelado || sincronizando || !esVistaTrimestral()) return;
      const periodo = periodoVisible();
      const limites = limitesTrimestre(periodo);
      if (!limites) return;
      if (periodo === ultimoPeriodo && automaticos.size) {
        aplicarVista();
        return;
      }

      sincronizando = true;
      ultimoPeriodo = periodo;
      automaticos.clear();

      try {
        const { data: existentes } = await supabase
          .from("higiene_cuestionarios")
          .select("codigo,respuesta")
          .eq("tipo", "trimestral")
          .eq("periodo", periodo);
        const respuestasExistentes = new Map((existentes || []).map((r) => [r.codigo, r.respuesta]));

        for (const fuente of FUENTES_AUTOMATICAS) {
          if (cancelado) return;
          const existe = await existeRegistro(fuente, limites);
          if (!existe) continue;

          for (const codigo of fuente.codigos) {
            automaticos.set(codigo, fuente.origen);
            const respuestaActual = respuestasExistentes.get(codigo);
            if (respuestaActual && respuestaActual !== "Pendiente") continue;

            const articulo = [...document.querySelectorAll(".sanidad-cuestionario article")]
              .find((a) => codigoArticulo(a) === codigo);
            const botonSi = articulo?.querySelector('.sanidad-opciones button[data-respuesta="Sí"]');
            const seleccionada = articulo?.querySelector(".sanidad-opciones button.seleccionada")?.dataset?.respuesta;
            if (botonSi && (!seleccionada || seleccionada === "Pendiente")) {
              botonSi.click();
            } else {
              await supabase.from("higiene_cuestionarios").upsert({
                tipo: "trimestral",
                periodo,
                codigo,
                respuesta: "Sí",
                nota: `Completado automáticamente desde ${fuente.origen}`,
                actualizado_en: new Date().toISOString(),
              }, { onConflict: "tipo,periodo,codigo" });
            }
          }
        }
      } finally {
        sincronizando = false;
        if (!cancelado) setTimeout(aplicarVista, 100);
      }
    }

    const observer = new MutationObserver(() => {
      aplicarVista();
      sincronizar();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

    function alCambiarPeriodo(event) {
      if (!event.target.closest?.(".sanidad-cabecera-trimestral")) return;
      ultimoPeriodo = "";
      automaticos.clear();
      setTimeout(sincronizar, 50);
    }
    document.addEventListener("change", alCambiarPeriodo, true);
    document.addEventListener("input", alCambiarPeriodo, true);

    setTimeout(() => {
      aplicarVista();
      sincronizar();
    }, 150);

    return () => {
      cancelado = true;
      observer.disconnect();
      document.removeEventListener("change", alCambiarPeriodo, true);
      document.removeEventListener("input", alCambiarPeriodo, true);
    };
  }, []);

  return <PreparacionSanidad />;
}
