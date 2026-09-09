import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { leerFichaTecnicaPdf } from "../services/lectorFichasTecnicas.js";

const inicial = {
  zona: "",
  tarea: "",
  frecuencia: "Diaria",
  responsable: "",
  fecha: new Date().toISOString().slice(0, 10),
  estado: "Pendiente",
  observaciones: "",
};
const productoInicial = {
  nombre: "",
  marca: "",
  proveedor: "",
  uso: "",
  dilucion: "",
  peligros: "",
  fecha_revision: new Date().toISOString().slice(0, 10),
  observaciones: "",
};
const PLAN_LIMPIEZA = [
  ["Barra / cafetería y comedor", "Mobiliario de clientes", "DUO BAC", "", "Diaria", "Pulverizar; dejar actuar 5-10 minutos; aclarar con agua"], ["Barra / cafetería y comedor", "Vitrinas y tiradores", "DUO BAC", "", "Diaria", "Pulverizar; dejar actuar 5-10 minutos; aclarar con agua"], ["Barra / cafetería y comedor", "Acero inoxidable y estanterías", "DUO BAC", "", "Diaria", "Pulverizar; dejar actuar 5-10 minutos; aclarar con agua"], ["Barra / cafetería y comedor", "Paredes y suelos", "DUO BAC", "", "Diaria", "Fregar normalmente"], ["Barra / cafetería y comedor", "Cafetera", "DUO BAC", "", "Semanal", "Pulverizar; dejar actuar 5-10 minutos; aclarar con agua"],
  ["Cámara frigorífica", "Estanterías", "DUO ASEPVIX", "", "Semanal", "Pulverizar; dejar actuar 5-10 minutos; aclarar con agua abundante"], ["Cámara frigorífica", "Suelo", "ASEPVIX", "", "Diaria", "Diluir 0,2-0,4 % en 4-5 litros de agua y fregar"], ["Cámara frigorífica", "Cubos orgánicos", "DUO ASEPVIX", "", "Diaria", "Pulverizar; dejar actuar 5-10 minutos; aclarar con agua abundante"], ["Cámara frigorífica", "Paredes", "DUO ASEPVIX", "", "Semanal", "Pulverizar; dejar actuar 5-10 minutos; aclarar con agua abundante"],
  ["Cocina", "Suelo", "VOLVONE", "ASEPVIX", "Diaria", "1 parte de Volvone y 3 partes de agua"], ["Cocina", "Techos", "VOLVONE", "ASEPVIX", "Mensual", "1 parte de Volvone y 3 partes de agua"], ["Cocina", "Superficies de trabajo", "DETERNET", "ASEPVIX", "A cada uso", ""], ["Cocina", "Freidora", "", "", "Semanal", ""], ["Cocina", "Suelo del cuarto frío", "VOLVONE", "ASEPVIX", "Diaria", "1 parte de Volvone y 3 partes de agua"], ["Cocina", "Paredes del cuarto frío", "VOLVONE", "ASEPVIX", "Mensual", "1 parte de Volvone y 3 partes de agua"], ["Cocina", "Nevera del cuarto frío", "DETERNET", "ASEPVIX", "Semanal", ""], ["Cocina", "Picas", "DETERNET", "ASEPVIX", "Diaria", ""], ["Cocina", "Cajones", "DETERNET", "ASEPVIX", "Semanal", ""], ["Cocina", "Luces", "VOLVONE", "ASEPVIX", "Mensual", "1-2 pulsaciones en un cubo de 5-10 litros"], ["Cocina", "Paredes", "VOLVONE", "ASEPVIX", "Mensual", "1-2 pulsaciones en un cubo de 5-10 litros"], ["Cocina", "Nevera", "DETERNET", "ASEPVIX", "Semanal", ""], ["Cocina", "Cortadora", "DETERNET", "ASEPVIX", "Diaria", ""], ["Cocina", "Microondas", "DETERNET", "ASEPVIX", "Diaria", ""], ["Cocina", "Detrás de congeladores", "VOLVONE", "ASEPVIX", "Semanal", "1-2 pulsaciones en un cubo de 5-10 litros"], ["Cocina", "Estanterías", "VOLVONE", "ASEPVIX", "Semanal", "1 parte de Volvone y 3 partes de agua"], ["Cocina", "Campana extractora", "SUPERVIX", "", "Semanal", ""],
  ["Cámara fría", "Mesas", "DUO ASEPVIX", "", "Diaria", "Pulverizar; dejar actuar 5-15 minutos; aclarar con agua"], ["Cámara fría", "Estanterías y maquinaria", "DUO ASEPVIX", "", "Diaria", "Pulverizar; dejar actuar 5-15 minutos; aclarar con agua"], ["Cámara fría", "Utensilios", "DUO ASEPVIX", "", "Diaria", "Pulverizar; dejar actuar 5-15 minutos; aclarar con agua"], ["Cámara fría", "Suelos y paredes", "DUO ASEPVIX", "", "Diaria", "Diluir 0,2-0,4 % en 4-5 litros de agua y fregar"], ["Cámara fría", "Frutas y verduras", "ASEPFOOD", "", "A cada uso", "Diluir 1,8 g/l; sumergir 5 minutos y aclarar abundantemente"],
  ["Lavado manual", "Sartenes, ollas y cazuelas", "KEY ULTRA", "", "Diaria", "Diluir 1-3 g/l en agua tibia; fregar y aclarar"], ["Lavado manual", "Utensilios", "KEY ULTRA", "", "Diaria", "Diluir 1-3 g/l en agua tibia; fregar y aclarar"], ["Lavado manual", "Vajilla y cristalería", "KEY ULTRA", "", "Diaria", "Diluir 1-3 g/l en agua tibia; fregar y aclarar"],
  ["Lavado automático", "Lavado", "ECOCONPACK A30", "", "A cada uso", "Dosificación automática 0,4-1,5 g/l"], ["Lavado automático", "Abrillantado", "ECOCONPACK ABRILLANTADOR", "", "A cada uso", "Dosificación automática 0,1-0,4 g/l"], ["Lavado automático", "Desincrustación", "BRUSTONE", "", "Cuando proceda", "Dosificación automática por recirculación 5-10 %"],
  ["Obrador", "Suelo", "VOLVONE", "ASEPVIX", "Diaria", "1 parte de Volvone y 3 partes de agua"], ["Obrador", "Techos", "VOLVONE", "ASEPVIX", "Mensual", "1 parte de Volvone y 3 partes de agua"], ["Obrador", "Superficies de trabajo", "DETERNET", "ASEPVIX", "A cada uso", ""], ["Obrador", "Neveras", "DETERNET", "ASEPVIX", "Semanal", ""], ["Obrador", "Pica", "DETERNET", "ASEPVIX", "Diaria", ""], ["Obrador", "Cajones", "DETERNET", "ASEPVIX", "Semanal", ""], ["Obrador", "Luces", "VOLVONE", "ASEPVIX", "Mensual", "1-2 pulsaciones en un cubo de 5-10 litros"], ["Obrador", "Paredes", "VOLVONE", "ASEPVIX", "Mensual", "1-2 pulsaciones en un cubo de 5-10 litros"], ["Obrador", "Estanterías", "VOLVONE", "ASEPVIX", "Semanal", "1 parte de Volvone y 3 partes de agua"], ["Obrador", "Campana extractora", "SUPERVIX", "", "Semanal", ""],
  ["Obrador", "Carros", "SUPERVIX", "", "Semanal", "Diluir 3-6 %; pulverizar y fregar con bayeta"], ["Obrador", "Horno industrial", "SUPERVIX", "", "Semanal", "Diluir 3-6 %; pulverizar y fregar con bayeta"], ["Obrador", "Bandejas", "SUPERVIX", "", "Diaria", "Diluir 3-6 %; pulverizar y fregar con bayeta"],
].map(([zona, superficie, limpieza, desinfeccion, frecuencia, metodo], id) => ({ id, zona, superficie, limpieza, desinfeccion, frecuencia, metodo }));

const ZONAS_PLAN = [...new Set(PLAN_LIMPIEZA.map((tarea) => tarea.zona))];

export default function Limpieza() {
  const [datos, setDatos] = useState([]),
    [form, setForm] = useState(inicial),
    [mensaje, setMensaje] = useState("");
  const [productos, setProductos] = useState([]),
    [producto, setProducto] = useState(productoInicial),
    [pdf, setPdf] = useState(null),
    [mensajeProducto, setMensajeProducto] = useState(""),
    [leyendoFicha, setLeyendoFicha] = useState(false);
  const [zonaPlan, setZonaPlan] = useState("Cocina");
  const [controlesPlan, setControlesPlan] = useState({});
  async function cargar() {
    const { data, error } = await supabase
      .from("higiene_limpieza")
      .select("*")
      .order("fecha", { ascending: false });
    if (!error) setDatos(data || []);
  }
  async function cargarProductos() {
    const { data, error } = await supabase
      .from("higiene_productos_limpieza")
      .select("*")
      .order("nombre");
    if (!error) setProductos(data || []);
  }
  useEffect(() => {
    cargar();
    cargarProductos();
  }, []);
  async function guardar(e) {
    e.preventDefault();
    const { error } = await supabase.from("higiene_limpieza").insert(form);
    setMensaje(error ? error.message : "Tarea guardada correctamente.");
    if (!error) {
      setForm(inicial);
      cargar();
    }
  }
  async function cambiar(id, estado) {
    await supabase
      .from("higiene_limpieza")
      .update({
        estado,
        completado_at:
          estado === "Completada" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    cargar();
  }
  async function registrarPlan(tarea) {
    const control = controlesPlan[tarea.id] || {};
    const fecha = control.fecha || new Date().toISOString().slice(0, 10);
    if (!control.responsable?.trim()) return setMensaje("Indica el responsable antes de registrar la limpieza.");
    const detalle = [tarea.superficie, tarea.limpieza && `Limpieza: ${tarea.limpieza}`, tarea.desinfeccion && `Desinfección: ${tarea.desinfeccion}`, tarea.metodo].filter(Boolean).join(" · ");
    const { error } = await supabase.from("higiene_limpieza").insert({ zona: tarea.zona, tarea: detalle, frecuencia: tarea.frecuencia, responsable: control.responsable.trim(), fecha, estado: "Completada", completado_at: new Date().toISOString(), observaciones: control.observaciones || "" });
    if (error) setMensaje(error.message);
    else { setMensaje(`${tarea.superficie} registrada correctamente.`); setControlesPlan((actual) => ({ ...actual, [tarea.id]: { fecha, responsable: "" } })); cargar(); }
  }
  async function guardarProducto(e) {
    e.preventDefault();
    setMensajeProducto("Guardando…");
    let archivo_ruta = null,
      archivo_nombre = null;
    if (pdf) {
      archivo_ruta = `productos-limpieza/${Date.now()}-${pdf.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("higiene-pdfs")
        .upload(archivo_ruta, pdf, { contentType: "application/pdf" });
      if (error)
        return setMensajeProducto(
          `No se pudo guardar el PDF: ${error.message}`,
        );
      archivo_nombre = pdf.name;
    }
    const { error } = await supabase
      .from("higiene_productos_limpieza")
      .insert({ ...producto, archivo_ruta, archivo_nombre });
    if (error) {
      if (archivo_ruta)
        await supabase.storage.from("higiene-pdfs").remove([archivo_ruta]);
      return setMensajeProducto(error.message);
    }
    setProducto(productoInicial);
    setPdf(null);
    setMensajeProducto("Producto y ficha guardados correctamente.");
    cargarProductos();
  }
  async function abrirFicha(r) {
    const { data, error } = await supabase.storage
      .from("higiene-pdfs")
      .createSignedUrl(r.archivo_ruta, 60);
    if (error) setMensajeProducto(error.message);
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  async function seleccionarFicha(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setPdf(archivo); setLeyendoFicha(true); setMensajeProducto("Leyendo la ficha técnica…");
    try { const extraido = await leerFichaTecnicaPdf(archivo); setProducto((actual) => ({ ...actual, ...extraido })); setMensajeProducto("Información extraída. Revísala antes de guardar."); }
    catch (error) { setMensajeProducto(`No se pudo leer automáticamente: ${error.message}`); }
    finally { setLeyendoFicha(false); }
  }
  async function eliminarProducto(r) {
    if (!window.confirm(`¿Eliminar ${r.nombre} y su ficha?`)) return;
    if (r.archivo_ruta)
      await supabase.storage.from("higiene-pdfs").remove([r.archivo_ruta]);
    const { error } = await supabase
      .from("higiene_productos_limpieza")
      .delete()
      .eq("id", r.id);
    if (error) setMensajeProducto(error.message);
    else cargarProductos();
  }
  return (
    <Pagina
      icono="🧹"
      titulo="Limpieza y desinfección"
      texto="Planifica las tareas y conserva las fichas técnicas de los productos."
    >
      <div className="plan-limpieza-cabecera">
        <div className="control-titulo-fila"><h2>Plan de limpieza habitual</h2><select value={zonaPlan} onChange={(e) => setZonaPlan(e.target.value)}>{ZONAS_PLAN.map((zona) => <option key={zona}>{zona}</option>)}</select></div>
        <a className="boton-control enlace-plan-pdf" href={`${import.meta.env.BASE_URL}documentos/plan_limpieza_cusachs_registro_semanal.pdf`} target="_blank" rel="noreferrer" download>📄 Descargar plan completo en PDF</a>
      </div>
      <div className="tabla-control-wrap"><table className="tabla-control plan-limpieza-tabla"><thead><tr><th>Superficie/equipo</th><th>Productos y método</th><th>Frecuencia</th><th>Fecha realizada</th><th>Responsable</th><th></th></tr></thead><tbody>{PLAN_LIMPIEZA.filter((t) => t.zona === zonaPlan).map((t) => { const c = controlesPlan[t.id] || {}; return <tr key={t.id}><td><strong>{t.superficie}</strong></td><td>{t.limpieza || "—"}{t.desinfeccion && <small>Desinfección: {t.desinfeccion}</small>}{t.metodo && <small>{t.metodo}</small>}</td><td>{t.frecuencia}</td><td><input type="date" value={c.fecha || new Date().toISOString().slice(0, 10)} onChange={(e) => setControlesPlan({ ...controlesPlan, [t.id]: { ...c, fecha: e.target.value } })}/></td><td><input placeholder="Nombre" value={c.responsable || ""} onChange={(e) => setControlesPlan({ ...controlesPlan, [t.id]: { ...c, responsable: e.target.value } })}/></td><td><button className="boton-tabla-control" onClick={() => registrarPlan(t)}>Registrar</button></td></tr>; })}</tbody></table></div>
      {mensaje && <p className="mensaje-control">{mensaje}</p>}
      <hr className="separador-control" />
      <h2>Añadir otra tarea</h2>
      <form className="control-form" onSubmit={guardar}>
        <div className="control-grid">
          <Campo
            n="Zona"
            v={form.zona}
            c={(v) => setForm({ ...form, zona: v })}
          />
          <Campo
            n="Tarea"
            v={form.tarea}
            c={(v) => setForm({ ...form, tarea: v })}
          />
          <Campo
            n="Responsable"
            v={form.responsable}
            c={(v) => setForm({ ...form, responsable: v })}
          />
          <label>
            Frecuencia
            <select
              value={form.frecuencia}
              onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}
            >
              <option>Diaria</option>
              <option>Semanal</option>
              <option>Mensual</option>
              <option>Cuando proceda</option>
            </select>
          </label>
          <label>
            Fecha
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </label>
        </div>
        <button className="boton-control">Añadir tarea</button>
      </form>
      <Tabla
        cab={["Fecha", "Zona", "Tarea", "Responsable", "Frecuencia", "Estado"]}
        datos={datos}
        fila={(r) => (
          <tr key={r.id}>
            <td>{r.fecha}</td>
            <td>{r.zona}</td>
            <td>{r.tarea}</td>
            <td>{r.responsable}</td>
            <td>{r.frecuencia}</td>
            <td>
              <select
                value={r.estado}
                onChange={(e) => cambiar(r.id, e.target.value)}
              >
                <option>Pendiente</option>
                <option>Completada</option>
                <option>No conforme</option>
              </select>
            </td>
          </tr>
        )}
      />
      <hr className="separador-control" />
      <h2>Productos y fichas técnicas</h2>
      <form className="control-form" onSubmit={guardarProducto}>
        <label className="subida-pdf">
          <input type="file" accept="application/pdf,.pdf" onChange={seleccionarFicha} />
          <strong>{pdf ? pdf.name : "Subir ficha técnica para completar los datos"}</strong>
          <span>{leyendoFicha ? "Leyendo el PDF…" : "Nombre, fabricante, uso, dilución, manipulación y revisión se completarán automáticamente."}</span>
        </label>
        <div className="control-grid">
          <Campo
            n="Nombre del producto"
            v={producto.nombre}
            c={(v) => setProducto({ ...producto, nombre: v })}
          />
          <label>
            Marca
            <input
              value={producto.marca}
              onChange={(e) =>
                setProducto({ ...producto, marca: e.target.value })
              }
            />
          </label>
          <label>
            Proveedor
            <input
              value={producto.proveedor}
              onChange={(e) =>
                setProducto({ ...producto, proveedor: e.target.value })
              }
            />
          </label>
          <Campo
            n="Uso / superficie"
            v={producto.uso}
            c={(v) => setProducto({ ...producto, uso: v })}
          />
          <label>
            Dilución
            <input
              value={producto.dilucion}
              onChange={(e) =>
                setProducto({ ...producto, dilucion: e.target.value })
              }
              placeholder="Ej. 20 ml por litro"
            />
          </label>
          <label>
            Riesgos / peligros
            <input
              value={producto.peligros}
              onChange={(e) =>
                setProducto({ ...producto, peligros: e.target.value })
              }
            />
          </label>
          <label>
            Fecha de revisión
            <input
              type="date"
              value={producto.fecha_revision}
              onChange={(e) =>
                setProducto({ ...producto, fecha_revision: e.target.value })
              }
            />
          </label>
        </div>
        <button className="boton-control">Guardar producto y ficha</button>
      </form>
      {mensajeProducto && <p className="mensaje-control">{mensajeProducto}</p>}
      <Tabla
        cab={[
          "Producto",
          "Marca / proveedor",
          "Uso",
          "Dilución",
          "Peligros",
          "Revisión",
          "Ficha",
        ]}
        datos={productos}
        fila={(r) => (
          <tr key={r.id}>
            <td>
              <strong>{r.nombre}</strong>
            </td>
            <td>
              {r.marca}
              <small>{r.proveedor}</small>
            </td>
            <td>{r.uso}</td>
            <td>{r.dilucion || "—"}</td>
            <td>{r.peligros || "—"}</td>
            <td>{r.fecha_revision}</td>
            <td>
              {r.archivo_ruta ? (
                <button onClick={() => abrirFicha(r)}>Ver PDF</button>
              ) : (
                "Sin PDF"
              )}
              <button className="peligro" onClick={() => eliminarProducto(r)}>
                Eliminar
              </button>
            </td>
          </tr>
        )}
      />
    </Pagina>
  );
}
function Campo({ n, v, c }) {
  return (
    <label>
      {n} *<input required value={v} onChange={(e) => c(e.target.value)} />
    </label>
  );
}
function Tabla({ cab, datos, fila }) {
  return (
    <div className="tabla-control-wrap">
      <table className="tabla-control">
        <thead>
          <tr>
            {cab.map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.map(fila)}
          {!datos.length && (
            <tr>
              <td colSpan={cab.length} className="tabla-vacia">
                Todavía no hay registros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function Pagina({ icono, titulo, texto, children }) {
  return (
    <div className="pagina-control-higiene">
      <header className="control-cabecera">
        <div>
          <span>{icono} AUTOCONTROL</span>
          <h1>{titulo}</h1>
          <p>{texto}</p>
        </div>
      </header>
      <section className="control-panel">{children}</section>
    </div>
  );
}
export { Pagina, Tabla, Campo };
