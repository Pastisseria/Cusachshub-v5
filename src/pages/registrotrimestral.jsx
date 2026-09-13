import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase.js";
import "../styles/preparacionsanidad-formatos.css";

const RESPUESTAS = ["Pendiente", "Sí", "No", "No aplica"];

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

function periodoActual() {
  const d = new Date();
  return `${d.getFullYear()}-T${Math.floor(d.getMonth() / 3) + 1}`;
}

function claveLocal(periodo) { return `cusachs-sanidad-trimestral-${periodo}`; }
function claveCabecera(periodo) { return `cusachs-sanidad-trimestral-cabecera-${periodo}`; }

export default function RegistroTrimestral() {
  const [periodo, setPeriodo] = useState(periodoActual());
  const [respuestas, setRespuestas] = useState({});
  const [cabecera, setCabecera] = useState({ fecha: "", responsable: "", ubicacion: "" });
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      setMensaje("");
      const local = JSON.parse(localStorage.getItem(claveLocal(periodo)) || "{}");
      const cabLocal = JSON.parse(localStorage.getItem(claveCabecera(periodo)) || "{}");
      const { data, error } = await supabase.from("higiene_cuestionarios")
        .select("codigo,respuesta,nota,fecha_revision,responsable,ubicacion")
        .eq("tipo", "trimestral").eq("periodo", periodo);
      if (!activo) return;
      if (error) {
        setRespuestas(local);
        setCabecera(cabLocal);
        setMensaje("Trabajando en modo local. Puedes rellenar el registro igualmente.");
        return;
      }
      const remotas = Object.fromEntries((data || []).map(r => [r.codigo, { respuesta: r.respuesta, nota: r.nota || "" }]));
      setRespuestas(data?.length ? remotas : local);
      const primera = data?.[0];
      setCabecera(primera ? { fecha: primera.fecha_revision || "", responsable: primera.responsable || "", ubicacion: primera.ubicacion || "" } : cabLocal);
    }
    cargar();
    return () => { activo = false; };
  }, [periodo]);

  const resumen = useMemo(() => TRIMESTRAL.reduce((acc, item) => {
    const v = respuestas[item.codigo]?.respuesta || "Pendiente";
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {}), [respuestas]);

  function cambiarLocal(codigo, campo, valor) {
    setRespuestas(actual => {
      const nuevas = { ...actual, [codigo]: { respuesta: actual[codigo]?.respuesta || "Pendiente", nota: actual[codigo]?.nota || "", [campo]: valor } };
      localStorage.setItem(claveLocal(periodo), JSON.stringify(nuevas));
      return nuevas;
    });
  }

  function cambiarCabecera(campo, valor) {
    setCabecera(actual => {
      const nueva = { ...actual, [campo]: valor };
      localStorage.setItem(claveCabecera(periodo), JSON.stringify(nueva));
      return nueva;
    });
  }

  async function responder(item, respuesta) {
    const siguiente = { ...(respuestas[item.codigo] || { nota: "" }), respuesta };
    const nuevas = { ...respuestas, [item.codigo]: siguiente };
    setRespuestas(nuevas);
    localStorage.setItem(claveLocal(periodo), JSON.stringify(nuevas));
    const fila = { tipo: "trimestral", periodo, codigo: item.codigo, seccion: item.seccion, pregunta: item.texto, respuesta, nota: siguiente.nota?.trim() || null, fecha_revision: cabecera.fecha || null, responsable: cabecera.responsable.trim() || null, ubicacion: cabecera.ubicacion || null, actualizado_en: new Date().toISOString() };
    const { error } = await supabase.from("higiene_cuestionarios").upsert(fila, { onConflict: "tipo,periodo,codigo" });
    setMensaje(error ? "La respuesta queda guardada en este ordenador." : "Respuesta guardada.");
  }

  async function guardar() {
    if (!cabecera.fecha || !cabecera.responsable.trim() || !cabecera.ubicacion) {
      setMensaje("Indica fecha, responsable y zona antes de guardar el trimestre.");
      return;
    }
    setGuardando(true);
    const filas = TRIMESTRAL.map(item => ({ tipo: "trimestral", periodo, codigo: item.codigo, seccion: item.seccion, pregunta: item.texto, respuesta: respuestas[item.codigo]?.respuesta || "Pendiente", nota: respuestas[item.codigo]?.nota?.trim() || null, fecha_revision: cabecera.fecha, responsable: cabecera.responsable.trim(), ubicacion: cabecera.ubicacion, actualizado_en: new Date().toISOString() }));
    const { error } = await supabase.from("higiene_cuestionarios").upsert(filas, { onConflict: "tipo,periodo,codigo" });
    localStorage.setItem(claveLocal(periodo), JSON.stringify(respuestas));
    localStorage.setItem(claveCabecera(periodo), JSON.stringify(cabecera));
    setGuardando(false);
    setMensaje(error ? "Guardado en este ordenador; Supabase no ha podido completar la copia." : "Registro trimestral guardado correctamente.");
  }

  return <main className="sanidad-page">
    <header className="sanidad-header"><div><span>AUTOCONTROL · REGISTRO OFICIAL</span><h1>Registro trimestral</h1><p>Pantalla independiente para evitar bloqueos en Preparación para Sanidad.</p></div><strong>✅</strong></header>
    <nav className="sanidad-tabs"><Link to="/higiene/preparacion-sanidad">← Volver a Preparación Sanidad</Link></nav>
    <section className="sanidad-toolbar"><div><strong>Registro trimestral oficial</strong><p>{TRIMESTRAL.length} puntos de control.</p></div><div className="sanidad-cabecera-trimestral"><label>Periodo<input value={periodo} onChange={e => setPeriodo(e.target.value)} placeholder="2026-T3" /></label><label>Fecha<input type="date" value={cabecera.fecha || ""} onChange={e => cambiarCabecera("fecha", e.target.value)} /></label><label>Responsable<input value={cabecera.responsable || ""} onChange={e => cambiarCabecera("responsable", e.target.value)} placeholder="Nombre y apellidos" /></label><fieldset><legend>Zona</legend><label><input type="radio" name="ubicacion-trimestral" value="Obrador" checked={cabecera.ubicacion === "Obrador"} onChange={e => cambiarCabecera("ubicacion", e.target.value)} /> Obrador</label><label><input type="radio" name="ubicacion-trimestral" value="Botiga" checked={cabecera.ubicacion === "Botiga"} onChange={e => cambiarCabecera("ubicacion", e.target.value)} /> Botiga</label></fieldset></div></section>
    <div className="sanidad-resumen">{RESPUESTAS.map(r => <span key={r}><b>{resumen[r] || 0}</b>{r}</span>)}</div>
    <section className="sanidad-cuestionario">{TRIMESTRAL.map(item => <article key={item.codigo} className={`respuesta-${(respuestas[item.codigo]?.respuesta || "Pendiente").toLowerCase().replace(" ", "-")}`}><div className="sanidad-pregunta"><span>{item.codigo}</span><div><small>{item.seccion}</small><p>{item.texto}</p></div></div><div className="sanidad-opciones" role="group">{RESPUESTAS.map(r => <button type="button" key={r} className={(respuestas[item.codigo]?.respuesta || "Pendiente") === r ? "seleccionada" : ""} data-respuesta={r} onClick={() => responder(item, r)}>{r === "Sí" ? "✓ " : r === "No" ? "✕ " : r === "Pendiente" ? "⏳ " : "— "}{r}</button>)}</div><div className={`sanidad-nota ${(respuestas[item.codigo]?.respuesta || "Pendiente") === "No" ? "requiere-nota" : ""}`}><label>{(respuestas[item.codigo]?.respuesta || "Pendiente") === "No" ? "Explica qué falta o qué se debe corregir" : "Nota opcional"}</label><textarea rows="2" value={respuestas[item.codigo]?.nota || ""} onChange={e => cambiarLocal(item.codigo, "nota", e.target.value)} /></div></article>)}</section>
    <div className="sanidad-guardar"><span>✓ Los cambios quedan guardados localmente</span><button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar registro trimestral"}</button><Link to="/higiene/incidencias">Abrir incidencias</Link></div>
    {mensaje && <p className="mensaje-control">{mensaje}</p>}
  </main>;
}
