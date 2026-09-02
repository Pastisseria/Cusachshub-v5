import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase.js";

const CATEGORIAS = ["Coffee Break", "Desayuno", "Finger Lunch", "Otras"];

const VACIO = {
  nombre: "",
  categoria: "Coffee Break",
  personas: 1,
  idioma: "es",
  observaciones: "",
  lineas: [],
  total: 0,
  activo: true,
};

const LINEA_VACIA = {
  descripcion: "",
  cantidad: 1,
};

const PROPUESTAS_CUSACHS = [
  {
    nombre: "Desayuno · Opción 1",
    categoria: "Desayuno",
    personas: 10,
    idioma: "es",
    total: 5.2,
    observaciones: "Mínimo 10 personas.",
    lineas: [
      { descripcion: "Café", cantidad: 1 },
      { descripcion: "Leche", cantidad: 1 },
      { descripcion: "Leche vegetal", cantidad: 1 },
      { descripcion: "Mini croissant", cantidad: 1 },
      { descripcion: "Mini ensaimada", cantidad: 1 },
    ],
  },
  {
    nombre: "Desayuno · Opción 2",
    categoria: "Desayuno",
    personas: 10,
    idioma: "es",
    total: 6.5,
    observaciones: "",
    lineas: [
      { descripcion: "Café", cantidad: 1 },
      { descripcion: "Leche", cantidad: 1 },
      { descripcion: "Leche vegetal", cantidad: 1 },
      { descripcion: "Mini bocadillo", cantidad: 1 },
      { descripcion: "Mini croissant de chocolate", cantidad: 1 },
    ],
  },
  {
    nombre: "Desayuno · Opción 3",
    categoria: "Desayuno",
    personas: 10,
    idioma: "es",
    total: 9.5,
    observaciones: "",
    lineas: [
      { descripcion: "Café", cantidad: 1 },
      { descripcion: "Leche", cantidad: 1 },
      { descripcion: "Leche vegetal", cantidad: 1 },
      { descripcion: "Mini bocadillo", cantidad: 1 },
      { descripcion: "Mini brioche o mini viena", cantidad: 1 },
      { descripcion: "Mini croissant de chocolate", cantidad: 1 },
      { descripcion: "Mini ensaimada", cantidad: 1 },
    ],
  },
  {
    nombre: "Desayuno · Opción 4",
    categoria: "Desayuno",
    personas: 10,
    idioma: "es",
    total: 9,
    observaciones: "",
    lineas: [
      {
        descripcion:
          "2 miniaturas dulces (mini croissant, mini croissant de chocolate, mini palmera, mini lacito de chocolate, mini chucho...)",
        cantidad: 1,
      },
      { descripcion: "Café", cantidad: 1 },
      { descripcion: "Leche", cantidad: 1 },
      { descripcion: "Leche vegetal", cantidad: 1 },
      { descripcion: "Zumo", cantidad: 1 },
      { descripcion: "Agua para infusión", cantidad: 1 },
      { descripcion: "Menaje", cantidad: 1 },
    ],
  },
  {
    nombre: "Desayuno · Opción 5",
    categoria: "Desayuno",
    personas: 10,
    idioma: "es",
    total: 12,
    observaciones: "",
    lineas: [
      {
        descripcion:
          "2 miniaturas saladas (mini bocadillo y mini dedo de brioche o mini viena)",
        cantidad: 1,
      },
      {
        descripcion:
          "2 miniaturas dulces (mini croissant, mini croissant de chocolate, mini palmera, mini lacito de chocolate, mini chucho...)",
        cantidad: 1,
      },
      { descripcion: "Café", cantidad: 1 },
      { descripcion: "Leche", cantidad: 1 },
      { descripcion: "Leche vegetal", cantidad: 1 },
      { descripcion: "Zumo", cantidad: 1 },
      { descripcion: "Agua para infusión", cantidad: 1 },
      { descripcion: "Menaje", cantidad: 1 },
    ],
  },
  {
    nombre: "Desayuno · Opción 6",
    categoria: "Desayuno",
    personas: 10,
    idioma: "es",
    total: 10,
    observaciones:
      "Opción celíaca +2 €/persona. Opción vegetariana/vegana +1 €/persona.",
    lineas: [
      {
        descripcion:
          "1 miniatura salada (mini bocadillo y mini dedo de brioche o mini viena)",
        cantidad: 1,
      },
      {
        descripcion:
          "1 miniatura dulce (mini croissant, mini croissant de chocolate, mini palmera, mini lacito de chocolate, mini chucho...)",
        cantidad: 1,
      },
      { descripcion: "Café", cantidad: 1 },
      { descripcion: "Leche", cantidad: 1 },
      { descripcion: "Leche vegetal", cantidad: 1 },
      { descripcion: "Zumo", cantidad: 1 },
      { descripcion: "Agua para infusión", cantidad: 1 },
      { descripcion: "Menaje", cantidad: 1 },
    ],
  },

  {
    nombre: "Comida · Opción 1",
    categoria: "Finger Lunch",
    personas: 10,
    idioma: "es",
    total: 22,
    observaciones: "",
    lineas: [
      { descripcion: "Bandeja de jamón ibérico con pan de coca", cantidad: 1 },
      {
        descripcion: "Ensalada de mezclum con aguacate, mango y frutos secos",
        cantidad: 1,
      },
      { descripcion: "Vasitos de crema de temporada", cantidad: 1 },
      { descripcion: "Tortilla de patata y cebolla", cantidad: 1 },
      { descripcion: "Croquetas de setas", cantidad: 1 },
      { descripcion: "Gyozas de verduras o pollo", cantidad: 1 },
      { descripcion: "Bandeja de quesos", cantidad: 1 },
      { descripcion: "Coca de chocolate", cantidad: 1 },
      { descripcion: "Brocheta de fruta", cantidad: 1 },
    ],
  },
  {
    nombre: "Comida · Opción 2",
    categoria: "Finger Lunch",
    personas: 10,
    idioma: "es",
    total: 18,
    observaciones: "",
    lineas: [
      { descripcion: "Bandeja de jamón ibérico con pan de coca", cantidad: 1 },
      { descripcion: "Mini quiche de puerro y roquefort", cantidad: 1 },
      { descripcion: "Tortilla de calabacín grande", cantidad: 1 },
      { descripcion: "Croquetas de arroz y calabaza", cantidad: 1 },
      { descripcion: "Wok de verduras salteadas con soja", cantidad: 1 },
      {
        descripcion: "Mini vol-au-vents de setas con bechamel",
        cantidad: 1,
      },
      { descripcion: "Cremas catalanas", cantidad: 1 },
      { descripcion: "Mini tartaletas de chocolate", cantidad: 1 },
    ],
  },
  {
    nombre: "Comida · Opción 3",
    categoria: "Finger Lunch",
    personas: 10,
    idioma: "es",
    total: 15,
    observaciones: "",
    lineas: [
      { descripcion: "Tortilla de patata y cebolla pequeña", cantidad: 1 },
      { descripcion: "Croquetas de jamón y setas", cantidad: 1 },
      {
        descripcion: "Mini ensaladas de cuscús con verduritas",
        cantidad: 1,
      },
      {
        descripcion: "Mini hamburguesas con cebolla caramelizada",
        cantidad: 1,
      },
      { descripcion: "Gyozas de verduras", cantidad: 1 },
      { descripcion: "Coca de chocolate y hojaldre", cantidad: 1 },
      { descripcion: "Brochetas de fruta", cantidad: 1 },
    ],
  },
  {
    nombre: "Comida · Opción 4",
    categoria: "Finger Lunch",
    personas: 10,
    idioma: "es",
    total: 18.3,
    observaciones: "",
    lineas: [
      {
        descripcion: "Ensalada de edamame, quinoa y verduritas",
        cantidad: 1,
      },
      {
        descripcion: "Hummus de garbanzos con palitos de zanahoria",
        cantidad: 1,
      },
      {
        descripcion: "Mini vols de pollo con salsa Café de París",
        cantidad: 1,
      },
      { descripcion: "1/2 coca de verduras", cantidad: 1 },
      { descripcion: "1 tortilla de patata y cebolla", cantidad: 1 },
      { descripcion: "10 brochetas de fruta", cantidad: 1 },
      { descripcion: "Coca de chocolate y hojaldre", cantidad: 1 },
    ],
  },
  {
    nombre: "Comida · Opción 5",
    categoria: "Finger Lunch",
    personas: 10,
    idioma: "es",
    total: 14.5,
    observaciones: "",
    lineas: [
      { descripcion: "Tortilla de calabacín grande", cantidad: 1 },
      { descripcion: "Chapatas de jamón con aguacate", cantidad: 1 },
      { descripcion: "Croquetas variadas", cantidad: 1 },
      {
        descripcion: "Ensalada de mezclum, tomate cherry y atún",
        cantidad: 1,
      },
      { descripcion: "Tostas de escalivada", cantidad: 1 },
      { descripcion: "Brochetas de fruta", cantidad: 1 },
    ],
  },
  {
    nombre: "Comida · Opción 6",
    categoria: "Finger Lunch",
    personas: 10,
    idioma: "es",
    total: 14.2,
    observaciones: "",
    lineas: [
      {
        descripcion: "Ensalada de pasta integral con verduritas",
        cantidad: 1,
      },
      { descripcion: "Brocheta de tomate y mozzarella", cantidad: 1 },
      { descripcion: "Vols de bacalao a la miel", cantidad: 1 },
      { descripcion: "Pollo Orly", cantidad: 1 },
      { descripcion: "Tortilla de berenjena", cantidad: 1 },
      { descripcion: "Brocheta de fruta", cantidad: 1 },
      { descripcion: "Coca de chocolate", cantidad: 1 },
    ],
  },
  {
    nombre: "Comida · Opción 8",
    categoria: "Finger Lunch",
    personas: 10,
    idioma: "es",
    total: 13.5,
    observaciones: "",
    lineas: [
      { descripcion: "Croquetas de jamón", cantidad: 1 },
      {
        descripcion: "Mini patata rellena de brandada de bacalao",
        cantidad: 1,
      },
      { descripcion: "Coca de setas y foie", cantidad: 1 },
      {
        descripcion: "Ensalada de fideos chinos con verduritas y soja",
        cantidad: 1,
      },
      {
        descripcion: "Vols de pollo al Café de París",
        cantidad: 1,
      },
      { descripcion: "Brocheta de fruta", cantidad: 1 },
    ],
  },

  {
    nombre: "Ideas catering · Brochetas",
    categoria: "Otras",
    personas: 1,
    idioma: "es",
    total: 0,
    observaciones: "Selección de ideas sin precio cerrado.",
    lineas: [
      {
        descripcion: "Roast beef, espárrago verde y salsa de trufa",
        cantidad: 1,
      },
      { descripcion: "Uva y queso de cabra", cantidad: 1 },
      { descripcion: "Calabacín y mozzarella", cantidad: 1 },
    ],
  },
  {
    nombre: "Ideas catering · Potet bambú",
    categoria: "Otras",
    personas: 1,
    idioma: "es",
    total: 0,
    observaciones: "Selección de ideas sin precio cerrado.",
    lineas: [
      { descripcion: "Habitas a la menta", cantidad: 1 },
      { descripcion: "Ensaladilla rusa", cantidad: 1 },
      { descripcion: "Salpicón de langostino", cantidad: 1 },
    ],
  },
  {
    nombre: "Ideas catering · Montaditos",
    categoria: "Otras",
    personas: 1,
    idioma: "es",
    total: 0,
    observaciones: "Selección de ideas sin precio cerrado.",
    lineas: [
      {
        descripcion:
          "Montadito de salmón marinado con aguacate, ricotta y pimienta",
        cantidad: 1,
      },
      {
        descripcion: "Hot dog de gambas con mayonesa de lima",
        cantidad: 1,
      },
      {
        descripcion:
          "Focaccia de queso, pesto, tomate seco y aceitunas Kalamata",
        cantidad: 1,
      },
      { descripcion: "Tartar de dorada con pico de gallo", cantidad: 1 },
      {
        descripcion: "Bikini de roast beef con trufa, queso y rúcula",
        cantidad: 1,
      },
      { descripcion: "Coulant de patata con pulpo", cantidad: 1 },
      {
        descripcion: "Pan bao con costilla (pulled pork) y mayonesa",
        cantidad: 1,
      },
      {
        descripcion:
          "Mini canelón de pato con trufa y parmesano rebozado",
        cantidad: 1,
      },
    ],
  },
];

function numero(valor) {
  const resultado = Number(String(valor ?? 0).replace(",", "."));
  return Number.isFinite(resultado) ? resultado : 0;
}

function redondear(valor) {
  return Math.round((numero(valor) + Number.EPSILON) * 100) / 100;
}

function euros(valor) {
  return numero(valor).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function fechaActual() {
  return new Date().toISOString().slice(0, 10);
}

function generarNumeroDocumento() {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  const hora = String(ahora.getHours()).padStart(2, "0");
  const minutos = String(ahora.getMinutes()).padStart(2, "0");
  const segundos = String(ahora.getSeconds()).padStart(2, "0");

  return `CAT-${año}${mes}${dia}-${hora}${minutos}${segundos}`;
}

function normalizarLineas(lineas) {
  if (!Array.isArray(lineas)) return [];

  return lineas
    .map((linea) => ({
      descripcion: String(linea?.descripcion || "").trim(),
      cantidad: Math.max(1, numero(linea?.cantidad || 1)),
    }))
    .filter((linea) => linea.descripcion);
}

function PresupuestosEstandar() {
  const navigate = useNavigate();

  const [plantillas, setPlantillas] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [formulario, setFormulario] = useState(VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [filtro, setFiltro] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [importando, setImportando] = useState(false);

  const [plantillaParaPresupuesto, setPlantillaParaPresupuesto] =
    useState(null);

  const [clienteId, setClienteId] = useState("");
  const [fechaPresupuesto, setFechaPresupuesto] = useState(fechaActual());
  const [personasPresupuesto, setPersonasPresupuesto] = useState(1);
  const [creandoPresupuesto, setCreandoPresupuesto] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    setError("");

    const [respuestaPlantillas, respuestaClientes] = await Promise.all([
      supabase
        .from("presupuestos_estandar")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("clientes")
        .select("id, nombre, empresa")
        .eq("activo", true)
        .order("nombre"),
    ]);

    if (respuestaPlantillas.error) {
      setError(respuestaPlantillas.error.message);
    } else {
      setPlantillas(respuestaPlantillas.data || []);
    }

    if (respuestaClientes.error) {
      setError((anterior) =>
        [anterior, respuestaClientes.error.message]
          .filter(Boolean)
          .join(" · "),
      );
    } else {
      setClientes(respuestaClientes.data || []);
    }

    setCargando(false);
  }

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return plantillas.filter((plantilla) => {
      const coincideCategoria =
        filtro === "Todas" || plantilla.categoria === filtro;

      const coincideBusqueda =
        !texto ||
        String(plantilla.nombre || "")
          .toLowerCase()
          .includes(texto) ||
        String(plantilla.observaciones || "")
          .toLowerCase()
          .includes(texto);

      return coincideCategoria && coincideBusqueda;
    });
  }, [plantillas, filtro, busqueda]);

  async function guardar(evento) {
    evento.preventDefault();

    if (!formulario.nombre.trim()) {
      setError("Indica el nombre.");
      return;
    }

    const lineasNormalizadas = normalizarLineas(formulario.lineas);

    const payload = {
      ...formulario,
      nombre: formulario.nombre.trim(),
      personas: Math.max(1, numero(formulario.personas)),
      total: redondear(formulario.total),
      lineas: lineasNormalizadas,
      updated_at: new Date().toISOString(),
    };

    const respuesta = editandoId
      ? await supabase
          .from("presupuestos_estandar")
          .update(payload)
          .eq("id", editandoId)
      : await supabase.from("presupuestos_estandar").insert(payload);

    if (respuesta.error) {
      setError(respuesta.error.message);
      return;
    }

    setMensaje(
      editandoId
        ? "Plantilla actualizada correctamente."
        : "Plantilla creada correctamente.",
    );

    setMostrarFormulario(false);
    setFormulario(VACIO);
    setEditandoId(null);

    await cargar();
  }

  function editar(plantilla) {
    setFormulario({
      nombre: plantilla.nombre || "",
      categoria: plantilla.categoria || "Coffee Break",
      personas: plantilla.personas || 1,
      idioma: plantilla.idioma || "es",
      observaciones: plantilla.observaciones || "",
      lineas: normalizarLineas(plantilla.lineas),
      total: numero(plantilla.total),
      activo: plantilla.activo !== false,
    });

    setEditandoId(plantilla.id);
    setMostrarFormulario(true);
    setError("");
    setMensaje("");
  }

  async function duplicar(plantilla) {
    setError("");
    setMensaje("");

    const payload = {
      nombre: `${plantilla.nombre} · COPIA`,
      categoria: plantilla.categoria || "Otras",
      personas: plantilla.personas || 1,
      idioma: plantilla.idioma || "es",
      observaciones: plantilla.observaciones || "",
      lineas: normalizarLineas(plantilla.lineas),
      total: numero(plantilla.total),
      activo: plantilla.activo !== false,
      updated_at: new Date().toISOString(),
    };

    const { error: errorDuplicado } = await supabase
      .from("presupuestos_estandar")
      .insert(payload);

    if (errorDuplicado) {
      setError(errorDuplicado.message);
      return;
    }

    setMensaje(`"${plantilla.nombre}" duplicado correctamente.`);
    await cargar();
  }

  async function eliminar(id) {
    if (!window.confirm("¿Eliminar esta plantilla?")) return;

    setError("");
    setMensaje("");

    const { error: errorBorrado } = await supabase
      .from("presupuestos_estandar")
      .delete()
      .eq("id", id);

    if (errorBorrado) {
      setError(errorBorrado.message);
      return;
    }

    setMensaje("Plantilla eliminada.");
    await cargar();
  }

  async function importarPropuestasCusachs() {
    setImportando(true);
    setError("");
    setMensaje("");

    try {
      const { data: existentes, error: errorExistentes } = await supabase
        .from("presupuestos_estandar")
        .select("nombre");

      if (errorExistentes) throw errorExistentes;

      const nombresExistentes = new Set(
        (existentes || []).map((elemento) =>
          String(elemento.nombre || "").trim().toLowerCase(),
        ),
      );

      const nuevas = PROPUESTAS_CUSACHS.filter(
        (propuesta) =>
          !nombresExistentes.has(
            propuesta.nombre.trim().toLowerCase(),
          ),
      ).map((propuesta) => ({
        ...propuesta,
        activo: true,
        updated_at: new Date().toISOString(),
      }));

      if (nuevas.length === 0) {
        setMensaje("Las propuestas Cusachs ya están cargadas.");
        return;
      }

      const { error: errorInsert } = await supabase
        .from("presupuestos_estandar")
        .insert(nuevas);

      if (errorInsert) throw errorInsert;

      setMensaje(
        `${nuevas.length} propuestas Cusachs añadidas correctamente.`,
      );

      await cargar();
    } catch (err) {
      setError(
        err.message ||
          "No se han podido importar las propuestas.",
      );
    } finally {
      setImportando(false);
    }
  }

  function abrirUsarEnPresupuesto(plantilla) {
    setPlantillaParaPresupuesto(plantilla);
    setClienteId("");
    setFechaPresupuesto(fechaActual());
    setPersonasPresupuesto(
      Math.max(1, numero(plantilla.personas || 1)),
    );
    setError("");
    setMensaje("");
  }

  async function crearPresupuestoDesdePlantilla(evento) {
    evento.preventDefault();

    if (!plantillaParaPresupuesto) return;

    if (!clienteId) {
      setError("Selecciona un cliente.");
      return;
    }

    const personas = Math.max(
      1,
      numero(personasPresupuesto),
    );

    const precioPorPersona = redondear(
      plantillaParaPresupuesto.total,
    );

    const lineasDetalle = normalizarLineas(
      plantillaParaPresupuesto.lineas,
    );

    if (lineasDetalle.length === 0) {
      setError(
        "La plantilla no tiene líneas. Edítala y añade al menos una.",
      );
      return;
    }

    setCreandoPresupuesto(true);
    setError("");
    setMensaje("");

    try {
      const numeroDocumento = generarNumeroDocumento();

      /*
       * La línea económica es la que da valor al presupuesto.
       * Las demás líneas son descriptivas y aparecen con precio 0.
       */
      const lineasPresupuesto = [
        {
          descripcion: plantillaParaPresupuesto.nombre,
          cantidad: personas,
          precio_unitario: precioPorPersona,
          iva: 10,
        },
        ...lineasDetalle.map((linea) => ({
          descripcion: linea.descripcion,
          /*
           * Cada línea de la propuesta se adapta al número de personas.
           * Si la plantilla tiene cantidad 1 y escogemos 30 personas,
           * el presupuesto mostrará 30 unidades.
           */
          cantidad:
            personas * Math.max(1, numero(linea.cantidad) || 1),
          precio_unitario: 0,
          iva: 10,
        })),
      ];

      const subtotalOriginal = redondear(
        personas * precioPorPersona,
      );

      const ivaTotal = redondear(
        Math.round((subtotalOriginal * 0.1 + Number.EPSILON) * 20) / 20,
      );
      const subtotal = subtotalOriginal;
      const total = redondear(subtotal + ivaTotal);

      const datosDocumento = {
        numero: numeroDocumento,
        cliente_id: clienteId,
        tipo_documento: "Catering",
        fecha: fechaPresupuesto,
        validez_hasta: null,
        estado: "Borrador",
        idioma: plantillaParaPresupuesto.idioma || "es",
        hora_entrega: null,
        direccion_entrega: null,
        persona_contacto: null,
        telefono_contacto: null,
        visitador_nombre: null,
        laboratorio: null,
        centro_medico: null,
        observaciones:
          plantillaParaPresupuesto.observaciones || null,
        transporte: 0,
        transporte_iva: 10,
        subtotal,
        iva_total: ivaTotal,
        total,
        facturado_externamente: false,
        updated_at: new Date().toISOString(),
      };

      const { data: presupuesto, error: errorPresupuesto } =
        await supabase
          .from("presupuestos")
          .insert(datosDocumento)
          .select("*")
          .single();

      if (errorPresupuesto) throw errorPresupuesto;

      const filasLineas = lineasPresupuesto.map((linea) => {
        const base = redondear(
          numero(linea.cantidad) *
            numero(linea.precio_unitario),
        );

        const importeIva = redondear(
          base * (numero(linea.iva) / 100),
        );

        return {
          presupuesto_id: presupuesto.id,
          producto_id: null,
          descripcion: linea.descripcion,
          cantidad: numero(linea.cantidad),
          precio_unitario: numero(linea.precio_unitario),
          iva: numero(linea.iva),
          subtotal: base,
          importe_iva: importeIva,
          total: redondear(base + importeIva),
        };
      });

      const { error: errorLineas } = await supabase
        .from("presupuesto_lineas")
        .insert(filasLineas);

      if (errorLineas) {
        await supabase
          .from("presupuestos")
          .delete()
          .eq("id", presupuesto.id);

        throw errorLineas;
      }

      setPlantillaParaPresupuesto(null);
      setMensaje(
        `Presupuesto ${numeroDocumento} creado correctamente.`,
      );

      navigate("/presupuestos");
    } catch (err) {
      setError(
        err.message ||
          "No se ha podido crear el presupuesto.",
      );
    } finally {
      setCreandoPresupuesto(false);
    }
  }

  function modificarLinea(indice, campo, valor) {
    setFormulario((anterior) => ({
      ...anterior,
      lineas: anterior.lineas.map((linea, i) =>
        i === indice
          ? {
              ...linea,
              [campo]: valor,
            }
          : linea,
      ),
    }));
  }

  function añadirLinea() {
    setFormulario((anterior) => ({
      ...anterior,
      lineas: [
        ...anterior.lineas,
        { ...LINEA_VACIA },
      ],
    }));
  }

  function eliminarLinea(indice) {
    setFormulario((anterior) => ({
      ...anterior,
      lineas: anterior.lineas.filter(
        (_, i) => i !== indice,
      ),
    }));
  }

  return (
    <section className="panel">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">COMERCIAL</p>
          <h2>⭐ Presupuestos estándar</h2>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="boton-secundario"
            onClick={importarPropuestasCusachs}
            disabled={importando}
          >
            {importando
              ? "Importando..."
              : "📋 Cargar propuestas Cusachs"}
          </button>

          <button
            type="button"
            onClick={() => {
              setFormulario({
                ...VACIO,
                lineas: [],
              });
              setEditandoId(null);
              setMostrarFormulario(true);
              setError("");
              setMensaje("");
            }}
          >
            + Nuevo estándar
          </button>
        </div>
      </div>

      {error && (
        <div className="mensaje-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mensaje">
          {mensaje}
        </div>
      )}

      <div
        className="presupuestos-estandar-filtros"
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <input
          type="search"
          value={busqueda}
          onChange={(e) =>
            setBusqueda(e.target.value)
          }
          placeholder="Buscar propuesta..."
        />

        <select
          value={filtro}
          onChange={(e) =>
            setFiltro(e.target.value)
          }
        >
          <option value="Todas">Todas</option>

          {CATEGORIAS.map((categoria) => (
            <option
              key={categoria}
              value={categoria}
            >
              {categoria}
            </option>
          ))}
        </select>
      </div>

      {cargando && (
        <p className="mensaje">
          Cargando propuestas...
        </p>
      )}

      {!cargando && filtradas.length === 0 && (
        <div className="estado-vacio">
          <h3>No hay propuestas guardadas</h3>
          <p>
            Pulsa “Cargar propuestas Cusachs” para
            añadir el listado del documento.
          </p>
        </div>
      )}

      <div className="presupuestos-estandar-grid">
        {filtradas.map((plantilla) => (
          <article
            key={plantilla.id}
            className="presupuesto-estandar-card"
          >
            <span>{plantilla.categoria}</span>

            <h3>{plantilla.nombre}</h3>

            <p>
              Plantilla base:{" "}
              <strong>
                {plantilla.personas || 1} personas
              </strong>
            </p>

            <p>
              {Array.isArray(plantilla.lineas)
                ? plantilla.lineas.length
                : 0}{" "}
              elementos
            </p>

            {numero(plantilla.total) > 0 ? (
              <strong>
                {euros(plantilla.total)} / persona
              </strong>
            ) : (
              <strong>Precio a definir</strong>
            )}

            {Array.isArray(plantilla.lineas) &&
              plantilla.lineas.length > 0 && (
                <details
                  style={{
                    marginTop: "12px",
                    padding: "10px 12px",
                    border: "1px solid #e3d7e8",
                    borderRadius: "10px",
                    background: "#faf7fc",
                  }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    👁️ Ver qué incluye
                  </summary>

                  <div
                    style={{
                      marginTop: "10px",
                      display: "grid",
                      gap: "6px",
                    }}
                  >
                    {plantilla.lineas.map((linea, indice) => (
                      <div
                        key={`${plantilla.id}-${indice}-${linea.descripcion}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "55px 1fr",
                          gap: "8px",
                          alignItems: "start",
                          fontSize: "14px",
                        }}
                      >
                        <strong>
                          {numero(linea.cantidad) || 1}
                        </strong>
                        <span>{linea.descripcion}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

            {plantilla.observaciones && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "#fff",
                  border: "1px solid #eee",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Observaciones
                </strong>

                <p
                  style={{
                    whiteSpace: "pre-line",
                    margin: 0,
                  }}
                >
                  {plantilla.observaciones}
                </p>
              </div>
            )}

            <div
              className="presupuesto-estandar-acciones"
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: "14px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  abrirUsarEnPresupuesto(plantilla)
                }
              >
                📝 Usar en presupuesto
              </button>

              <button
                type="button"
                className="boton-secundario"
                onClick={() => duplicar(plantilla)}
              >
                📄 Duplicar
              </button>

              <button
                type="button"
                onClick={() => editar(plantilla)}
              >
                ✏️ Editar
              </button>

              <button
                type="button"
                className="boton-peligro"
                onClick={() =>
                  eliminar(plantilla.id)
                }
              >
                🗑
              </button>
            </div>
          </article>
        ))}
      </div>

      {mostrarFormulario && (
        <div
          className="modal-fondo"
          onClick={() =>
            setMostrarFormulario(false)
          }
        >
          <form
            className="modal-contenido"
            onSubmit={guardar}
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              maxWidth: "900px",
              width: "94%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2>
              {editandoId
                ? "Editar plantilla"
                : "Nueva plantilla"}
            </h2>

            <label>
              Nombre
              <input
                value={formulario.nombre}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    nombre: e.target.value,
                  })
                }
                required
              />
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              <label>
                Categoría
                <select
                  value={formulario.categoria}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      categoria: e.target.value,
                    })
                  }
                >
                  {CATEGORIAS.map((categoria) => (
                    <option
                      key={categoria}
                      value={categoria}
                    >
                      {categoria}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Personas base
                <input
                  type="number"
                  min="1"
                  value={formulario.personas}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      personas: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Precio por persona
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formulario.total}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      total: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Idioma
                <select
                  value={formulario.idioma}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      idioma: e.target.value,
                    })
                  }
                >
                  <option value="es">
                    Castellano
                  </option>
                  <option value="ca">
                    Català
                  </option>
                  <option value="en">
                    English
                  </option>
                </select>
              </label>
            </div>

            <h3 style={{ marginTop: "22px" }}>
              Contenido de la propuesta
            </h3>

            {formulario.lineas.map(
              (linea, indice) => (
                <div
                  key={`${indice}-${linea.descripcion}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 100px 44px",
                    gap: "8px",
                    alignItems: "end",
                    marginBottom: "8px",
                  }}
                >
                  <label>
                    Descripción
                    <input
                      value={linea.descripcion}
                      onChange={(e) =>
                        modificarLinea(
                          indice,
                          "descripcion",
                          e.target.value,
                        )
                      }
                    />
                  </label>

                  <label>
                    Cant.
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={linea.cantidad}
                      onChange={(e) =>
                        modificarLinea(
                          indice,
                          "cantidad",
                          e.target.value,
                        )
                      }
                    />
                  </label>

                  <button
                    type="button"
                    className="boton-peligro"
                    onClick={() =>
                      eliminarLinea(indice)
                    }
                    title="Eliminar línea"
                  >
                    ×
                  </button>
                </div>
              ),
            )}

            <button
              type="button"
              className="boton-secundario"
              onClick={añadirLinea}
            >
              + Añadir línea
            </button>

            <label
              style={{
                display: "block",
                marginTop: "18px",
              }}
            >
              Observaciones
              <textarea
                rows="4"
                value={formulario.observaciones}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    observaciones:
                      e.target.value,
                  })
                }
                placeholder="Escribe aquí las observaciones que quieras mostrar en esta propuesta..."
              />
            </label>

            <div className="modal-acciones">
              <button
                type="button"
                onClick={() =>
                  setMostrarFormulario(false)
                }
              >
                Cancelar
              </button>

              <button type="submit">
                💾 Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {plantillaParaPresupuesto && (
        <div
          className="modal-fondo"
          onClick={() =>
            !creandoPresupuesto &&
            setPlantillaParaPresupuesto(null)
          }
        >
          <form
            className="modal-contenido"
            onSubmit={crearPresupuestoDesdePlantilla}
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              maxWidth: "650px",
              width: "94%",
            }}
          >
            <h2>Usar propuesta en presupuesto</h2>

            <p>
              <strong>
                {plantillaParaPresupuesto.nombre}
              </strong>
            </p>

            <label>
              Cliente *
              <select
                value={clienteId}
                onChange={(e) =>
                  setClienteId(e.target.value)
                }
                required
              >
                <option value="">
                  Selecciona un cliente
                </option>

                {clientes.map((cliente) => (
                  <option
                    key={cliente.id}
                    value={cliente.id}
                  >
                    {cliente.nombre}
                    {cliente.empresa
                      ? ` — ${cliente.empresa}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fecha del presupuesto
              <input
                type="date"
                value={fechaPresupuesto}
                onChange={(e) =>
                  setFechaPresupuesto(
                    e.target.value,
                  )
                }
              />
            </label>

            <label>
              Número de personas
              <input
                type="number"
                min="1"
                value={personasPresupuesto}
                onChange={(e) =>
                  setPersonasPresupuesto(
                    e.target.value,
                  )
                }
              />
            </label>

            <div
              style={{
                marginTop: "16px",
                padding: "14px",
                border: "1px solid #ddd",
                borderRadius: "10px",
              }}
            >
              <p>
                Precio por persona:{" "}
                <strong>
                  {euros(
                    plantillaParaPresupuesto.total,
                  )}
                </strong>
              </p>

              <p>
                Base prevista:{" "}
                <strong>
                  {euros(
                    numero(personasPresupuesto) *
                      numero(
                        plantillaParaPresupuesto.total,
                      ),
                  )}
                </strong>
              </p>
            </div>

            <div className="modal-acciones">
              <button
                type="button"
                disabled={creandoPresupuesto}
                onClick={() =>
                  setPlantillaParaPresupuesto(null)
                }
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={creandoPresupuesto}
              >
                {creandoPresupuesto
                  ? "Creando..."
                  : "✅ Crear presupuesto"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default PresupuestosEstandar;
