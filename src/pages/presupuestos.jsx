import DocumentoEditor from "../components/DocumentoEditor.jsx";

function Presupuestos() {
  return (
    <>
      <div className="presupuestos-facturacion-barra">
        <div>
          <strong>Presupuestos y facturación</strong>

          <span>
            Crea y guarda el presupuesto. Después ábrelo y pulsa
            “Generar factura” para enviarlo automáticamente al histórico
            de Facturación.
          </span>
        </div>
      </div>

      <DocumentoEditor
        titulo="Documentos comerciales"
        etiqueta="Presupuestos y pedidos"
        icono="📝"
      />
    </>
  );
}

export default Presupuestos;