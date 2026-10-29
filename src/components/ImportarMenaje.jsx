import { useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const normalizar = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const numero = (s) => Number(String(s || "").replace(/\s/g, "").replace(",", "."));
function interpretar(texto) {
  return texto.split(/\r?\n/).map((linea) => {
    const campos = linea.split(/[;\t]/).map((x) => x.trim());
    if (campos.length < 2) return null;
    const [nombre, cantidad, precio] = campos;
    if (!nombre || !Number.isFinite(numero(cantidad)) || numero(cantidad) <= 0 || !Number.isInteger(numero(cantidad))) return null;
    return { nombre, cantidad: numero(cantidad), precio: precio && Number.isFinite(numero(precio)) ? numero(precio) : null };
  }).filter(Boolean);
}
export default function ImportarMenaje({ articulos, recargar }) {
  const [texto, setTexto] = useState("");
  const [filas, setFilas] = useState([]);
  const [selecciones, setSelecciones] = useState({});
  const [procesando, setProcesando] = useState(false);
  const [estado, setEstado] = useState("");
  const [documento, setDocumento] = useState("");
  const filasConDestino = useMemo(() => filas.map((fila, i) => {
    const sugerido = articulos.find((a) => normalizar(a.nombre) === normalizar(fila.nombre));
    return { ...fila, destino: selecciones[i] ?? (sugerido ? String(sugerido.id) : "nuevo") };
  }), [filas, selecciones, articulos]);
  async function guardar() {
    if (!documento.trim()) { setEstado("Indica proveedor y número de factura para identificar esta importación."); return; }
    if (!filasConDestino.length) return;
    if (!window.confirm("Comprueba las cantidades. Se sumarán al stock existente o se crearán artículos nuevos. ¿Continuar?")) return;
    setProcesando(true); setEstado("");
    let completadas = 0;
    try {
      // La tabla de control evita contabilizar dos veces una misma factura, incluso desde otro dispositivo.
      const clave = normalizar(documento);
      const { data: registro, error: errorRegistro } = await supabase.from("menaje_importaciones").insert({ clave, documento: documento.trim(), estado: "procesando" }).select("id").single();
      if (errorRegistro) throw new Error("No se ha podido registrar la factura (o ya está importada). Comprueba que se haya aplicado la migración menaje_importaciones.sql. " + errorRegistro.message);
      for (let i = 0; i < filasConDestino.length; i++) {
        const fila = filasConDestino[i];
        const { error } = await supabase.rpc("registrar_entrada_menaje", {
          p_importacion_id: registro.id,
          p_linea: i + 1,
          p_menaje_id: fila.destino === "nuevo" ? null : fila.destino,
          p_nombre: fila.nombre,
          p_cantidad: fila.cantidad,
          p_precio: fila.precio
        });
        if (error) throw error;
        completadas++;
      }
      await supabase.from("menaje_importaciones").update({ estado: "completado" }).eq("id", registro.id);
      setEstado("Importación completada: " + completadas + " líneas. Stock actualizado.");
      setFilas([]); setTexto(""); setDocumento(""); setSelecciones({});
      await recargar();
    } catch (e) {
      setEstado("Importación detenida tras " + completadas + " líneas: " + e.message + ". No vuelvas a importar la factura; revisa el registro antes de reintentar.");
      await recargar();
    } finally { setProcesando(false); }
  }
  return <div style={{padding:18,border:"1px solid #555",borderRadius:14,marginBottom:24}}>
    <h3>Entrada de artículos desde factura · revisión antes de guardar</h3>
    <p>Primera fase: copia las líneas de la factura como <strong>artículo; cantidad; precio unitario</strong> (una por línea). No se interpreta automáticamente el PDF o la fotografía todavía.</p>
    <label>Proveedor y número de factura (obligatorio, evita duplicados)
      <input style={{display:"block",width:"100%",margin:"8px 0",padding:10}} value={documento} onChange={e=>setDocumento(e.target.value)} placeholder="Proveedor · Factura 2026-123"/>
    </label>
    <textarea style={{width:"100%",minHeight:110,padding:10}} value={texto} onChange={e=>setTexto(e.target.value)} placeholder={"Copa de vino; 24; 1,50\nPlato llano; 12; 3,20"}/>
    <div style={{margin:"12px 0"}}><button type="button" onClick={()=>{setFilas(interpretar(texto));setSelecciones({});setEstado("");}}>Revisar líneas</button></div>
    {filasConDestino.length > 0 && <div style={{overflowX:"auto"}}><table style={{width:"100%"}}><thead><tr><th>Artículo</th><th>Unidades</th><th>Coste/u.</th><th>Vincular o crear</th></tr></thead><tbody>
      {filasConDestino.map((fila,i)=><tr key={i}><td>{fila.nombre}</td><td>{fila.cantidad}</td><td>{fila.precio ?? "Sin precio"}</td><td><select value={fila.destino} onChange={e=>setSelecciones(v=>({...v,[i]:e.target.value}))}><option value="nuevo">Crear nuevo</option>{articulos.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}</select></td></tr>)}
    </tbody></table><button type="button" disabled={procesando} onClick={guardar}>{procesando?"Guardando...":"Confirmar entrada de stock"}</button></div>}
    {estado && <p role="status">{estado}</p>}
  </div>;
}
