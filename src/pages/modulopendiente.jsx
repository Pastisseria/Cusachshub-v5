function ModuloPendiente({ titulo, icono = "📁", descripcion }) {
  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Módulo</p>
          <h2>
            {icono} {titulo}
          </h2>
        </div>

        <span className="contador">En preparación</span>
      </div>

      <div
        style={{
          marginTop: "24px",
          padding: "28px",
          border: "1px solid #3e3944",
          borderRadius: "16px",
          background: "#151319",
        }}
      >
        <h3>{titulo}</h3>

        <p style={{ lineHeight: 1.7, opacity: 0.85 }}>
          {descripcion ||
            "Este apartado ya está preparado en el menú. Lo iremos activando sin tener que volver a modificar la navegación."}
        </p>
      </div>
    </section>
  );
}

export default ModuloPendiente;