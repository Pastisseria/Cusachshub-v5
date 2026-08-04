import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const CATEGORIAS = ["Coffee Break", "Desayuno", "Finger Lunch", "Otras"];
const VACIO = {
  nombre: "",
  categoria: "Coffee Break",
  personas: 1,
  idioma: "es",
  observaciones: "",
  lineas: [],
  activo: true,
};

function numero(valor) {
  const resultado = Number(valor || 0);
  return Number.isFinite(resultado) ? resultado : 0;
}

function euros(valor) {
  return numero(valor).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function PresupuestosEstandar() {
  const [plantillas, setPlantillas] = useState([]);
  const [formulario, setFormulario] = useState(VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtro, setFiltro] = useState("Todas");
  const [error, setError] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const { data, error: errorCarga } = await supabase
      .from("presupuestos_estandar")
      .select("*")
      .order("created_at", { ascending: false });

    if (errorCarga) {
      setError(errorCarga.message);
      return;
    }

    setPlantillas(data || []);
  }

  const filtradas = useMemo(
    () =>
      filtro === "Todas"
        ? plantillas
        : plantillas.filter((p) => p.categoria === filtro),
    [plantillas, filtro],
  );

  async function guardar(evento) {
    evento.preventDefault();

    if (!formulario.nombre.trim()) {
      setError("Indica el nombre.");
      return;
    }

    const payload = {
      ...formulario,
      nombre: formulario.nombre.trim(),
      personas: Math.max(1, numero(formulario.personas)),
      updated_at: new Date().toISOString(),
    };

    const respuesta = editandoId
      ? await supabase.from("presupuestos_estandar").update(payload).eq("id", editandoId)
      : await supabase.from("presupuestos_estandar").insert(payload);

    if (respuesta.error) {
      setError(respuesta.error.message);
      return;
    }

    setMostrarFormulario(false);
    setFormulario(VACIO);
    setEditandoId(null);
    cargar();
  }

  function editar(plantilla) {
    setFormulario({
      nombre: plantilla.nombre || "",
      categoria: plantilla.categoria || "Coffee Break",
      personas: plantilla.personas || 1,
      idioma: plantilla.idioma || "es",
      observaciones: plantilla.observaciones || "",
      lineas: Array.isArray(plantilla.lineas) ? plantilla.lineas : [],
      activo: plantilla.activo !== false,
    });
    setEditandoId(plantilla.id);
    setMostrarFormulario(true);
  }

  async function eliminar(id) {
    if (!window.confirm("¿Eliminar esta plantilla?")) return;
    await supabase.from("presupuestos_estandar").delete().eq("id", id);
    cargar();
  }

  return (
    <section className="panel">
      <div className="cabecera-seccion">
        <div>
          <p className="etiqueta">COMERCIAL</p>
          <h1>⭐ Presupuestos estándar</h1>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormulario(VACIO);
            setEditandoId(null);
            setMostrarFormulario(true);
          }}
        >
          + Nuevo estándar
        </button>
      </div>

      {error && <div className="mensaje-error">{error}</div>}

      <div className="presupuestos-estandar-filtros">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="Todas">Todas</option>
          {CATEGORIAS.map((categoria) => (
            <option key={categoria} value={categoria}>{categoria}</option>
          ))}
        </select>
      </div>

      <div className="presupuestos-estandar-grid">
        {filtradas.map((plantilla) => (
          <article key={plantilla.id} className="presupuesto-estandar-card">
            <span>{plantilla.categoria}</span>
            <h3>{plantilla.nombre}</h3>
            <p>{plantilla.personas} personas</p>
            <strong>{euros(plantilla.total)}</strong>

            <div className="presupuesto-estandar-acciones">
              <button type="button" onClick={() => editar(plantilla)}>✏️ Editar</button>
              <button type="button" className="boton-peligro" onClick={() => eliminar(plantilla.id)}>🗑</button>
            </div>
          </article>
        ))}
      </div>

      {mostrarFormulario && (
        <div className="modal-fondo" onClick={() => setMostrarFormulario(false)}>
          <form className="modal-contenido" onSubmit={guardar} onClick={(e) => e.stopPropagation()}>
            <h2>{editandoId ? "Editar plantilla" : "Nueva plantilla"}</h2>

            <label>
              Nombre
              <input
                value={formulario.nombre}
                onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
              />
            </label>

            <label>
              Categoría
              <select
                value={formulario.categoria}
                onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}
              >
                {CATEGORIAS.map((categoria) => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </label>

            <label>
              Personas
              <input
                type="number"
                min="1"
                value={formulario.personas}
                onChange={(e) => setFormulario({ ...formulario, personas: e.target.value })}
              />
            </label>

            <label>
              Observaciones
              <textarea
                value={formulario.observaciones}
                onChange={(e) => setFormulario({ ...formulario, observaciones: e.target.value })}
              />
            </label>

            <div className="modal-acciones">
              <button type="button" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default PresupuestosEstandar;
