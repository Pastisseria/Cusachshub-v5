import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase.js";
import "../styles/preparacionsanidad-formatos.css";

const RESPUESTAS = ["Pendiente", "Sí", "No", "No aplica"];

const REQUISITOS = [
  ["Agua", "El agua del grifo se utiliza para preparar o elaborar productos de pastelería."],
  ["Agua", "El suministro procede de la red pública."],
  ["Agua", "Está archivada una factura del suministro de agua."],
  ["Agua", "El suministro procede de captación propia."],
  ["Agua", "Se utiliza agua procedente de cisternas."],
  ["Agua", "Hay agua potable fría y caliente."],
  ["Agua", "Existe una descripción o plano de la red: entrada, salidas, instalaciones intermedias y tratamientos."],
  ["Agua", "Las instalaciones intermedias y tratamientos de agua se limpian y mantienen periódicamente."],
  ["Agua", "Si hay captación propia, se mide diariamente el cloro libre alternando los grifos."],
  ["Agua", "Si la red pública tiene depósito o cisterna, se mide semanalmente el cloro libre alternando los grifos."],
  ["Agua", "Se controla el funcionamiento de los equipos de tratamiento de agua."],
  ["Agua", "Si hay captación propia, se realizan los análisis de potabilidad exigidos (completo cada 5 años y básicos cada año)."],
  ["Agua", "La limpieza y el mantenimiento de las instalaciones de agua están documentados."],
  ["Limpieza", "Se realizan limpiezas manuales."],
  ["Limpieza", "Se realizan limpiezas con maquinaria automática."],
  ["Limpieza", "Se limpia por calor cuando corresponde (por ejemplo, lavaperoles automático)."],
  ["Limpieza", "Se desinfecta con productos químicos."],
  ["Limpieza", "Se limpia desde la zona más limpia hacia la más sucia y sin alimentos presentes."],
  ["Limpieza", "Las superficies en contacto con alimentos se limpian y desinfectan tras el uso, al menos una vez al día."],
  ["Limpieza", "El resto de superficies se limpia con una periodicidad que garantiza su buen estado."],
  ["Limpieza", "Los contenedores de residuos se vacían y limpian al menos una vez al día."],
  ["Limpieza", "Se aplican protocolos basados en el Plan de limpieza y desinfección."],
  ["Limpieza", "Los productos de limpieza son aptos para uso alimentario y proceden de empresas autorizadas."],
  ["Limpieza", "Siempre que es posible se escogen productos biodegradables."],
  ["Limpieza", "Hay un lugar exclusivo para productos, materiales y equipos de limpieza."],
  ["Limpieza", "Se conservan las fichas técnicas y de seguridad de todos los productos de limpieza y desinfección."],
  ["Limpieza", "Se comprueba visualmente cada día la limpieza y desinfección de todas las zonas."],
  ["Limpieza", "Se controla visual o manualmente el mantenimiento de instalaciones, equipos y útiles de limpieza."],
  ["Plagas", "Se aplican barreras preventivas: limpieza, mosquiteras íntegras y/o insectocutores con placa adhesiva."],
  ["Plagas", "Existe una descripción o plano de las barreras y sistemas de control de plagas."],
  ["Plagas", "Puertas y ventanas permanecen cerradas o tienen mosquiteras/cierre automático en buen estado."],
  ["Plagas", "Los cubos tienen bolsa, tapa y accionamiento no manual."],
  ["Plagas", "Se mantiene la estructura del local: grietas selladas y tuberías revisadas."],
  ["Plagas", "Los desagües disponen de sifón."],
  ["Plagas", "Si hay indicios, se conserva contrato, fichas de productos y partes de actuación de una empresa autorizada."],
  ["Plagas", "Se revisan diariamente las medidas preventivas y barreras físicas."],
  ["Formación", "El personal nuevo recibe información inicial sobre higiene, buenas prácticas y alérgenos."],
  ["Formación", "Existe un plan de formación continua adaptado a cada perfil."],
  ["Formación", "Todo el personal de obrador y tienda conoce los alérgenos de los productos."],
  ["Formación", "Se archivan entidad, contenidos, certificados y/o listas de asistencia de cada formación."],
  ["Formación", "Se verifica en el puesto de trabajo que la formación se aplica correctamente."],
  ["Proveedores", "Hay una persona responsable de la recepción de mercancías."],
  ["Proveedores", "Todos los proveedores de materias primas figuran en la lista de proveedores homologados."],
  ["Proveedores", "Se conservan los albaranes de materias primas firmados o registrados como aceptados."],
  ["Proveedores", "En recepción se revisan producto, envase y todas las menciones obligatorias de la etiqueta."],
  ["Proveedores", "Los incumplimientos provocan devolución/notificación y apertura de una incidencia."],
  ["Trazabilidad", "Toda la producción se vende directamente al consumidor final en el mismo local."],
  ["Trazabilidad", "Se distribuye una parte marginal a establecimientos propios minoristas del ámbito local."],
  ["Trazabilidad", "Se distribuye una parte marginal a terceros minoristas del ámbito local."],
  ["Trazabilidad", "Se pide a los proveedores que indiquen el lote de las materias primas en el albarán."],
  ["Trazabilidad", "Los productos intermedios se identifican con la etiqueta mínima prevista en la guía."],
  ["Trazabilidad", "Los productos finales envasados llevan la etiqueta obligatoria."],
  ["Trazabilidad", "Existe una lista diaria con productos y cantidades elaboradas."],
  ["Trazabilidad", "Los albaranes de salida indican producto, cantidad, fecha y destino."],
  ["Trazabilidad", "Existe un procedimiento para inmovilizar materias primas y retirar productos ante una alerta alimentaria."],
  ["Temperaturas", "Existe una relación o plano de los equipos de frío con su ubicación y temperatura máxima."],
  ["Temperaturas", "Los equipos de frío tienen capacidad suficiente y permiten la circulación del aire."],
  ["Temperaturas", "Existe un procedimiento ante averías: valorar/rechazar género, trasladarlo y avisar al frigorista."],
  ["Temperaturas", "Se comprueban diariamente frigoríficos (≤4 °C) y congeladores (≤-18 °C)."],
  ["Temperaturas", "Se dispone de control centralizado de temperatura."],
  ["Temperaturas", "Se dispone de control manual de temperatura."],
].map(([seccion, texto], i) => ({ codigo: `R${i + 1}`, seccion, texto }));

const TRIMESTRAL = [
  [7, "Pla de control de l’aigua", "Es disposa de bon subministrament d’aigua potable freda i/o calenta en tots els punts de la xarxa."],
  [8, "Pla de control de l’aigua", "S’ha mesurat i registrat la concentració de clor lliure de l’aigua durant aquest període."],
  [11, "Pla de control de neteja i desinfecció", "Els nous productes de neteja procedeixen d’indústries autoritzades, són aptes per a ús alimentari i se’n disposa de la fitxa tècnica."],
  [12, "Pla de control de neteja i desinfecció", "Els productes de neteja estan emmagatzemats en un lloc aïllat, sempre tapats i amb etiqueta."],
  [13, "Pla de control de neteja i desinfecció", "S’omple el registre de neteja."],
  [14, "Pla de control de neteja i desinfecció", "S’han realitzat les neteges descrites en el full de freqüències."],
  [15, "Pla de control de neteja i desinfecció", "Les operacions de neteja han seguit les indicacions descrites en el full de mètode."],
  [16, "Pla de control de neteja i desinfecció", "Les bosses d’escombraries, tancades, es transporten al contenidor del carrer quan són plenes."],
  [19, "Pla de control de plagues", "Les teles mosquiteres o atrapamosques es troben íntegres i en bon estat."],
  [20, "Pla de control de plagues", "Es mantenen les zones on hi ha aliments ordenades i netes."],
  [21, "Pla de control de plagues", "Es mantenen els aliments tapats i protegits a l’obrador i a la botiga."],
  [22, "Pla de control de plagues", "Si aquest trimestre ha estat necessària la intervenció d’una empresa de control de plagues, es disposa de la documentació corresponent."],
  [25, "Pla de formació i capacitació del personal", "Les persones que manipulen aliments han rebut formació."],
  [26, "Pla de formació i capacitació del personal", "Es disposa dels certificats corresponents."],
  [27, "Pla de formació i capacitació del personal", "Es disposa dels continguts del curs."],
  [30, "Pla de control de proveïdors", "Si hi ha nous proveïdors, s’han afegit a la llista de proveïdors homologats."],
  [31, "Pla de control de proveïdors", "Es realitza el control de recepció (dates de caducitat i temperatura) i es registra en l’albarà o en el registre corresponent."],
  [32, "Pla de control de proveïdors", "El control de recepció preveu també la revisió de les condicions d’higiene i estiba dels vehicles dels proveïdors."],
  [33, "Pla de control de proveïdors", "S’omple el registre de recepció per a totes les matèries primeres."],
  [36, "Pla de traçabilitat", "Totes les matèries primeres es poden relacionar amb un albarà d’entrada."],
  [37, "Pla de traçabilitat", "Totes les matèries primeres i els productes intermedis són en recipients tapats i correctament etiquetats."],
  [38, "Pla de traçabilitat", "Tots els productes acabats envasats estan correctament etiquetats."],
  [39, "Pla de traçabilitat", "La llista de fabricació diària conté dades sobre la data de producció, el producte i la quantitat fabricada."],
  [40, "Pla de traçabilitat", "Els albarans de sortida indiquen la data, el destí, el producte i la seva quantitat."],
  [43, "Bones pràctiques", "El personal es treu les joies i el rellotge per treballar."],
  [44, "Bones pràctiques", "El personal fa servir barret i indumentària exclusiva i neta."],
  [45, "Bones pràctiques", "El personal compleix la prohibició de fumar a les instal·lacions."],
  [46, "Bones pràctiques", "El personal es renta les mans amb freqüència."],
  [49, "Requisits dels locals i equipament", "La capacitat del magatzem és suficient."],
  [50, "Requisits dels locals i equipament", "La capacitat de fred positiu i negatiu és suficient."],
  [51, "Requisits dels locals i equipament", "El lector de temperatura a l’exterior d’expositors i cambres funciona correctament."],
  [52, "Requisits dels locals i equipament", "Les cambres estan lliures d’aigua de condensació i gel."],
  [53, "Requisits dels locals i equipament", "El terra, les parets, el sostre, la maquinària i els utensilis estan en bon estat."],
  [54, "Requisits dels locals i equipament", "La il·luminació és suficient i està protegida."],
  [55, "Requisits dels locals i equipament", "Els contenidors d’escombraries disposen de bossa fixada a la boca i tenen la tapa d’accionament no manual."],
  [56, "Requisits dels locals i equipament", "L’accionament no manual dels rentamans funciona i estan ben equipats (paper de cel·lulosa, sabó i aigua calenta)."],
  [57, "Requisits dels locals i equipament", "L’estat d’higiene dels vestidors és correcte i estan endreçats."],
  [60, "Gestió d’al·lèrgens", "S’informa els clients de la presència d’al·lèrgens (ingredient o traça) en els productes."],
  [61, "Gestió d’al·lèrgens", "Les fitxes de fabricació estan actualitzades."],
  [64, "Gestió de residus", "Es compleix amb les mesures de separació de residus."],
  [65, "Gestió de residus", "Es disposa d’una empresa de recollida de l’oli de fregir usat."],
  [68, "Emmagatzematge de matèries primeres", "L’estiba és correcta, sense producte al terra ni contaminació encreuada."],
  [69, "Emmagatzematge de matèries primeres", "Els productes crus estan ben separats dels elaborats o cuits."],
  [70, "Emmagatzematge de matèries primeres", "Els aliments de diferent naturalesa estan ben separats."],
  [71, "Emmagatzematge de matèries primeres", "Es fa rotació d’estocs d’acord amb la norma primer en entrar, primer en sortir (PEPS)."],
  [72, "Emmagatzematge de matèries primeres", "Les temperatures d’emmagatzematge i exposició són correctes."],
  [75, "Manipulació", "Es comprova la neteja de superfícies, equips i estris abans de començar a treballar."],
  [76, "Manipulació", "Es treballa per evitar la contaminació encreuada a partir d’estris o dels manipuladors."],
  [77, "Manipulació", "Es pesen correctament els additius."],
  [78, "Manipulació", "S’utilitzen pinces o altres estris durant la venda de pastissos i brioixeria."],
  [79, "Manipulació", "Es comprova la data de caducitat o de consum preferent de les matèries primeres abans d’usar-les."],
  [80, "Manipulació", "Es respecta la separació temporal o física entre la manipulació de productes crus i cuits."],
  [81, "Manipulació", "Es desinfecten els vegetals abans de formar part dels farcits."],
  [82, "Manipulació", "Tots els productes amb llet, ous o ovoproductes, nata o formatge que hi ha a les cambres han estat elaborats fa menys de dos dies."],
  [83, "Manipulació", "Es rebutgen els productes exposats per a la venda que es conserven a 8 ºC al final del dia."],
  [84, "Manipulació", "S’etiqueten els productes envasats d’acord amb la normativa d’etiquetatge i al·lèrgens."],
  [87, "Cocció", "Es controla el temps i la temperatura de cocció?"],
  [88, "Cocció", "Es comprova l’estat de l’oli de fregir?"],
  [91, "Refredament", "Els productes sensibles es refreden a 10 ºC en menys de dues hores?"],
  [92, "Refredament", "Acabat el refredament, l’aliment es disposa ràpidament en cambra de fred?"],
].map(([fila, seccion, texto]) => ({ codigo: `RT${fila}`, seccion, texto }));

const CARENCIAS = [
  ["Alta", "Compromiso de adhesión a la guía", "No existe un documento firmado por la persona responsable con los datos de la empresa.", "Preparar, firmar y archivar el compromiso de la página 27."],
  ["Alta", "Cuestionario trimestral", "No existe en el código actual un registro trimestral completo con respuestas Sí/No, responsable y fecha.", "Completar este cuestionario cada trimestre; todo “No” debe generar una incidencia."],
  ["Alta", "Control semanal unificado", "Temperaturas y limpieza están separadas, pero falta el registro semanal de la guía y el control de cloro cuando haya depósito/cisterna.", "Crear un cierre semanal que reúna temperaturas, cloro y comprobación visual de limpieza."],
  ["Alta", "Plano y descripción de instalaciones", "No hay archivo específico para plano del local, red de agua, equipos de frío y barreras contra plagas.", "Subir plano del local y anexos señalando agua, cámaras, congeladores, mosquiteras e insectocutores."],
  ["Alta", "Plan estratégico de mejoras", "La guía exige anotar plazos para cada requisito incumplido y no existe este documento.", "Convertir cada respuesta “No” en una tarea con responsable y fecha límite."],
  ["Alta", "Etiquetas internas", "Hay ingredientes y recetas, pero no consta un generador de etiquetas para materia prima abierta y producto intermedio.", "Crear etiquetas con denominación, recepción/elaboración, apertura, caducidad y lote."],
  ["Alta", "Etiquetado de producto acabado", "No se ha localizado una ficha completa imprimible con denominación, ingredientes/alérgenos, cantidad, fecha/lote, conservación y datos de Cusachs.", "Añadir plantilla de etiqueta y validar cada producto envasado."],
  ["Alta", "Procedimiento de alerta y retirada", "La trazabilidad registra lotes, pero no hay protocolo documentado de inmovilización, retirada, contactos y cierre.", "Crear protocolo de alerta alimentaria y realizar una prueba de trazabilidad."],
  ["Media", "Lista diaria sanitaria de producción", "Producción existe como módulo operativo, pero no queda acreditado un cierre diario firmado con producto, cantidad, lote y responsable.", "Añadir cierre diario exportable y no editable tras firma, o justificar el registro digital equivalente."],
  ["Media", "Homologación sanitaria de proveedores", "Existe la gestión comercial de proveedores, pero hay que verificar registro/autorización sanitaria, dirección, contacto y productos suministrados.", "Completar y revisar la ficha sanitaria de cada proveedor."],
  ["Media", "Control de cocción y enfriamiento", "Las recetas incluyen datos descriptivos, pero no se ha localizado un registro sistemático de mediciones iniciales/validación por producto.", "Registrar ≥75 °C/5 min cuando corresponda y enfriamiento a 10 °C en menos de 2 h."],
  ["Media", "Aceite de fritura", "Se archivan recogidas, pero falta evidenciar el control del estado del aceite con el método o equipo utilizado.", "Registrar comprobaciones, resultado, cambio de aceite y responsable."],
  ["Media", "Formación alimentaria separada de PRL", "Personal y PRL guarda documentos, pero debe comprobarse que incluye formación inicial, alérgenos, contenidos entregados y reciclajes.", "Marcar por trabajador formación alimentaria, contenidos, firma, certificado y próxima revisión."],
  ["Media", "Archivo de contratos y justificantes", "Deben estar disponibles contrato/partes de plagas, gestor de residuos y aceite, factura de agua y fichas de limpieza.", "Revisar que todos los PDF estén vigentes, legibles y asociados a su fecha."],
];

const APARTADOS_ALTA = CARENCIAS.filter(([prioridad]) => prioridad === "Alta").map(
  ([, titulo, falta, accion], indice) => ({ codigo: `alta-${indice + 1}`, titulo, falta, accion }),
);

const FORMATOS_OFICIALES = [
  { numero: 1, icono: "📋", titulo: "Compromís + Prerequisits", descripcion: "Compromiso de adhesión, plano, requisitos y plan de mejoras.", vista: "requisitos", vistaSecundaria: "alta", etiquetaSecundaria: "Documentos pendientes", estado: "Pendiente" },
  { numero: 2, icono: "📅", titulo: "Registre setmanal", descripcion: "Temperaturas, cloro y comprobación visual de la limpieza.", acciones: [["Temperaturas", "/higiene/temperaturas"], ["Limpieza", "/higiene/limpieza"]], estado: "Pendiente" },
  { numero: 3, icono: "✅", titulo: "Registre trimestral", descripcion: "Las 60 comprobaciones oficiales del trimestre.", vista: "trimestral", estado: "Ya disponible" },
  { numero: 4, icono: "🚚", titulo: "Llista proveïdors", descripcion: "Proveedores homologados, registro sanitario y productos suministrados.", ruta: "/higiene/proveedores", estado: "Ya disponible" },
  { numero: 5, icono: "📦", titulo: "Control recepció", descripcion: "Control de temperatura, envase, caducidad, lote, aspecto y transporte.", ruta: "/higiene/control-recepcion", estado: "Ya disponible" },
  { numero: 6, icono: "🔖", titulo: "Model segell recepció", descripcion: "Sello de aceptación o devolución para los albaranes recibidos.", ruta: "/higiene/control-recepcion", estado: "Ya disponible" },
  { numero: 7, icono: "🧾", titulo: "Llista producció", descripcion: "Relación diaria de productos, cantidades y tipo de elaboración.", ruta: "/produccion", estado: "Ya disponible" },
  { numero: 8, icono: "🥐", titulo: "Fitxa producció", descripcion: "Ingredientes, proceso, cocción, enfriamiento, conservación y etiquetado.", ruta: "/higiene/recetas", estado: "Ya disponible" },
  { numero: 9, icono: "⚠️", titulo: "Registre d’incidències", descripcion: "Incidencia, medida correctora, fechas, responsable y cierre.", ruta: "/higiene/incidencias", estado: "Ya disponible" },
  { numero: 10, icono: "🧹", titulo: "Programa N+D · Freqüències", descripcion: "Qué se limpia, cuándo se limpia y quién es responsable.", ruta: "/higiene/limpieza", estado: "Ya disponible" },
  { numero: 11, icono: "🧴", titulo: "Programa N+D · Mètodes", descripcion: "Producto, dosis, temperatura, tiempo, material y método de limpieza.", ruta: "/higiene/limpieza", estado: "Ya disponible" },
  { numero: 12, icono: "🌾", titulo: "Llista d’al·lèrgens", descripcion: "Alérgenos y trazas de los productos elaborados.", ruta: "/higiene/recetas", estado: "Pendiente" },
  { numero: 13, icono: "🏷️", titulo: "Models etiquetes", descripcion: "Etiquetas para materia prima, producto intermedio y producto acabado.", ruta: "/higiene/trazabilidad", estado: "Pendiente" },
];
const GESTION_VACIA = { estado: "Pendiente", responsable: "", fecha_objetivo: "", notas: "" };

const enlaceModulo = {
  Agua: "/higiene/agua", Limpieza: "/higiene/limpieza", Plagas: "/higiene/ibertrac",
  Formación: "/higiene/personal-riesgos", Proveedores: "/higiene/proveedores",
  Trazabilidad: "/higiene/trazabilidad", Temperaturas: "/higiene/temperaturas",
  Incidencias: "/higiene/incidencias", Residuos: "/higiene/aceite",
  "Pla de control de l’aigua": "/higiene/agua",
  "Pla de control de neteja i desinfecció": "/higiene/limpieza",
  "Pla de control de plagues": "/higiene/ibertrac",
  "Pla de formació i capacitació del personal": "/higiene/personal-riesgos",
  "Pla de control de proveïdors": "/higiene/proveedores",
  "Pla de traçabilitat": "/higiene/trazabilidad",
  "Gestió de residus": "/higiene/aceite",
};

function periodoActual(tipo) {
  const d = new Date();
  return tipo === "trimestral" ? `${d.getFullYear()}-T${Math.floor(d.getMonth() / 3) + 1}` : "implantacion";
}

function claveLocal(tipo, periodo) {
  return `cusachs-sanidad-${tipo}-${periodo}`;
}

function claveCabecera(periodo) {
  return `cusachs-sanidad-trimestral-cabecera-${periodo}`;
}

function leerLocal(tipo, periodo) {
  try { return JSON.parse(localStorage.getItem(claveLocal(tipo, periodo)) || "{}"); }
  catch { return {}; }
}

export default function PreparacionSanidad() {
  const [vista, setVista] = useState("dashboard");
  const [periodo, setPeriodo] = useState(periodoActual("trimestral"));
  const [respuestas, setRespuestas] = useState({});
  const [cabeceraTrimestral, setCabeceraTrimestral] = useState({ fecha: "", responsable: "", ubicacion: "" });
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [apartadoActivo, setApartadoActivo] = useState(APARTADOS_ALTA[0]);
  const [gestiones, setGestiones] = useState([]);
  const [gestion, setGestion] = useState(GESTION_VACIA);
  const [documento, setDocumento] = useState(null);
  const [mensajeGestion, setMensajeGestion] = useState("");
  const [guardandoGestion, setGuardandoGestion] = useState(false);
  const items = vista === "requisitos" ? REQUISITOS : TRIMESTRAL;
  const tipo = vista === "requisitos" ? "requisitos" : "trimestral";
  const periodoConsulta = vista === "requisitos" ? "implantacion" : periodo;

  useEffect(() => {
    if (vista === "dashboard" || vista === "alta") return;
    let activo = true;
    supabase.from("higiene_cuestionarios").select("codigo,respuesta,nota,fecha_revision,responsable,ubicacion")
      .eq("tipo", tipo).eq("periodo", periodoConsulta).then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          setMensaje("Las respuestas se guardan automáticamente en este ordenador. Falta activar Supabase para compartirlas entre dispositivos.");
          setRespuestas(leerLocal(tipo, periodoConsulta));
          if (tipo === "trimestral") {
            try { setCabeceraTrimestral(JSON.parse(localStorage.getItem(claveCabecera(periodoConsulta)) || "{}")); }
            catch { setCabeceraTrimestral({ fecha: "", responsable: "", ubicacion: "" }); }
          }
          return;
        }
        setMensaje("");
        const remotas = Object.fromEntries((data || []).map((r) => [r.codigo, { respuesta: r.respuesta, nota: r.nota || "" }]));
        setRespuestas(data?.length ? remotas : leerLocal(tipo, periodoConsulta));
        if (tipo === "trimestral") {
          const primera = data?.[0];
          if (primera) setCabeceraTrimestral({ fecha: primera.fecha_revision || "", responsable: primera.responsable || "", ubicacion: primera.ubicacion || "" });
          else {
            try { setCabeceraTrimestral(JSON.parse(localStorage.getItem(claveCabecera(periodoConsulta)) || "{}")); }
            catch { setCabeceraTrimestral({ fecha: "", responsable: "", ubicacion: "" }); }
          }
        }
      });
    return () => { activo = false; };
  }, [vista, tipo, periodoConsulta]);

  useEffect(() => {
    if (vista !== "alta" || !apartadoActivo) return;
    cargarGestiones(apartadoActivo.codigo);
  }, [vista, apartadoActivo]);

  async function cargarGestiones(codigo) {
    setMensajeGestion("");
    const { data, error } = await supabase.from("higiene_gestion_sanidad").select("*").eq("apartado", codigo).order("created_at", { ascending: false });
    if (error) { setGestiones([]); setMensajeGestion("Falta activar la base de datos de Preparación Sanidad para guardar estos apartados."); }
    else setGestiones(data || []);
  }

  async function guardarGestion(e) {
    e.preventDefault(); setGuardandoGestion(true); setMensajeGestion("");
    let archivo_ruta = null; let archivo_nombre = null;
    if (documento) {
      archivo_nombre = documento.name;
      archivo_ruta = `preparacion-sanidad/${apartadoActivo.codigo}/${Date.now()}-${documento.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("sanidad-privado").upload(archivo_ruta, documento, { contentType: documento.type || undefined });
      if (error) { setGuardandoGestion(false); setMensajeGestion(`No se pudo subir el documento: ${error.message}`); return; }
    }
    const { error } = await supabase.from("higiene_gestion_sanidad").insert({ apartado: apartadoActivo.codigo, titulo: apartadoActivo.titulo, estado: gestion.estado, responsable: gestion.responsable.trim() || null, fecha_objetivo: gestion.fecha_objetivo || null, notas: gestion.notas.trim() || null, archivo_ruta, archivo_nombre });
    if (error && archivo_ruta) await supabase.storage.from("sanidad-privado").remove([archivo_ruta]);
    setGuardandoGestion(false); setMensajeGestion(error ? `No se pudo guardar: ${error.message}` : "Seguimiento guardado correctamente.");
    if (!error) { setGestion(GESTION_VACIA); setDocumento(null); await cargarGestiones(apartadoActivo.codigo); }
  }

  async function abrirDocumento(registro) {
    const { data, error } = await supabase.storage.from("sanidad-privado").createSignedUrl(registro.archivo_ruta, 120);
    if (error) setMensajeGestion(error.message); else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function eliminarGestion(registro) {
    if (!window.confirm("¿Eliminar este seguimiento y su documento?")) return;
    const { error } = await supabase.from("higiene_gestion_sanidad").delete().eq("id", registro.id);
    if (error) return setMensajeGestion(error.message);
    if (registro.archivo_ruta) await supabase.storage.from("sanidad-privado").remove([registro.archivo_ruta]);
    await cargarGestiones(apartadoActivo.codigo);
  }

  const resumen = useMemo(() => items.reduce((a, item) => {
    const valor = respuestas[item.codigo]?.respuesta || "Pendiente";
    a[valor] = (a[valor] || 0) + 1; return a;
  }, {}), [items, respuestas]);

  function cambiar(codigo, campo, valor) {
    setRespuestas((actual) => {
      const nuevas = { ...actual, [codigo]: { respuesta: actual[codigo]?.respuesta || "Pendiente", nota: actual[codigo]?.nota || "", [campo]: valor } };
      localStorage.setItem(claveLocal(tipo, periodoConsulta), JSON.stringify(nuevas));
      return nuevas;
    });
  }

  function cambiarCabecera(campo, valor) {
    setCabeceraTrimestral((actual) => {
      const nueva = { ...actual, [campo]: valor };
      localStorage.setItem(claveCabecera(periodoConsulta), JSON.stringify(nueva));
      return nueva;
    });
  }

  async function guardar() {
    setGuardando(true); setMensaje("");
    if (tipo === "trimestral" && (!cabeceraTrimestral.fecha || !cabeceraTrimestral.responsable.trim() || !cabeceraTrimestral.ubicacion)) {
      setGuardando(false);
      setMensaje("Antes de guardar indica la fecha, la persona responsable y si la revisión corresponde a Obrador o Botiga.");
      return;
    }
    const filas = items.map((item) => ({ tipo, periodo: periodoConsulta, codigo: item.codigo, seccion: item.seccion, pregunta: item.texto, respuesta: respuestas[item.codigo]?.respuesta || "Pendiente", nota: respuestas[item.codigo]?.nota?.trim() || null, fecha_revision: tipo === "trimestral" ? cabeceraTrimestral.fecha : null, responsable: tipo === "trimestral" ? cabeceraTrimestral.responsable.trim() : null, ubicacion: tipo === "trimestral" ? cabeceraTrimestral.ubicacion : null, actualizado_en: new Date().toISOString() }));
    const { error } = await supabase.from("higiene_cuestionarios").upsert(filas, { onConflict: "tipo,periodo,codigo" });
    setGuardando(false);
    if (error) {
      localStorage.setItem(claveLocal(tipo, periodoConsulta), JSON.stringify(respuestas));
      setMensaje("Guardado en este ordenador. Cuando activemos Supabase también quedará disponible en la tablet y otros equipos.");
    } else setMensaje("Cuestionario guardado correctamente y disponible para los usuarios autorizados.");
  }

  return <main className="sanidad-page">
    <header className="sanidad-header"><div><span>AUTOCONTROL · GUÍA DE PASTELERÍA</span><h1>Preparación para Sanidad</h1><p>Revisión documental basada en la Guía de prácticas correctas de higiene en pastelería (Generalitat de Catalunya, 2013).</p></div><strong>🩺</strong></header>
    <nav className="sanidad-tabs">
      <button className={vista === "dashboard" ? "activo" : ""} onClick={() => setVista("dashboard")}>Dashboard sanitario</button>
      <button className={vista === "requisitos" ? "activo" : ""} onClick={() => setVista("requisitos")}>Compromís + Prerequisits</button>
      <button className={vista === "trimestral" ? "activo" : ""} onClick={() => setVista("trimestral")}>Registre trimestral</button>
    </nav>

    {vista === "dashboard" ? <>
      <section className="sanidad-dashboard-resumen">
        <article><b>13</b><span>Formatos oficiales</span></article>
        <article className="resumen-ok"><b>9</b><span>Ya disponibles</span></article>
        <article className="resumen-alta"><b>3</b><span>Pendientes de crear</span></article>
        <article className="resumen-media"><b>1</b><span>Pendiente de revisar</span></article>
      </section>
      <section className="sanidad-aviso"><strong>Qué debes preparar para Sanidad</strong><p>Los apartados de abajo siguen exactamente el orden del Excel “Formats documentació”. Entra en cada tarjeta para completar o revisar el registro correspondiente.</p></section>
      <section className="sanidad-formatos-grid">{FORMATOS_OFICIALES.map((formato) => <article key={formato.numero}>
        <header><span>{formato.icono}</span><small>FORMATO {formato.numero}</small><em className={`formato-estado ${formato.estado.toLowerCase().replaceAll(" ", "-")}`}>{formato.estado}</em></header>
        <h2>{formato.titulo}</h2><p>{formato.descripcion}</p>
        <div className="formato-acciones">
          {formato.vista && <button onClick={() => setVista(formato.vista)}>Abrir formato</button>}
          {formato.vistaSecundaria && <button onClick={() => setVista(formato.vistaSecundaria)}>{formato.etiquetaSecundaria}</button>}
          {formato.ruta && <Link to={formato.ruta}>Abrir apartado</Link>}
          {formato.acciones?.map(([etiqueta, ruta]) => <Link key={ruta} to={ruta}>{etiqueta}</Link>)}
        </div>
      </article>)}</section>
      <section id="formatos-pendientes" className="sanidad-pendientes-dashboard"><div><h2>Solo lo que todavía falta</h2><p>Los demás apartados ya existen y se mantienen sin cambios.</p></div>{FORMATOS_OFICIALES.filter((formato) => formato.estado !== "Ya disponible").map((formato) => <article key={formato.numero}><span className={`formato-estado ${formato.estado.toLowerCase()}`}>{formato.estado}</span><div><strong>{formato.titulo}</strong><p>{formato.descripcion}</p></div></article>)}</section>
    </> : vista === "alta" ? <>
      <section className="sanidad-alta-layout">
        <aside className="sanidad-alta-menu"><h2>Apartados prioritarios</h2>{APARTADOS_ALTA.map((apartado) => <button key={apartado.codigo} className={apartadoActivo.codigo === apartado.codigo ? "activo" : ""} onClick={() => setApartadoActivo(apartado)}><span>{apartado.titulo}</span><small>Gestionar →</small></button>)}</aside>
        <div className="sanidad-alta-contenido">
          <header><span>PRIORIDAD ALTA</span><h2>{apartadoActivo.titulo}</h2><p><b>Lo que falta:</b> {apartadoActivo.falta}</p><p><b>Objetivo:</b> {apartadoActivo.accion}</p></header>
          <form className="sanidad-gestion-form" onSubmit={guardarGestion}><div className="sanidad-gestion-grid">
            <label>Estado<select value={gestion.estado} onChange={(e) => setGestion({ ...gestion, estado: e.target.value })}><option>Pendiente</option><option>En preparación</option><option>Preparado</option><option>Revisar</option></select></label>
            <label>Responsable<input value={gestion.responsable} onChange={(e) => setGestion({ ...gestion, responsable: e.target.value })} placeholder="Persona responsable" /></label>
            <label>Fecha objetivo<input type="date" value={gestion.fecha_objetivo} onChange={(e) => setGestion({ ...gestion, fecha_objetivo: e.target.value })} /></label>
            <label className="sanidad-documento">Documento<input type="file" accept="application/pdf,image/*,.pdf" onChange={(e) => setDocumento(e.target.files?.[0] || null)} /><span>{documento?.name || "PDF o fotografía"}</span></label>
          </div><label>Notas y trabajo pendiente<textarea rows="4" value={gestion.notas} onChange={(e) => setGestion({ ...gestion, notas: e.target.value })} placeholder="Anota qué falta, qué se ha pedido o qué se debe revisar" /></label><button disabled={guardandoGestion}>{guardandoGestion ? "Guardando…" : "Guardar seguimiento"}</button></form>
          {mensajeGestion && <p className="mensaje-control">{mensajeGestion}</p>}
          <section className="sanidad-historico"><h3>Historial del apartado</h3>{gestiones.length === 0 ? <p>Todavía no hay seguimientos guardados.</p> : gestiones.map((registro) => <article key={registro.id}><div><span className={`estado-gestion ${registro.estado.toLowerCase().replaceAll(" ", "-")}`}>{registro.estado}</span><strong>{registro.responsable || "Sin responsable"}</strong><small>{registro.fecha_objetivo ? `Objetivo: ${registro.fecha_objetivo}` : "Sin fecha objetivo"}</small><p>{registro.notas || "Sin notas"}</p></div><div>{registro.archivo_ruta && <button onClick={() => abrirDocumento(registro)}>Ver documento</button>}<button className="peligro" onClick={() => eliminarGestion(registro)}>Eliminar</button></div></article>)}</section>
        </div>
      </section>
    </> : <>
      <section className="sanidad-toolbar"><div><strong>{vista === "requisitos" ? "Implantación inicial y revisión" : "Registro trimestral oficial"}</strong><p>{items.length} puntos · cada “No” debe anotarse en Incidencias y tener medida correctora.</p></div>{vista === "trimestral" && <div className="sanidad-cabecera-trimestral"><label>Periodo<input value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="2026-T3" /></label><label>Fecha<input type="date" value={cabeceraTrimestral.fecha || ""} onChange={(e) => cambiarCabecera("fecha", e.target.value)} /></label><label>Responsable<input value={cabeceraTrimestral.responsable || ""} onChange={(e) => cambiarCabecera("responsable", e.target.value)} placeholder="Nombre y apellidos" /></label><fieldset><legend>Zona</legend><label><input type="radio" name="ubicacion-trimestral" value="Obrador" checked={cabeceraTrimestral.ubicacion === "Obrador"} onChange={(e) => cambiarCabecera("ubicacion", e.target.value)} /> Obrador</label><label><input type="radio" name="ubicacion-trimestral" value="Botiga" checked={cabeceraTrimestral.ubicacion === "Botiga"} onChange={(e) => cambiarCabecera("ubicacion", e.target.value)} /> Botiga</label></fieldset></div>}</section>
      <div className="sanidad-resumen">{RESPUESTAS.map((r) => <span key={r}><b>{resumen[r] || 0}</b>{r}</span>)}</div>
      <section className="sanidad-cuestionario">{items.map((item) => <article key={item.codigo} className={`respuesta-${(respuestas[item.codigo]?.respuesta || "Pendiente").toLowerCase().replace(" ", "-")}`}>
        <div className="sanidad-pregunta"><span>{item.codigo}</span><div><small>{item.seccion}</small><p>{item.texto}</p>{enlaceModulo[item.seccion] && <Link to={enlaceModulo[item.seccion]}>Abrir módulo relacionado →</Link>}</div></div>
        <div className="sanidad-opciones" role="group" aria-label={`Respuesta ${item.codigo}`}>{RESPUESTAS.map((r) => <button type="button" key={r} className={(respuestas[item.codigo]?.respuesta || "Pendiente") === r ? "seleccionada" : ""} data-respuesta={r} onClick={() => cambiar(item.codigo, "respuesta", r)}>{r === "Sí" ? "✓ " : r === "No" ? "✕ " : r === "Pendiente" ? "⏳ " : "— "}{r}</button>)}</div>
        <div className={`sanidad-nota ${(respuestas[item.codigo]?.respuesta || "Pendiente") === "No" ? "requiere-nota" : ""}`}><label>{(respuestas[item.codigo]?.respuesta || "Pendiente") === "No" ? "Explica qué falta o qué se debe corregir" : "Nota opcional"}</label><textarea rows="2" placeholder="Documento que falta o medida pendiente" value={respuestas[item.codigo]?.nota || ""} onChange={(e) => cambiar(item.codigo, "nota", e.target.value)} /></div>
      </article>)}</section>
      <div className="sanidad-guardar"><span>✓ Los cambios se guardan automáticamente en este ordenador</span><button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar copia en Supabase"}</button><Link to="/higiene/incidencias">Abrir registro de incidencias</Link></div>
      {mensaje && <p className="mensaje-control">{mensaje}</p>}
    </>}
  </main>;
}
