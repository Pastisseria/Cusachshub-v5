import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase.js";
import "../styles/camareros.css";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const iso = (fecha) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
const hora = (valor) => valor ? String(valor).slice(0, 5) : "";

function inicioSemana(fecha) {
  const copia = new Date(fecha);
  const dia = copia.getDay();
  copia.setDate(copia.getDate() + (dia === 0 ? -6 : 1 - dia));
  return copia;
}

function diasMes(fecha) {
  const primero = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const inicio = inicioSemana(primero);
  return Array.from({ length: 42 }, (_, indice) => {
    const dia = new Date(inicio); dia.setDate(inicio.getDate() + indice); return dia;
  });
}

function estadoPersonal(catering) {
  if (catering.camareros_necesarios === null || catering.camareros_necesarios === undefined || catering.camareros_necesarios === "") return "sin-definir";
  const necesarios = Number(catering.camareros_necesarios);
  const confirmados = Number(catering.camareros_confirmados || 0);
  if (necesarios === 0) return "completo";
  if (confirmados >= necesarios) return "completo";
  return "pendiente";
}

export default function Camareros() {
  const navigate = useNavigate();
  const hoy = new Date();
  const [fechaVisible, setFechaVisible] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [fechaSemana, setFechaSemana] = useState(inicioSemana(hoy));
  const [vista, setVista] = useState("mes");
  const [caterings, setCaterings] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    const [eventos, personas] = await Promise.all([
      supabase.from("caterings").select("id,cliente_id,presupuesto_id,titulo,fecha,hora_inicio,hora_fin,direccion,numero_personas,estado,camareros_necesarios,camareros_confirmados,camareros_asignados,hora_camareros_inicio,hora_camareros_fin,notas_camareros").order("fecha").order("hora_inicio"),
      supabase.from("clientes").select("id,nombre,empresa"),
    ]);
    const error = eventos.error || personas.error;
    if (error) setMensaje(`No se pudo cargar el calendario: ${error.message}`);
    else { setCaterings((eventos.data || []).filter((item) => String(item.estado || "").toLowerCase() !== "cancelado")); setClientes(personas.data || []); }
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  const nombreCliente = (evento) => { const cliente = clientes.find((item) => item.id === evento.cliente_id); return cliente?.empresa || cliente?.nombre || evento.titulo || "Catering"; };
  const abrir = (evento) => { setEditando(evento); setForm({ camareros_necesarios: evento.camareros_necesarios ?? "", camareros_confirmados: evento.camareros_confirmados ?? "", camareros_asignados: evento.camareros_asignados || "", hora_camareros_inicio: hora(evento.hora_camareros_inicio) || hora(evento.hora_inicio), hora_camareros_fin: hora(evento.hora_camareros_fin) || hora(evento.hora_fin), notas_camareros: evento.notas_camareros || "" }); };
  async function guardar(e) {
    e.preventDefault(); setGuardando(true);
    const necesarios = form.camareros_necesarios === "" ? null : Math.max(0, Number(form.camareros_necesarios));
    const confirmados = form.camareros_confirmados === "" ? 0 : Math.max(0, Number(form.camareros_confirmados));
    const { error } = await supabase.from("caterings").update({ camareros_necesarios: necesarios, camareros_confirmados: confirmados, camareros_asignados: form.camareros_asignados.trim() || null, hora_camareros_inicio: form.hora_camareros_inicio || null, hora_camareros_fin: form.hora_camareros_fin || null, notas_camareros: form.notas_camareros.trim() || null, updated_at: new Date().toISOString() }).eq("id", editando.id);
    setGuardando(false);
    if (error) return setMensaje(`No se pudo guardar: ${error.message}`);
    setEditando(null); setMensaje("Servicio de camareros guardado."); await cargar();
  }

  const eventosMes = useMemo(() => caterings.filter((evento) => { const fecha = new Date(`${evento.fecha}T12:00:00`); return fecha.getFullYear() === fechaVisible.getFullYear() && fecha.getMonth() === fechaVisible.getMonth(); }), [caterings, fechaVisible]);
  const pendientes = eventosMes.filter((evento) => estadoPersonal(evento) !== "completo").length;
  const totalCamareros = eventosMes.reduce((suma, evento) => suma + Number(evento.camareros_necesarios || 0), 0);
  const renderEvento = (evento, amplio = false) => { const definido = evento.camareros_necesarios !== null && evento.camareros_necesarios !== undefined; return <button type="button" key={evento.id} className={`camareros-evento ${estadoPersonal(evento)}`} onClick={() => abrir(evento)} title={`${nombreCliente(evento)} · ${definido ? evento.camareros_necesarios : "Sin definir"} camareros`}><strong>{hora(evento.hora_inicio)} {nombreCliente(evento)}</strong><span>{definido ? `👥 ${evento.camareros_confirmados || 0}/${evento.camareros_necesarios}` : "⚠️ Indicar camareros"}</span>{amplio && <small>{evento.numero_personas || 0} comensales · {evento.direccion || "Sin dirección"}</small>}</button>; };
  const semana = Array.from({ length: 7 }, (_, indice) => { const dia = new Date(fechaSemana); dia.setDate(fechaSemana.getDate() + indice); return dia; });

  return <main className="camareros-page">
    <header className="camareros-cabecera"><div><span>PERSONAL DE SERVICIO</span><h1>Calendario de camareros</h1><p>Planificación vinculada automáticamente con los caterings.</p></div><div className="camareros-resumen"><b>{totalCamareros}<small>camareros solicitados</small></b><b className={pendientes ? "alerta" : ""}>{pendientes}<small>por completar</small></b></div></header>
    <div className="camareros-barra"><div className="camareros-vistas"><button className={vista === "mes" ? "activo" : ""} onClick={() => setVista("mes")}>Mes</button><button className={vista === "semana" ? "activo" : ""} onClick={() => { setVista("semana"); setFechaSemana(inicioSemana(fechaVisible)); }}>Semana</button></div><div className="camareros-navegacion"><button onClick={() => vista === "mes" ? setFechaVisible(new Date(fechaVisible.getFullYear(), fechaVisible.getMonth() - 1, 1)) : setFechaSemana(new Date(fechaSemana.getFullYear(), fechaSemana.getMonth(), fechaSemana.getDate() - 7))}>←</button><h2>{vista === "mes" ? `${MESES[fechaVisible.getMonth()]} ${fechaVisible.getFullYear()}` : `${semana[0].toLocaleDateString("es-ES")} – ${semana[6].toLocaleDateString("es-ES")}`}</h2><button onClick={() => vista === "mes" ? setFechaVisible(new Date(fechaVisible.getFullYear(), fechaVisible.getMonth() + 1, 1)) : setFechaSemana(new Date(fechaSemana.getFullYear(), fechaSemana.getMonth(), fechaSemana.getDate() + 7))}>→</button></div></div>
    {mensaje && <p className="camareros-mensaje">{mensaje}</p>}
    {cargando ? <p>Cargando calendario…</p> : vista === "mes" ? <section className="camareros-calendario"><div className="camareros-dias">{DIAS.map((dia) => <b key={dia}>{dia}</b>)}</div><div className="camareros-mes">{diasMes(fechaVisible).map((dia) => { const fecha = iso(dia); const eventos = caterings.filter((evento) => evento.fecha === fecha); const total = eventos.reduce((suma, evento) => suma + Number(evento.camareros_necesarios || 0), 0); return <div key={fecha} className={`camareros-dia ${dia.getMonth() !== fechaVisible.getMonth() ? "otro" : ""}`}><span className="camareros-numero">{dia.getDate()}</span>{total > 0 && <span className="camareros-total">👥 {total}</span>}<div>{eventos.slice(0, 3).map((evento) => renderEvento(evento))}{eventos.length > 3 && <small>+ {eventos.length - 3} caterings</small>}</div></div>; })}</div></section> : <section className="camareros-semana">{semana.map((dia) => { const eventos = caterings.filter((evento) => evento.fecha === iso(dia)); const total = eventos.reduce((suma, evento) => suma + Number(evento.camareros_necesarios || 0), 0); return <article key={iso(dia)}><header><b>{DIAS[(dia.getDay() + 6) % 7]}</b><span>{dia.getDate()}/{dia.getMonth() + 1}</span><strong>👥 {total}</strong></header>{eventos.length ? eventos.map((evento) => renderEvento(evento, true)) : <p>Sin caterings</p>}</article>; })}</section>}
    {editando && <div className="camareros-fondo" onMouseDown={() => setEditando(null)}><form className="camareros-modal" onSubmit={guardar} onMouseDown={(e) => e.stopPropagation()}><div className="camareros-modal-cabecera"><div><span>{editando.fecha} · {hora(editando.hora_inicio)}</span><h2>{nombreCliente(editando)}</h2><p>{editando.numero_personas || 0} comensales</p></div><button type="button" onClick={() => setEditando(null)}>×</button></div><div className="camareros-form-grid"><label>Camareros necesarios<input type="number" min="0" value={form.camareros_necesarios} onChange={(e) => setForm({ ...form, camareros_necesarios: e.target.value })} /></label><label>Camareros confirmados<input type="number" min="0" value={form.camareros_confirmados} onChange={(e) => setForm({ ...form, camareros_confirmados: e.target.value })} /></label><label>Hora de entrada<input type="time" value={form.hora_camareros_inicio} onChange={(e) => setForm({ ...form, hora_camareros_inicio: e.target.value })} /></label><label>Hora de salida<input type="time" value={form.hora_camareros_fin} onChange={(e) => setForm({ ...form, hora_camareros_fin: e.target.value })} /></label></div><label>Nombres de los camareros<textarea rows="3" value={form.camareros_asignados} onChange={(e) => setForm({ ...form, camareros_asignados: e.target.value })} placeholder="Ana, Carlos, Marta…" /></label><label>Notas del servicio<textarea rows="3" value={form.notas_camareros} onChange={(e) => setForm({ ...form, notas_camareros: e.target.value })} /></label><div className="camareros-modal-acciones">{editando.presupuesto_id && <button type="button" className="secundario" onClick={() => navigate(`/presupuestos?presupuesto_id=${editando.presupuesto_id}&editar=1`)}>Abrir presupuesto</button>}<button disabled={guardando}>{guardando ? "Guardando…" : "Guardar planificación"}</button></div></form></div>}
  </main>;
}
