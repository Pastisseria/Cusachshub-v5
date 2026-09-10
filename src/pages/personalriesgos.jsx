import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase.js";
import "../styles/personalriesgos.css";

const TIPOS = [
  ["formacion_puesto", "Formación del puesto"],
  ["epis", "Entrega / registro de EPIs"],
  ["renuncia_reconocimiento", "Renuncia al reconocimiento médico"],
  ["manipulador_alimentos", "Manipulador de alimentos"],
  ["reconocimiento_medico", "Reconocimiento médico"],
  ["otra_formacion", "Otra formación"],
  ["otro", "Otro documento"],
];
const etiquetaTipo = (tipo) => TIPOS.find(([valor]) => valor === tipo)?.[1] || tipo;
const PERSONA_VACIA = { nombre: "", apellidos: "", dni: "", telefono: "", email: "", fecha_nacimiento: "", activo: true, observaciones: "" };
const DOCUMENTO_VACIO = { tipo: "formacion_puesto", titulo: "Formación del puesto de trabajo", entidad_formadora: "", fecha_emision: "", fecha_caducidad: "", numero_certificado: "", observaciones: "" };

function fechaBonita(fecha) {
  if (!fecha) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES").format(new Date(`${fecha}T12:00:00`));
}
function estadoDocumento(documento) {
  if (!documento.fecha_caducidad) return "vigente";
  const dias = Math.ceil((new Date(`${documento.fecha_caducidad}T23:59:59`) - new Date()) / 86400000);
  if (dias < 0) return "caducado";
  if (dias <= 60) return "proximo";
  return "vigente";
}
function rutaSegura(nombre) {
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function PersonalRiesgos() {
  const [personas, setPersonas] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [editandoPersona, setEditandoPersona] = useState(false);
  const [personaForm, setPersonaForm] = useState(PERSONA_VACIA);
  const [documentoForm, setDocumentoForm] = useState(DOCUMENTO_VACIO);
  const [mostrarDocumento, setMostrarDocumento] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const archivoRef = useRef(null);

  async function cargarPersonas(mantenerId = seleccionada?.id) {
    const { data, error } = await supabase.from("personal_trabajadores").select("*").order("nombre").order("apellidos");
    if (error) return setMensaje(`No se pudo cargar el personal: ${error.message}`);
    const lista = data || [];
    setPersonas(lista);
    const siguiente = lista.find((persona) => persona.id === mantenerId) || lista[0] || null;
    setSeleccionada(siguiente);
  }
  async function cargarDocumentos(id) {
    if (!id) return setDocumentos([]);
    const { data, error } = await supabase.from("personal_documentos_prl").select("*").eq("trabajador_id", id).order("fecha_emision", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    if (error) setMensaje(`No se pudieron cargar los certificados: ${error.message}`);
    else setDocumentos(data || []);
  }
  useEffect(() => { cargarPersonas(); }, []);
  useEffect(() => { cargarDocumentos(seleccionada?.id); }, [seleccionada?.id]);

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return personas.filter((persona) => (!soloActivos || persona.activo) && (!texto || `${persona.nombre} ${persona.apellidos} ${persona.dni || ""}`.toLowerCase().includes(texto)));
  }, [personas, busqueda, soloActivos]);
  const resumen = useMemo(() => ({
    total: personas.filter((persona) => persona.activo).length,
    certificados: documentos.length,
    renuncia: documentos.some((documento) => documento.tipo === "renuncia_reconocimiento"),
    alertas: documentos.filter((documento) => estadoDocumento(documento) !== "vigente").length,
  }), [personas, documentos]);

  function nuevaPersona() {
    setSeleccionada(null); setPersonaForm(PERSONA_VACIA); setEditandoPersona(true); setDocumentos([]); setMensaje("");
  }
  function editarPersona() {
    if (!seleccionada) return;
    setPersonaForm({ ...PERSONA_VACIA, ...seleccionada, fecha_nacimiento: seleccionada.fecha_nacimiento || "" });
    setEditandoPersona(true); setMensaje("");
  }
  async function guardarPersona(e) {
    e.preventDefault();
    if (!personaForm.nombre.trim()) return setMensaje("Escribe el nombre del trabajador.");
    setGuardando(true);
    const payload = {
      nombre: personaForm.nombre.trim(), apellidos: personaForm.apellidos.trim(), dni: personaForm.dni.trim() || null,
      telefono: personaForm.telefono.trim() || null, email: personaForm.email.trim() || null,
      fecha_nacimiento: personaForm.fecha_nacimiento || null, activo: personaForm.activo,
      observaciones: personaForm.observaciones.trim() || null, updated_at: new Date().toISOString(),
    };
    const consulta = seleccionada?.id
      ? supabase.from("personal_trabajadores").update(payload).eq("id", seleccionada.id).select().single()
      : supabase.from("personal_trabajadores").insert(payload).select().single();
    const { data, error } = await consulta;
    setGuardando(false);
    if (error) return setMensaje(`No se pudo guardar: ${error.message}`);
    setEditandoPersona(false); setSeleccionada(data); setMensaje("Ficha de personal guardada."); await cargarPersonas(data.id);
  }
  function nuevoDocumento() {
    if (!seleccionada) return;
    setDocumentoForm(DOCUMENTO_VACIO); setArchivo(null); if (archivoRef.current) archivoRef.current.value = "";
    setMostrarDocumento(true); setMensaje("");
  }
  async function guardarDocumento(e) {
    e.preventDefault();
    if (!documentoForm.titulo.trim()) return setMensaje("Escribe el nombre del certificado o formación.");
    setGuardando(true);
    let archivoRuta = null;
    try {
      if (archivo) {
        archivoRuta = `${seleccionada.id}/${crypto.randomUUID()}-${rutaSegura(archivo.name)}`;
        const { error } = await supabase.storage.from("personal-prl").upload(archivoRuta, archivo, { contentType: archivo.type || undefined });
        if (error) throw error;
      }
      const { error } = await supabase.from("personal_documentos_prl").insert({
        trabajador_id: seleccionada.id, tipo: documentoForm.tipo, titulo: documentoForm.titulo.trim(),
        entidad_formadora: documentoForm.entidad_formadora.trim() || null, fecha_emision: documentoForm.fecha_emision || null,
        fecha_caducidad: documentoForm.fecha_caducidad || null, numero_certificado: documentoForm.numero_certificado.trim() || null,
        observaciones: documentoForm.observaciones.trim() || null, archivo_nombre: archivo?.name || null,
        archivo_ruta: archivoRuta, archivo_tipo: archivo?.type || null,
      });
      if (error) throw error;
      setMostrarDocumento(false); setMensaje("Certificado guardado en la ficha."); await cargarDocumentos(seleccionada.id);
    } catch (error) {
      if (archivoRuta) await supabase.storage.from("personal-prl").remove([archivoRuta]);
      setMensaje(`No se pudo guardar el documento: ${error.message}`);
    } finally { setGuardando(false); }
  }
  async function abrirDocumento(documento) {
    if (!documento.archivo_ruta) return;
    const { data, error } = await supabase.storage.from("personal-prl").createSignedUrl(documento.archivo_ruta, 120);
    if (error) setMensaje(error.message); else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  async function eliminarDocumento(documento) {
    if (!window.confirm(`¿Eliminar “${documento.titulo}”?`)) return;
    const { error } = await supabase.from("personal_documentos_prl").delete().eq("id", documento.id);
    if (error) return setMensaje(error.message);
    if (documento.archivo_ruta) await supabase.storage.from("personal-prl").remove([documento.archivo_ruta]);
    setMensaje("Documento eliminado."); await cargarDocumentos(seleccionada.id);
  }
  function cambiarTipo(tipo) {
    setDocumentoForm((actual) => ({ ...actual, tipo, titulo: actual.titulo === etiquetaTipo(actual.tipo) || actual.titulo === DOCUMENTO_VACIO.titulo ? etiquetaTipo(tipo) : actual.titulo }));
  }

  return <main className="prl-page">
    <header className="prl-cabecera"><div><span>GESTIÓN DOCUMENTAL</span><h1>Personal y riesgos laborales</h1><p>Fichas del equipo, formaciones, EPIs, certificados y vigilancia de la salud.</p></div><button onClick={nuevaPersona}>+ Añadir persona</button></header>
    <section className="prl-resumen">
      <article><b>{resumen.total}</b><span>personas activas</span></article>
      <article><b>{seleccionada ? resumen.certificados : "—"}</b><span>documentos en la ficha</span></article>
      <article className={resumen.renuncia ? "correcto" : "aviso"}><b>{seleccionada ? (resumen.renuncia ? "Sí" : "No") : "—"}</b><span>renuncia registrada</span></article>
      <article className={resumen.alertas ? "peligro" : "correcto"}><b>{seleccionada ? resumen.alertas : "—"}</b><span>caducados o próximos</span></article>
    </section>
    {mensaje && <p className="prl-mensaje">{mensaje}</p>}
    <div className="prl-layout">
      <aside className="prl-personas"><div className="prl-filtros"><input placeholder="Buscar nombre o DNI…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /><label><input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} /> Solo activos</label></div>
        <div className="prl-listado">{filtradas.map((persona) => <button key={persona.id} className={seleccionada?.id === persona.id ? "activo" : ""} onClick={() => { setSeleccionada(persona); setEditandoPersona(false); }}><span>{persona.nombre.charAt(0)}{persona.apellidos.charAt(0)}</span><div><strong>{persona.nombre} {persona.apellidos}</strong><small>{persona.activo ? persona.dni || "Sin DNI" : "Baja"}</small></div></button>)}{filtradas.length === 0 && <p>No hay personas que coincidan.</p>}</div>
      </aside>
      <section className="prl-ficha">
        {editandoPersona ? <form className="prl-form" onSubmit={guardarPersona}><div className="prl-titulo-ficha"><h2>{seleccionada ? "Editar ficha" : "Nueva persona"}</h2><button type="button" className="secundario" onClick={() => { setEditandoPersona(false); if (!seleccionada) cargarPersonas(); }}>Cancelar</button></div><div className="prl-grid-form">
          <label>Nombre *<input value={personaForm.nombre} onChange={(e) => setPersonaForm({ ...personaForm, nombre: e.target.value })} /></label><label>Apellidos<input value={personaForm.apellidos} onChange={(e) => setPersonaForm({ ...personaForm, apellidos: e.target.value })} /></label><label>DNI / NIE<input value={personaForm.dni} onChange={(e) => setPersonaForm({ ...personaForm, dni: e.target.value.toUpperCase() })} /></label><label>Teléfono<input inputMode="tel" value={personaForm.telefono} onChange={(e) => setPersonaForm({ ...personaForm, telefono: e.target.value })} /></label><label>Email<input type="email" value={personaForm.email} onChange={(e) => setPersonaForm({ ...personaForm, email: e.target.value })} /></label><label>Fecha de nacimiento<input type="date" value={personaForm.fecha_nacimiento} onChange={(e) => setPersonaForm({ ...personaForm, fecha_nacimiento: e.target.value })} /></label><label className="prl-check"><input type="checkbox" checked={personaForm.activo} onChange={(e) => setPersonaForm({ ...personaForm, activo: e.target.checked })} /> Trabajador activo</label><label className="ancho">Observaciones<textarea rows="3" value={personaForm.observaciones} onChange={(e) => setPersonaForm({ ...personaForm, observaciones: e.target.value })} /></label></div><button disabled={guardando}>{guardando ? "Guardando…" : "Guardar ficha"}</button></form>
        : seleccionada ? <><div className="prl-titulo-ficha"><div><span className={`prl-activo ${seleccionada.activo ? "si" : "no"}`}>{seleccionada.activo ? "EN ACTIVO" : "BAJA"}</span><h2>{seleccionada.nombre} {seleccionada.apellidos}</h2></div><button className="secundario" onClick={editarPersona}>Editar datos</button></div><dl className="prl-datos"><div><dt>DNI / NIE</dt><dd>{seleccionada.dni || "—"}</dd></div><div><dt>Teléfono</dt><dd>{seleccionada.telefono || "—"}</dd></div><div><dt>Email</dt><dd>{seleccionada.email || "—"}</dd></div><div><dt>Nacimiento</dt><dd>{fechaBonita(seleccionada.fecha_nacimiento)}</dd></div></dl>
          <div className="prl-documentos-cabecera"><div><h3>Certificados y documentos</h3><p>Puedes añadir todas las formaciones y certificados que necesites.</p></div><button onClick={nuevoDocumento}>+ Subir certificado</button></div>
          {mostrarDocumento && <form className="prl-form-documento" onSubmit={guardarDocumento}><div className="prl-titulo-ficha"><h3>Nuevo certificado o documento</h3><button type="button" className="secundario" onClick={() => setMostrarDocumento(false)}>Cancelar</button></div><div className="prl-grid-form"><label>Tipo<select value={documentoForm.tipo} onChange={(e) => cambiarTipo(e.target.value)}>{TIPOS.map(([valor, etiqueta]) => <option value={valor} key={valor}>{etiqueta}</option>)}</select></label><label>Título *<input value={documentoForm.titulo} onChange={(e) => setDocumentoForm({ ...documentoForm, titulo: e.target.value })} /></label><label>Fecha de emisión<input type="date" value={documentoForm.fecha_emision} max="2099-12-31" onChange={(e) => setDocumentoForm({ ...documentoForm, fecha_emision: e.target.value })} /></label><label>Fecha de caducidad<input type="date" value={documentoForm.fecha_caducidad} onChange={(e) => setDocumentoForm({ ...documentoForm, fecha_caducidad: e.target.value })} /></label><label>Entidad / formador<input value={documentoForm.entidad_formadora} onChange={(e) => setDocumentoForm({ ...documentoForm, entidad_formadora: e.target.value })} /></label><label>Nº certificado<input value={documentoForm.numero_certificado} onChange={(e) => setDocumentoForm({ ...documentoForm, numero_certificado: e.target.value })} /></label><label className="ancho prl-archivo">PDF o imagen<input ref={archivoRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf" onChange={(e) => setArchivo(e.target.files?.[0] || null)} /><small>Máximo 15 MB. Los archivos quedan privados.</small></label><label className="ancho">Observaciones<textarea rows="2" value={documentoForm.observaciones} onChange={(e) => setDocumentoForm({ ...documentoForm, observaciones: e.target.value })} /></label></div><button disabled={guardando}>{guardando ? "Guardando…" : "Guardar documento"}</button></form>}
          <div className="prl-documentos">{documentos.map((documento) => { const estado = estadoDocumento(documento); return <article key={documento.id}><div className={`prl-icono ${estado}`}>📄</div><div className="prl-doc-info"><span>{etiquetaTipo(documento.tipo)}</span><strong>{documento.titulo}</strong><small>Emisión: {fechaBonita(documento.fecha_emision)}{documento.fecha_caducidad ? ` · Caduca: ${fechaBonita(documento.fecha_caducidad)}` : " · Sin caducidad"}</small>{documento.entidad_formadora && <small>{documento.entidad_formadora}</small>}</div><span className={`prl-estado-doc ${estado}`}>{estado === "caducado" ? "Caducado" : estado === "proximo" ? "Próximo" : "Vigente"}</span><div className="prl-acciones">{documento.archivo_ruta ? <button onClick={() => abrirDocumento(documento)}>Ver archivo</button> : <span>Sin archivo</span>}<button className="peligro" onClick={() => eliminarDocumento(documento)}>Eliminar</button></div></article>; })}{documentos.length === 0 && <div className="prl-vacio"><b>No hay certificados adjuntos</b><p>Añade la formación, los EPIs, la renuncia médica o cualquier otro documento.</p></div>}</div>
        </> : <div className="prl-vacio"><b>Selecciona una persona</b></div>}
      </section>
    </div>
  </main>;
}
