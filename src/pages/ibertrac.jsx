import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase.js";
import { Pagina, Tabla } from "./limpieza.jsx";
import { leerIbertracPdf, normalizarProducto } from "../services/lectorIbertrac.js";

const TIPOS = [
  { valor: "parte", etiqueta: "Parte de servicio", icono: "📋" },
  { valor: "producto", etiqueta: "Producto utilizado", icono: "🧴" },
  { valor: "ficha_tecnica", etiqueta: "Ficha técnica", icono: "📄" },
];
const formularioVacio = () => ({ tipo: "parte", fecha_documento: new Date().toISOString().slice(0, 10), titulo: "", numero_documento: "", producto: "", numero_registro: "", zona_aplicacion: "", observaciones: "" });
const etiquetaTipo = (tipo) => TIPOS.find((opcion) => opcion.valor === tipo)?.etiqueta || tipo;

export default function Ibertrac() {
  const [form, setForm] = useState(formularioVacio);
  const [archivo, setArchivo] = useState(null);
  const [productosDetectados, setProductosDetectados] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const inputArchivo = useRef(null);

  async function cargar() {
    const { data, error } = await supabase.from("higiene_ibertrac_documentos").select("*").order("fecha_documento", { ascending: false }).order("created_at", { ascending: false });
    if (error) setMensaje(`No se pudo cargar Ibertrac: ${error.message}`); else setRegistros(data || []);
  }
  useEffect(() => { cargar(); }, []);
  function actualizar(nombre, valor) { setForm((actual) => ({ ...actual, [nombre]: valor })); }

  async function seleccionarArchivo(e) {
    const fichero = e.target.files?.[0] || null;
    setArchivo(fichero); setProductosDetectados([]);
    if (!fichero) return;
    if (!(fichero.type === "application/pdf" || /\.pdf$/i.test(fichero.name))) { setMensaje("Foto seleccionada. Completa los datos manualmente antes de guardar."); return; }
    setLeyendo(true); setMensaje("Leyendo automáticamente el certificado de Ibertrac…");
    try {
      const datos = await leerIbertracPdf(fichero);
      setForm((actual) => ({ ...actual, ...Object.fromEntries(Object.entries(datos).filter(([clave, valor]) => clave !== "productos_detectados" && valor !== "")) }));
      setProductosDetectados(datos.productos_detectados || []);
      setMensaje(datos.numero_documento ? `Certificado ${datos.numero_documento} leído. Revisa los datos y pulsa Guardar documento.` : "PDF leído. Revisa los datos antes de guardar.");
    } catch (error) { setMensaje(`No se pudo leer automáticamente: ${error.message}. Puedes completar los datos manualmente.`); } finally { setLeyendo(false); }
  }

  async function guardar(e) {
    e.preventDefault();
    if (!archivo) return setMensaje("Selecciona una foto o un PDF antes de guardar.");
    if (!form.titulo.trim()) return setMensaje("Indica el título o nombre del documento.");
    setGuardando(true); setMensaje("Guardando documento de Ibertrac…");
    const nombreSeguro = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ruta = `ibertrac/${form.tipo}/${Date.now()}-${nombreSeguro}`;
    const subida = await supabase.storage.from("higiene-pdfs").upload(ruta, archivo, { contentType: archivo.type || "application/octet-stream" });
    if (subida.error) { setGuardando(false); return setMensaje(`No se pudo subir el archivo: ${subida.error.message}`); }
    const payload = { ...form, titulo: form.titulo.trim(), numero_documento: form.numero_documento.trim() || null, producto: form.producto.trim() || null, numero_registro: form.numero_registro.trim() || null, zona_aplicacion: form.zona_aplicacion.trim() || null, observaciones: form.observaciones.trim() || null, productos_detectados: form.tipo === "parte" ? productosDetectados : [], archivo_nombre: archivo.name, archivo_ruta: ruta, archivo_tipo: archivo.type || null };
    const { error } = await supabase.from("higiene_ibertrac_documentos").insert(payload);
    if (error) { await supabase.storage.from("higiene-pdfs").remove([ruta]); setGuardando(false); return setMensaje(`No se pudo guardar el registro: ${error.message}`); }
    setForm(formularioVacio()); setArchivo(null); setProductosDetectados([]); if (inputArchivo.current) inputArchivo.current.value = ""; setGuardando(false); setMensaje("Documento de Ibertrac guardado correctamente."); await cargar();
  }
  async function abrir(registro) {
    const { data, error } = await supabase.storage.from("higiene-pdfs").createSignedUrl(registro.archivo_ruta, 60);
    if (error) setMensaje(`No se pudo abrir el archivo: ${error.message}`); else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  async function eliminar(registro) {
    if (!window.confirm(`¿Eliminar “${registro.titulo}” y su archivo adjunto?`)) return;
    setMensaje("Eliminando…");
    const { error } = await supabase.from("higiene_ibertrac_documentos").delete().eq("id", registro.id);
    if (error) return setMensaje(`No se pudo eliminar: ${error.message}`);
    if (registro.archivo_ruta) await supabase.storage.from("higiene-pdfs").remove([registro.archivo_ruta]);
    setMensaje("Documento eliminado correctamente."); await cargar();
  }

  const fichasNecesarias = useMemo(() => {
    const productos = new Map();
    registros.filter((r) => r.tipo === "parte").forEach((parte) => (parte.productos_detectados || []).forEach((producto) => { const nombre = producto.nombre_corto || producto.nombre; const clave = normalizarProducto(nombre); if (clave && !productos.has(clave)) productos.set(clave, { ...producto, nombre_corto: nombre }); }));
    productosDetectados.forEach((producto) => { const clave = normalizarProducto(producto.nombre_corto || producto.nombre); if (clave && !productos.has(clave)) productos.set(clave, producto); });
    const fichas = registros.filter((r) => r.tipo === "ficha_tecnica").map((r) => normalizarProducto(r.producto || r.titulo));
    return [...productos.entries()].map(([clave, producto]) => ({ ...producto, guardada: fichas.some((ficha) => ficha && (ficha.includes(clave) || clave.includes(ficha))) })).sort((a, b) => Number(a.guardada) - Number(b.guardada) || Number(b.requiere_ficha_biocida) - Number(a.requiere_ficha_biocida));
  }, [registros, productosDetectados]);
  const faltantes = fichasNecesarias.filter((ficha) => !ficha.guardada);
  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es");
    return registros.filter((registro) => { if (filtro !== "todos" && registro.tipo !== filtro) return false; if (!texto) return true; return [registro.titulo, registro.numero_documento, registro.producto, registro.numero_registro, registro.zona_aplicacion, registro.observaciones].some((valor) => String(valor || "").toLocaleLowerCase("es").includes(texto)); });
  }, [registros, filtro, busqueda]);

  return <Pagina icono="🛡️" titulo="Ibertrac" texto="Sube un certificado y la aplicación leerá sus datos y productos automáticamente.">
    <div className="ibertrac-resumen">{TIPOS.map((tipo) => <button type="button" key={tipo.valor} className={form.tipo === tipo.valor ? "activo" : ""} onClick={() => actualizar("tipo", tipo.valor)}><span>{tipo.icono}</span><strong>{tipo.etiqueta}</strong><small>{registros.filter((r) => r.tipo === tipo.valor).length} guardados</small></button>)}</div>
    {fichasNecesarias.length > 0 && <section className={`ibertrac-fichas ${faltantes.length ? "con-faltantes" : "completo"}`}><div><h2>{faltantes.length ? `Fichas técnicas pendientes: ${faltantes.length}` : "Fichas técnicas completas"}</h2><p>{faltantes.length ? "Estas fichas corresponden a productos detectados en los partes y todavía no están archivadas." : "Todos los productos detectados en los partes tienen una ficha guardada."}</p></div><div className="ibertrac-lista-fichas">{fichasNecesarias.map((ficha) => <span key={normalizarProducto(ficha.nombre_corto || ficha.nombre)} className={ficha.guardada ? "guardada" : "pendiente"}>{ficha.guardada ? "✓" : ficha.requiere_ficha_biocida ? "!" : "○"} {ficha.nombre_corto || ficha.nombre}{ficha.requiere_ficha_biocida && !ficha.guardada ? <strong>Ficha biocida prioritaria</strong> : null}</span>)}</div></section>}
    <h2>Subir nuevo documento</h2>
    <form className="control-form" onSubmit={guardar}>
      <label className="subida-pdf"><input ref={inputArchivo} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,application/pdf,.pdf" onChange={seleccionarArchivo} /><strong>{archivo ? archivo.name : "Seleccionar certificado, foto o PDF de Ibertrac"}</strong><span>{leyendo ? "Leyendo datos y productos…" : "Los certificados PDF de Ibertrac se rellenan automáticamente."}</span></label>
      {productosDetectados.length > 0 && <div className="ibertrac-detectados"><strong>Productos detectados en este parte</strong>{productosDetectados.map((producto) => <span key={`${producto.nombre}-${producto.lote}`}>🧴 {producto.nombre_corto || producto.nombre}<small>{[producto.numero_registro && `Registro: ${producto.numero_registro}`, producto.consumo && `Consumo: ${producto.consumo}`, producto.lote && `Lote: ${producto.lote}`].filter(Boolean).join(" · ")}</small></span>)}</div>}
      <div className="control-grid">
        <label>Tipo de documento *<select value={form.tipo} onChange={(e) => actualizar("tipo", e.target.value)}>{TIPOS.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>)}</select></label>
        <label>Fecha *<input type="date" required value={form.fecha_documento} onChange={(e) => actualizar("fecha_documento", e.target.value)} /></label>
        <label>Título / nombre *<input required placeholder="Ej.: Parte mensual septiembre" value={form.titulo} onChange={(e) => actualizar("titulo", e.target.value)} /></label>
        <label>Número de parte o documento<input value={form.numero_documento} onChange={(e) => actualizar("numero_documento", e.target.value)} /></label>
        <label>Producto utilizado<input placeholder="Nombre comercial" value={form.producto} onChange={(e) => actualizar("producto", e.target.value)} /></label>
        <label>Número de registro<input placeholder="N.º de registro sanitario/biocida" value={form.numero_registro} onChange={(e) => actualizar("numero_registro", e.target.value)} /></label>
        <label>Zona de aplicación<input placeholder="Cocina, obrador, tienda…" value={form.zona_aplicacion} onChange={(e) => actualizar("zona_aplicacion", e.target.value)} /></label>
        <label>Observaciones<input value={form.observaciones} onChange={(e) => actualizar("observaciones", e.target.value)} /></label>
      </div>
      <button type="submit" className="boton-control" disabled={guardando || leyendo}>{guardando ? "Guardando…" : "Guardar documento"}</button>
    </form>
    {mensaje && <p className="mensaje-control">{mensaje}</p>}<hr className="separador-control" />
    <div className="control-titulo-fila ibertrac-filtros"><h2>Histórico de Ibertrac</h2><select value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="todos">Todos los documentos</option>{TIPOS.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>)}</select><input placeholder="Buscar producto, parte o registro…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></div>
    <Tabla cab={["Fecha", "Tipo", "Documento", "Producto / registro", "Zona", "Acciones"]} datos={visibles} fila={(registro) => <tr key={registro.id}><td>{registro.fecha_documento}</td><td>{etiquetaTipo(registro.tipo)}</td><td><strong>{registro.titulo}</strong><small>{registro.numero_documento || registro.archivo_nombre}</small></td><td>{registro.producto || "—"}<small>{registro.numero_registro || ""}</small></td><td>{registro.zona_aplicacion || "—"}<small>{registro.observaciones || ""}</small></td><td><button type="button" onClick={() => abrir(registro)}>Ver archivo</button><button type="button" className="peligro" onClick={() => eliminar(registro)}>Eliminar</button></td></tr>} />
  </Pagina>;
}
