import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase.js";
import { analizarEmail } from "../ai/parserEmails.js";

const CLAVE_BORRADOR_PRESUPUESTO = "cusachs:borrador-presupuesto:v2";

function fechaActual() {
  return new Date().toISOString().slice(0, 10);
}

function crearTemporalId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random()}`;
}

function normalizar(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function crearDescripcionSolicitud(texto = "") {
  const lineas = String(texto)
    .replace(/\r/g, "")
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean)
    .filter((linea) => !/^(asunto|de|para|cc|fecha|enviado|sent|from|to|subject)\s*:/i.test(linea))
    .filter((linea) => !/^(hola|buenos dias|buenas tardes|bon dia|bona tarda|gracias|saludos|salutacions|atentamente|muchas gracias)[,!. ]*$/i.test(linea))
    .filter((linea) => linea.length >= 5);

  const relevantes = lineas.filter((linea) =>
    /(catering|coffee|break|desayuno|esmorzar|almuerzo|dinar|comida|berenar|merienda|cocktail|c[oó]ctel|finger|aperitivo|personas|persones|pax|entrega|lliurament|necesitamos|necessitem|queremos|voldriem|solicitamos|pressupost|presupuesto|men[uú]|bandeja|surtido|pastas|bocadillos|entrepans|croissant|canap[eé]|ensalada|amanida|tortilla|croqueta|dulce|salado)/i.test(linea),
  );

  const elegidas = (relevantes.length ? relevantes : lineas).slice(0, 6);
  const descripcion = elegidas.join(" · ").replace(/\s+/g, " ").trim();
  return descripcion || "Solicitud de catering recibida por email";
}

function EmailPresupuesto() {
  const navigate = useNavigate();
  const [textoEmail, setTextoEmail] = useState("");
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [articulosFrecuentes, setArticulosFrecuentes] = useState([]);
  const [analisis, setAnalisis] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setError("");
    try {
      const [respuestaClientes, respuestaProductos, respuestaLineas] = await Promise.all([
        supabase.from("clientes").select("*").order("nombre", { ascending: true }),
        supabase.from("productos").select("*").order("nombre", { ascending: true }),
        supabase
          .from("presupuesto_lineas")
          .select("producto_id, descripcion, cantidad, precio_unitario")
          .limit(5000),
      ]);

      if (respuestaClientes.error) throw respuestaClientes.error;
      if (respuestaProductos.error) throw respuestaProductos.error;
      if (respuestaLineas.error) throw respuestaLineas.error;

      const listaProductos = (respuestaProductos.data || []).filter((producto) => producto.activo !== false);
      setClientes(respuestaClientes.data || []);
      setProductos(listaProductos);
      setArticulosFrecuentes(calcularArticulosFrecuentes(respuestaLineas.data || [], listaProductos));
    } catch (err) {
      setError(err.message || "No se han podido cargar clientes, productos e histórico.");
    } finally {
      setCargando(false);
    }
  }

  function calcularArticulosFrecuentes(lineasHistoricas, listaProductos) {
    const mapa = new Map();

    for (const linea of lineasHistoricas) {
      const producto = listaProductos.find((p) => String(p.id) === String(linea.producto_id));
      const descripcion = producto?.nombre || linea.descripcion || "";
      if (!descripcion.trim()) continue;

      const clave = linea.producto_id ? `p:${linea.producto_id}` : `d:${normalizar(descripcion)}`;
      const actual = mapa.get(clave) || {
        producto_id: linea.producto_id || producto?.id || "",
        nombre: descripcion,
        veces: 0,
        cantidad_total: 0,
        precio_unitario: Number(producto?.precio_venta ?? linea.precio_unitario ?? 0),
      };

      actual.veces += 1;
      actual.cantidad_total += Number(linea.cantidad || 0);
      if (!actual.precio_unitario) {
        actual.precio_unitario = Number(producto?.precio_venta ?? linea.precio_unitario ?? 0);
      }
      mapa.set(clave, actual);
    }

    return Array.from(mapa.values())
      .sort((a, b) => b.veces - a.veces || b.cantidad_total - a.cantidad_total)
      .slice(0, 30);
  }

  function generarPropuestaFrecuente(resultado) {
    const texto = normalizar(resultado.observaciones || textoEmail);
    const personas = Number(resultado.numero_personas || 0);

    const palabras = texto.split(" ").filter((p) => p.length >= 4);
    const puntuados = articulosFrecuentes.map((articulo, indice) => {
      const nombre = normalizar(articulo.nombre);
      let puntos = Math.max(0, 30 - indice);
      for (const palabra of palabras) {
        if (nombre.includes(palabra)) puntos += 20;
      }
      if (/dulce|postre|chocolate|fruta/.test(texto) && /dulce|postre|chocolate|fruta|coca/.test(nombre)) puntos += 15;
      if (/salado|aperitivo|finger|cocktail|coctel/.test(texto) && /croqueta|tortilla|jamon|queso|gyoza|coca|canape/.test(nombre)) puntos += 15;
      if (/bebida|agua|coca cola|refresco/.test(texto) && /agua|coca cola|refresco/.test(nombre)) puntos += 20;
      return { ...articulo, puntos };
    });

    const seleccion = puntuados.sort((a, b) => b.puntos - a.puntos).slice(0, personas >= 20 ? 10 : 8);

    return seleccion.map((articulo) => ({
      producto_id: articulo.producto_id || "",
      nombre: articulo.nombre,
      cantidad: 1,
      precio_unitario: Number(articulo.precio_unitario || 0),
      sugerido: true,
    }));
  }

  function analizarTexto() {
    if (!textoEmail.trim()) {
      setError("Pega primero el email que has recibido.");
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      const resultado = analizarEmail({ texto: textoEmail, clientes, productos });
      const descripcionSolicitud = crearDescripcionSolicitud(resultado.observaciones || textoEmail);
      const detectados = resultado.lineas || [];
      const sugeridos = detectados.length ? detectados : generarPropuestaFrecuente(resultado);

      setAnalisis({
        ...resultado,
        cliente_id: resultado.cliente_id || "",
        fecha_evento: resultado.fecha_evento || fechaActual(),
        hora_evento: resultado.hora_evento || "",
        numero_personas: resultado.numero_personas || "",
        telefono: resultado.telefono || "",
        descripcion_solicitud: descripcionSolicitud,
        lineas: sugeridos,
      });

      setMensaje(
        detectados.length
          ? `He encontrado ${detectados.length} producto(s) del catálogo.`
          : `He preparado una propuesta con ${sugeridos.length} de los artículos que más utilizáis en vuestros presupuestos.`,
      );
    } catch (err) {
      setError(err.message || "No se ha podido analizar el email.");
    } finally {
      setProcesando(false);
    }
  }

  function cambiarAnalisis(campo, valor) {
    setAnalisis((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function cambiarCantidad(indice, valor) {
    setAnalisis((anterior) => ({
      ...anterior,
      lineas: (anterior?.lineas || []).map((linea, i) => i === indice ? { ...linea, cantidad: valor } : linea),
    }));
  }

  function eliminarLinea(indice) {
    setAnalisis((anterior) => ({
      ...anterior,
      lineas: (anterior?.lineas || []).filter((_, i) => i !== indice),
    }));
  }

  function añadirFrecuente(articulo) {
    setAnalisis((anterior) => ({
      ...(anterior || {
        cliente_id: "",
        fecha_evento: fechaActual(),
        hora_evento: "",
        numero_personas: "",
        telefono: "",
        email: "",
        descripcion_solicitud: "",
        observaciones: textoEmail,
      }),
      lineas: [
        ...((anterior?.lineas) || []),
        {
          producto_id: articulo.producto_id || "",
          nombre: articulo.nombre,
          cantidad: 1,
          precio_unitario: Number(articulo.precio_unitario || 0),
          sugerido: true,
        },
      ],
    }));
  }

  const totalPropuesta = useMemo(() => {
    return (analisis?.lineas || []).reduce(
      (suma, linea) => suma + Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0),
      0,
    );
  }, [analisis?.lineas]);

  function prepararPresupuesto() {
    if (!analisis) {
      setError("Analiza primero el email.");
      return;
    }

    const lineas = (analisis.lineas || []).map((linea) => ({
      temporalId: crearTemporalId(),
      producto_id: linea.producto_id || "",
      descripcion: linea.nombre || analisis.descripcion_solicitud || "",
      cantidad: String(linea.cantidad || 1),
      precio_unitario: String(linea.precio_unitario ?? ""),
      iva: "10",
    }));

    if (lineas.length === 0) {
      lineas.push({
        temporalId: crearTemporalId(),
        producto_id: "",
        descripcion: analisis.descripcion_solicitud || crearDescripcionSolicitud(analisis.observaciones || textoEmail),
        cantidad: String(analisis.numero_personas || 1),
        precio_unitario: "",
        iva: "10",
      });
    }

    const cliente = clientes.find((item) => String(item.id) === String(analisis.cliente_id));
    const observaciones = [
      analisis.numero_personas ? `Personas: ${analisis.numero_personas}` : "",
      analisis.email ? `Email contacto: ${analisis.email}` : "",
      "",
      "EMAIL ORIGINAL:",
      analisis.observaciones || textoEmail,
    ].filter(Boolean).join("\n").trim();

    const borrador = {
      activo: true,
      documentoEditando: null,
      visitadorSeleccionadoId: "",
      tipoDocumento: "Catering",
      clienteId: analisis.cliente_id || "",
      fecha: analisis.fecha_evento || fechaActual(),
      validezHasta: "",
      estado: "Borrador",
      idioma: "es",
      horaEntrega: analisis.hora_evento || "",
      direccionEntrega: cliente?.direccion || "",
      personaContacto: cliente?.persona_contacto || cliente?.contacto || "",
      telefonoContacto: analisis.telefono || cliente?.telefono || "",
      visitadorNombre: "",
      laboratorio: "",
      centroMedico: "",
      observaciones,
      transporte: "",
      transporteIva: "10",
      lineas,
      actualizadoEn: new Date().toISOString(),
      origen: "email-catering",
    };

    window.localStorage.setItem(CLAVE_BORRADOR_PRESUPUESTO, JSON.stringify(borrador));
    navigate("/presupuestos");
  }

  const clienteSeleccionado = useMemo(
    () => clientes.find((cliente) => String(cliente.id) === String(analisis?.cliente_id)),
    [clientes, analisis?.cliente_id],
  );

  if (cargando) return <section className="panel"><p>Cargando asistente de presupuestos...</p></section>;

  return (
    <section className="panel email-presupuesto-panel">
      <div className="cabecera-seccion">
        <div>
          <p className="etiqueta">CATERING</p>
          <h1>📧 Email → Presupuesto</h1>
          <p className="texto-secundario">Pega el email y Cusachs Hub te propondrá artículos basándose también en los productos que más utilizáis en los presupuestos.</p>
        </div>
      </div>

      {error && <div className="mensaje-error">{error}</div>}
      {mensaje && <div className="mensaje-exito">{mensaje}</div>}

      <div className="formulario">
        <h3>1. Pega el email recibido</h3>
        <label>Email completo<textarea value={textoEmail} onChange={(e) => setTextoEmail(e.target.value)} placeholder="Pega aquí el correo del cliente..." style={{ minHeight: 240 }} /></label>
        <div className="grupo-botones" style={{ marginTop: 16 }}>
          <button type="button" onClick={analizarTexto} disabled={procesando}>{procesando ? "Analizando..." : "🧠 Analizar y proponer catering"}</button>
        </div>
      </div>

      <div className="formulario">
        <h3>⭐ Artículos más usados en presupuestos</h3>
        <p className="texto-secundario">Esta lista se calcula automáticamente con vuestro histórico. Pulsa un artículo para añadirlo a la propuesta.</p>
        <div className="grupo-botones" style={{ gap: 8, flexWrap: "wrap" }}>
          {articulosFrecuentes.slice(0, 15).map((articulo) => (
            <button key={`${articulo.producto_id}-${articulo.nombre}`} type="button" className="boton-secundario" onClick={() => añadirFrecuente(articulo)}>
              + {articulo.nombre} · {articulo.veces} veces
            </button>
          ))}
        </div>
      </div>

      {analisis && (
        <div className="formulario">
          <h3>2. Revisa la propuesta</h3>
          <div className="rejilla-formulario">
            <label>Cliente<select value={analisis.cliente_id} onChange={(e) => cambiarAnalisis("cliente_id", e.target.value)}><option value="">— Seleccionar cliente —</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.empresa || c.nombre || "Cliente"}</option>)}</select></label>
            <label>Fecha<input type="date" value={analisis.fecha_evento || ""} onChange={(e) => cambiarAnalisis("fecha_evento", e.target.value)} /></label>
            <label>Hora<input type="time" value={analisis.hora_evento || ""} onChange={(e) => cambiarAnalisis("hora_evento", e.target.value)} /></label>
            <label>Nº personas<input type="number" min="0" value={analisis.numero_personas || ""} onChange={(e) => cambiarAnalisis("numero_personas", e.target.value)} /></label>
            <label className="campo-completo">Descripción<textarea value={analisis.descripcion_solicitud || ""} onChange={(e) => cambiarAnalisis("descripcion_solicitud", e.target.value)} style={{ minHeight: 100 }} /></label>
          </div>

          {clienteSeleccionado && <p className="texto-secundario">Cliente detectado: <strong>{clienteSeleccionado.empresa || clienteSeleccionado.nombre}</strong></p>}

          <div className="tabla-responsive">
            <table>
              <thead><tr><th>Artículo</th><th>Cantidad</th><th>Precio</th><th>Importe</th><th></th></tr></thead>
              <tbody>
                {(analisis.lineas || []).map((linea, indice) => (
                  <tr key={`${linea.producto_id}-${indice}`}>
                    <td><strong>{linea.nombre}</strong>{linea.sugerido && <small style={{ display: "block" }}>Sugerido por histórico</small>}</td>
                    <td><input type="number" min="0" step="0.01" value={linea.cantidad} onChange={(e) => cambiarCantidad(indice, e.target.value)} /></td>
                    <td>{Number(linea.precio_unitario || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</td>
                    <td>{(Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0)).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</td>
                    <td><button type="button" className="boton-peligro" onClick={() => eliminarLinea(indice)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, fontSize: 20, fontWeight: 700 }}>Base propuesta: {totalPropuesta.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
          <p className="texto-secundario">Los artículos sin precio o con precio 0 € deberán revisarse antes de enviar el presupuesto.</p>

          <div className="grupo-botones" style={{ marginTop: 24 }}>
            <button type="button" className="boton-exito" onClick={prepararPresupuesto}>📄 Pasar propuesta a Presupuesto</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default EmailPresupuesto;
