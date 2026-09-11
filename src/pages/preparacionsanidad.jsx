import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase.js";

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
  ["Agua", "Hay buen suministro de agua potable fría y caliente en todos los puntos."],
  ["Agua", "Se ha medido y registrado el cloro libre durante el trimestre cuando corresponde."],
  ["Limpieza", "Los productos nuevos son aptos para uso alimentario y tienen ficha técnica."],
  ["Limpieza", "Los productos están aislados, tapados y etiquetados."],
  ["Limpieza", "Se ha completado el registro de limpieza."],
  ["Limpieza", "Se han realizado las limpiezas con las frecuencias previstas."],
  ["Limpieza", "Se han seguido los métodos y dosificaciones definidos."],
  ["Limpieza", "Las bolsas cerradas se trasladan al contenedor cuando están llenas."],
  ["Plagas", "Mosquiteras y atrapainsectos están íntegros y en buen estado."],
  ["Plagas", "Las zonas con alimentos están ordenadas y limpias."],
  ["Plagas", "Los alimentos permanecen tapados y protegidos en obrador y tienda."],
  ["Plagas", "Si intervino la empresa de plagas, está archivada toda la documentación."],
  ["Formación", "Las personas manipuladoras han recibido formación."],
  ["Formación", "Están archivados los certificados correspondientes."],
  ["Formación", "Están disponibles los contenidos de los cursos."],
  ["Proveedores", "Los proveedores nuevos se han añadido a la lista de homologados."],
  ["Proveedores", "Se controla y registra en el albarán caducidad y temperatura."],
  ["Proveedores", "Se revisan higiene y estiba de los vehículos de reparto."],
  ["Proveedores", "Se completa el control de recepción de todas las materias primas."],
  ["Trazabilidad", "Todas las materias primas pueden relacionarse con un albarán de entrada."],
  ["Trazabilidad", "Materias primas e intermedios están tapados y etiquetados."],
  ["Trazabilidad", "Todos los productos acabados envasados están correctamente etiquetados."],
  ["Trazabilidad", "La producción diaria incluye fecha, producto y cantidad."],
  ["Trazabilidad", "Los albaranes de salida incluyen fecha, destino, producto y cantidad."],
  ["Buenas prácticas", "El personal se quita joyas y reloj para trabajar."],
  ["Buenas prácticas", "El personal utiliza gorro e indumentaria exclusiva y limpia."],
  ["Buenas prácticas", "Se respeta la prohibición de fumar en todas las zonas."],
  ["Buenas prácticas", "El personal se lava las manos con frecuencia."],
  ["Locales y equipos", "Almacenes y equipos de frío tienen capacidad suficiente."],
  ["Locales y equipos", "Los indicadores exteriores de temperatura funcionan."],
  ["Locales y equipos", "Las cámaras no presentan condensación ni hielo."],
  ["Locales y equipos", "Suelos, paredes, techos, maquinaria y utensilios están en buen estado."],
  ["Locales y equipos", "La iluminación es suficiente y está protegida."],
  ["Locales y equipos", "Los cubos tienen bolsa, tapa y accionamiento no manual."],
  ["Locales y equipos", "Los lavamanos no son manuales y disponen de agua caliente, jabón y papel."],
  ["Locales y equipos", "Los vestuarios están limpios y ordenados."],
  ["Alérgenos", "Los clientes reciben información de ingredientes y trazas alergénicas."],
  ["Alérgenos", "Las fichas de fabricación están actualizadas."],
  ["Residuos", "Se minimizan y separan correctamente los residuos."],
  ["Residuos", "Existe gestor para la recogida del aceite de fritura usado."],
  ["Incidencias", "Se han aplicado y documentado las medidas correctoras necesarias."],
  ["Almacenamiento", "No hay productos en el suelo y se evita la contaminación cruzada."],
  ["Almacenamiento", "Crudos, elaborados y alimentos de distinta naturaleza están separados."],
  ["Almacenamiento", "Se aplica la rotación PEPS (primero en entrar, primero en salir)."],
  ["Almacenamiento", "Las temperaturas registradas durante el trimestre han sido adecuadas."],
  ["Manipulación", "Superficies, equipos y utensilios se revisan antes de trabajar."],
  ["Manipulación", "Se evita la contaminación cruzada y se separan crudos y cocinados."],
  ["Manipulación", "Los aditivos se pesan correctamente."],
  ["Manipulación", "Cortadora, pinzas y otros útiles de venta se usan y mantienen correctamente."],
  ["Manipulación", "Se comprueban caducidades antes de usar las materias primas."],
  ["Manipulación", "Los vegetales destinados a rellenos se desinfectan."],
  ["Manipulación", "Leche, huevo, ovoproducto, nata y queso abiertos/elaborados respetan el plazo definido."],
  ["Manipulación", "Se retiran al final del día los productos que han estado expuestos a 8 °C."],
  ["Manipulación", "Los productos envasados cumplen etiquetado y alérgenos."],
  ["Cocción", "Se controlan tiempo y temperatura de cocción."],
  ["Cocción", "Se comprueba y registra el estado del aceite de fritura."],
  ["Enfriamiento", "Los productos sensibles alcanzan 10 °C en menos de dos horas."],
  ["Enfriamiento", "Al terminar el enfriamiento se introducen rápidamente en frío."],
].map(([seccion, texto], i) => ({ codigo: `T${i + 1}`, seccion, texto }));

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
const GESTION_VACIA = { estado: "Pendiente", responsable: "", fecha_objetivo: "", notas: "" };

const enlaceModulo = {
  Agua: "/higiene/agua", Limpieza: "/higiene/limpieza", Plagas: "/higiene/ibertrac",
  Formación: "/higiene/personal-riesgos", Proveedores: "/higiene/proveedores",
  Trazabilidad: "/higiene/trazabilidad", Temperaturas: "/higiene/temperaturas",
  Incidencias: "/higiene/incidencias", Residuos: "/higiene/aceite",
};

function periodoActual(tipo) {
  const d = new Date();
  return tipo === "trimestral" ? `${d.getFullYear()}-T${Math.floor(d.getMonth() / 3) + 1}` : "implantacion";
}

function claveLocal(tipo, periodo) {
  return `cusachs-sanidad-${tipo}-${periodo}`;
}

function leerLocal(tipo, periodo) {
  try { return JSON.parse(localStorage.getItem(claveLocal(tipo, periodo)) || "{}"); }
  catch { return {}; }
}

export default function PreparacionSanidad() {
  const [vista, setVista] = useState("pendientes");
  const [periodo, setPeriodo] = useState(periodoActual("trimestral"));
  const [respuestas, setRespuestas] = useState({});
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
    if (vista === "pendientes" || vista === "alta") return;
    let activo = true;
    supabase.from("higiene_cuestionarios").select("codigo,respuesta,nota")
      .eq("tipo", tipo).eq("periodo", periodoConsulta).then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          setMensaje("Las respuestas se guardan automáticamente en este ordenador. Falta activar Supabase para compartirlas entre dispositivos.");
          setRespuestas(leerLocal(tipo, periodoConsulta));
          return;
        }
        setMensaje("");
        const remotas = Object.fromEntries((data || []).map((r) => [r.codigo, { respuesta: r.respuesta, nota: r.nota || "" }]));
        setRespuestas(data?.length ? remotas : leerLocal(tipo, periodoConsulta));
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

  async function guardar() {
    setGuardando(true); setMensaje("");
    const filas = items.map((item) => ({ tipo, periodo: periodoConsulta, codigo: item.codigo, seccion: item.seccion, pregunta: item.texto, respuesta: respuestas[item.codigo]?.respuesta || "Pendiente", nota: respuestas[item.codigo]?.nota?.trim() || null, actualizado_en: new Date().toISOString() }));
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
      <button className={vista === "pendientes" ? "activo" : ""} onClick={() => setVista("pendientes")}>Lo que falta</button>
      <button className={vista === "alta" ? "activo" : ""} onClick={() => setVista("alta")}>Gestionar prioridad alta</button>
      <button className={vista === "requisitos" ? "activo" : ""} onClick={() => setVista("requisitos")}>61 requisitos</button>
      <button className={vista === "trimestral" ? "activo" : ""} onClick={() => setVista("trimestral")}>Revisión trimestral</button>
    </nav>

    {vista === "pendientes" ? <>
      <section className="sanidad-aviso"><strong>Importante</strong><p>Estas notas indican lo que no aparece completo en el código actual. Hay que confirmar físicamente el local y comprobar los documentos ya cargados antes de marcar cada punto como resuelto.</p></section>
      <section className="sanidad-carencias">{CARENCIAS.map(([prioridad, titulo, falta, accion]) => <article key={titulo}>
        <span className={`prioridad ${prioridad.toLowerCase()}`}>{prioridad}</span><div><h2>{titulo}</h2><p><b>Nota de lo que no tienes:</b> {falta}</p><p><b>Qué preparar:</b> {accion}</p></div>
      </article>)}</section>
      <section className="sanidad-registros"><h2>Registros que deben mantenerse</h2><div><Link to="/higiene/temperaturas">Semanal/diario · Temperaturas</Link><Link to="/higiene/limpieza">Diario · Limpieza</Link><Link to="/higiene/control-recepcion">Cada recepción · Materias primas</Link><Link to="/produccion">Diario · Producción</Link><Link to="/higiene/incidencias">Cuando ocurra · Incidencias</Link></div></section>
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
      <section className="sanidad-toolbar"><div><strong>{vista === "requisitos" ? "Implantación inicial y revisión" : "Comprobación obligatoria cada trimestre"}</strong><p>{items.length} puntos · cada “No” debe anotarse en Incidencias y tener medida correctora.</p></div>{vista === "trimestral" && <label>Periodo<input value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="2026-T3" /></label>}</section>
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
