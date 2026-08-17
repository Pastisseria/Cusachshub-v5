import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";
import logoCusachs from "../assets/logo-cusachs.png";
import { escucharUnaOrden, navegadorAdmiteVoz } from "../ai/voz.js";
import { prepararPropuestaAsistente } from "../ai/asistente.js";

const TIPOS_DOCUMENTO = [
  "Catering",
  "Visitador médico",
  "Empresa",
  "Tienda",
  "Particular",
  "Otro",
];

const ESTADOS_DOCUMENTO = [
  { valor: "Borrador", etiqueta: "Pendiente" },
  { valor: "Aceptado", etiqueta: "Aceptado" },
  { valor: "Cancelado", etiqueta: "Anulado" },
];

const IDIOMAS_DOCUMENTO = [
  { valor: "es", etiqueta: "Castellano" },
  { valor: "ca", etiqueta: "Català" },
  { valor: "en", etiqueta: "English" },
];

const TEXTOS_DOCUMENTO = {
  es: {
    presupuesto: "Presupuesto",
    cliente: "CLIENTE",
    fecha: "Fecha:",
    validoHasta: "Válido hasta:",
    horaEntrega: "Hora de entrega:",
    direccion: "Dirección:",
    cantidad: "CANT.",
    descripcion: "DESCRIPCIÓN",
    observaciones: "OBSERVACIONES",
    resumen: "RESUMEN",
    baseImponible: "Base imponible",
    iva: "IVA",
    total: "TOTAL PRESUPUESTO",
    visitador: "Visitador médico",
    nombre: "Nombre:",
    laboratorio: "Laboratorio:",
    centroMedico: "Centro médico:",
    textoDefecto:
      "Gracias por confiar en Pastisseria Cusachs.\nQuedamos a su disposición para cualquier consulta.",
  },
  ca: {
    presupuesto: "Pressupost",
    cliente: "CLIENT",
    fecha: "Data:",
    validoHasta: "Vàlid fins a:",
    horaEntrega: "Hora de lliurament:",
    direccion: "Adreça:",
    cantidad: "QUANT.",
    descripcion: "DESCRIPCIÓ",
    observaciones: "OBSERVACIONS",
    resumen: "RESUM",
    baseImponible: "Base imposable",
    iva: "IVA",
    total: "TOTAL PRESSUPOST",
    visitador: "Visitador mèdic",
    nombre: "Nom:",
    laboratorio: "Laboratori:",
    centroMedico: "Centre mèdic:",
    textoDefecto:
      "Gràcies per confiar en Pastisseria Cusachs.\nRestem a la vostra disposició per a qualsevol consulta.",
  },
  en: {
    presupuesto: "Quotation",
    cliente: "CUSTOMER",
    fecha: "Date:",
    validoHasta: "Valid until:",
    horaEntrega: "Delivery time:",
    direccion: "Address:",
    cantidad: "QTY.",
    descripcion: "DESCRIPTION",
    observaciones: "NOTES",
    resumen: "SUMMARY",
    baseImponible: "Net amount",
    iva: "VAT",
    total: "TOTAL QUOTATION",
    visitador: "Medical representative",
    nombre: "Name:",
    laboratorio: "Laboratory:",
    centroMedico: "Medical centre:",
    textoDefecto:
      "Thank you for choosing Pastisseria Cusachs.\nPlease contact us if you have any questions.",
  },
};

const ESTILOS_ESTADOS_PRESUPUESTO = `
  .estado-presupuesto {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 88px;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .estado-presupuesto-borrador {
    background: #fff2c7;
    color: #8a5a00;
  }

  .estado-presupuesto-enviado {
    background: #e5f2ff;
    color: #245f9f;
  }

  .estado-presupuesto-aceptado {
    background: #dff5e7;
    color: #176b3a;
  }

  .estado-presupuesto-cancelado {
    background: #fde9ed;
    color: #a93045;
  }

  .boton-aceptar-presupuesto {
    background: #237a47;
  }

  .boton-enviar-presupuesto {
    background: #2769a8;
  }

  .boton-cancelar-presupuesto {
    background: #b7354d;
  }
`;

function nuevaLinea(prefijoDescripcion = "") {
  return {
    temporalId:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    producto_id: "",
    descripcion: prefijoDescripcion,
    cantidad: "1",
    precio_unitario: "",
    iva: "10",
  };
}

function DocumentoEditor({
  tipoDocumentoFijo = null,
  titulo = "Documentos comerciales",
  etiqueta = "Documentos",
  icono = "📝",
}) {
  const [clientes, setClientes] = useState([]);
  const [visitadoresMedicos, setVisitadoresMedicos] = useState([]);
  const [visitadorSeleccionadoId, setVisitadorSeleccionadoId] = useState("");
  const [productos, setProductos] = useState([]);
  const [documentos, setDocumentos] = useState([]);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [documentoAbierto, setDocumentoAbierto] = useState(null);
  const [documentoEditando, setDocumentoEditando] = useState(null);
  const [lineasAbiertas, setLineasAbiertas] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  const [tipoDocumento, setTipoDocumento] = useState(
    tipoDocumentoFijo || "Catering",
  );

  const [clienteId, setClienteId] = useState("");
  const [fecha, setFecha] = useState(fechaActual());
  const [validezHasta, setValidezHasta] = useState("");
  const [estado, setEstado] = useState("Borrador");
  const [idioma, setIdioma] = useState("es");

  const [horaEntrega, setHoraEntrega] = useState("");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [personaContacto, setPersonaContacto] = useState("");
  const [telefonoContacto, setTelefonoContacto] = useState("");

  const [visitadorNombre, setVisitadorNombre] = useState("");
  const [laboratorio, setLaboratorio] = useState("");
  const [centroMedico, setCentroMedico] = useState("");

  const [observaciones, setObservaciones] = useState("");
  const [transporte, setTransporte] = useState("");
  const [transporteIva, setTransporteIva] = useState("10");
  const [lineas, setLineas] = useState([nuevaLinea()]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [facturando, setFacturando] = useState(false);
  const [programandoCatering, setProgramandoCatering] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [asistenteVisible, setAsistenteVisible] = useState(false);
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const [textoAsistente, setTextoAsistente] = useState("");
  const [propuestaAsistente, setPropuestaAsistente] = useState(null);
  const [errorAsistente, setErrorAsistente] = useState("");
  const [analizandoAsistente, setAnalizandoAsistente] = useState(false);

  async function iniciarDictadoAsistente() {
    setErrorAsistente("");
    setPropuestaAsistente(null);

    try {
      const texto = await escucharUnaOrden({
        idioma: idioma === "ca" ? "ca-ES" : idioma === "en" ? "en-GB" : "es-ES",
        onInicio: () => setEscuchandoVoz(true),
        onFin: () => setEscuchandoVoz(false),
        onTextoParcial: (parcial) => setTextoAsistente(parcial),
      });

      setTextoAsistente(texto);
      await analizarOrdenAsistente(texto);
    } catch (err) {
      setErrorAsistente(err.message || "No s'ha pogut utilitzar el micròfon.");
      setEscuchandoVoz(false);
    }
  }

  async function analizarOrdenAsistente(texto = textoAsistente) {
    if (!texto.trim()) {
      setErrorAsistente("Escriu o dicta una ordre.");
      return;
    }

    setAnalizandoAsistente(true);
    setErrorAsistente("");

    try {
      const propuesta = await prepararPropuestaAsistente({
        texto,
        clientes,
        productos,
      });

      setPropuestaAsistente(propuesta);
    } catch (err) {
      setErrorAsistente(err.message || "No s'ha pogut interpretar l'ordre.");
    } finally {
      setAnalizandoAsistente(false);
    }
  }

  function aplicarPropuestaAlPresupuesto() {
    const datos = propuestaAsistente?.datos;

    if (!propuestaAsistente?.puedeAplicarseAlPresupuesto || !datos) {
      setErrorAsistente("Aquesta proposta no es pot aplicar al pressupost.");
      return;
    }

    abrirNuevoDocumento();

    if (datos.cliente?.id) setClienteId(String(datos.cliente.id));
    if (datos.fecha) setFecha(datos.fecha);
    if (datos.hora) setHoraEntrega(datos.hora);
    if (datos.idioma) setIdioma(datos.idioma);

    if (datos.lineas?.length) {
      setLineas(
        datos.lineas.map((linea) => ({
          temporalId:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
          producto_id: linea.producto_id || "",
          descripcion: linea.producto_nombre || "",
          cantidad: String(linea.cantidad || 1),
          precio_unitario: String(linea.precio_unitario ?? 0),
          iva: String(linea.iva ?? 10),
        })),
      );
    }

    const observacionesIA = [
      datos.personas ? `Persones: ${datos.personas}` : "",
      datos.observaciones ? `Ordre dictada: ${datos.observaciones}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (observacionesIA) setObservaciones(observacionesIA);

    setAsistenteVisible(false);
    setPropuestaAsistente(null);
    setMensaje(
      "Proposta aplicada al formulari. Revisa-la abans de desar el document.",
    );
  }

  function cancelarPropuestaAsistente() {
    setPropuestaAsistente(null);
    setErrorAsistente("");
  }

  async function cargarDatos() {
    setCargando(true);
    setError("");

    try {
      let consultaDocumentos = supabase
        .from("presupuestos")
        .select(`
          *,
          clientes (
            id,
            nombre,
            empresa,
            nif_cif,
            direccion,
            codigo_postal,
            poblacion,
            provincia,
            pais,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (tipoDocumentoFijo) {
        consultaDocumentos = consultaDocumentos.eq(
          "tipo_documento",
          tipoDocumentoFijo,
        );
      }

      const [
        respuestaClientes,
        respuestaVisitadores,
        respuestaProductos,
        respuestaDocumentos,
      ] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nombre, empresa")
          .eq("activo", true)
          .order("nombre"),
        supabase.from("visitadores_medicos").select("*"),
        supabase
          .from("productos")
          .select(
            "id, nombre, nombre_ca, nombre_en, referencia, precio_venta, iva, activo",
          )
          .eq("activo", true)
          .order("nombre"),
        consultaDocumentos,
      ]);

      if (respuestaClientes.error) throw respuestaClientes.error;
      if (respuestaVisitadores.error) throw respuestaVisitadores.error;
      if (respuestaProductos.error) throw respuestaProductos.error;
      if (respuestaDocumentos.error) throw respuestaDocumentos.error;

      setClientes(respuestaClientes.data ?? []);
      setVisitadoresMedicos(
        [...(respuestaVisitadores.data ?? [])].sort((a, b) =>
          obtenerNombreVisitador(a).localeCompare(
            obtenerNombreVisitador(b),
            "es",
            { sensitivity: "base" },
          ),
        ),
      );
      setProductos(respuestaProductos.data ?? []);
      setDocumentos(respuestaDocumentos.data ?? []);
    } catch (err) {
      setError(err.message || "No se han podido cargar los documentos.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [tipoDocumentoFijo]);

  const totales = useMemo(
    () => calcularTotales(lineas, transporte, transporteIva),
    [lineas, transporte, transporteIva],
  );

  const documentosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return documentos.filter((documento) => {
      const coincideBusqueda =
        !texto ||
        documento.numero?.toLowerCase().includes(texto) ||
        documento.clientes?.nombre?.toLowerCase().includes(texto) ||
        documento.clientes?.empresa?.toLowerCase().includes(texto) ||
        documento.visitador_nombre?.toLowerCase().includes(texto) ||
        documento.laboratorio?.toLowerCase().includes(texto) ||
        documento.centro_medico?.toLowerCase().includes(texto);

      const estadoDocumentoNormalizado =
        documento.estado === "Enviado"
          ? "Borrador"
          : documento.estado;

      const coincideEstado =
        !filtroEstado ||
        estadoDocumentoNormalizado === filtroEstado;

      const coincideTipo =
        tipoDocumentoFijo ||
        !filtroTipo ||
        documento.tipo_documento === filtroTipo;

      return coincideBusqueda && coincideEstado && coincideTipo;
    });
  }, [documentos, busqueda, filtroEstado, filtroTipo, tipoDocumentoFijo]);

  function abrirNuevoDocumento() {
    setDocumentoEditando(null);
    setTipoDocumento(tipoDocumentoFijo || "Catering");
    setClienteId("");
    setVisitadorSeleccionadoId("");
    setFecha(fechaActual());
    setValidezHasta("");
    setEstado("Borrador");
    setIdioma("es");
    setHoraEntrega("");
    setDireccionEntrega("");
    setPersonaContacto("");
    setTelefonoContacto("");
    setVisitadorNombre("");
    setLaboratorio("");
    setCentroMedico("");
    setObservaciones("");
    setTransporte("");
    setTransporteIva("10");
    setLineas([nuevaLinea()]);
    setDocumentoAbierto(null);
    setLineasAbiertas([]);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cambiarTipoDocumento(nuevoTipo) {
    setTipoDocumento(nuevoTipo);
    setClienteId("");
    setVisitadorSeleccionadoId("");
    setVisitadorNombre("");
    setLaboratorio("");
    setCentroMedico("");
  }

  function seleccionarVisitador(visitadorId) {
    setVisitadorSeleccionadoId(visitadorId);

    const visitador = visitadoresMedicos.find(
      (elemento) => String(elemento.id) === String(visitadorId),
    );

    if (!visitador) {
      setVisitadorNombre("");
      setLaboratorio("");
      setCentroMedico("");
      setClienteId("");
      return;
    }

    setVisitadorNombre(obtenerNombreVisitador(visitador));
    setLaboratorio(obtenerEmpresaVisitador(visitador));
    setCentroMedico(obtenerCentroVisitador(visitador));
    setClienteId(visitador.cliente_id ? String(visitador.cliente_id) : "");
  }

  function cancelarFormulario() {
    setMostrarFormulario(false);
    setDocumentoEditando(null);
    setError("");
  }

  function modificarLinea(temporalId, campo, valor) {
    setLineas((anteriores) =>
      anteriores.map((linea) =>
        linea.temporalId === temporalId ? { ...linea, [campo]: valor } : linea,
      ),
    );
  }

  function seleccionarProducto(temporalId, productoId) {
    const producto = productos.find((elemento) => elemento.id === productoId);

    setLineas((anteriores) =>
      anteriores.map((linea) => {
        if (linea.temporalId !== temporalId) return linea;

        if (!producto) {
          return { ...linea, producto_id: "" };
        }

        return {
          ...linea,
          producto_id: producto.id,
          descripcion: obtenerNombreProducto(producto, idioma),
          precio_unitario: String(producto.precio_venta ?? 0),
          iva: String(producto.iva ?? 10),
        };
      }),
    );
  }

  function añadirLinea(prefijoDescripcion = "") {
    setLineas((anteriores) => [...anteriores, nuevaLinea(prefijoDescripcion)]);
  }

  function eliminarLinea(temporalId) {
    setLineas((anteriores) => {
      if (anteriores.length === 1) return [nuevaLinea()];
      return anteriores.filter((linea) => linea.temporalId !== temporalId);
    });
  }

  async function guardarDocumento(event) {
    event.preventDefault();

    if (!tipoDocumento) {
      setError("Selecciona el tipo de documento.");
      return;
    }

    if (tipoDocumento === "Visitador médico") {
      if (!visitadorSeleccionadoId && !visitadorNombre.trim()) {
        setError("Selecciona un visitador médico.");
        return;
      }
    } else if (!clienteId) {
      setError("Selecciona un cliente.");
      return;
    }

    const lineasValidas = lineas.filter(
      (linea) =>
        linea.descripcion.trim() && convertirNumero(linea.cantidad) > 0,
    );

    if (lineasValidas.length === 0) {
      setError("Añade al menos una línea al documento.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const totalesCalculados = calcularTotales(
      lineasValidas,
      transporte,
      transporteIva,
    );

    const numero =
      documentoEditando?.numero || generarNumeroDocumento(tipoDocumento);

    const datosDocumento = {
      numero,
      cliente_id: clienteId || null,
      tipo_documento: tipoDocumento,
      fecha,
      validez_hasta: validezHasta || null,
      estado,
      idioma,
      hora_entrega: horaEntrega || null,
      direccion_entrega: direccionEntrega.trim() || null,
      persona_contacto: personaContacto.trim() || null,
      telefono_contacto: telefonoContacto.trim() || null,
      visitador_nombre:
        tipoDocumento === "Visitador médico"
          ? visitadorNombre.trim() || null
          : null,
      laboratorio:
        tipoDocumento === "Visitador médico"
          ? laboratorio.trim() || null
          : null,
      centro_medico:
        tipoDocumento === "Visitador médico"
          ? centroMedico.trim() || null
          : null,
      observaciones: observaciones.trim() || null,
      transporte: convertirNumero(transporte),
      transporte_iva: convertirNumero(transporteIva),
      subtotal: totalesCalculados.subtotal,
      iva_total: totalesCalculados.ivaTotal,
      total: totalesCalculados.total,
      updated_at: new Date().toISOString(),
    };

    if (!documentoEditando) {
      datosDocumento.facturado_externamente = false;
    }

    try {
      let documentoGuardado = null;

      if (documentoEditando) {
        const { data, error: errorDocumento } = await supabase
          .from("presupuestos")
          .update(datosDocumento)
          .eq("id", documentoEditando.id)
          .select("*")
          .single();

        if (errorDocumento) throw errorDocumento;
        documentoGuardado = data;

        const { error: errorBorradoLineas } = await supabase
          .from("presupuesto_lineas")
          .delete()
          .eq("presupuesto_id", documentoEditando.id);

        if (errorBorradoLineas) throw errorBorradoLineas;
      } else {
        const { data, error: errorDocumento } = await supabase
          .from("presupuestos")
          .insert(datosDocumento)
          .select("*")
          .single();

        if (errorDocumento) throw errorDocumento;
        documentoGuardado = data;
      }

      const datosLineas = lineasValidas.map((linea) => {
        const cantidad = convertirNumero(linea.cantidad);
        const precioUnitario = convertirNumero(linea.precio_unitario);
        const iva = convertirNumero(linea.iva);
        const subtotal = redondear(cantidad * precioUnitario);
        const importeIva = redondear(subtotal * (iva / 100));
        const total = redondear(subtotal + importeIva);

        return {
          presupuesto_id: documentoGuardado.id,
          producto_id: linea.producto_id || null,
          descripcion: linea.descripcion.trim(),
          cantidad,
          precio_unitario: precioUnitario,
          iva,
          subtotal,
          importe_iva: importeIva,
          total,
        };
      });

      const { error: errorLineas } = await supabase
        .from("presupuesto_lineas")
        .insert(datosLineas);

      if (errorLineas) {
        if (!documentoEditando) {
          await supabase
            .from("presupuestos")
            .delete()
            .eq("id", documentoGuardado.id);
        }
        throw errorLineas;
      }

      const totalesFinales = {
        transporte: convertirNumero(transporte),
        transporte_iva: convertirNumero(transporteIva),
        subtotal: totalesCalculados.subtotal,
        iva_total: totalesCalculados.ivaTotal,
        total: totalesCalculados.total,
        updated_at: new Date().toISOString(),
      };

      const {
        data: documentoFinal,
        error: errorTotalesFinales,
      } = await supabase
        .from("presupuestos")
        .update(totalesFinales)
        .eq("id", documentoGuardado.id)
        .select("*")
        .single();

      if (errorTotalesFinales) {
        throw errorTotalesFinales;
      }

      documentoGuardado = documentoFinal;

      setMensaje(
        documentoEditando
          ? `Documento ${numero} actualizado correctamente.`
          : `Documento ${numero} guardado correctamente.`,
      );

      setMostrarFormulario(false);
      setDocumentoEditando(null);
      setClienteId("");
      setVisitadorSeleccionadoId("");
      setLineas([nuevaLinea()]);
      setObservaciones("");
      setTransporte("");
      setTransporteIva("10");

      await cargarDatos();
    } catch (err) {
      setError(
        err.message ||
          (documentoEditando
            ? "No se ha podido actualizar el documento."
            : "No se ha podido guardar el documento."),
      );
    } finally {
      setGuardando(false);
    }
  }

  async function editarDocumento(documento) {
    setAbriendo(true);
    setError("");
    setMensaje("");

    try {
      const { data, error: supabaseError } = await supabase
        .from("presupuesto_lineas")
        .select(`
          *,
          productos (
            id,
            nombre,
            nombre_ca,
            nombre_en
          )
        `)
        .eq("presupuesto_id", documento.id)
        .order("created_at");

      if (supabaseError) throw supabaseError;

      setDocumentoEditando(documento);
      setDocumentoAbierto(null);
      setLineasAbiertas([]);
      setTipoDocumento(
        documento.tipo_documento || tipoDocumentoFijo || "Catering",
      );
      setClienteId(documento.cliente_id || "");
      setFecha(documento.fecha || fechaActual());
      setValidezHasta(documento.validez_hasta || "");
      setEstado(documento.estado || "Borrador");
      setIdioma(documento.idioma || "es");
      setHoraEntrega(documento.hora_entrega || "");
      setDireccionEntrega(documento.direccion_entrega || "");
      setPersonaContacto(documento.persona_contacto || "");
      setTelefonoContacto(documento.telefono_contacto || "");
      setVisitadorNombre(documento.visitador_nombre || "");

      const visitadorCoincidente = visitadoresMedicos.find(
        (visitador) =>
          obtenerNombreVisitador(visitador).trim().toLowerCase() ===
          String(documento.visitador_nombre || "").trim().toLowerCase(),
      );

      setVisitadorSeleccionadoId(
        visitadorCoincidente ? String(visitadorCoincidente.id) : "",
      );
      setLaboratorio(documento.laboratorio || "");
      setCentroMedico(documento.centro_medico || "");
      setObservaciones(documento.observaciones || "");
      setTransporte(
        documento.transporte !== null && documento.transporte !== undefined
          ? String(documento.transporte)
          : "",
      );
      setTransporteIva(
        documento.transporte_iva !== null &&
          documento.transporte_iva !== undefined
          ? String(documento.transporte_iva)
          : "10",
      );

      setLineas(
        (data ?? []).length
          ? (data ?? []).map((linea) => ({
              temporalId:
                typeof crypto !== "undefined" && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `${Date.now()}-${Math.random()}`,
              producto_id: linea.producto_id || "",
              descripcion: linea.descripcion || "",
              cantidad: String(linea.cantidad ?? 1),
              precio_unitario: String(linea.precio_unitario ?? ""),
              iva: String(linea.iva ?? 10),
            }))
          : [nuevaLinea()],
      );

      setMostrarFormulario(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err.message || "No se ha podido cargar el documento para editar.",
      );
    } finally {
      setAbriendo(false);
    }
  }

  async function duplicarDocumento(documento) {
    setAbriendo(true);
    setError("");
    setMensaje("");

    try {
      const { data, error: supabaseError } = await supabase
        .from("presupuesto_lineas")
        .select(`
          *,
          productos (
            id,
            nombre,
            nombre_ca,
            nombre_en
          )
        `)
        .eq("presupuesto_id", documento.id)
        .order("created_at");

      if (supabaseError) throw supabaseError;

      setDocumentoEditando(null);
      setDocumentoAbierto(null);
      setLineasAbiertas([]);

      setTipoDocumento(
        documento.tipo_documento || tipoDocumentoFijo || "Catering",
      );
      setClienteId(documento.cliente_id || "");
      setFecha(fechaActual());
      setValidezHasta("");
      setEstado("Borrador");
      setIdioma(documento.idioma || "es");
      setHoraEntrega(documento.hora_entrega || "");
      setDireccionEntrega(documento.direccion_entrega || "");
      setPersonaContacto(documento.persona_contacto || "");
      setTelefonoContacto(documento.telefono_contacto || "");
      setVisitadorNombre(documento.visitador_nombre || "");

      const visitadorCoincidente = visitadoresMedicos.find(
        (visitador) =>
          obtenerNombreVisitador(visitador).trim().toLowerCase() ===
          String(documento.visitador_nombre || "").trim().toLowerCase(),
      );

      setVisitadorSeleccionadoId(
        visitadorCoincidente ? String(visitadorCoincidente.id) : "",
      );
      setLaboratorio(documento.laboratorio || "");
      setCentroMedico(documento.centro_medico || "");
      setObservaciones(documento.observaciones || "");
      setTransporte(
        documento.transporte !== null && documento.transporte !== undefined
          ? String(documento.transporte)
          : "",
      );
      setTransporteIva(
        documento.transporte_iva !== null &&
          documento.transporte_iva !== undefined
          ? String(documento.transporte_iva)
          : "10",
      );

      setLineas(
        (data ?? []).length
          ? (data ?? []).map((linea) => ({
              temporalId:
                typeof crypto !== "undefined" && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `${Date.now()}-${Math.random()}`,
              producto_id: linea.producto_id || "",
              descripcion: linea.descripcion || "",
              cantidad: String(linea.cantidad ?? 1),
              precio_unitario: String(linea.precio_unitario ?? ""),
              iva: String(linea.iva ?? 10),
            }))
          : [nuevaLinea()],
      );

      setMostrarFormulario(true);
      setMensaje(
        `Copia de ${documento.numero} preparada. Se guardará como un presupuesto nuevo.`,
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "No se ha podido duplicar el presupuesto.");
    } finally {
      setAbriendo(false);
    }
  }

  async function abrirDocumento(documento) {
    setAbriendo(true);
    setError("");
    setMensaje("");

    try {
      const { data, error: supabaseError } = await supabase
        .from("presupuesto_lineas")
        .select(`
          *,
          productos (
            id,
            nombre,
            nombre_ca,
            nombre_en
          )
        `)
        .eq("presupuesto_id", documento.id)
        .order("created_at");

      if (supabaseError) throw supabaseError;

      setDocumentoAbierto(documento);
      setLineasAbiertas(data ?? []);
      setMostrarFormulario(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "No se ha podido abrir el documento.");
    } finally {
      setAbriendo(false);
    }
  }

  async function generarFactura(documento = documentoAbierto) {
    if (!documento) return;

    if (documento.factura_id) {
      setError("Este presupuesto ya está facturado.");
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas generar la factura del presupuesto ${documento.numero}?`,
    );

    if (!confirmar) return;

    setFacturando(true);
    setError("");
    setMensaje("");

    try {
      const { data: existente, error: errorExistente } = await supabase
        .from("facturas")
        .select("id, numero")
        .eq("origen", "presupuesto")
        .eq("origen_id", documento.id)
        .maybeSingle();

      if (errorExistente) throw errorExistente;
      if (existente) {
        throw new Error(
          `Este presupuesto ya tiene la factura ${existente.numero}.`,
        );
      }

      let lineasFactura = lineasAbiertas;

      if (!lineasFactura.length) {
        const { data, error } = await supabase
          .from("presupuesto_lineas")
          .select(`
            *,
            productos (
              id,
              nombre,
              nombre_ca,
              nombre_en
            )
          `)
          .eq("presupuesto_id", documento.id)
          .order("created_at");

        if (error) throw error;
        lineasFactura = data ?? [];
      }

      if (!lineasFactura.length) {
        throw new Error("El presupuesto no contiene líneas para facturar.");
      }

      const cliente = documento.clientes ?? {};
      const numeroFactura = generarNumeroFactura();

      const direccionCompleta = [
        cliente.direccion,
        [cliente.codigo_postal, cliente.poblacion].filter(Boolean).join(" "),
        cliente.provincia,
        cliente.pais,
      ]
        .filter(Boolean)
        .join(", ");

      const concepto = lineasFactura
        .map((linea) => `${linea.cantidad} × ${linea.descripcion}`)
        .join("\n");

      const tiposIva = [
        ...new Set(
          lineasFactura
            .map((linea) => Number(linea.iva))
            .filter((iva) => Number.isFinite(iva) && iva >= 0),
        ),
      ];

      const tipoIvaFactura =
        tiposIva.length === 1
          ? tiposIva[0]
          : Number(documento.tipo_iva || 10);

      const baseImponible = Number(documento.subtotal || 0);
      const importeIva = Number(documento.iva_total || 0);
      const totalFactura = Number(
        documento.total || baseImponible + importeIva,
      );

      const datosFactura = {
        numero: numeroFactura,
        origen: "presupuesto",
        origen_id: documento.id,
        presupuesto_id: documento.id,
        cliente_id: documento.cliente_id,
        nombre_cliente: cliente.empresa || cliente.nombre || "Cliente",
        cif: cliente.nif_cif || null,
        direccion: direccionCompleta || null,
        email: cliente.email || null,
        fecha_factura: fechaActual(),
        detalle_concepto: concepto,
        importe: baseImponible,
        iva_incluido: false,
        tipo_iva: tipoIvaFactura,
        base_imponible: baseImponible,
        importe_iva: importeIva,
        total: totalFactura,
        forma_pago: "transferencia",
        estado: "pendiente",
        fecha_pago: null,
        observaciones: documento.observaciones || null,
        updated_at: new Date().toISOString(),
      };

      const { data: factura, error: errorFactura } = await supabase
        .from("facturas")
        .insert(datosFactura)
        .select("*")
        .single();

      if (errorFactura) throw errorFactura;

      const filasFactura = lineasFactura.map((linea, indice) => ({
        factura_id: factura.id,
        orden: indice + 1,
        producto_id: linea.producto_id || null,
        descripcion: linea.descripcion,
        cantidad: Number(linea.cantidad || 0),
        precio_unitario: Number(linea.precio_unitario || 0),
        iva: Number(linea.iva || 0),
        subtotal: Number(linea.subtotal || 0),
        importe_iva: Number(linea.importe_iva || 0),
        total: Number(linea.total || 0),
      }));

      const { error: errorLineas } = await supabase
        .from("factura_lineas")
        .insert(filasFactura);

      if (errorLineas) {
        await supabase.from("facturas").delete().eq("id", factura.id);
        throw errorLineas;
      }

      const cambiosPresupuesto = {
        factura_id: factura.id,
        fecha_facturacion: fechaActual(),
        updated_at: new Date().toISOString(),
      };

      const { error: errorPresupuesto } = await supabase
        .from("presupuestos")
        .update(cambiosPresupuesto)
        .eq("id", documento.id);

      if (errorPresupuesto) throw errorPresupuesto;

      setDocumentoAbierto((anterior) =>
        anterior?.id === documento.id
          ? { ...anterior, ...cambiosPresupuesto }
          : anterior,
      );

      setMensaje(`Factura ${numeroFactura} creada correctamente.`);
      await cargarDatos();

      window.open(
        `${import.meta.env.BASE_URL}#/facturacion?imprimir=${factura.id}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (err) {
      console.error("Error al generar la factura:", err);
      setError(err?.message || "No se ha podido generar la factura.");
    } finally {
      setFacturando(false);
    }
  }

  function obtenerNombreClienteProduccion(documento) {
    const cliente = documento?.clientes || null;

    if (cliente?.empresa && cliente?.nombre) {
      return `${cliente.empresa} — ${cliente.nombre}`;
    }

    return (
      cliente?.empresa ||
      cliente?.nombre ||
      documento?.visitador_nombre ||
      "Cliente"
    );
  }

  function determinarZonaProduccionDirecta(producto, nombreProducto = "") {
    const zonas = ["Obrador", "Cocina", "Barra"];

    const zonaConfigurada =
      producto?.zona_produccion ||
      producto?.zona ||
      producto?.seccion ||
      "";

    if (zonas.includes(zonaConfigurada)) {
      return zonaConfigurada;
    }

    const texto = String(nombreProducto || "")
      .trim()
      .toLocaleLowerCase("es-ES")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const palabrasBarra = [
      "cafe",
      "agua",
      "refresco",
      "cerveza",
      "vino",
      "zumo",
      "bebida",
      "leche",
      "infusion",
      "te ",
    ];

    if (palabrasBarra.some((palabra) => texto.includes(palabra))) {
      return "Barra";
    }

    const palabrasCocina = [
      "tortilla",
      "brocheta",
      "croqueta",
      "hamburguesa",
      "quiche",
      "ensalada",
      "carne",
      "pollo",
      "pescado",
      "verdura",
      "arroz",
      "pasta",
      "salsa",
      "caliente",
    ];

    if (palabrasCocina.some((palabra) => texto.includes(palabra))) {
      return "Cocina";
    }

    return "Obrador";
  }

  async function borrarProduccionDelDocumento(documento) {
    if (!documento) return;

    const pedidoNombre = documento.numero || `Pedido ${documento.id}`;
    const clienteNombre = obtenerNombreClienteProduccion(documento);

    let consulta = supabase
      .from("producciones")
      .delete()
      .is("catering_id", null)
      .eq("pedido_nombre", pedidoNombre);

    if (documento.cliente_id) {
      consulta = consulta.eq("cliente_id", documento.cliente_id);
    } else {
      consulta = consulta.eq("cliente_nombre", clienteNombre);
    }

    const { error: errorBorrado } = await consulta;

    if (errorBorrado) throw errorBorrado;
  }

  async function enviarAProduccion(documento = documentoAbierto, opciones = {}) {
    if (!documento) return false;

    if (documento.estado !== "Aceptado") {
      setError("Primero debes aceptar el presupuesto.");
      return false;
    }

    const silencioso = Boolean(opciones.silencioso);

    if (!silencioso) {
      setProgramandoCatering(true);
      setError("");
      setMensaje("");
    }

    try {
      const { data: lineasPedido, error: errorLineas } = await supabase
        .from("presupuesto_lineas")
        .select("id, presupuesto_id, producto_id, descripcion, cantidad")
        .eq("presupuesto_id", documento.id)
        .order("created_at", { ascending: true });

      if (errorLineas) throw errorLineas;

      const lineasValidas = (lineasPedido || []).filter(
        (linea) =>
          String(linea.descripcion || "").trim() &&
          Number(linea.cantidad || 0) > 0,
      );

      if (lineasValidas.length === 0) {
        throw new Error("El pedido no tiene líneas válidas para Producción.");
      }

      const clienteNombre =
        documento?.clientes?.empresa && documento?.clientes?.nombre
          ? `${documento.clientes.empresa} — ${documento.clientes.nombre}`
          : documento?.clientes?.empresa ||
            documento?.clientes?.nombre ||
            documento?.visitador_nombre ||
            "Cliente";

      const pedidoNombre =
        documento.numero ||
        `${documento.tipo_documento || "Pedido"} ${documento.id}`;

      let consultaBorrado = supabase
        .from("producciones")
        .delete()
        .is("catering_id", null)
        .eq("pedido_nombre", pedidoNombre);

      if (documento.cliente_id) {
        consultaBorrado = consultaBorrado.eq(
          "cliente_id",
          documento.cliente_id,
        );
      } else {
        consultaBorrado = consultaBorrado.eq(
          "cliente_nombre",
          clienteNombre,
        );
      }

      const { error: errorBorrado } = await consultaBorrado;
      if (errorBorrado) throw errorBorrado;

      const nuevasProducciones = lineasValidas.map((linea) => {
        const productoNombre =
          String(linea.descripcion || "").trim() || "Producto";

        return {
          catering_id: null,
          cliente_id: documento.cliente_id || null,
          cliente_nombre: clienteNombre.trim(),
          pedido_nombre: pedidoNombre.trim(),
          fecha: documento.fecha || fechaActual(),
          zona: determinarZonaProduccionDirecta(null, productoNombre),
          producto_id: linea.producto_id || null,
          producto_nombre: productoNombre,
          cantidad: Number(linea.cantidad),
          unidad: "unidades",
          responsable: null,
          hora_limite: documento.hora_entrega || null,
          estado: "Pendiente",
          direccion_entrega:
            String(documento.direccion_entrega || "").trim() || null,
          observaciones:
            String(documento.observaciones || "").trim() || null,
          updated_at: new Date().toISOString(),
        };
      });

      for (const datos of nuevasProducciones) {
        const { error: errorInsercion } = await supabase
          .from("producciones")
          .insert(datos);

        if (errorInsercion) {
          throw new Error(
            `${datos.producto_nombre}: ${
              errorInsercion.message || "Error al guardar en Producción"
            }`,
          );
        }
      }

      if (!silencioso) {
        setMensaje(
          `✅ Pedido ${pedidoNombre} enviado a Producción (${nuevasProducciones.length} líneas).`,
        );
      }

      return true;
    } catch (err) {
      console.error("Error al enviar el pedido a Producción:", err);

      if (!silencioso) {
        setError(
          err?.message ||
            "No se ha podido enviar el pedido a Producción.",
        );
      }

      return false;
    } finally {
      if (!silencioso) {
        setProgramandoCatering(false);
      }
    }
  }

  async function cambiarFechaDocumento(documentoId, nuevaFecha) {
    if (!nuevaFecha) return;

    setError("");
    setMensaje("");

    try {
      const datosActualizados = {
        fecha: nuevaFecha,
        updated_at: new Date().toISOString(),
      };

      const { error: errorPresupuesto } = await supabase
        .from("presupuestos")
        .update(datosActualizados)
        .eq("id", documentoId);

      if (errorPresupuesto) throw errorPresupuesto;

      const { data: catering, error: errorBuscarCatering } =
        await supabase
          .from("caterings")
          .select("id")
          .eq("presupuesto_id", documentoId)
          .maybeSingle();

      if (errorBuscarCatering) throw errorBuscarCatering;

      if (catering?.id) {
        const { error: errorCatering } = await supabase
          .from("caterings")
          .update({
            fecha: nuevaFecha,
            updated_at: new Date().toISOString(),
          })
          .eq("id", catering.id);

        if (errorCatering) throw errorCatering;

        const { error: errorProduccion } = await supabase
          .from("producciones")
          .update({
            fecha: nuevaFecha,
            updated_at: new Date().toISOString(),
          })
          .eq("catering_id", catering.id);

        if (errorProduccion) throw errorProduccion;
      }

      const documentoParaProduccion =
        documentoAbierto?.id === documentoId
          ? documentoAbierto
          : documentos.find((documento) => documento.id === documentoId);

      if (documentoParaProduccion?.numero) {
        let consultaProduccionDirecta = supabase
          .from("producciones")
          .update({
            fecha: nuevaFecha,
            updated_at: new Date().toISOString(),
          })
          .is("catering_id", null)
          .eq("pedido_nombre", documentoParaProduccion.numero);

        if (documentoParaProduccion.cliente_id) {
          consultaProduccionDirecta = consultaProduccionDirecta.eq(
            "cliente_id",
            documentoParaProduccion.cliente_id,
          );
        }

        const { error: errorProduccionDirecta } =
          await consultaProduccionDirecta;

        if (errorProduccionDirecta) throw errorProduccionDirecta;
      }

      setDocumentoAbierto((anterior) =>
        anterior?.id === documentoId
          ? { ...anterior, ...datosActualizados }
          : anterior,
      );

      setDocumentos((anteriores) =>
        anteriores.map((documento) =>
          documento.id === documentoId
            ? { ...documento, ...datosActualizados }
            : documento,
        ),
      );

      setMensaje(
        `Fecha del presupuesto cambiada a ${formatearFecha(nuevaFecha)}.`,
      );
    } catch (err) {
      setError(
        err.message || "No se ha podido modificar la fecha.",
      );
    }
  }

  async function cambiarIdiomaDocumento(documentoId, nuevoIdioma) {
    setError("");
    setMensaje("");

    try {
      const datosActualizados = {
        idioma: nuevoIdioma,
        updated_at: new Date().toISOString(),
      };

      const { error: supabaseError } = await supabase
        .from("presupuestos")
        .update(datosActualizados)
        .eq("id", documentoId);

      if (supabaseError) throw supabaseError;

      setDocumentoAbierto((anterior) =>
        anterior?.id === documentoId
          ? { ...anterior, ...datosActualizados }
          : anterior,
      );

      setDocumentos((anteriores) =>
        anteriores.map((documento) =>
          documento.id === documentoId
            ? { ...documento, ...datosActualizados }
            : documento,
        ),
      );

      setMensaje("Idioma actualizado correctamente.");
    } catch (err) {
      setError(err.message || "No se ha podido modificar el idioma.");
    }
  }

  async function cambiarEstado(documentoId, nuevoEstado) {
    setError("");
    setMensaje("");

    try {
      const datosActualizados = {
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
      };

      const { error: supabaseError } = await supabase
        .from("presupuestos")
        .update(datosActualizados)
        .eq("id", documentoId);

      if (supabaseError) throw supabaseError;

      const documentoBase =
        documentoAbierto?.id === documentoId
          ? documentoAbierto
          : documentos.find((documento) => documento.id === documentoId);

      const documentoActualizado = documentoBase
        ? { ...documentoBase, ...datosActualizados }
        : null;

      if (nuevoEstado === "Aceptado" && documentoActualizado) {
        await enviarAProduccion(documentoActualizado, { silencioso: true });
      }

      if (nuevoEstado === "Cancelado" && documentoActualizado) {
        await borrarProduccionDelDocumento(documentoActualizado);
      }

      setDocumentoAbierto((anterior) =>
        anterior?.id === documentoId
          ? { ...anterior, ...datosActualizados }
          : anterior,
      );

      setDocumentos((anteriores) =>
        anteriores.map((documento) =>
          documento.id === documentoId
            ? { ...documento, ...datosActualizados }
            : documento,
        ),
      );

      setMensaje(
        nuevoEstado === "Aceptado"
          ? "✅ Presupuesto aceptado y pedido enviado automáticamente a Producción."
          : nuevoEstado === "Cancelado"
            ? "Presupuesto anulado. Se ha retirado su producción pendiente."
            : "Presupuesto marcado como Pendiente.",
      );

      await cargarDatos();
    } catch (err) {
      setError(
        err.message || "No se ha podido modificar el estado.",
      );
    }
  }

  async function eliminarDocumento(documento) {
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar el documento ${documento.numero}?`,
    );

    if (!confirmar) return;

    setError("");
    setMensaje("");

    try {
      const { error: errorLineas } = await supabase
        .from("presupuesto_lineas")
        .delete()
        .eq("presupuesto_id", documento.id);

      if (errorLineas) throw errorLineas;

      const { error: errorDocumento } = await supabase
        .from("presupuestos")
        .delete()
        .eq("id", documento.id);

      if (errorDocumento) throw errorDocumento;

      if (documentoAbierto?.id === documento.id) {
        setDocumentoAbierto(null);
        setLineasAbiertas([]);
      }

      setMensaje("Documento eliminado correctamente.");
      await cargarDatos();
    } catch (err) {
      setError(err.message || "No se ha podido eliminar el documento.");
    }
  }

  const esVisitador = tipoDocumento === "Visitador médico";
  const idiomaDocumento = documentoAbierto?.idioma || idioma || "es";
  const textos =
    TEXTOS_DOCUMENTO[idiomaDocumento] || TEXTOS_DOCUMENTO.es;

  return (
    <section className="panel">
      <style>{ESTILOS_ESTADOS_PRESUPUESTO}</style>

      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">{etiqueta}</p>
          <h2>{titulo}</h2>
        </div>

        <span className="contador">
          {documentosFiltrados.length}{" "}
          {documentosFiltrados.length === 1 ? "documento" : "documentos"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "22px",
        }}
      >
        <button type="button" onClick={abrirNuevoDocumento}>
          + Nuevo documento
        </button>

        <button
          type="button"
          className="boton-secundario"
          onClick={() => {
            setAsistenteVisible((anterior) => !anterior);
            setErrorAsistente("");
          }}
        >
          🎤 Parlar amb Cusachs Hub
        </button>
      </div>

      {asistenteVisible && (
        <div
          className="formulario"
          style={{
            marginBottom: "22px",
            padding: "18px",
            border: "2px solid #8f63a8",
          }}
        >
          <div className="titulo-seccion" style={{ marginBottom: "14px" }}>
            <div>
              <p className="etiqueta">Assistent segur</p>
              <h3>🎤 Parlar amb Cusachs Hub</h3>
            </div>

            <button
              type="button"
              className="boton-cancelar"
              onClick={() => {
                setAsistenteVisible(false);
                cancelarPropuestaAsistente();
              }}
            >
              Tancar
            </button>
          </div>

          <p>
            Dicta o escriu la petició. L'assistent només prepararà una proposta:
            no desarà, facturarà ni modificarà dades sense la teva confirmació.
          </p>

          <textarea
            rows="4"
            value={textoAsistente}
            onChange={(event) => setTextoAsistente(event.target.value)}
            placeholder="Exemple: Pressupost per a Hospital Clínic divendres a les 9, per a 75 persones, amb 75 cafès i 75 mini croissants."
            style={{ width: "100%", marginTop: "10px" }}
          />

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "12px",
            }}
          >
            <button
              type="button"
              onClick={iniciarDictadoAsistente}
              disabled={
                escuchandoVoz || analizandoAsistente || !navegadorAdmiteVoz()
              }
            >
              {escuchandoVoz ? "🎙️ Escoltant..." : "🎤 Dictar"}
            </button>

            <button
              type="button"
              className="boton-secundario"
              onClick={() => analizarOrdenAsistente()}
              disabled={analizandoAsistente || !textoAsistente.trim()}
            >
              {analizandoAsistente ? "Analitzant..." : "✨ Preparar proposta"}
            </button>

            <button
              type="button"
              className="boton-cancelar"
              onClick={() => {
                setTextoAsistente("");
                cancelarPropuestaAsistente();
              }}
            >
              Netejar
            </button>
          </div>

          {!navegadorAdmiteVoz() && (
            <p className="mensaje-error">
              El navegador no admet el micròfon. Pots escriure l'ordre o obrir
              l'aplicació amb Chrome o Edge.
            </p>
          )}

          {errorAsistente && (
            <p className="mensaje-error">Error: {errorAsistente}</p>
          )}

          {propuestaAsistente && (
            <div
              style={{
                marginTop: "18px",
                padding: "16px",
                border: "1px solid #d8c8df",
                borderRadius: "12px",
                background: "#faf7fc",
              }}
            >
              <h3>{propuestaAsistente.titulo}</h3>

              <p>
                <strong>Acció detectada:</strong> {propuestaAsistente.intencion}
              </p>

              {propuestaAsistente.datos?.cliente && (
                <p>
                  <strong>Client:</strong>{" "}
                  {propuestaAsistente.datos.cliente.empresa ||
                    propuestaAsistente.datos.cliente.nombre}
                </p>
              )}

              {propuestaAsistente.datos?.fecha && (
                <p>
                  <strong>Data:</strong> {propuestaAsistente.datos.fecha}
                </p>
              )}

              {propuestaAsistente.datos?.hora && (
                <p>
                  <strong>Hora:</strong> {propuestaAsistente.datos.hora}
                </p>
              )}

              {propuestaAsistente.datos?.personas && (
                <p>
                  <strong>Persones:</strong>{" "}
                  {propuestaAsistente.datos.personas}
                </p>
              )}

              {propuestaAsistente.datos?.lineas?.length > 0 && (
                <>
                  <h4>Productes detectats</h4>
                  <ul>
                    {propuestaAsistente.datos.lineas.map((linea) => (
                      <li key={`${linea.producto_id}-${linea.producto_nombre}`}>
                        {linea.cantidad} × {linea.producto_nombre}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {propuestaAsistente.advertencias?.map((advertencia) => (
                <p key={advertencia}>⚠️ {advertencia}</p>
              ))}

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "14px",
                }}
              >
                {propuestaAsistente.puedeAplicarseAlPresupuesto && (
                  <button
                    type="button"
                    onClick={aplicarPropuestaAlPresupuesto}
                  >
                    ✅ Aplicar al pressupost
                  </button>
                )}

                <button
                  type="button"
                  className="boton-cancelar"
                  onClick={cancelarPropuestaAsistente}
                >
                  ❌ Cancel·lar proposta
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        className="formulario"
        style={{
          marginBottom: "22px",
          padding: "18px",
        }}
      >
        <div className="rejilla-presupuesto">
          <label>
            Buscar
            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Número, cliente, empresa..."
            />
          </label>

          <label>
            Estado
            <select
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value)}
            >
              <option value="">Todos los estados</option>
              {ESTADOS_DOCUMENTO.map((estadoDocumento) => (
                <option
                  key={estadoDocumento.valor}
                  value={estadoDocumento.valor}
                >
                  {estadoDocumento.etiqueta}
                </option>
              ))}
            </select>
          </label>

          {!tipoDocumentoFijo && (
            <label>
              Tipo
              <select
                value={filtroTipo}
                onChange={(event) => setFiltroTipo(event.target.value)}
              >
                <option value="">Todos los tipos</option>

                {TIPOS_DOCUMENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {error && <p className="mensaje-error">Error: {error}</p>}
      {mensaje && <p className="mensaje">{mensaje}</p>}

      {mostrarFormulario && (
        <form className="formulario" onSubmit={guardarDocumento}>
          <h3>
            {documentoEditando
              ? `Editar documento ${documentoEditando.numero}`
              : "Crear nuevo documento"}
          </h3>

          <div className="rejilla-presupuesto">
            {!tipoDocumentoFijo && (
              <label>
                Tipo de documento *
                <select
                  value={tipoDocumento}
                  onChange={(event) =>
                    cambiarTipoDocumento(event.target.value)
                  }
                  disabled={guardando}
                  required
                >
                  {TIPOS_DOCUMENTO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {esVisitador ? (
              <label>
                Visitador médico *
                <select
                  value={visitadorSeleccionadoId}
                  onChange={(event) =>
                    seleccionarVisitador(event.target.value)
                  }
                  disabled={guardando}
                  required
                >
                  <option value="">Selecciona un visitador médico</option>

                  {visitadoresMedicos.map((visitador) => (
                    <option key={visitador.id} value={visitador.id}>
                      {obtenerNombreVisitador(visitador)}
                      {obtenerEmpresaVisitador(visitador)
                        ? ` — ${obtenerEmpresaVisitador(visitador)}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Cliente *
                <select
                  value={clienteId}
                  onChange={(event) => setClienteId(event.target.value)}
                  disabled={guardando}
                  required
                >
                  <option value="">Selecciona un cliente</option>

                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                      {cliente.empresa ? ` — ${cliente.empresa}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Fecha
              <input
                type="date"
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                disabled={guardando}
              />
            </label>

            <label>
              Válido hasta
              <input
                type="date"
                value={validezHasta}
                onChange={(event) => setValidezHasta(event.target.value)}
                disabled={guardando}
              />
            </label>

            <label>
              Estado
              <select
                value={estado === "Enviado" ? "Borrador" : estado}
                onChange={(event) => setEstado(event.target.value)}
                disabled={guardando}
              >
                {ESTADOS_DOCUMENTO.map((estadoDocumento) => (
                  <option
                    key={estadoDocumento.valor}
                    value={estadoDocumento.valor}
                  >
                    {estadoDocumento.etiqueta}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Idioma del presupuesto
              <select
                value={idioma}
                onChange={(event) => setIdioma(event.target.value)}
                disabled={guardando}
              >
                {IDIOMAS_DOCUMENTO.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {esVisitador && (
            <>
              <h3 style={{ marginTop: "28px" }}>
                Datos del visitador médico
              </h3>

              <div className="rejilla-presupuesto">
                <label>
                  Nombre del visitador *
                  <input
                    type="text"
                    value={visitadorNombre}
                    onChange={(event) =>
                      setVisitadorNombre(event.target.value)
                    }
                    disabled={guardando}
                    required
                  />
                </label>

                <label>
                  Laboratorio o empresa
                  <input
                    type="text"
                    value={laboratorio}
                    onChange={(event) => setLaboratorio(event.target.value)}
                    disabled={guardando}
                  />
                </label>

                <label>
                  Centro médico
                  <input
                    type="text"
                    value={centroMedico}
                    onChange={(event) => setCentroMedico(event.target.value)}
                    disabled={guardando}
                  />
                </label>
              </div>
            </>
          )}

          <h3 style={{ marginTop: "28px" }}>Entrega y contacto</h3>

          <div className="rejilla-presupuesto">
            <label>
              Hora de entrega
              <input
                type="time"
                value={horaEntrega}
                onChange={(event) => setHoraEntrega(event.target.value)}
                disabled={guardando}
              />
            </label>

            <label>
              Dirección de entrega
              <input
                type="text"
                value={direccionEntrega}
                onChange={(event) => setDireccionEntrega(event.target.value)}
                disabled={guardando}
              />
            </label>

            <label>
              Persona de contacto
              <input
                type="text"
                value={personaContacto}
                onChange={(event) => setPersonaContacto(event.target.value)}
                disabled={guardando}
              />
            </label>

            <label>
              Teléfono de contacto
              <input
                type="tel"
                value={telefonoContacto}
                onChange={(event) => setTelefonoContacto(event.target.value)}
                disabled={guardando}
              />
            </label>
          </div>

          <div style={{ marginTop: "28px" }}>
            <div className="cabecera-lineas">
              <h3>Productos y servicios</h3>

              <div className="botones-tipo-linea">
                <button
                  type="button"
                  onClick={() => añadirLinea("")}
                  disabled={guardando}
                >
                  + Producto / servicio
                </button>

                <button
                  type="button"
                  className="boton-secundario"
                  onClick={() => añadirLinea("Menaje: ")}
                  disabled={guardando}
                >
                  + Menaje
                </button>

                <button
                  type="button"
                  className="boton-secundario"
                  onClick={() => añadirLinea("Bebidas: ")}
                  disabled={guardando}
                >
                  + Bebidas
                </button>
              </div>
            </div>

            <div className="lineas-presupuesto">
              {lineas.map((linea, indice) => {
                const calculo = calcularLinea(linea);

                return (
                  <div
                    className="linea-presupuesto"
                    key={linea.temporalId}
                  >
                    <div className="numero-linea">
                      {indice + 1}
                    </div>

                    <label className="campo-producto">
                      Producto
                      <select
                        value={linea.producto_id}
                        onChange={(event) =>
                          seleccionarProducto(
                            linea.temporalId,
                            event.target.value,
                          )
                        }
                        disabled={guardando}
                      >
                        <option value="">
                          Línea manual / servicio
                        </option>

                        {productos.map((producto) => (
                          <option key={producto.id} value={producto.id}>
                            {producto.nombre}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="campo-descripcion">
                      Descripción *
                      <input
                        type="text"
                        value={linea.descripcion}
                        onChange={(event) =>
                          modificarLinea(
                            linea.temporalId,
                            "descripcion",
                            event.target.value,
                          )
                        }
                        disabled={guardando}
                        required
                      />
                    </label>

                    <label>
                      Cantidad
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={linea.cantidad}
                        onChange={(event) =>
                          modificarLinea(
                            linea.temporalId,
                            "cantidad",
                            event.target.value,
                          )
                        }
                        disabled={guardando}
                      />
                    </label>

                    <label>
                      Precio
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.precio_unitario}
                        onChange={(event) =>
                          modificarLinea(
                            linea.temporalId,
                            "precio_unitario",
                            event.target.value,
                          )
                        }
                        disabled={guardando}
                      />
                    </label>

                    <label>
                      IVA
                      <select
                        value={linea.iva}
                        onChange={(event) =>
                          modificarLinea(
                            linea.temporalId,
                            "iva",
                            event.target.value,
                          )
                        }
                        disabled={guardando}
                      >
                        <option value="0">0 %</option>
                        <option value="4">4 %</option>
                        <option value="10">10 %</option>
                        <option value="21">21 %</option>
                      </select>
                    </label>

                    <div className="total-linea">
                      <span>Total</span>
                      <strong>{formatearEuros(calculo.total)}</strong>
                    </div>

                    <button
                      type="button"
                      className="boton-eliminar-linea"
                      onClick={() =>
                        eliminarLinea(linea.temporalId)
                      }
                      disabled={guardando}
                      title="Eliminar línea"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              marginTop: "24px",
              padding: "18px",
              border: "1px solid #d8c8df",
              borderRadius: "12px",
              background: "#faf7fc",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              🚚 Transporte interno
            </h3>

            <p
              style={{
                marginTop: "4px",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              Se suma al total, pero no aparece como línea en el visor ni en el
              PDF del presupuesto.
            </p>

            <div className="rejilla-presupuesto">
              <label>
                Importe del transporte
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={transporte}
                  onChange={(event) =>
                    setTransporte(event.target.value)
                  }
                  disabled={guardando}
                  placeholder="0,00"
                />
              </label>

              <label>
                IVA del transporte
                <select
                  value={transporteIva}
                  onChange={(event) =>
                    setTransporteIva(event.target.value)
                  }
                  disabled={guardando}
                >
                  <option value="0">0 %</option>
                  <option value="4">4 %</option>
                  <option value="10">10 %</option>
                  <option value="21">21 %</option>
                </select>
              </label>
            </div>
          </div>

          <label
            style={{
              display: "block",
              marginTop: "24px",
            }}
          >
            Observaciones
            <textarea
              value={observaciones}
              onChange={(event) =>
                setObservaciones(event.target.value)
              }
              disabled={guardando}
              rows="4"
              placeholder="Condiciones, horarios, entrega, montaje..."
            />
          </label>

          <div className="resumen-presupuesto">
            <p>
              <span>{textos.baseImponible}</span>
              <strong>{formatearEuros(totales.subtotal)}</strong>
            </p>

            <p>
              <span>
                {textos.iva} {formatearPorcentaje(totales.tipoIva)}
              </span>
              <strong>{formatearEuros(totales.ivaTotal)}</strong>
            </p>

            <p className="total-presupuesto">
              <span>Total documento</span>
              <strong>{formatearEuros(totales.total)}</strong>
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "24px",
            }}
          >
            <button type="submit" disabled={guardando}>
              {guardando
                ? "Guardando..."
                : documentoEditando
                  ? "💾 Guardar cambios"
                  : "💾 Guardar documento"}
            </button>

            <button
              type="button"
              className="boton-cancelar"
              onClick={cancelarFormulario}
              disabled={guardando}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {documentoAbierto && (
        <div className="documento-vista-contenedor">
          <div
            id="documento-imprimible"
            className="documento-presupuesto-profesional documento-presupuesto-imprimir"
          >
            <header className="presupuesto-print-cabecera">
              <div className="presupuesto-print-marca">
                <img
                  src={logoCusachs}
                  alt="Pastisseria Cusachs"
                  className="presupuesto-print-logo"
                />
              </div>

              <div className="presupuesto-print-titulo">
                <h1>{textos.presupuesto}</h1>

                <div className="presupuesto-print-numero">
                  {documentoAbierto.numero}
                </div>
              </div>

              <div className="presupuesto-cabecera-acciones no-imprimir">
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                    minWidth: "145px",
                    fontWeight: 700,
                  }}
                >
                  Idioma

                  <select
                    value={idiomaDocumento}
                    onChange={(event) =>
                      cambiarIdiomaDocumento(
                        documentoAbierto.id,
                        event.target.value,
                      )
                    }
                    disabled={abriendo}
                  >
                    {IDIOMAS_DOCUMENTO.map((opcion) => (
                      <option key={opcion.valor} value={opcion.valor}>
                        {opcion.etiqueta}
                      </option>
                    ))}
                  </select>
                </label>

                <div
                  className="no-imprimir"
                  style={{
                    display: "flex",
                    alignItems: "end",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                      minWidth: "150px",
                      fontWeight: 700,
                    }}
                  >
                    Fecha servicio

                    <input
                      id={`fecha-servicio-${documentoAbierto.id}`}
                      type="date"
                      defaultValue={documentoAbierto.fecha || ""}
                      disabled={abriendo}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      const campoFecha = document.getElementById(
                        `fecha-servicio-${documentoAbierto.id}`,
                      );

                      const nuevaFecha = campoFecha?.value || "";

                      if (!nuevaFecha) {
                        setError("Selecciona una fecha válida.");
                        return;
                      }

                      cambiarFechaDocumento(
                        documentoAbierto.id,
                        nuevaFecha,
                      );
                    }}
                    disabled={abriendo}
                  >
                    ✅ Guardar nueva fecha
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    editarDocumento(documentoAbierto)
                  }
                  disabled={abriendo}
                >
                  ✏️ Editar
                </button>

                <button
                  type="button"
                  className="boton-cancelar"
                  onClick={() => {
                    setDocumentoAbierto(null);
                    setLineasAbiertas([]);
                  }}
                >
                  Cerrar
                </button>
              </div>
            </header>

            <section className="presupuesto-print-datos">
              <div className="presupuesto-print-cliente">
                {documentoAbierto.tipo_documento !==
                  "Visitador médico" && (
                  <h2>● {textos.cliente}</h2>
                )}

                <strong>
                  {documentoAbierto.tipo_documento === "Visitador médico"
                    ? documentoAbierto.visitador_nombre || "—"
                    : documentoAbierto.clientes?.empresa ||
                      documentoAbierto.clientes?.nombre ||
                      "Cliente"}
                </strong>

                {documentoAbierto.tipo_documento !== "Visitador médico" &&
                  documentoAbierto.clientes?.empresa &&
                  documentoAbierto.clientes?.nombre && (
                    <p>{documentoAbierto.clientes.nombre}</p>
                  )}
              </div>

              <div className="presupuesto-print-detalles">
                <p>
                  <strong>▣ {textos.fecha}</strong>
                  <span>
                    {formatearFecha(documentoAbierto.fecha)}
                  </span>
                </p>

                <p>
                  <strong>▣ {textos.validoHasta}</strong>
                  <span>
                    {formatearFecha(documentoAbierto.validez_hasta)}
                  </span>
                </p>

                <p>
                  <strong>◷ {textos.horaEntrega}</strong>
                  <span>
                    {documentoAbierto.hora_entrega || "—"}
                  </span>
                </p>

                <p>
                  <strong>⌖ {textos.direccion}</strong>
                  <span>
                    {documentoAbierto.direccion_entrega || "—"}
                  </span>
                </p>
              </div>

              <label className="presupuesto-estado no-imprimir">
                Estado

                <select
                  value={
                    documentoAbierto.estado === "Enviado"
                      ? "Borrador"
                      : documentoAbierto.estado
                  }
                  onChange={(event) =>
                    cambiarEstado(
                      documentoAbierto.id,
                      event.target.value,
                    )
                  }
                >
                  {ESTADOS_DOCUMENTO.map((estadoDocumento) => (
                    <option
                      key={estadoDocumento.valor}
                      value={estadoDocumento.valor}
                    >
                      {estadoDocumento.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            {documentoAbierto.tipo_documento === "Visitador médico" && (
              <section className="presupuesto-print-bloque-extra">
                <p>
                  <strong>{textos.nombre}</strong>{" "}
                  {documentoAbierto.visitador_nombre || "—"}
                </p>

                <p>
                  <strong>{textos.laboratorio}</strong>{" "}
                  {documentoAbierto.laboratorio || "—"}
                </p>

                <p>
                  <strong>{textos.centroMedico}</strong>{" "}
                  {documentoAbierto.centro_medico || "—"}
                </p>
              </section>
            )}

            <section className="presupuesto-print-tabla">
              <div className="presupuesto-print-fila presupuesto-print-fila-cabecera">
                <span>{textos.cantidad}</span>
                <span>{textos.descripcion}</span>
              </div>

              {lineasAbiertas.map((linea) => (
                <div
                  className="presupuesto-print-fila"
                  key={linea.id}
                >
                  <strong>{linea.cantidad}</strong>

                  <span>
                    {obtenerDescripcionTraducida(
                      linea,
                      idiomaDocumento,
                      productos,
                    )}
                  </span>
                </div>
              ))}
            </section>

            <section className="presupuesto-print-cierre">
              <div className="presupuesto-print-observaciones">
                <h3>◌ {textos.observaciones}</h3>

                <p>
                  {documentoAbierto.observaciones ||
                    textos.textoDefecto}
                </p>
              </div>

              <div className="presupuesto-print-total">
                <span className="presupuesto-print-total-titulo">
                  {textos.resumen}
                </span>

                <p>
                  <span>Base imponible</span>
                  <strong>
                    {formatearEuros(documentoAbierto.subtotal)}
                  </strong>
                </p>

                <p>
                  <span>IVA</span>
                  <strong>
                    {formatearEuros(documentoAbierto.iva_total)}
                  </strong>
                </p>

                <p className="presupuesto-print-total-final">
                  <span>{textos.total}</span>

                  <strong>
                    {formatearEuros(documentoAbierto.total)}
                  </strong>
                </p>
              </div>
            </section>

            <footer className="presupuesto-print-pie">
              <span>⌖ Pastisseria Cusachs</span>
              <span>▥ C/Bailén 223</span>
              <span>☎ 609 773 413</span>
              <span>✉ pcusachs@gmail.com</span>
            </footer>
          </div>

          <div className="acciones documento-acciones no-imprimir">
            <button
              type="button"
              onClick={() => {
                const limpiarImpresion = () => {
                  document.body.classList.remove(
                    "imprimiendo-documento",
                  );

                  window.removeEventListener(
                    "afterprint",
                    limpiarImpresion,
                  );
                };

                document.body.classList.add(
                  "imprimiendo-documento",
                );

                window.addEventListener(
                  "afterprint",
                  limpiarImpresion,
                );

                window.requestAnimationFrame(() => {
                  window.requestAnimationFrame(() => {
                    window.print();
                  });
                });
              }}
            >
              🖨️ Guardar presupuesto en PDF
            </button>

            {documentoAbierto.estado !== "Aceptado" &&
              documentoAbierto.estado !== "Cancelado" && (
                <button
                  type="button"
                  className="boton-aceptar-presupuesto"
                  onClick={() =>
                    cambiarEstado(
                      documentoAbierto.id,
                      "Aceptado",
                    )
                  }
                >
                  ✅ Aceptar presupuesto
                </button>
              )}

            {documentoAbierto.estado === "Aceptado" && (
              <button
                type="button"
                onClick={() =>
                  cambiarEstado(
                    documentoAbierto.id,
                    "Borrador",
                  )
                }
              >
                🟡 Volver a Pendiente
              </button>
            )}

            {documentoAbierto.estado === "Cancelado" && (
              <button
                type="button"
                onClick={() =>
                  cambiarEstado(
                    documentoAbierto.id,
                    "Borrador",
                  )
                }
              >
                ↩️ Reactivar como Pendiente
              </button>
            )}

            {documentoAbierto.estado !== "Cancelado" && (
              <button
                type="button"
                className="boton-cancelar-presupuesto"
                onClick={() => {
                  const confirmar = window.confirm(
                    "¿Deseas anular este presupuesto?",
                  );

                  if (confirmar) {
                    cambiarEstado(
                      documentoAbierto.id,
                      "Cancelado",
                    );
                  }
                }}
              >
                ❌ Anular presupuesto
              </button>
            )}

            {documentoAbierto.estado === "Aceptado" ? (
              <button
                type="button"
                onClick={() =>
                  enviarAProduccion(documentoAbierto)
                }
                disabled={programandoCatering}
              >
                {programandoCatering
                  ? "Enviando..."
                  : "🧁 Enviar / actualizar Producción"}
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="Primero debes aceptar el presupuesto"
              >
                🧁 Acepta para enviar a Producción
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                generarFactura(documentoAbierto)
              }
              disabled={
                facturando ||
                Boolean(documentoAbierto.factura_id) ||
                documentoAbierto.estado !== "Aceptado"
              }
              title={
                documentoAbierto.estado !== "Aceptado"
                  ? "Primero debes aceptar el presupuesto"
                  : ""
              }
            >
              {documentoAbierto.factura_id
                ? "✅ Facturado"
                : facturando
                  ? "Generando factura..."
                  : documentoAbierto.estado !== "Aceptado"
                    ? "🧾 Acepta para facturar"
                    : "🧾 Generar factura"}
            </button>
          </div>
        </div>
      )}

      {cargando && (
        <p className="mensaje">
          Cargando documentos...
        </p>
      )}

      {!cargando && documentosFiltrados.length === 0 && (
        <div className="estado-vacio">
          <h3>No hay documentos guardados</h3>
          <p>
            Pulsa “Nuevo documento” para crear el primero.
          </p>
        </div>
      )}

      {!cargando && documentosFiltrados.length > 0 && (
        <div className="tabla-responsive no-imprimir">
          <table className="tabla-facturas">
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Transporte</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {documentosFiltrados.map((documento) => (
                <tr key={documento.id}>
                  <td>
                    <strong>
                      {documento.numero || "—"}
                    </strong>
                  </td>

                  <td>
                    {formatearFecha(documento.fecha)}
                  </td>

                  <td>
                    {documento.tipo_documento ===
                    "Visitador médico"
                      ? documento.visitador_nombre ||
                        "Visitador no disponible"
                      : documento.clientes?.empresa ||
                        documento.clientes?.nombre ||
                        "Cliente no disponible"}
                  </td>

                  <td>
                    {documento.tipo_documento || "Catering"}
                  </td>

                  <td>
                    <span
                      className={`estado-presupuesto estado-presupuesto-${normalizarEstadoDocumento(
                        documento.estado,
                      )}`}
                    >
                      {documento.estado || "Borrador"}
                    </span>
                  </td>

                  <td>
                    {formatearEuros(
                      documento.transporte || 0,
                    )}
                  </td>

                  <td>
                    <strong>
                      {formatearEuros(documento.total)}
                    </strong>
                  </td>

                  <td>
                    <div className="acciones">
                      <button
                        type="button"
                        className="boton-ficha"
                        onClick={() =>
                          abrirDocumento(documento)
                        }
                        disabled={abriendo}
                      >
                        👁 Abrir
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          editarDocumento(documento)
                        }
                        disabled={abriendo}
                      >
                        ✏ Editar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          duplicarDocumento(documento)
                        }
                        disabled={abriendo}
                      >
                        📋 Duplicar
                      </button>

                      <button
                        type="button"
                        className="boton-peligro"
                        onClick={() =>
                          eliminarDocumento(documento)
                        }
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function etiquetaEstadoDocumento(estado) {
  if (estado === "Aceptado") return "Aceptado";
  if (estado === "Cancelado") return "Anulado";
  return "Pendiente";
}

function normalizarEstadoDocumento(estado) {
  return etiquetaEstadoDocumento(estado)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function obtenerNombreProducto(producto, idioma = "es") {
  if (!producto) return "";

  if (idioma === "ca") {
    return producto.nombre_ca || producto.nombre || "";
  }

  if (idioma === "en") {
    return producto.nombre_en || producto.nombre || "";
  }

  return producto.nombre || "";
}

function obtenerDescripcionTraducida(
  linea,
  idioma,
  productos,
) {
  const descripcionActual = String(
    linea?.descripcion || "",
  ).trim();

  let producto = linea?.productos || null;

  if (!producto && linea?.producto_id) {
    producto = productos.find(
      (elemento) =>
        String(elemento.id) ===
        String(linea.producto_id),
    );
  }

  if (!producto) return descripcionActual;

  const nombresOficiales = [
    producto.nombre,
    producto.nombre_ca,
    producto.nombre_en,
  ]
    .filter(Boolean)
    .map((nombre) =>
      normalizarTextoProducto(nombre),
    );

  const descripcionNormalizada =
    normalizarTextoProducto(descripcionActual);

  if (
    !nombresOficiales.includes(
      descripcionNormalizada,
    )
  ) {
    return descripcionActual;
  }

  return (
    obtenerNombreProducto(producto, idioma) ||
    descripcionActual
  );
}

function normalizarTextoProducto(valor) {
  return String(valor || "")
    .trim()
    .toLocaleLowerCase("es-ES")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function obtenerNombreVisitador(visitador) {
  return String(
    visitador?.nombre ??
      visitador?.nombre_visitador ??
      visitador?.visitador_nombre ??
      visitador?.nombre_completo ??
      visitador?.contacto ??
      "Visitador sin nombre",
  );
}

function obtenerEmpresaVisitador(visitador) {
  return String(
    visitador?.laboratorio ??
      visitador?.empresa ??
      visitador?.nombre_comercial ??
      visitador?.compania ??
      "",
  );
}

function obtenerCentroVisitador(visitador) {
  return String(
    visitador?.centro_medico ??
      visitador?.centro ??
      visitador?.hospital ??
      "",
  );
}

function calcularLinea(linea) {
  const cantidad = convertirNumero(linea.cantidad);
  const precio = convertirNumero(
    linea.precio_unitario,
  );
  const iva = convertirNumero(linea.iva);

  const subtotal = redondear(
    cantidad * precio,
  );

  const importeIva = redondear(
    subtotal * (iva / 100),
  );

  const total = redondear(
    subtotal + importeIva,
  );

  return {
    subtotal,
    importeIva,
    total,
  };
}

/*
 * ============================================================
 * CÁLCULO GENERAL DEL PRESUPUESTO
 * ============================================================
 *
 * El IVA total se redondea al múltiplo de 0,05 € más cercano.
 *
 * Ejemplo:
 *
 * Base imponible: 893,75 €
 * IVA matemático: 89,375 €
 * IVA mostrado:    89,40 €
 * TOTAL:           983,15 €
 *
 * De esta manera:
 *
 * 893,75 + 89,40 = 983,15 €
 *
 * ============================================================
 */
function calcularTotales(
  lineas,
  transporte = 0,
  transporteIva = 10,
) {
  const baseProductos = redondear(
    lineas.reduce((acumulado, linea) => {
      const calculo = calcularLinea(linea);

      return acumulado + calculo.subtotal;
    }, 0),
  );

  const baseTransporte =
    convertirNumero(transporte);

  const tipoIva =
    convertirNumero(transporteIva) || 10;

  const baseImponible = redondear(
    baseProductos + baseTransporte,
  );

  /*
   * Calculamos primero el IVA matemático.
   *
   * Ejemplo:
   * 893,75 × 10 % = 89,375
   */
  const ivaCalculado =
    baseImponible * (tipoIva / 100);

  /*
   * Redondeo al múltiplo de 0,05 € más cercano.
   *
   * 89,375 € -> 89,40 €
   *
   * Multiplicamos por 20 porque:
   * 1 / 0,05 = 20
   */
  const ivaTotal = redondear(
    Math.round(
      (ivaCalculado + Number.EPSILON) * 20,
    ) / 20,
  );

  /*
   * El TOTAL siempre se obtiene sumando:
   *
   * base imponible + IVA redondeado.
   *
   * De esta manera nunca aparecerá un descuadre
   * entre las cifras mostradas.
   */
  const total = redondear(
    baseImponible + ivaTotal,
  );

  return {
    baseProductos,
    transporte: baseTransporte,
    tipoIva,
    subtotal: baseImponible,
    ivaTotal,
    total,
    totalExacto: total,
  };
}

/*
 * Se mantiene esta función por compatibilidad
 * con el resto del DocumentoEditor.
 */
function redondearA05(numero) {
  return (
    Math.round(
      (Number(numero || 0) + Number.EPSILON) *
        2,
    ) / 2
  );
}

function convertirNumero(valor) {
  const numero = Number(
    String(valor ?? "0").replace(",", "."),
  );

  return Number.isFinite(numero)
    ? numero
    : 0;
}

function redondear(numero) {
  return (
    Math.round(
      (numero + Number.EPSILON) * 100,
    ) / 100
  );
}

function fechaActual() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function generarNumeroDocumento(tipoDocumento) {
  const ahora = new Date();

  const año = ahora.getFullYear();

  const mes = String(
    ahora.getMonth() + 1,
  ).padStart(2, "0");

  const dia = String(
    ahora.getDate(),
  ).padStart(2, "0");

  const hora = String(
    ahora.getHours(),
  ).padStart(2, "0");

  const minutos = String(
    ahora.getMinutes(),
  ).padStart(2, "0");

  const segundos = String(
    ahora.getSeconds(),
  ).padStart(2, "0");

  const prefijos = {
    Catering: "CAT",
    "Visitador médico": "VIS",
    Empresa: "EMP",
    Tienda: "TIE",
    Particular: "PAR",
    Otro: "OTR",
  };

  const prefijo =
    prefijos[tipoDocumento] || "DOC";

  return `${prefijo}-${año}${mes}${dia}-${hora}${minutos}${segundos}`;
}

function generarNumeroFactura() {
  const ahora = new Date();
  const año = ahora.getFullYear();

  const marca = [
    ahora.getMonth() + 1,
    ahora.getDate(),
    ahora.getHours(),
    ahora.getMinutes(),
    ahora.getSeconds(),
  ]
    .map((valor) =>
      String(valor).padStart(2, "0"),
    )
    .join("");

  return `F-${año}-${marca}`;
}

function formatearEuros(valor) {
  return new Intl.NumberFormat(
    "es-ES",
    {
      style: "currency",
      currency: "EUR",
    },
  ).format(Number(valor || 0));
}

function formatearPorcentaje(valor) {
  return `(${new Intl.NumberFormat(
    "es-ES",
    {
      maximumFractionDigits: 2,
    },
  ).format(Number(valor || 0))} %)`;
}

function formatearFecha(fecha) {
  if (!fecha) return "—";

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(
    new Date(`${fecha}T12:00:00`),
  );
}

export default DocumentoEditor;