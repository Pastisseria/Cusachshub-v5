export default function LocalBudgetView({ document, onEdit, onClose }) {
  const euros = number => new Intl.NumberFormat('es-ES', {style:'currency',currency:'EUR'}).format(Number(number)||0);
  return <section className="documento-vista-contenedor">
    <div className="no-imprimir" role="status">
      <strong>Guardado solo en este dispositivo</strong>
      <p>No se ha enviado a Supabase. No se sincroniza automáticamente ni modifica el presupuesto original.</p>
      <button type="button" onClick={onEdit}>Editar copia local</button>{' '}
      <button type="button" onClick={onClose}>Cerrar copia local</button>
    </div>
    <article className="documento-presupuesto-profesional">
      <h2>{document.numero} · Copia local</h2>
      <p>{document.tipo_documento} · {document.clientes?.empresa || document.clientes?.nombre || document.visitador_nombre}</p>
      <p>Fecha: {document.fecha} · Válido hasta: {document.validez_hasta || '—'}</p>
      <p>Estado local: {document.estado} · Idioma: {document.idioma}</p>
      <p>Hora: {document.hora_entrega || '—'} · Personas: {document.numero_personas ?? '—'}</p>
      <p>{document.direccion_entrega} · {document.persona_contacto} · {document.telefono_contacto}</p>
      <p>{document.laboratorio} · {document.centro_medico}</p>
      <div className="tabla-responsive"><table><thead><tr><th>Descripción</th><th>Cantidad</th><th>Precio</th><th>IVA %</th></tr></thead>
        <tbody>{document.lineas_locales.map((line,index)=><tr key={index}><td>{line.descripcion}</td><td>{line.cantidad}</td><td>{euros(line.precio_unitario)}</td><td>{line.iva}</td></tr>)}</tbody>
      </table></div>
      <p>{document.observaciones}</p>
      <p>Transporte: {euros(document.transporte)} · IVA transporte: {document.transporte_iva}%</p>
      <p>Base: {euros(document.subtotal)} · IVA: {euros(document.iva_total)} · <strong>Total: {euros(document.total)}</strong></p>
    </article>
  </section>;
}
