import { calcularTotalesImportacion } from "../services/presupuestoExtractor.js";

const ESTADOS = [
  "Borrador",
  "Enviado",
  "Aceptado",
  "En producción",
  "Preparado",
  "Entregado",
  "Pendiente de facturación",
  "Cancelado",
];

const TIPOS = ["Catering", "Visitador médico", "Empresa", "Tienda", "Particular", "Otro"];

function ImportacionEmailCard({
  item,
  clientes,
  onChange,
  onLineChange,
  onAddLine,
  onRemoveLine,
  onCreateClient,
  onImport,
  onDiscard,
}) {
  const totales = calcularTotalesImportacion(item.lineas);
  const bloqueado = item.estado_importacion === "importando" || item.estado_importacion === "importado";

  return (
    <article className={`email-import-card ${item.estado_importacion || "pendiente"}`}>
      <div className="email-import-card__header">
        <div>
          <p className="etiqueta">{item.archivo}</p>
          <h3>{item.asunto || "Email sin asunto"}</h3>
          <p className="texto-secundario">De: {item.remitente || "No detectado"}</p>
        </div>
        <span className={`import-status import-status--${item.estado_importacion || "pendiente"}`}>
          {item.estado_importacion === "importado" ? "Importado" : item.estado_importacion === "duplicado" ? "Duplicado" : item.estado_importacion === "error" ? "Error" : "Pendiente"}
        </span>
      </div>

      {item.error && <p className="mensaje-error">{item.error}</p>}
      {item.avisos?.length > 0 && (
        <div className="import-warning">
          <strong>Revisar:</strong> {item.avisos.join(" ")}
        </div>
      )}

      <div className="import-grid">
        <label className="cliente-importador-selector">
          Cliente existente
          <select
            value={item.cliente_id || ""}
            onChange={(event) => onChange("cliente_id", event.target.value)}
            disabled={bloqueado || item.cliente_creando}
          >
            <option value="">Crear o buscar por los datos detectados</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}{cliente.empresa ? ` — ${cliente.empresa}` : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="boton-crear-cliente-importador"
            onClick={onCreateClient}
            disabled={
              bloqueado ||
              item.cliente_creando ||
              Boolean(item.cliente_id) ||
              !item.nombre_cliente?.trim()
            }
          >
            {item.cliente_id
              ? "✓ Cliente vinculado"
              : item.cliente_creando
                ? "Creando cliente..."
                : "👤 Crear cliente ahora"}
          </button>
        </label>

        <label>
          Nombre / contacto *
          <input value={item.nombre_cliente || ""} onChange={(event) => onChange("nombre_cliente", event.target.value)} disabled={bloqueado} />
        </label>

        <label>
          Empresa
          <input value={item.empresa || ""} onChange={(event) => onChange("empresa", event.target.value)} disabled={bloqueado} />
        </label>

        <label>
          CIF / NIF
          <input value={item.nif_cif || ""} onChange={(event) => onChange("nif_cif", event.target.value)} disabled={bloqueado} />
        </label>

        <label>
          Email
          <input type="email" value={item.email || ""} onChange={(event) => onChange("email", event.target.value)} disabled={bloqueado} />
        </label>

        <label>
          Teléfono
          <input value={item.telefono || ""} onChange={(event) => onChange("telefono", event.target.value)} disabled={bloqueado} />
        </label>

        <label>
          Fecha del documento
          <input type="date" value={item.fecha || ""} onChange={(event) => onChange("fecha", event.target.value)} disabled={bloqueado} />
        </label>

        <label>
          Hora de entrega
          <input type="time" value={item.hora_entrega || ""} onChange={(event) => onChange("hora_entrega", event.target.value)} disabled={bloqueado} />
        </label>

        <label>
          Tipo
          <select value={item.tipo_documento} onChange={(event) => onChange("tipo_documento", event.target.value)} disabled={bloqueado}>
            {TIPOS.map((tipo) => <option key={tipo}>{tipo}</option>)}
          </select>
        </label>

        <label>
          Estado
          <select value={item.estado} onChange={(event) => onChange("estado", event.target.value)} disabled={bloqueado}>
            {ESTADOS.map((estado) => <option key={estado}>{estado}</option>)}
          </select>
        </label>

        <label className="import-grid__wide">
          Dirección de entrega
          <input value={item.direccion || ""} onChange={(event) => onChange("direccion", event.target.value)} disabled={bloqueado} />
        </label>
      </div>

      <div className="import-lines-header">
        <h4>Conceptos detectados</h4>
        <button type="button" onClick={onAddLine} disabled={bloqueado}>+ Añadir línea</button>
      </div>

      <div className="import-lines">
        {item.lineas.map((linea, index) => (
          <div className="import-line" key={linea.temporalId || index}>
            <input aria-label="Descripción" value={linea.descripcion} onChange={(event) => onLineChange(index, "descripcion", event.target.value)} disabled={bloqueado} />
            <input aria-label="Cantidad" type="number" min="0" step="0.01" value={linea.cantidad} onChange={(event) => onLineChange(index, "cantidad", event.target.value)} disabled={bloqueado} />
            <input aria-label="Precio" type="number" min="0" step="0.01" value={linea.precio_unitario} onChange={(event) => onLineChange(index, "precio_unitario", event.target.value)} disabled={bloqueado} />
            <select aria-label="IVA" value={linea.iva} onChange={(event) => onLineChange(index, "iva", event.target.value)} disabled={bloqueado}>
              <option value="0">0 %</option><option value="4">4 %</option><option value="10">10 %</option><option value="21">21 %</option>
            </select>
            <button type="button" className="boton-eliminar-linea" onClick={() => onRemoveLine(index)} disabled={bloqueado}>×</button>
          </div>
        ))}
      </div>

      <label className="import-observations">
        Observaciones
        <textarea rows="3" value={item.observaciones || ""} onChange={(event) => onChange("observaciones", event.target.value)} disabled={bloqueado} />
      </label>

      <details className="email-original">
        <summary>Ver texto original del email</summary>
        <pre>{item.cuerpo_original}</pre>
      </details>

      <div className="import-card-footer">
        <div className="import-total">
          <span>Base: <strong>{totales.subtotal.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong></span>
          <span>IVA: <strong>{totales.ivaTotal.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong></span>
          <span>Total: <strong>{totales.total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong></span>
        </div>
        <div className="acciones">
          <button type="button" className="boton-cancelar" onClick={onDiscard} disabled={bloqueado}>Descartar</button>
          <button type="button" onClick={onImport} disabled={bloqueado || !item.nombre_cliente?.trim()}>
            {item.estado_importacion === "importando" ? "Importando..." : item.estado_importacion === "importado" ? "✓ Importado" : "📥 Importar presupuesto"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default ImportacionEmailCard;
