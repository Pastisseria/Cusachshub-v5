import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";

function Dashboard() {
  const [datos, setDatos] = useState({ presupuestos: 0, facturasPendientes: 0, cobradoMes: 0, facturadoMes: 0 });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const hoy = new Date();
      const inicioMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;

      const [presupuestos, facturas] = await Promise.all([
        supabase.from("presupuestos").select("id, estado"),
        supabase.from("facturas").select("total, estado, fecha_factura").gte("fecha_factura", inicioMes),
      ]);

      const listaPresupuestos = presupuestos.data ?? [];
      const listaFacturas = facturas.data ?? [];

      setDatos({
        presupuestos: listaPresupuestos.filter((item) => !["Facturado", "Cancelado", "Facturado externamente"].includes(item.estado)).length,
        facturasPendientes: listaFacturas.filter((item) => item.estado === "pendiente").length,
        cobradoMes: listaFacturas.filter((item) => item.estado === "pagada").reduce((suma, item) => suma + Number(item.total || 0), 0),
        facturadoMes: listaFacturas.reduce((suma, item) => suma + Number(item.total || 0), 0),
      });
      setCargando(false);
    }

    cargar();
  }, []);

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div><p className="etiqueta">CUSACHS HUB</p><h2>Dashboard de dirección</h2></div>
      </div>
      {cargando ? <p className="mensaje">Cargando resumen...</p> : (
        <div className="dashboard-grid">
          <article><span>Presupuestos pendientes</span><strong>{datos.presupuestos}</strong></article>
          <article><span>Facturas pendientes</span><strong>{datos.facturasPendientes}</strong></article>
          <article><span>Facturado este mes</span><strong>{euros(datos.facturadoMes)}</strong></article>
          <article><span>Cobrado este mes</span><strong>{euros(datos.cobradoMes)}</strong></article>
        </div>
      )}
    </section>
  );
}

function euros(valor) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(valor || 0));
}

export default Dashboard;
