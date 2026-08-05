const VERSION_PARSER = "3.0.0";

const IVA_VALIDOS = [0, 4, 5, 10, 21];

const UNIDADES = [
  "kg",
  "kgs",
  "g",
  "gr",
  "gramo",
  "gramos",
  "l",
  "lt",
  "litro",
  "litros",
  "ml",
  "cl",
  "ud",
  "uds",
  "unidad",
  "unidades",
  "caja",
  "cajas",
  "bandeja",
  "bandejas",
  "paquete",
  "paquetes",
  "bolsa",
  "bolsas",
  "botella",
  "botellas",
  "lata",
  "latas",
  "pieza",
  "piezas",
  "bulto",
  "bultos",
  "pack",
  "packs",
];

const PALABRAS_CABECERA = [
  "codigo",
  "código",
  "referencia",
  "ref",
  "articulo",
  "artículo",
  "descripcion",
  "descripción",
  "producto",
  "cantidad",
  "cant",
  "unidad",
  "precio",
  "importe",
  "total",
  "iva",
  "dto",
  "descuento",
];

const PATRON_LINEA_NO_PRODUCTO =
  /^(pastisseria|cusachs|cliente|proveedor|albar[aá]n|factura|pedido|presupuesto|fecha|data|p[aá]gina|cif|nif|dni|direcci[oó]n|domicilio|tel[eé]fono|tel\.|fax|email|correo|web|www\.|subtotal|base imponible|iva|total|forma de pago|vencimiento|observaciones|transportista|firma|recib[ií]|iban|swift|banco|cuenta|portes|gracias|atentamente)/i;

function normalizarEspacios(texto = "") {
  return String(texto)
    .replace(/\u00a0/g, " ")
    .replace(/\t+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function normalizarTexto(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‐-‒–—]/g, "-")
    .replace(/[^a-z0-9%.,€/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizarNombreProducto(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‐-‒–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(?:de|del|la|las|el|los|para|con|sin|y|en)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarCodigo(texto = "") {
  return String(texto)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9._/-]/g, "");
}

function numeroEuropeo(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  let limpio = String(valor)
    .trim()
    .replace(/[€%\s]/g, "")
    .replace(/[^\d,.-]/g, "");

  if (
    !limpio ||
    limpio === "-" ||
    limpio === "." ||
    limpio === ","
  ) {
    return null;
  }

  const negativo = limpio.startsWith("-");
  limpio = limpio.replace(/-/g, "");

  const tieneComa = limpio.includes(",");
  const tienePunto = limpio.includes(".");

  if (tieneComa && tienePunto) {
    if (
      limpio.lastIndexOf(",") >
      limpio.lastIndexOf(".")
    ) {
      limpio = limpio
        .replace(/\./g, "")
        .replace(",", ".");
    } else {
      limpio = limpio.replace(/,/g, "");
    }
  } else if (tieneComa) {
    const partes = limpio.split(",");

    if (
      partes.length === 2 &&
      partes[1].length <= 4
    ) {
      limpio = `${partes[0]}.${partes[1]}`;
    } else {
      limpio = limpio.replace(/,/g, "");
    }
  } else if (tienePunto) {
    const partes = limpio.split(".");

    if (partes.length > 2) {
      const decimal = partes.pop();

      if (decimal.length <= 4) {
        limpio = `${partes.join("")}.${decimal}`;
      } else {
        limpio = [...partes, decimal].join("");
      }
    }
  }

  const resultado = Number(limpio);

  if (!Number.isFinite(resultado)) {
    return null;
  }

  return negativo ? -resultado : resultado;
}

function redondear(valor, decimales = 4) {
  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return 0;
  }

  return Number(convertido.toFixed(decimales));
}

function extraerNumeros(texto = "") {
  return [
    ...String(texto).matchAll(
      /-?\d{1,10}(?:[.,]\d{1,4})?\s*(?:€|eur|%)?/gi,
    ),
  ]
    .map((coincidencia) => ({
      texto: coincidencia[0],
      valor: numeroEuropeo(coincidencia[0]),
      indice: coincidencia.index ?? 0,
      fin:
        (coincidencia.index ?? 0) +
        coincidencia[0].length,
    }))
    .filter(
      (elemento) =>
        elemento.valor !== null,
    );
}

function contarPalabrasCabecera(texto = "") {
  const normalizado = normalizarTexto(texto);

  return PALABRAS_CABECERA.filter((palabra) =>
    normalizado.includes(
      normalizarTexto(palabra),
    ),
  ).length;
}

function esCabeceraTabla(texto = "") {
  const coincidencias =
    contarPalabrasCabecera(texto);

  return coincidencias >= 3;
}

function esPieDocumento(texto = "") {
  const limpio = normalizarEspacios(texto);

  return (
    /^(subtotal|base imponible|iva|total|forma de pago|vencimiento|observaciones|transportista|firma|iban|swift|banco|cuenta|portes)/i.test(
      limpio,
    ) ||
    /\b(?:base imponible|total albar[aá]n|total factura|forma de pago|vencimiento|iban|swift)\b/i.test(
      limpio,
    )
  );
}

function esLineaDescartable(texto = "") {
  const limpio = normalizarEspacios(texto);

  if (!limpio) {
    return true;
  }

  if (PATRON_LINEA_NO_PRODUCTO.test(limpio)) {
    return true;
  }

  if (
    /^[-_=*.\s]+$/.test(limpio) ||
    /^[0-9]+\s*\/\s*[0-9]+$/.test(limpio)
  ) {
    return true;
  }

  if (
    /^(www\.|https?:\/\/|mailto:)/i.test(
      limpio,
    )
  ) {
    return true;
  }

  return false;
}

function tieneDescripcion(texto = "") {
  const letras =
    String(texto).match(/[A-Za-zÀ-ÿ]/g) ||
    [];

  return letras.length >= 2;
}

function obtenerUnidad(texto = "") {
  const patron = new RegExp(
    `\\b(${UNIDADES.join("|")})\\b`,
    "i",
  );

  const coincidencia =
    String(texto).match(patron);

  if (!coincidencia) {
    return "unidad";
  }

  const unidad =
    coincidencia[1].toLowerCase();

  const equivalencias = {
    kgs: "kg",
    gr: "g",
    gramo: "g",
    gramos: "g",
    lt: "l",
    litro: "l",
    litros: "l",
    uds: "unidad",
    unidades: "unidad",
    cajas: "caja",
    bandejas: "bandeja",
    paquetes: "paquete",
    bolsas: "bolsa",
    botellas: "botella",
    latas: "lata",
    piezas: "pieza",
    bultos: "bulto",
    packs: "pack",
  };

  return equivalencias[unidad] || unidad;
}

function detectarIva(texto = "") {
  const coincidencia =
    String(texto).match(
      /\b(0|4|5|10|21)\s*%/,
    );

  if (coincidencia) {
    return Number(coincidencia[1]);
  }

  const coincidenciaIva =
    String(texto).match(
      /\b(?:iva)\s*(0|4|5|10|21)\b/i,
    );

  if (coincidenciaIva) {
    return Number(coincidenciaIva[1]);
  }

  return 10;
}

function detectarCodigoInicial(texto = "") {
  const limpio = normalizarEspacios(texto);

  const primeraParte =
    limpio.split(" ")[0] || "";

  const codigo =
    normalizarCodigo(primeraParte);

  if (
    codigo.length < 3 ||
    codigo.length > 30
  ) {
    return "";
  }

  if (
    /^(IVA|TOTAL|BASE|EUR|UD|UDS|KG|L|ML)$/i.test(
      codigo,
    )
  ) {
    return "";
  }

  if (!/\d/.test(codigo)) {
    return "";
  }

  return codigo;
}

function obtenerZonaTabla(lineas = []) {
  let inicio = -1;
  let fin = lineas.length;

  for (
    let indice = 0;
    indice < lineas.length;
    indice += 1
  ) {
    const texto =
      lineas[indice]?.texto || "";

    if (esCabeceraTabla(texto)) {
      inicio = indice + 1;
      break;
    }
  }

  if (inicio < 0) {
    const primeraPosible = lineas.findIndex(
      (linea) => {
        const texto = linea?.texto || "";
        const numeros =
          extraerNumeros(texto);

        return (
          !esLineaDescartable(texto) &&
          tieneDescripcion(texto) &&
          numeros.length >= 2
        );
      },
    );

    inicio =
      primeraPosible >= 0
        ? primeraPosible
        : 0;
  }

  for (
    let indice = inicio;
    indice < lineas.length;
    indice += 1
  ) {
    const texto =
      lineas[indice]?.texto || "";

    if (esPieDocumento(texto)) {
      fin = indice;
      break;
    }
  }

  return {
    inicio,
    fin,
    lineas: lineas.slice(inicio, fin),
  };
}

function unirDescripcionesPartidas(lineas = []) {
  const resultado = [];

  for (const linea of lineas) {
    const texto =
      normalizarEspacios(
        linea?.texto || linea || "",
      );

    if (!texto) {
      continue;
    }

    const numeros =
      extraerNumeros(texto);

    const pareceProducto =
      numeros.length >= 2 &&
      tieneDescripcion(texto);

    if (
      !pareceProducto &&
      !esLineaDescartable(texto) &&
      resultado.length > 0
    ) {
      const anterior =
        resultado[
          resultado.length - 1
        ];

      const numerosAnterior =
        extraerNumeros(
          anterior.texto,
        );

      if (numerosAnterior.length < 2) {
        anterior.texto =
          normalizarEspacios(
            `${anterior.texto} ${texto}`,
          );

        continue;
      }

      if (
        /^[A-Za-zÀ-ÿ*]/.test(texto) &&
        texto.length <= 90
      ) {
        anterior.texto =
          normalizarEspacios(
            `${texto} ${anterior.texto}`,
          );

        continue;
      }
    }

    resultado.push({
      ...(typeof linea === "object"
        ? linea
        : {}),
      texto,
    });
  }

  return resultado;
}

function seleccionarCantidadPrecioTotal(
  numeros = [],
  texto = "",
) {
  const candidatos = numeros.filter(
    (numero) => {
      if (
        String(numero.texto).includes("%")
      ) {
        return false;
      }

      return numero.valor !== null;
    },
  );

  if (candidatos.length < 2) {
    return null;
  }

  let mejor = null;

  for (
    let indiceTotal =
      candidatos.length - 1;
    indiceTotal >= 1;
    indiceTotal -= 1
  ) {
    const total =
      candidatos[indiceTotal].valor;

    if (total <= 0) {
      continue;
    }

    for (
      let indicePrecio =
        indiceTotal - 1;
      indicePrecio >= 0;
      indicePrecio -= 1
    ) {
      const precio =
        candidatos[indicePrecio].valor;

      if (precio <= 0) {
        continue;
      }

      for (
        let indiceCantidad =
          indicePrecio - 1;
        indiceCantidad >= -1;
        indiceCantidad -= 1
      ) {
        const cantidad =
          indiceCantidad >= 0
            ? candidatos[indiceCantidad]
                .valor
            : 1;

        if (
          cantidad <= 0 ||
          cantidad > 100000
        ) {
          continue;
        }

        const calculado =
          cantidad * precio;

        const diferencia =
          Math.abs(calculado - total);

        const tolerancia =
          Math.max(
            0.05,
            total * 0.04,
          );

        let puntuacion = 0;

        if (diferencia <= tolerancia) {
          puntuacion += 100;
        } else {
          puntuacion -=
            diferencia * 8;
        }

        if (
          indiceTotal ===
          candidatos.length - 1
        ) {
          puntuacion += 20;
        }

        if (
          indicePrecio ===
          indiceTotal - 1
        ) {
          puntuacion += 12;
        }

        if (
          indiceCantidad ===
          indicePrecio - 1
        ) {
          puntuacion += 8;
        }

        if (cantidad === 1) {
          puntuacion += 2;
        }

        const opcion = {
          cantidad,
          precio_unitario: precio,
          total_linea: total,
          diferencia,
          puntuacion,
          indiceCantidad,
          indicePrecio,
          indiceTotal,
        };

        if (
          !mejor ||
          opcion.puntuacion >
            mejor.puntuacion
        ) {
          mejor = opcion;
        }
      }
    }
  }

  if (!mejor) {
    const total =
      candidatos[
        candidatos.length - 1
      ].valor;

    const precio =
      candidatos[
        candidatos.length - 2
      ].valor;

    const cantidadCalculada =
      precio > 0
        ? total / precio
        : 1;

    mejor = {
      cantidad:
        cantidadCalculada > 0
          ? cantidadCalculada
          : 1,
      precio_unitario: precio,
      total_linea: total,
      diferencia: 0,
      puntuacion: 0,
      indiceCantidad: -1,
      indicePrecio:
        candidatos.length - 2,
      indiceTotal:
        candidatos.length - 1,
    };
  }

  return {
    ...mejor,
    cantidad: redondear(
      mejor.cantidad,
      4,
    ),
    precio_unitario: redondear(
      mejor.precio_unitario,
      4,
    ),
    total_linea: redondear(
      mejor.total_linea,
      2,
    ),
  };
}

function construirDescripcion({
  texto,
  numeros,
  seleccion,
  codigo,
}) {
  let inicio = 0;

  if (
    seleccion.indiceCantidad >= 0
  ) {
    const cantidad =
      numeros[
        seleccion.indiceCantidad
      ];

    inicio =
      cantidad?.fin || 0;
  }

  const precio =
    numeros[
      seleccion.indicePrecio
    ];

  let fin =
    precio?.indice ??
    texto.length;

  if (fin <= inicio) {
    inicio = 0;
  }

  let descripcion =
    normalizarEspacios(
      texto.slice(inicio, fin),
    );

  if (
    codigo &&
    descripcion
      .toUpperCase()
      .startsWith(codigo)
  ) {
    descripcion =
      descripcion.slice(
        codigo.length,
      );
  }

  descripcion = descripcion
    .replace(
      /^\s*\d+(?:[.,]\d+)?\s*(?:x|ud|uds|kg|g|l|ml|caja|bandeja|pack)?\s*/i,
      "",
    )
    .replace(
      /\b(?:dto|dcto|descuento)\s*\d+(?:[.,]\d+)?\s*%?/gi,
      " ",
    )
    .replace(
      /\b(?:0|4|5|10|21)\s*%\b/g,
      " ",
    )
    .replace(/^[-–—.:;*\s]+/, "")
    .replace(/[-–—.:;\s]+$/, "");

  return normalizarEspacios(
    descripcion,
  );
}

function aplicarDiccionario(linea, descripcion) {
  const aprendizaje =
    linea?.aprendizaje_diccionario;

  if (!aprendizaje) {
    return {
      descripcion,
      codigo: "",
      unidad: "",
      aprendizaje_aplicado: false,
    };
  }

  return {
    descripcion:
      aprendizaje.nombre_corregido ||
      descripcion,

    codigo:
      aprendizaje.codigo_proveedor ||
      "",

    unidad:
      aprendizaje.unidad_corregida ||
      "",

    producto_id:
      aprendizaje.producto_id ||
      null,

    catalogo_proveedor_id:
      aprendizaje.catalogo_proveedor_id ||
      null,

    aprendizaje_aplicado: true,

    similitud_aprendizaje:
      aprendizaje.similitud || 0,
  };
}

function calcularConfianza({
  descripcion,
  codigo,
  cantidad,
  precio,
  total,
  diferencia,
  unidad,
  aprendizajeAplicado,
}) {
  let puntuacion = 0;

  if (descripcion.length >= 3) {
    puntuacion += 25;
  }

  if (descripcion.length >= 8) {
    puntuacion += 10;
  }

  if (codigo) {
    puntuacion += 10;
  }

  if (
    cantidad > 0 &&
    precio > 0 &&
    total > 0
  ) {
    puntuacion += 30;
  }

  if (
    diferencia <=
    Math.max(0.05, total * 0.04)
  ) {
    puntuacion += 15;
  }

  if (unidad !== "unidad") {
    puntuacion += 5;
  }

  if (aprendizajeAplicado) {
    puntuacion += 5;
  }

  return Math.max(
    0,
    Math.min(100, puntuacion),
  );
}

function parsearLineaProducto(linea) {
  const texto =
    normalizarEspacios(
      linea?.texto || "",
    );

  if (
    !texto ||
    esLineaDescartable(texto) ||
    esCabeceraTabla(texto) ||
    esPieDocumento(texto)
  ) {
    return null;
  }

  const numeros =
    extraerNumeros(texto);

  if (numeros.length < 2) {
    return null;
  }

  const seleccion =
    seleccionarCantidadPrecioTotal(
      numeros,
      texto,
    );

  if (!seleccion) {
    return null;
  }

  let codigo =
    detectarCodigoInicial(texto);

  let descripcion =
    construirDescripcion({
      texto,
      numeros,
      seleccion,
      codigo,
    });

  const aprendizaje =
    aplicarDiccionario(
      linea,
      descripcion,
    );

  descripcion =
    aprendizaje.descripcion;

  if (aprendizaje.codigo) {
    codigo =
      aprendizaje.codigo;
  }

  if (
    !descripcion ||
    descripcion.length < 2 ||
    !tieneDescripcion(descripcion)
  ) {
    return null;
  }

  const unidad =
    aprendizaje.unidad ||
    obtenerUnidad(texto);

  const iva =
    detectarIva(texto);

  const confianza =
    calcularConfianza({
      descripcion,
      codigo,
      cantidad:
        seleccion.cantidad,
      precio:
        seleccion.precio_unitario,
      total:
        seleccion.total_linea,
      diferencia:
        seleccion.diferencia,
      unidad,
      aprendizajeAplicado:
        aprendizaje.aprendizaje_aplicado,
    });

  return {
    codigo,
    descripcion,
    nombre_normalizado:
      normalizarNombreProducto(
        descripcion,
      ),
    cantidad:
      seleccion.cantidad,
    unidad,
    precio_unitario:
      seleccion.precio_unitario,
    iva,
    total_linea:
      seleccion.total_linea,
    confianza,
    necesita_revision:
      confianza < 72,
    texto_origen: texto,
    producto_id:
      aprendizaje.producto_id ||
      null,
    catalogo_proveedor_id:
      aprendizaje.catalogo_proveedor_id ||
      null,
    aprendizaje_aplicado:
      aprendizaje.aprendizaje_aplicado,
    similitud_aprendizaje:
      aprendizaje.similitud_aprendizaje ||
      0,
  };
}

function eliminarDuplicados(
  lineas = [],
) {
  const vistos = new Set();

  return lineas.filter((linea) => {
    const clave = [
      linea.codigo,
      linea.nombre_normalizado,
      linea.cantidad,
      linea.precio_unitario,
      linea.total_linea,
    ]
      .join("|")
      .toLowerCase();

    if (vistos.has(clave)) {
      return false;
    }

    vistos.add(clave);
    return true;
  });
}

function normalizarFecha(
  anio,
  mes,
  dia,
) {
  let year = Number(anio);

  if (year < 100) {
    year += 2000;
  }

  const month =
    String(Number(mes)).padStart(
      2,
      "0",
    );

  const day =
    String(Number(dia)).padStart(
      2,
      "0",
    );

  if (
    Number(month) < 1 ||
    Number(month) > 12 ||
    Number(day) < 1 ||
    Number(day) > 31
  ) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function extraerFecha(texto = "") {
  const patrones = [
    /(?:fecha|data)(?:\s+(?:albar[aá]n|documento|emisi[oó]n))?\s*[:#-]?\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/i,
    /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/,
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/,
  ];

  for (const patron of patrones) {
    const coincidencia =
      String(texto).match(patron);

    if (!coincidencia) {
      continue;
    }

    if (
      coincidencia[1]?.length === 4
    ) {
      return normalizarFecha(
        coincidencia[1],
        coincidencia[2],
        coincidencia[3],
      );
    }

    return normalizarFecha(
      coincidencia[3],
      coincidencia[2],
      coincidencia[1],
    );
  }

  return "";
}

function extraerNumeroDocumento(
  texto = "",
) {
  const patrones = [
    /(?:n(?:ú|u|º|°|o)?\.?\s*(?:albar[aá]n|documento)|albar[aá]n\s*(?:n(?:ú|u|º|°|o)?\.?|n[uú]mero)?|delivery\s*note)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\/._-]{2,})/i,
    /(?:documento|doc\.?|n[uú]mero)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\/._-]{3,})/i,
  ];

  for (const patron of patrones) {
    const coincidencia =
      String(texto).match(patron);

    if (coincidencia?.[1]) {
      return coincidencia[1]
        .trim()
        .replace(/[.,;:]$/, "");
    }
  }

  return "";
}

export function recalcularDocumentoIA(
  lineas = [],
) {
  let base = 0;
  let ivaTotal = 0;

  for (const linea of lineas) {
    const cantidad =
      numeroEuropeo(
        linea.cantidad,
      ) || 0;

    const precio =
      numeroEuropeo(
        linea.precio_unitario,
      ) || 0;

    const totalLinea =
      redondear(
        cantidad * precio,
        2,
      );

    const iva =
      numeroEuropeo(linea.iva) ??
      10;

    base += totalLinea;
    ivaTotal +=
      totalLinea * (iva / 100);
  }

  return {
    base_imponible:
      redondear(base, 2),
    total_iva:
      redondear(ivaTotal, 2),
    total: redondear(
      base + ivaTotal,
      2,
    ),
  };
}

function generarDiagnosticoColumnas(
  productos = [],
) {
  if (!productos.length) {
    return {
      cantidad_detectada: false,
      precio_detectado: false,
      total_detectado: false,
      codigo_detectado: false,
      unidad_detectada: false,
    };
  }

  return {
    cantidad_detectada:
      productos.every(
        (producto) =>
          Number(
            producto.cantidad,
          ) > 0,
      ),

    precio_detectado:
      productos.every(
        (producto) =>
          Number(
            producto.precio_unitario,
          ) > 0,
      ),

    total_detectado:
      productos.every(
        (producto) =>
          Number(
            producto.total_linea,
          ) > 0,
      ),

    codigo_detectado:
      productos.some(
        (producto) =>
          Boolean(producto.codigo),
      ),

    unidad_detectada:
      productos.some(
        (producto) =>
          producto.unidad !==
          "unidad",
      ),
  };
}

export function analizarDocumentoIA(
  lectura = {},
) {
  const texto =
    lectura.texto_normalizado ||
    lectura.texto_original ||
    "";

  const lineasEntrada =
    Array.isArray(lectura.lineas)
      ? lectura.lineas
      : String(texto)
          .split(/\n+/)
          .map((linea, indice) => ({
            indice,
            texto:
              normalizarEspacios(
                linea,
              ),
          }));

  const zonaTabla =
    obtenerZonaTabla(
      lineasEntrada,
    );

  const lineasPreparadas =
    unirDescripcionesPartidas(
      zonaTabla.lineas,
    );

  const productos =
    eliminarDuplicados(
      lineasPreparadas
        .map(parsearLineaProducto)
        .filter(Boolean),
    );

  const totales =
    recalcularDocumentoIA(
      productos,
    );

  const confianzaMedia =
    productos.length > 0
      ? redondear(
          productos.reduce(
            (total, producto) =>
              total +
              Number(
                producto.confianza ||
                  0,
              ),
            0,
          ) /
            productos.length,
          2,
        )
      : 0;

  const productosRevision =
    productos.filter(
      (producto) =>
        producto.necesita_revision,
    );

  return {
    version_parser:
      VERSION_PARSER,

    proveedor_id:
      lectura.proveedor_id ||
      lectura.proveedor_detectado
        ?.id ||
      "",

    proveedor_nombre:
      lectura.proveedor_detectado
        ?.nombre ||
      "",

    numero_albaran:
      extraerNumeroDocumento(
        texto,
      ),

    fecha_albaran:
      extraerFecha(texto),

    lineas: productos,

    ...totales,

    confianza_media:
      confianzaMedia,

    necesita_revision:
      productos.length === 0 ||
      confianzaMedia < 78 ||
      productosRevision.length > 0,

    zona_tabla: {
      inicio:
        zonaTabla.inicio,

      fin:
        zonaTabla.fin,

      lineas_analizadas:
        zonaTabla.lineas.length,
    },

    diagnostico: {
      lineas_documento:
        lineasEntrada.length,

      lineas_tabla:
        zonaTabla.lineas.length,

      lineas_preparadas:
        lineasPreparadas.length,

      productos_detectados:
        productos.length,

      productos_revision:
        productosRevision.length,

      confianza_media:
        confianzaMedia,

      columnas:
        generarDiagnosticoColumnas(
          productos,
        ),

      calidad_lector_v3:
        lectura.calidad_lectura_v3 ||
        null,

      aprendizaje:
        lectura.aprendizaje ||
        null,
    },
  };
}

export const analizarAlbaranIA =
  analizarDocumentoIA;

export default analizarDocumentoIA;