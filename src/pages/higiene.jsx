const proximosModulos = [
  ["🌡️", "Temperaturas", "Registro diario de cámaras, congeladores y elaboraciones."],
  ["🧹", "Limpieza y desinfección", "Plan de tareas, responsables y comprobaciones."],
  ["📦", "Recepción y trazabilidad", "Materias primas, lotes, caducidades y proveedores."],
  ["⚠️", "Incidencias", "Desviaciones detectadas y medidas correctoras."],
];

export default function Higiene() {
  return (
    <div className="pagina-higiene">
      <header className="cabecera-higiene">
        <div>
          <p className="etiqueta-acceso">ESPACIO PRIVADO · ADMINISTRADOR</p>
          <h1>Bones pràctiques d’higiene</h1>
          <p>El nuevo espacio de autocontrol de Pastisseria Cusachs.</p>
        </div>
        <span className="sello-higiene">🧼</span>
      </header>

      <section className="aviso-construccion">
        <strong>Acceso preparado correctamente</strong>
        <p>Este apartado ya está reservado únicamente para el administrador. El siguiente paso será activar sus registros y controles.</p>
      </section>

      <div className="rejilla-higiene">
        {proximosModulos.map(([icono, titulo, descripcion]) => (
          <article key={titulo} className="tarjeta-higiene">
            <span>{icono}</span>
            <h2>{titulo}</h2>
            <p>{descripcion}</p>
            <small>Próximamente</small>
          </article>
        ))}
      </div>
    </div>
  );
}
