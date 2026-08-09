import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const ZONAS = ["Obrador", "Cocina", "Barra"];

const ESTADOS = [
  "Pendiente",
  "En preparación",
  "Terminado",
  "Cancelado",
];

const FORMULARIO_INICIAL = {
  id: null,
  catering_id: "",
  cliente_id: "",
  cliente_nombre: "",
  pedido_nombre: "",
  fecha: "",
  zona: "Obrador",
  producto_id: "",
  producto_nombre: "",
  cantidad: "1",
  unidad: "unidades",
  responsable: "",
  hora_limite: "",
  estado: "Pendiente",
  direccion_entrega: "",
  observaciones: "",
};

function Produccion() {
  const hoy = obtenerFechaISO(new Date());

  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoy);

  const [producciones, setProducciones] = useState([]);
  const [caterings, setCaterings] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);

  const [formulario, setFormulario] = useState({
    ...FORMULARIO_INICIAL,
    fecha: hoy,
  });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [vistaBarraSemanal, setVistaBarraSemanal] = useState(false);
  const [fechaSemanaBarra, setFechaSemanaBarra] = useState(hoy);

  useEffect(() => {
    inicializarProduccion();
  }, []);

  async function inicializarProduccion() {
    await cargarDatos();
  }


  async function sincronizarProduccionAceptada({ silencioso = false } = {}) {
    if (!silencioso) {
      setSincronizando(true);
      setError("");
      setMensaje("");
    }

    try {
      const [
        respuestaCateringsAceptados,
        respuestaProduccionesExistentes,
      ] = await Promise.all([
        supabase
          .from("caterings")
          .select(`
            id,
            presupuesto_id,
            cliente_id,
            titulo,
            fecha,
            hora_inicio,
            direccion,
            poblacion,
            estado,
            clientes (
              id,
              nombre,
              empresa
            )
          `)
          .in("estado", ["Aceptado", "Confirmado"])
          .not("presupuesto_id", "is", null),

        supabase
          .from("producciones")
          .select(`
            id,
            catering_id,
            producto_id,
            producto_nombre,
            cantidad
          `),
      ]);

      if (respuestaCateringsAceptados.error) {
        throw respuestaCateringsAceptados.error;
      }

      if (respuestaProduccionesExistentes.error) {
        throw respuestaProduccionesExistentes.error;
      }

      const cateringsAceptados =
        respuestaCateringsAceptados.data || [];

      if (cateringsAceptados.length === 0) {
        if (!silencioso) {
          setMensaje("No hay caterings aceptados pendientes de importar.");
        }
        return;
      }

      const presupuestosIds = [
        ...new Set(
          cateringsAceptados
            .map((catering) => catering.presupuesto_id)
            .filter(Boolean),
        ),
      ];

      const { data: lineasPresupuesto, error: errorLineas } =
        await supabase
          .from("presupuesto_lineas")
          .select(`
            id,
            presupuesto_id,
            producto_id,
            descripcion,
            cantidad,
            productos (
              id,
              nombre,
              unidad,
              unidad_medida,
              zona_produccion,
              zona,
              seccion
            )
          `)
          .in("presupuesto_id", presupuestosIds)
          .order("created_at", { ascending: true });

      if (errorLineas) {
        throw errorLineas;
      }

      const produccionesExistentes =
        respuestaProduccionesExistentes.data || [];

      const clavesExistentes = new Set(
        produccionesExistentes.map((linea) =>
          crearClaveProduccion({
            catering_id: linea.catering_id,
            producto_id: linea.producto_id,
            producto_nombre: linea.producto_nombre,
            cantidad: linea.cantidad,
          }),
        ),
      );

      const nuevasProducciones = [];

      cateringsAceptados.forEach((catering) => {
        const lineasDelPresupuesto = (lineasPresupuesto || []).filter(
          (linea) =>
            String(linea.presupuesto_id) ===
            String(catering.presupuesto_id),
        );

        const clienteNombre =
          obtenerNombreCliente(catering.clientes) ||
          catering.titulo ||
          "Cliente";

        const direccionCompleta = [
          catering.direccion,
          catering.poblacion,
        ]
          .filter(Boolean)
          .join(", ");

        lineasDelPresupuesto.forEach((linea) => {
          const producto = linea.productos || null;
          const productoNombre =
            producto?.nombre ||
            linea.descripcion ||
            "Producto";

          const cantidad = Number(linea.cantidad || 0);

          if (cantidad <= 0) return;

          const clave = crearClaveProduccion({
            catering_id: catering.id,
            producto_id: linea.producto_id,
            producto_nombre: productoNombre,
            cantidad,
          });

          if (clavesExistentes.has(clave)) return;

          clavesExistentes.add(clave);

          nuevasProducciones.push({
            catering_id: catering.id,
            cliente_id: catering.cliente_id || null,
            cliente_nombre: clienteNombre,
            pedido_nombre:
              catering.titulo || "Catering aceptado",
            fecha: catering.fecha,
            zona: determinarZonaProduccion(
              producto,
              productoNombre,
            ),
            producto_id: linea.producto_id || null,
            producto_nombre: productoNombre,
            cantidad,
            unidad:
              producto?.unidad ||
              producto?.unidad_medida ||
              "unidades",
            responsable: null,
            hora_limite: catering.hora_inicio || null,
            estado: "Pendiente",
            direccion_entrega: direccionCompleta || null,
            observaciones: null,
            updated_at: new Date().toISOString(),
          });
        });
      });

      if (nuevasProducciones.length === 0) {
        if (!silencioso) {
          setMensaje(
            "La producción de los caterings aceptados ya estaba sincronizada.",
          );
        }
        return;
      }

      const { error: errorInsercion } = await supabase
        .from("producciones")
        .insert(nuevasProducciones);

      if (errorInsercion) {
        throw errorInsercion;
      }

      if (!silencioso) {
        setMensaje(
          `${nuevasProducciones.length} líneas de producción creadas correctamente.`,
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "No se ha podido importar la producción de los caterings aceptados.",
      );
    } finally {
      if (!silencioso) {
        setSincronizando(false);
      }
    }
  }

  async function cargarDatos() {
    setCargando(true);
    setError("");

    try {
      const [
        respuestaProducciones,
        respuestaCaterings,
        respuestaClientes,
        respuestaProductos,
      ] = await Promise.all([
        supabase
          .from("producciones")
          .select("*")
          .order("fecha", { ascending: true })
          .order("hora_limite", { ascending: true })
          .order("created_at", { ascending: true }),

        supabase
          .from("caterings")
          .select(
            `
              id,
              titulo,
              fecha,
              hora_inicio,
              hora_fin,
              direccion,
              poblacion,
              cliente_id,
              presupuesto_id,
              estado
            `,
          )
          .order("fecha", { ascending: true }),

        supabase
          .from("clientes")
          .select("id, nombre, empresa")
          .order("nombre", { ascending: true }),

        supabase
          .from("productos")
          .select("*")
          .order("nombre", { ascending: true }),
      ]);

      if (respuestaProducciones.error) {
        throw respuestaProducciones.error;
      }

      if (respuestaCaterings.error) {
        throw respuestaCaterings.error;
      }

      if (respuestaClientes.error) {
        throw respuestaClientes.error;
      }

      if (respuestaProductos.error) {
        throw respuestaProductos.error;
      }

      setProducciones(respuestaProducciones.data || []);
      setCaterings(respuestaCaterings.data || []);
      setClientes(respuestaClientes.data || []);
      setProductos(respuestaProductos.data || []);
    } catch (err) {
      setError(
        err.message || "No se ha podido cargar la producción.",
      );
    } finally {
      setCargando(false);
    }
  }

  const produccionesFecha = useMemo(() => {
    return producciones.filter(
      (linea) => linea.fecha === fechaSeleccionada,
    );
  }, [producciones, fechaSeleccionada]);

  const pedidosAgrupados = useMemo(() => {
    const grupos = {};

    produccionesFecha.forEach((linea) => {
      const clave =
        linea.catering_id ||
        `${linea.cliente_nombre || "Sin cliente"}-${
          linea.pedido_nombre || "Pedido manual"
        }`;

      if (!grupos[clave]) {
        grupos[clave] = {
          clave,
          catering_id: linea.catering_id,
          cliente_id: linea.cliente_id,
          cliente_nombre:
            linea.cliente_nombre || "Cliente sin indicar",
          pedido_nombre:
            linea.pedido_nombre || "Pedido sin nombre",
          direccion_entrega: linea.direccion_entrega || "",
          hora_limite: linea.hora_limite || "",
          lineas: [],
        };
      }

      grupos[clave].lineas.push(linea);
    });

    return Object.values(grupos).sort((a, b) => {
      return String(a.hora_limite || "").localeCompare(
        String(b.hora_limite || ""),
      );
    });
  }, [produccionesFecha]);

  const resumen = useMemo(() => {
    const total = produccionesFecha.length;

    const pendientes = produccionesFecha.filter(
      (linea) => linea.estado === "Pendiente",
    ).length;

    const enPreparacion = produccionesFecha.filter(
      (linea) => linea.estado === "En preparación",
    ).length;

    const terminados = produccionesFecha.filter(
      (linea) => linea.estado === "Terminado",
    ).length;

    return {
      total,
      pendientes,
      enPreparacion,
      terminados,
    };
  }, [produccionesFecha]);

  const diasSemanaBarra = useMemo(() => {
    const fechaBase = new Date(`${fechaSemanaBarra}T12:00:00`);
    const diaSemana = fechaBase.getDay();
    const diferenciaLunes = diaSemana === 0 ? -6 : 1 - diaSemana;

    const lunes = new Date(fechaBase);
    lunes.setDate(fechaBase.getDate() + diferenciaLunes);

    return Array.from({ length: 7 }, (_, indice) => {
      const fecha = new Date(lunes);
      fecha.setDate(lunes.getDate() + indice);

      return {
        fecha: obtenerFechaISO(fecha),
        nombre: new Intl.DateTimeFormat("es-ES", {
          weekday: "long",
        }).format(fecha),
        diaMes: new Intl.DateTimeFormat("es-ES", {
          day: "2-digit",
          month: "2-digit",
        }).format(fecha),
      };
    });
  }, [fechaSemanaBarra]);

  const produccionBarraSemana = useMemo(() => {
    const fechasSemana = new Set(diasSemanaBarra.map((dia) => dia.fecha));

    const lineasBarra = producciones.filter(
      (linea) =>
        linea.zona === "Barra" &&
        fechasSemana.has(linea.fecha) &&
        linea.estado !== "Cancelado",
    );

    const agrupado = {};

    diasSemanaBarra.forEach((dia) => {
      agrupado[dia.fecha] = {};
    });

    lineasBarra.forEach((linea) => {
      const clavePedido =
        linea.catering_id ||
        `${linea.cliente_nombre || "Sin cliente"}-${
          linea.pedido_nombre || "Pedido"
        }`;

      if (!agrupado[linea.fecha][clavePedido]) {
        agrupado[linea.fecha][clavePedido] = {
          clave: clavePedido,
          cliente_nombre: linea.cliente_nombre || "Cliente",
          pedido_nombre: linea.pedido_nombre || "Pedido",
          lineas: [],
        };
      }

      agrupado[linea.fecha][clavePedido].lineas.push(linea);
    });

    return agrupado;
  }, [producciones, diasSemanaBarra]);

  function cambiarSemanaBarra(semanas) {
    const fecha = new Date(`${fechaSemanaBarra}T12:00:00`);
    fecha.setDate(fecha.getDate() + semanas * 7);
    setFechaSemanaBarra(obtenerFechaISO(fecha));
  }

  function imprimirBarraSemanal() {
    const limpiar = () => {
      document.body.classList.remove("imprimiendo-barra-semanal");
      window.removeEventListener("afterprint", limpiar);
    };

    document.body.classList.add("imprimiendo-barra-semanal");
    window.addEventListener("afterprint", limpiar);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  const cateringsFecha = useMemo(() => {
    return caterings.filter(
      (catering) =>
        catering.fecha === formulario.fecha &&
        ["Aceptado", "Confirmado"].includes(catering.estado),
    );
  }, [caterings, formulario.fecha]);

  const productosZona = useMemo(() => {
    return productos.filter((producto) => {
      const zonaProducto =
        producto.zona_produccion ||
        producto.zona ||
        producto.seccion ||
        "";

      if (!zonaProducto) return true;

      return zonaProducto === formulario.zona;
    });
  }, [productos, formulario.zona]);

  function cambiarFecha(dias) {
    const fecha = new Date(
      `${fechaSeleccionada}T12:00:00`,
    );

    fecha.setDate(fecha.getDate() + dias);

    setFechaSeleccionada(obtenerFechaISO(fecha));
  }

  function irAHoy() {
    setFechaSeleccionada(obtenerFechaISO(new Date()));
  }

  function abrirNuevaLinea(datosPedido = null, zona = "Obrador") {
    setError("");
    setMensaje("");

    if (datosPedido) {
      setFormulario({
        ...FORMULARIO_INICIAL,
        catering_id: datosPedido.catering_id || "",
        cliente_id: datosPedido.cliente_id || "",
        cliente_nombre: datosPedido.cliente_nombre || "",
        pedido_nombre: datosPedido.pedido_nombre || "",
        fecha: fechaSeleccionada,
        zona,
        direccion_entrega:
          datosPedido.direccion_entrega || "",
        hora_limite: cortarHora(datosPedido.hora_limite),
      });
    } else {
      setFormulario({
        ...FORMULARIO_INICIAL,
        fecha: fechaSeleccionada,
        zona,
      });
    }

    setModalAbierto(true);
  }

  function abrirEditarLinea(linea) {
    setError("");
    setMensaje("");

    setFormulario({
      id: linea.id,
      catering_id: linea.catering_id || "",
      cliente_id: linea.cliente_id || "",
      cliente_nombre: linea.cliente_nombre || "",
      pedido_nombre: linea.pedido_nombre || "",
      fecha: linea.fecha || fechaSeleccionada,
      zona: linea.zona || "Obrador",
      producto_id: linea.producto_id || "",
      producto_nombre: linea.producto_nombre || "",
      cantidad: String(linea.cantidad ?? 1),
      unidad: linea.unidad || "unidades",
      responsable: linea.responsable || "",
      hora_limite: cortarHora(linea.hora_limite),
      estado: linea.estado || "Pendiente",
      direccion_entrega: linea.direccion_entrega || "",
      observaciones: linea.observaciones || "",
    });

    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;

    setModalAbierto(false);

    setFormulario({
      ...FORMULARIO_INICIAL,
      fecha: fechaSeleccionada,
    });
  }

  function modificarFormulario(campo, valor) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function seleccionarCatering(cateringId) {
    const catering = caterings.find(
      (elemento) => elemento.id === cateringId,
    );

    if (!catering) {
      setFormulario((anterior) => ({
        ...anterior,
        catering_id: "",
      }));

      return;
    }

    const cliente = clientes.find(
      (elemento) => elemento.id === catering.cliente_id,
    );

    const direccionCompleta = [
      catering.direccion,
      catering.poblacion,
    ]
      .filter(Boolean)
      .join(", ");

    setFormulario((anterior) => ({
      ...anterior,
      catering_id: catering.id,
      cliente_id: catering.cliente_id || "",
      cliente_nombre: obtenerNombreCliente(cliente),
      pedido_nombre: catering.titulo || "",
      fecha: catering.fecha || anterior.fecha,
      hora_limite: cortarHora(catering.hora_inicio),
      direccion_entrega: direccionCompleta,
    }));
  }

  function seleccionarCliente(clienteId) {
    const cliente = clientes.find(
      (elemento) => elemento.id === clienteId,
    );

    setFormulario((anterior) => ({
      ...anterior,
      cliente_id: clienteId,
      cliente_nombre: obtenerNombreCliente(cliente),
    }));
  }

  function seleccionarProducto(productoId) {
    const producto = productos.find(
      (elemento) => elemento.id === productoId,
    );

    if (!producto) {
      setFormulario((anterior) => ({
        ...anterior,
        producto_id: "",
      }));

      return;
    }

    const zonaProducto =
      producto.zona_produccion ||
      producto.zona ||
      formulario.zona;

    const unidadProducto =
      producto.unidad ||
      producto.unidad_medida ||
      "unidades";

    setFormulario((anterior) => ({
      ...anterior,
      producto_id: producto.id,
      producto_nombre:
        producto.nombre || producto.descripcion || "",
      zona: ZONAS.includes(zonaProducto)
        ? zonaProducto
        : anterior.zona,
      unidad: unidadProducto,
    }));
  }

  async function guardarLinea(event) {
    event.preventDefault();

    if (!formulario.cliente_nombre.trim()) {
      setError("Selecciona o escribe el nombre del cliente.");
      return;
    }

    if (!formulario.pedido_nombre.trim()) {
      setError("Escribe el nombre del pedido.");
      return;
    }

    if (!formulario.fecha) {
      setError("Selecciona una fecha de producción.");
      return;
    }

    if (!formulario.producto_nombre.trim()) {
      setError("Selecciona o escribe un producto.");
      return;
    }

    if (Number(formulario.cantidad) <= 0) {
      setError("La cantidad debe ser superior a cero.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const datos = {
      catering_id: formulario.catering_id || null,
      cliente_id: formulario.cliente_id || null,
      cliente_nombre:
        formulario.cliente_nombre.trim(),
      pedido_nombre: formulario.pedido_nombre.trim(),
      fecha: formulario.fecha,
      zona: formulario.zona,
      producto_id: formulario.producto_id || null,
      producto_nombre:
        formulario.producto_nombre.trim(),
      cantidad: Number(formulario.cantidad),
      unidad: formulario.unidad.trim() || "unidades",
      responsable:
        formulario.responsable.trim() || null,
      hora_limite: formulario.hora_limite || null,
      estado: formulario.estado,
      direccion_entrega:
        formulario.direccion_entrega.trim() || null,
      observaciones:
        formulario.observaciones.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (formulario.id) {
        const { error: errorSupabase } = await supabase
          .from("producciones")
          .update(datos)
          .eq("id", formulario.id);

        if (errorSupabase) {
          throw errorSupabase;
        }

        setMensaje(
          "Línea de producción actualizada correctamente.",
        );
      } else {
        const { error: errorSupabase } = await supabase
          .from("producciones")
          .insert(datos);

        if (errorSupabase) {
          throw errorSupabase;
        }

        setMensaje(
          "Línea de producción creada correctamente.",
        );
      }

      setFechaSeleccionada(formulario.fecha);
      setModalAbierto(false);

      setFormulario({
        ...FORMULARIO_INICIAL,
        fecha: formulario.fecha,
      });

      await cargarDatos();
    } catch (err) {
      setError(
        err.message ||
          "No se ha podido guardar la producción.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(linea, nuevoEstado) {
    setError("");
    setMensaje("");

    try {
      const { error: errorSupabase } = await supabase
        .from("producciones")
        .update({
          estado: nuevoEstado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", linea.id);

      if (errorSupabase) {
        throw errorSupabase;
      }

      setProducciones((anteriores) =>
        anteriores.map((elemento) =>
          elemento.id === linea.id
            ? {
                ...elemento,
                estado: nuevoEstado,
              }
            : elemento,
        ),
      );
    } catch (err) {
      setError(
        err.message ||
          "No se ha podido cambiar el estado.",
      );
    }
  }

  async function eliminarLinea() {
    if (!formulario.id) return;

    const confirmado = window.confirm(
      "¿Seguro que quieres eliminar esta línea de producción?",
    );

    if (!confirmado) return;

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const { error: errorSupabase } = await supabase
        .from("producciones")
        .delete()
        .eq("id", formulario.id);

      if (errorSupabase) {
        throw errorSupabase;
      }

      setModalAbierto(false);
      setMensaje(
        "Línea de producción eliminada correctamente.",
      );

      setFormulario({
        ...FORMULARIO_INICIAL,
        fecha: fechaSeleccionada,
      });

      await cargarDatos();
    } catch (err) {
      setError(
        err.message ||
          "No se ha podido eliminar la línea.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <style>{ESTILOS_PRODUCCION}</style>

      <section className="panel produccion-panel">
        <div className="produccion-cabecera">
          <div>
            <p className="produccion-etiqueta">
              GESTIÓN DIARIA
            </p>

            <h2>Producción por pedido</h2>

            <p className="produccion-descripcion">
              Cada cliente y pedido se muestra por separado.
            </p>
          </div>

          <div className="produccion-acciones-cabecera">
            <button
              type="button"
              className="boton-secundario-produccion"
              onClick={cargarDatos}
              disabled={cargando}
            >
              {cargando ? "Actualizando..." : "🔄 Recargar producción"}
            </button>

            <button
              type="button"
              className="boton-secundario-produccion"
              onClick={() => setVistaBarraSemanal((anterior) => !anterior)}
            >
              {vistaBarraSemanal
                ? "↩ Volver a Producción"
                : "☕ Vista semanal Barra"}
            </button>

            <button
              type="button"
              onClick={() => abrirNuevaLinea()}
            >
              + Añadir producción
            </button>
          </div>
        </div>

        {vistaBarraSemanal ? (
          <section className="barra-semanal-panel">
            <div className="barra-semanal-cabecera no-imprimir-barra">
              <div>
                <p className="produccion-etiqueta">BARRA</p>
                <h3>Plan semanal de Barra</h3>
                <p>
                  Preparación por días, sin horas. Pensado para imprimir y
                  preparar el día anterior.
                </p>
              </div>

              <div className="barra-semanal-acciones">
                <button
                  type="button"
                  className="boton-secundario-produccion"
                  onClick={() => cambiarSemanaBarra(-1)}
                >
                  ← Semana anterior
                </button>

                <button
                  type="button"
                  className="boton-secundario-produccion"
                  onClick={() => setFechaSemanaBarra(hoy)}
                >
                  Esta semana
                </button>

                <button
                  type="button"
                  className="boton-secundario-produccion"
                  onClick={() => cambiarSemanaBarra(1)}
                >
                  Semana siguiente →
                </button>

                <button type="button" onClick={imprimirBarraSemanal}>
                  🖨️ Imprimir Barra
                </button>
              </div>
            </div>

            <div className="barra-semanal-hoja">
              <div className="barra-semanal-titulo-print">
                <div>
                  <strong>PASTISSERIA CUSACHS</strong>
                  <h2>Plan semanal de Barra</h2>
                </div>
                <span>
                  {diasSemanaBarra[0]?.diaMes} -{" "}
                  {diasSemanaBarra[6]?.diaMes}
                </span>
              </div>

              <div className="barra-semanal-grid">
                {diasSemanaBarra.map((dia) => {
                  const pedidosDia = Object.values(
                    produccionBarraSemana[dia.fecha] || {},
                  );

                  return (
                    <section key={dia.fecha} className="barra-semanal-dia">
                      <div className="barra-semanal-dia-cabecera">
                        <strong>{dia.nombre}</strong>
                        <span>{dia.diaMes}</span>
                      </div>

                      {pedidosDia.length === 0 ? (
                        <div className="barra-semanal-vacio">Sin preparación</div>
                      ) : (
                        pedidosDia.map((pedido) => (
                          <div
                            key={pedido.clave}
                            className="barra-semanal-pedido"
                          >
                            <div className="barra-semanal-pedido-cabecera">
                              <strong>{pedido.cliente_nombre}</strong>
                              <span>{pedido.pedido_nombre}</span>
                            </div>

                            <div className="barra-semanal-lineas">
                              {pedido.lineas.map((linea) => (
                                <div
                                  key={linea.id}
                                  className="barra-semanal-linea"
                                >
                                  <span className="barra-check">☐</span>
                                  <span className="barra-cantidad">
                                    {formatearCantidad(linea.cantidad)}
                                  </span>
                                  <span className="barra-producto">
                                    {linea.producto_nombre}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
          <>
        <div className="produccion-fecha-barra">
          <div className="produccion-navegacion">
            <button
              type="button"
              onClick={() => cambiarFecha(-1)}
            >
              ←
            </button>

            <button
              type="button"
              className="boton-secundario-produccion"
              onClick={irAHoy}
            >
              Hoy
            </button>

            <button
              type="button"
              onClick={() => cambiarFecha(1)}
            >
              →
            </button>
          </div>

          <label className="produccion-selector-fecha">
            Fecha de producción
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(event) =>
                setFechaSeleccionada(event.target.value)
              }
            />
          </label>

          <div className="produccion-fecha-texto">
            {formatearFecha(fechaSeleccionada)}
          </div>
        </div>

        <div className="produccion-resumen">
          <div className="produccion-resumen-tarjeta">
            <span>Pedidos</span>
            <strong>{pedidosAgrupados.length}</strong>
          </div>

          <div className="produccion-resumen-tarjeta">
            <span>Líneas</span>
            <strong>{resumen.total}</strong>
          </div>

          <div className="produccion-resumen-tarjeta pendiente">
            <span>Pendientes</span>
            <strong>{resumen.pendientes}</strong>
          </div>

          <div className="produccion-resumen-tarjeta preparacion">
            <span>En preparación</span>
            <strong>{resumen.enPreparacion}</strong>
          </div>

          <div className="produccion-resumen-tarjeta terminado">
            <span>Terminadas</span>
            <strong>{resumen.terminados}</strong>
          </div>
        </div>

        {error && (
          <div className="produccion-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {mensaje && (
          <div className="produccion-mensaje">
            {mensaje}
          </div>
        )}

        {cargando ? (
          <div className="produccion-cargando">
            Cargando producción...
          </div>
        ) : pedidosAgrupados.length === 0 ? (
          <div className="produccion-vacia">
            <div className="produccion-vacia-icono">
              ✓
            </div>

            <h3>No hay producción para este día</h3>

            <p>
              Acepta un presupuesto para enviarlo automáticamente
              a Producción, o añade una línea manualmente.
            </p>

            <button
              type="button"
              onClick={() => abrirNuevaLinea()}
            >
              + Añadir producción
            </button>
          </div>
        ) : (
          <div className="produccion-pedidos">
            {pedidosAgrupados.map((pedido) => (
              <article
                key={pedido.clave}
                className="produccion-pedido"
              >
                <div className="produccion-pedido-cabecera">
                  <div>
                    <p className="produccion-cliente">
                      {pedido.cliente_nombre}
                    </p>

                    <h3>{pedido.pedido_nombre}</h3>

                    <div className="produccion-datos-pedido">
                      {pedido.hora_limite && (
                        <span>
                          🕒{" "}
                          {cortarHora(pedido.hora_limite)}
                        </span>
                      )}

                      {pedido.direccion_entrega && (
                        <span>
                          📍 {pedido.direccion_entrega}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="produccion-numero-lineas">
                    {pedido.lineas.length}{" "}
                    {pedido.lineas.length === 1
                      ? "línea"
                      : "líneas"}
                  </span>
                </div>

                <div className="produccion-zonas">
                  {ZONAS.map((zona) => {
                    const lineasZona =
                      pedido.lineas.filter(
                        (linea) => linea.zona === zona,
                      );

                    return (
                      <section
                        key={zona}
                        className="produccion-zona"
                      >
                        <div className="produccion-zona-cabecera">
                          <h4>
                            {obtenerIconoZona(zona)} {zona}
                          </h4>

                          <button
                            type="button"
                            className="boton-anadir-zona"
                            onClick={() =>
                              abrirNuevaLinea(pedido, zona)
                            }
                          >
                            +
                          </button>
                        </div>

                        {lineasZona.length === 0 ? (
                          <p className="produccion-zona-vacia">
                            Sin productos
                          </p>
                        ) : (
                          <div className="produccion-lineas">
                            {lineasZona.map((linea) => (
                              <div
                                key={linea.id}
                                className={[
                                  "produccion-linea",
                                  `linea-${normalizarClase(
                                    linea.estado,
                                  )}`,
                                ].join(" ")}
                              >
                                <button
                                  type="button"
                                  className="produccion-producto"
                                  onClick={() =>
                                    abrirEditarLinea(linea)
                                  }
                                >
                                  <strong>
                                    {linea.producto_nombre}
                                  </strong>

                                  <span>
                                    {formatearCantidad(
                                      linea.cantidad,
                                    )}{" "}
                                    {linea.unidad}
                                  </span>

                                  {linea.responsable && (
                                    <small>
                                      Responsable:{" "}
                                      {linea.responsable}
                                    </small>
                                  )}

                                  {linea.observaciones && (
                                    <small>
                                      {linea.observaciones}
                                    </small>
                                  )}
                                </button>

                                <select
                                  className={`produccion-estado estado-${normalizarClase(
                                    linea.estado,
                                  )}`}
                                  value={linea.estado}
                                  onChange={(event) =>
                                    cambiarEstado(
                                      linea,
                                      event.target.value,
                                    )
                                  }
                                >
                                  {ESTADOS.map((estado) => (
                                    <option
                                      key={estado}
                                      value={estado}
                                    >
                                      {estado}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
          </>
        )}
      </section>

      {modalAbierto && (
        <div
          className="produccion-modal-fondo"
          onMouseDown={cerrarModal}
        >
          <div
            className="produccion-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="produccion-modal-cabecera">
              <div>
                <p className="produccion-etiqueta">
                  PRODUCCIÓN
                </p>

                <h3>
                  {formulario.id
                    ? "Editar línea"
                    : "Nueva línea"}
                </h3>
              </div>

              <button
                type="button"
                className="produccion-cerrar"
                onClick={cerrarModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarLinea}>
              <div className="produccion-formulario">
                <label className="campo-produccion-ancho">
                  Catering relacionado
                  <select
                    value={formulario.catering_id}
                    onChange={(event) =>
                      seleccionarCatering(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Pedido manual, sin catering
                    </option>

                    {cateringsFecha.map((catering) => (
                      <option
                        key={catering.id}
                        value={catering.id}
                      >
                        {catering.hora_inicio
                          ? `${cortarHora(
                              catering.hora_inicio,
                            )} · `
                          : ""}
                        {catering.titulo}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Cliente *
                  <select
                    value={formulario.cliente_id}
                    onChange={(event) =>
                      seleccionarCliente(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Seleccionar cliente
                    </option>

                    {clientes.map((cliente) => (
                      <option
                        key={cliente.id}
                        value={cliente.id}
                      >
                        {obtenerNombreCliente(cliente)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Nombre visible del cliente *
                  <input
                    value={formulario.cliente_nombre}
                    onChange={(event) =>
                      modificarFormulario(
                        "cliente_nombre",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label className="campo-produccion-ancho">
                  Nombre del pedido *
                  <input
                    value={formulario.pedido_nombre}
                    onChange={(event) =>
                      modificarFormulario(
                        "pedido_nombre",
                        event.target.value,
                      )
                    }
                    placeholder="Ej. Coffee break Hospital Clínic"
                    required
                  />
                </label>

                <label>
                  Fecha de producción *
                  <input
                    type="date"
                    value={formulario.fecha}
                    onChange={(event) =>
                      modificarFormulario(
                        "fecha",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label>
                  Hora límite
                  <input
                    type="time"
                    value={formulario.hora_limite}
                    onChange={(event) =>
                      modificarFormulario(
                        "hora_limite",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Zona *
                  <select
                    value={formulario.zona}
                    onChange={(event) =>
                      modificarFormulario(
                        "zona",
                        event.target.value,
                      )
                    }
                  >
                    {ZONAS.map((zona) => (
                      <option key={zona} value={zona}>
                        {zona}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Producto del catálogo
                  <select
                    value={formulario.producto_id}
                    onChange={(event) =>
                      seleccionarProducto(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Escribir producto manualmente
                    </option>

                    {productosZona.map((producto) => (
                      <option
                        key={producto.id}
                        value={producto.id}
                      >
                        {producto.nombre ||
                          producto.descripcion}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="campo-produccion-ancho">
                  Producto *
                  <input
                    value={formulario.producto_nombre}
                    onChange={(event) =>
                      modificarFormulario(
                        "producto_nombre",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label>
                  Cantidad *
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formulario.cantidad}
                    onChange={(event) =>
                      modificarFormulario(
                        "cantidad",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label>
                  Unidad
                  <input
                    value={formulario.unidad}
                    onChange={(event) =>
                      modificarFormulario(
                        "unidad",
                        event.target.value,
                      )
                    }
                    placeholder="unidades, bandejas, kg..."
                  />
                </label>

                <label>
                  Responsable
                  <input
                    value={formulario.responsable}
                    onChange={(event) =>
                      modificarFormulario(
                        "responsable",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Estado
                  <select
                    value={formulario.estado}
                    onChange={(event) =>
                      modificarFormulario(
                        "estado",
                        event.target.value,
                      )
                    }
                  >
                    {ESTADOS.map((estado) => (
                      <option
                        key={estado}
                        value={estado}
                      >
                        {estado}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="campo-produccion-ancho">
                  Dirección de entrega
                  <input
                    value={formulario.direccion_entrega}
                    onChange={(event) =>
                      modificarFormulario(
                        "direccion_entrega",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="campo-produccion-ancho">
                  Observaciones
                  <textarea
                    value={formulario.observaciones}
                    onChange={(event) =>
                      modificarFormulario(
                        "observaciones",
                        event.target.value,
                      )
                    }
                    placeholder="Sin gluten, cortar en porciones, preparar en bandejas..."
                  />
                </label>
              </div>

              <div className="produccion-modal-acciones">
                <button
                  type="submit"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : "Guardar línea"}
                </button>

                <button
                  type="button"
                  className="boton-secundario-produccion"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                {formulario.id && (
                  <button
                    type="button"
                    className="boton-eliminar-produccion"
                    onClick={eliminarLinea}
                    disabled={guardando}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function crearClaveProduccion({
  catering_id,
  producto_id,
  producto_nombre,
  cantidad,
}) {
  return [
    String(catering_id || ""),
    String(producto_id || ""),
    normalizarTextoProduccion(producto_nombre),
    Number(cantidad || 0).toFixed(4),
  ].join("|");
}

function determinarZonaProduccion(producto, nombreProducto = "") {
  const zonaConfigurada =
    producto?.zona_produccion ||
    producto?.zona ||
    producto?.seccion ||
    "";

  if (ZONAS.includes(zonaConfigurada)) {
    return zonaConfigurada;
  }

  const texto = normalizarTextoProduccion(nombreProducto);

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

function normalizarTextoProduccion(valor) {
  return String(valor || "")
    .trim()
    .toLocaleLowerCase("es-ES")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function obtenerNombreCliente(cliente) {
  if (!cliente) return "";

  if (cliente.empresa && cliente.nombre) {
    return `${cliente.empresa} — ${cliente.nombre}`;
  }

  return cliente.empresa || cliente.nombre || "";
}

function obtenerFechaISO(fecha) {
  const año = fecha.getFullYear();

  const mes = String(fecha.getMonth() + 1).padStart(
    2,
    "0",
  );

  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${año}-${mes}-${dia}`;
}

function formatearFecha(fechaTexto) {
  if (!fechaTexto) return "";

  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${fechaTexto}T12:00:00`));
}

function cortarHora(hora) {
  return hora ? String(hora).slice(0, 5) : "";
}

function formatearCantidad(cantidad) {
  const numero = Number(cantidad || 0);

  return numero.toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  });
}

function normalizarClase(texto) {
  return String(texto || "pendiente")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function obtenerIconoZona(zona) {
  if (zona === "Obrador") return "🥐";
  if (zona === "Cocina") return "🍳";
  if (zona === "Barra") return "☕";

  return "✓";
}

const ESTILOS_PRODUCCION = `
  .produccion-panel {
    padding: 28px;
  }

  .produccion-cabecera,
  .produccion-fecha-barra,
  .produccion-pedido-cabecera,
  .produccion-zona-cabecera,
  .produccion-modal-cabecera,
  .produccion-modal-acciones {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .produccion-cabecera h2,
  .produccion-pedido h3,
  .produccion-modal h3 {
    margin: 0;
  }

  .produccion-etiqueta {
    margin: 0 0 6px;
    color: #7837a1;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 2px;
  }

  .produccion-descripcion {
    margin: 7px 0 0;
    color: #756d7a;
  }

  .produccion-acciones-cabecera {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .produccion-fecha-barra {
    margin: 24px 0 18px;
    padding: 15px;
    border: 1px solid #ded5e3;
    border-radius: 14px;
    background: #faf8fb;
  }

  .produccion-navegacion {
    display: flex;
    gap: 8px;
  }

  .boton-secundario-produccion {
    border: 1px solid #cbbbd4;
    background: #ffffff;
    color: #642a87;
  }

  .produccion-selector-fecha {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
  }

  .produccion-selector-fecha input {
    padding: 9px;
    border: 1px solid #cec4d3;
    border-radius: 9px;
  }

  .produccion-fecha-texto {
    color: #642a87;
    font-size: 17px;
    font-weight: 900;
    text-transform: capitalize;
  }

  .produccion-resumen {
    display: grid;
    grid-template-columns: repeat(5, minmax(130px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }

  .produccion-resumen-tarjeta {
    padding: 15px;
    border: 1px solid #ded5e3;
    border-radius: 13px;
    background: #ffffff;
  }

  .produccion-resumen-tarjeta span {
    display: block;
    color: #756d7a;
    font-size: 13px;
    font-weight: 700;
  }

  .produccion-resumen-tarjeta strong {
    display: block;
    margin-top: 5px;
    color: #302738;
    font-size: 25px;
  }

  .produccion-resumen-tarjeta.pendiente {
    background: #fff8df;
  }

  .produccion-resumen-tarjeta.preparacion {
    background: #e7f2ff;
  }

  .produccion-resumen-tarjeta.terminado {
    background: #e5f7ec;
  }

  .produccion-error,
  .produccion-mensaje,
  .produccion-cargando {
    margin-bottom: 16px;
    padding: 13px 15px;
    border-radius: 10px;
  }

  .produccion-error {
    background: #fde9ed;
    color: #a52d43;
  }

  .produccion-mensaje {
    background: #e5f7ec;
    color: #256b41;
  }

  .produccion-cargando {
    background: #f3eff5;
    color: #625968;
  }

  .produccion-vacia {
    padding: 55px 20px;
    border: 1px dashed #cbbfd1;
    border-radius: 17px;
    background: #faf8fb;
    text-align: center;
  }

  .produccion-vacia-icono {
    display: flex;
    width: 56px;
    height: 56px;
    align-items: center;
    justify-content: center;
    margin: 0 auto 15px;
    border-radius: 50%;
    background: #eee2f5;
    color: #713397;
    font-size: 27px;
    font-weight: 900;
  }

  .produccion-vacia h3 {
    margin: 0 0 8px;
  }

  .produccion-vacia p {
    margin: 0 0 18px;
    color: #756d7a;
  }

  .produccion-pedidos {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .produccion-pedido {
    overflow: hidden;
    border: 1px solid #dcd2e1;
    border-radius: 17px;
    background: #ffffff;
    box-shadow: 0 8px 25px rgba(55, 31, 70, 0.07);
  }

  .produccion-pedido-cabecera {
    padding: 18px 20px;
    background: linear-gradient(
      135deg,
      #f4eaf8,
      #ffffff
    );
  }

  .produccion-cliente {
    margin: 0 0 5px;
    color: #713397;
    font-size: 14px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .produccion-pedido h3 {
    font-size: 23px;
  }

  .produccion-datos-pedido {
    display: flex;
    flex-wrap: wrap;
    gap: 13px;
    margin-top: 8px;
    color: #665d6b;
    font-size: 14px;
  }

  .produccion-numero-lineas {
    padding: 8px 12px;
    border-radius: 999px;
    background: #ffffff;
    color: #642a87;
    font-weight: 800;
  }

  .produccion-zonas {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
  }

  .produccion-zona {
    min-height: 180px;
    padding: 16px;
    border-top: 1px solid #e5dee8;
    border-right: 1px solid #e5dee8;
  }

  .produccion-zona:last-child {
    border-right: 0;
  }

  .produccion-zona-cabecera h4 {
    margin: 0;
    font-size: 17px;
  }

  .boton-anadir-zona {
    width: 34px;
    min-height: 34px;
    padding: 0;
    border-radius: 50%;
  }

  .produccion-zona-vacia {
    margin: 25px 0;
    color: #9b929f;
    text-align: center;
  }

  .produccion-lineas {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-top: 13px;
  }

  .produccion-linea {
    overflow: hidden;
    border: 1px solid #ded5e3;
    border-left: 5px solid #d5a72e;
    border-radius: 11px;
    background: #ffffff;
  }

  .produccion-linea.linea-en-preparacion {
    border-left-color: #3484c5;
  }

  .produccion-linea.linea-terminado {
    border-left-color: #3a9d60;
  }

  .produccion-linea.linea-cancelado {
    border-left-color: #bd4054;
    opacity: 0.72;
  }

  .produccion-producto {
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    padding: 11px;
    border: 0;
    border-radius: 0;
    background: #ffffff;
    color: #302738;
    text-align: left;
    box-shadow: none;
  }

  .produccion-producto:hover {
    background: #faf7fc;
    color: #302738;
    transform: none;
  }

  .produccion-producto span {
    color: #713397;
    font-weight: 900;
  }

  .produccion-producto small {
    color: #756d7a;
  }

  .produccion-estado {
    width: calc(100% - 16px);
    margin: 0 8px 8px;
    padding: 7px;
    border: 1px solid #d4cad9;
    border-radius: 8px;
    font-weight: 700;
  }

  .estado-pendiente {
    background: #fff8df;
  }

  .estado-en-preparacion {
    background: #e7f2ff;
  }

  .estado-terminado {
    background: #e5f7ec;
  }

  .estado-cancelado {
    background: #fde9ed;
  }

  .produccion-modal-fondo {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(31, 20, 37, 0.62);
  }

  .produccion-modal {
    width: min(970px, 100%);
    max-height: 92vh;
    overflow-y: auto;
    padding: 26px;
    border-radius: 20px;
    background: #ffffff;
    box-shadow: 0 25px 70px rgba(25, 12, 34, 0.3);
  }

  .produccion-cerrar {
    width: 43px;
    min-height: 43px;
    padding: 0;
    border: 1px solid #d1c7d6;
    background: #ffffff;
    color: #4d4451;
    font-size: 25px;
  }

  .produccion-formulario {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-top: 20px;
  }

  .produccion-formulario label {
    display: flex;
    flex-direction: column;
    gap: 7px;
    font-weight: 800;
  }

  .produccion-formulario input,
  .produccion-formulario select,
  .produccion-formulario textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 11px;
    border: 1px solid #cfc5d4;
    border-radius: 9px;
    font: inherit;
  }

  .produccion-formulario textarea {
    min-height: 100px;
    resize: vertical;
  }

  .campo-produccion-ancho {
    grid-column: 1 / -1;
  }

  .produccion-modal-acciones {
    justify-content: flex-start;
    margin-top: 22px;
  }

  .boton-eliminar-produccion {
    margin-left: auto;
    background: #bb334b;
  }

  .barra-semanal-panel {
    margin-top: 22px;
  }

  .barra-semanal-cabecera,
  .barra-semanal-titulo-print {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .barra-semanal-cabecera {
    margin-bottom: 16px;
  }

  .barra-semanal-cabecera h3,
  .barra-semanal-titulo-print h2 {
    margin: 0;
  }

  .barra-semanal-cabecera p {
    margin: 6px 0 0;
    color: #756d7a;
  }

  .barra-semanal-acciones {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .barra-semanal-hoja {
    overflow: hidden;
    border: 1px solid #d8cedd;
    border-radius: 16px;
    background: #ffffff;
  }

  .barra-semanal-titulo-print {
    padding: 16px 18px;
    border-bottom: 1px solid #d8cedd;
    background: #f7f1fa;
  }

  .barra-semanal-titulo-print strong {
    color: #713397;
    font-size: 12px;
    letter-spacing: 1.5px;
  }

  .barra-semanal-titulo-print span {
    font-weight: 900;
  }

  .barra-semanal-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }

  .barra-semanal-dia {
    min-height: 420px;
    border-right: 1px solid #ded5e3;
  }

  .barra-semanal-dia:last-child {
    border-right: 0;
  }

  .barra-semanal-dia-cabecera {
    padding: 11px 8px;
    border-bottom: 1px solid #ded5e3;
    background: #f0f3ef;
    text-align: center;
    text-transform: capitalize;
  }

  .barra-semanal-dia-cabecera strong,
  .barra-semanal-dia-cabecera span {
    display: block;
  }

  .barra-semanal-dia-cabecera span {
    margin-top: 3px;
    font-size: 12px;
  }

  .barra-semanal-vacio {
    padding: 28px 8px;
    color: #9b929f;
    font-size: 12px;
    text-align: center;
  }

  .barra-semanal-pedido {
    padding: 9px 8px;
    border-bottom: 1px solid #ece5ef;
  }

  .barra-semanal-pedido-cabecera {
    margin-bottom: 7px;
  }

  .barra-semanal-pedido-cabecera strong,
  .barra-semanal-pedido-cabecera span {
    display: block;
  }

  .barra-semanal-pedido-cabecera strong {
    color: #642a87;
    font-size: 12px;
  }

  .barra-semanal-pedido-cabecera span {
    margin-top: 2px;
    font-size: 11px;
    color: #756d7a;
  }

  .barra-semanal-lineas {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .barra-semanal-linea {
    display: grid;
    grid-template-columns: 18px 30px 1fr;
    gap: 4px;
    align-items: start;
    font-size: 11px;
    line-height: 1.25;
  }

  .barra-check {
    font-size: 14px;
  }

  .barra-cantidad {
    font-weight: 900;
    text-align: right;
  }

  .barra-producto {
    overflow-wrap: anywhere;
  }

  @media print {
    body.imprimiendo-barra-semanal * {
      visibility: hidden !important;
    }

    body.imprimiendo-barra-semanal .barra-semanal-hoja,
    body.imprimiendo-barra-semanal .barra-semanal-hoja * {
      visibility: visible !important;
    }

    body.imprimiendo-barra-semanal .barra-semanal-hoja {
      position: fixed;
      inset: 0;
      width: 100%;
      height: auto;
      border: 0;
      border-radius: 0;
    }

    body.imprimiendo-barra-semanal .barra-semanal-grid {
      grid-template-columns: repeat(7, 1fr);
    }

    body.imprimiendo-barra-semanal .barra-semanal-dia {
      min-height: 0;
    }

    @page {
      size: A4 landscape;
      margin: 8mm;
    }
  }

  @media (max-width: 1100px) {
    .produccion-resumen {
      grid-template-columns: repeat(3, 1fr);
    }

    .produccion-zonas {
      grid-template-columns: 1fr;
    }

    .produccion-zona {
      border-right: 0;
    }
  }

  @media (max-width: 750px) {
    .produccion-cabecera,
    .produccion-fecha-barra,
    .produccion-pedido-cabecera {
      align-items: stretch;
      flex-direction: column;
    }

    .produccion-acciones-cabecera {
      flex-direction: column;
    }

    .produccion-acciones-cabecera button {
      width: 100%;
    }

    .produccion-resumen {
      grid-template-columns: repeat(2, 1fr);
    }

    .produccion-formulario {
      grid-template-columns: 1fr;
    }

    .campo-produccion-ancho {
      grid-column: auto;
    }

    .produccion-modal-acciones {
      flex-direction: column;
    }

    .produccion-modal-acciones button {
      width: 100%;
    }

    .boton-eliminar-produccion {
      margin-left: 0;
    }
  }
`;

export default Produccion;