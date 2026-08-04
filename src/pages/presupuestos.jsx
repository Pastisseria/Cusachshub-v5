import { useNavigate } from "react-router-dom";
import DocumentoEditor from "../components/documentoeditor.jsx";

function Presupuestos() {
  const navigate = useNavigate();

  return (
    <>
      <div className="presupuestos-facturacion-barra">
        <div>
          <strong>Facturación</strong>

          <span>
            Cuando tengas terminado el presupuesto, abre
            Facturación para copiar sus datos y generar el
            documento imprimible.
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate("/facturacion")}
        >
          🧾 Abrir facturación
        </button>
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