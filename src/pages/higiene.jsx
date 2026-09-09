import { useNavigate } from "react-router-dom";

const modulosHigiene = [
  [
    "🌡️",
    "Temperaturas",
    "Registro de cámaras, congeladores y elaboraciones mediante PDF.",
    "/higiene/temperaturas",
  ],
  [
    "🧹",
    "Limpieza y desinfección",
    "Plan de tareas, responsables y comprobaciones.",
    "/higiene/limpieza",
  ],
  ["📦", "Trazabilidad", "Control de lotes, materias primas y destino.", "/higiene/trazabilidad"],
  ["⚠️", "Incidencias", "Desviaciones detectadas y medidas correctoras.", "/higiene/incidencias"],
  ["🛢️", "Aceite usado", "Recogidas, cantidades y justificantes PDF del gestor.", "/higiene/aceite"],
  ["💧", "Facturas de agua", "Facturas, periodos, consumo e importes.", "/higiene/agua"],
  ["🧂", "Ingredientes", "Materias primas, alérgenos, costes y proveedores.", "/higiene/ingredientes"],
  ["📊", "Escandallos", "Costes de elaboración, márgenes y precios de venta.", "/higiene/escandallos"],
  ["📖", "Recetas", "Fichas de elaboración vinculadas con ingredientes y escandallos.", "/higiene/recetas"],
];

export default function Higiene() {
  const navigate = useNavigate();

  return (
    <div className="pagina-higiene">
      <header className="cabecera-higiene">
        <div>
          <p className="etiqueta-acceso">ESPACIO PRIVADO · ADMINISTRADOR</p>
          <h1>Bones pràctiques d’higiene</h1>
          <p>El espacio de autocontrol de Pastisseria Cusachs.</p>
        </div>
        <span className="sello-higiene">🧼</span>
      </header>

      <section className="aviso-construccion">
        <strong>Recepció i traçabilitat</strong>
        <p>
          Pots introduir els albarans manualment i crear un catàleg de productes
          diferent per a cada proveïdor.
        </p>
      </section>

      <div className="rejilla-higiene">
        <article
          className="tarjeta-higiene"
          role="button"
          tabIndex="0"
          onClick={() => navigate("/higiene/albaran-manual")}
          onKeyDown={(e) =>
            e.key === "Enter" && navigate("/higiene/albaran-manual")
          }
          style={{ cursor: "pointer" }}
        >
          <span>📝</span>
          <h2>Introduir albarà manual</h2>
          <p>
            Escull el proveïdor, busca els seus productes guardats o crea'n de
            nous i guarda l'albarà.
          </p>
          <small style={{ fontWeight: 800 }}>OBRIR →</small>
        </article>

        <article
          className="tarjeta-higiene"
          role="button"
          tabIndex="0"
          onClick={() => navigate("/higiene/albaranes")}
          onKeyDown={(e) => e.key === "Enter" && navigate("/higiene/albaranes")}
          style={{ cursor: "pointer" }}
        >
          <span>📚</span>
          <h2>Històric d’albarans</h2>
          <p>
            Consulta els albarans que ja tens guardats, tant manuals com llegits
            automàticament.
          </p>
          <small style={{ fontWeight: 800 }}>OBRIR →</small>
        </article>

        <article
          className="tarjeta-higiene"
          role="button"
          tabIndex="0"
          onClick={() => navigate("/higiene/catalogo-proveedores")}
          onKeyDown={(e) =>
            e.key === "Enter" && navigate("/higiene/catalogo-proveedores")
          }
          style={{ cursor: "pointer" }}
        >
          <span>🗂️</span>
          <h2>Productes per proveïdor</h2>
          <p>
            Consulta i edita el catàleg de productes que has anat guardant per a
            cada proveïdor.
          </p>
          <small style={{ fontWeight: 800 }}>OBRIR →</small>
        </article>

        {modulosHigiene.map(([icono, titulo, descripcion, ruta]) => (
          <article key={titulo} className="tarjeta-higiene" role="button" tabIndex="0" onClick={() => navigate(ruta)} onKeyDown={(e) => e.key === "Enter" && navigate(ruta)} style={{ cursor: "pointer" }}>
            <span>{icono}</span>
            <h2>{titulo}</h2>
            <p>{descripcion}</p>
            <small style={{ fontWeight: 800 }}>OBRIR →</small>
          </article>
        ))}
      </div>
    </div>
  );
}
