const IVA_VALIDOS = [0, 4, 5, 10, 21];

const PALABRAS_NO_PRODUCTO =
  /^(albar[aá]n|factura|cliente|proveedor|fecha|data|pedido|p[aá]gina|cif|nif|tel[eé]fono|direcci[oó]n|subtotal|base imponible|iva|total|forma de pago|vencimiento|observaciones|cantidad|descripci[oó]n|art[ií]culo|precio|importe|referencia|c[oó]digo)/i;

const UNIDADES = [
  "kg",
  "kgs",
  "g",
  "gr",
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
  "saco",
  "sacos",
  "pieza",
  "piezas",
];

function normalizarEspacios(texto = "") {
  return String(texto)
    .replace(/\u00a0/g, " ")
    .replace(/\t+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

export function normalizarNombreArticulo(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‐-‒–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(?:de|del|la|las|el|los|para|con|sin|y)\b/g, " ")
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

  if (!limpio || limpio === "-" || limpio === ".") {
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
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return Number(numero.toFixed(decimales));
}

function obtenerImportes(linea) {
  if (Array.isArray(linea?.importes)) {
    return linea.importes
      .map((importe) => ({
        ...importe,
        valor: numeroEuropeo(
          importe.valor ?? importe.texto,
        ),
      }))
      .filter(
        (importe) =>
          importe.valor !== null,
      );
  }

  const texto =
    typeof linea === "string"
      ? linea
      : linea?.texto || "";

  return [
    ...String(texto).matchAll(
      /-?\d{1,9}(?:[.,]\d{1,4})?\s*(?:€|eur)?/gi,
    ),
  ]
    .map((coincidencia) => ({
      texto: coincidencia[0],
      valor: numeroEuropeo(
        coincidencia[0],
      ),
      indice: coincidencia.index ?? 0,
      fin:
        (coincidencia.index ?? 0) +
        coincidencia[0].length,
    }))
    .filter(
      (importe) =>
        importe.valor !== null,
    );
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
    sacos: "saco",
    piezas: "pieza",
  };

  return equivalencias[unidad] || unidad;
}

function detectarIva(texto = "", importes = []) {
  const coincidenciaPorcentaje =
    String(texto).match(
      /\b(0|4|5|10|21)\s*%/,
    );

  if (coincidenciaPorcentaje) {
    return Number(
      coincidenciaPorcentaje[1],
    );
  }

  for (
    let indice = importes.length - 1;
    indice >= 0;
    indice -= 1
  ) {
    const valor =
      importes[indice]?.valor;

    if (
      IVA_VALIDOS.includes(valor) &&
      String(importes[indice]?.texto || "")
        .replace(/\s/g, "")
        .includes("%")
    ) {
      return valor;
    }
  }

  return 10;
}

function esCabeceraOTotal(texto = "") {
  const limpia =
    normalizarEspacios(texto);

  if (!limpia) {
    return true;
  }

  if (PALABRAS_NO_PRODUCTO.test(limpia)) {
    return true;
  }

  return (
    /^(gracias|atentamente|firma|transportista|recib[ií]|mercanc[ií]a|portes|descuento|recargo)/i.test(
      limpia,
    ) ||
    /^\s*(?:subtotal|base|iva|total)\s*[:€\d]/i.test(
      limpia,
    )
  );
}

function tieneDescripcionValida(texto = "") {
  const limpia =
    normalizarEspacios(texto);

  if (
    limpia.length < 2 ||
    esCabeceraOTotal(limpia)
  ) {
    return false;
  }

  const letras =
    limpia.match(/[A-Za-zÀ-ÿ]/g) || [];

  return letras.length >= 2;
}

function detectarCodigoInicial(
  texto = "",
  primerImporte = null,
) {
  const antesDelPrimerImporte =
    primerImporte &&
    Number.isFinite(primerImporte.indice)
      ? String(texto).slice(
          0,
          primerImporte.indice,
        )
      : String(texto);

  const partes =
    normalizarEspacios(
      antesDelPrimerImporte,
    ).split(" ");

  const candidato =
    partes.find((parte) => {
      const codigo =
        normalizarCodigo(parte);

      if (
        codigo.length < 3 ||
        codigo.length > 30
      ) {
        return false;
      }

      if (
        /^(KG|UD|UDS|IVA|EUR|TOTAL|BASE)$/i.test(
          codigo,
        )
      ) {
        return false;
      }

      return (
        /\d/.test(codigo) &&
        /^[A-Z0-9._/-]+$/.test(codigo)
      );
    }) || "";

  return normalizarCodigo(candidato);
}

function quitarCodigoInicial(
  texto = "",
  codigo = "",
) {
  if (!codigo) {
    return texto;
  }

  const escapado =
    codigo.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  return String(texto).replace(
    new RegExp(`^\\s*${escapado}\\s*`, "i"),
    "",
  );
}

function limpiarDescripcion(
  texto = "",
  codigo = "",
) {
  let descripcion =
    quitarCodigoInicial(texto, codigo);

  descripcion = descripcion
    .replace(
      /^\s*\d+(?:[.,]\d+)?\s*(?:x|ud|uds|kg|g|l|ml)?\s+/i,
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
    .replace(
      /\b(?:kg|kgs|g|gr|l|lt|ml|cl|ud|uds|unidad|unidades)\b\s*$/i,
      "",
    )
    .replace(/^[-–—.:;\s]+/, "")
    .replace(/[-–—.:;\s]+$/, "");

  return normalizarEspacios(descripcion);
}

function calcularDiferencia(
  valorA,
  valorB,
) {
  return Math.abs(
    Number(valorA || 0) -
      Number(valorB || 0),
  );
}

function elegirCantidadPrecioTotal(
  importes = [],
  texto = "",
) {
  const validos = importes.filter(
    (importe) =>
      Number.isFinite(importe.valor),
  );

  if (validos.length < 2) {
    return null;
  }

  const iva = detectarIva(
    texto,
    validos,
  );

  const candidatos = validos.filter(
    (importe) => {
      const textoImporte =
        String(importe.texto || "");

      if (
        textoImporte.includes("%")
      ) {
        return false;
      }

      return !(
        IVA_VALIDOS.includes(
          importe.valor,
        ) &&
        /\biva\b/i.test(texto)
      );
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
          calcularDiferencia(
            calculado,
            total,
          );

        const tolerancia =
          Math.max(
            0.05,
            total * 0.03,
          );

        let puntuacion = 0;

        if (diferencia <= tolerancia) {
          puntuacion += 100;
        } else {
          puntuacion -=
            diferencia * 10;
        }

        if (
          indiceTotal ===
          candidatos.length - 1
        ) {
          puntuacion += 15;
        }

        if (
          indicePrecio ===
          indiceTotal - 1
        ) {
          puntuacion += 10;
        }

        if (cantidad === 1) {
          puntuacion += 2;
        }

        const opcion = {
          cantidad,
          precio_unitario: precio,
          total_linea: total,
          iva,
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
        cantidadCalculada > 0 &&
        cantidadCalculada <= 100000
          ? cantidadCalculada
          : 1,
      precio_unitario: precio,
      total_linea: total,
      iva,
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

function construirDescripcion(
  texto = "",
  importes = [],
  seleccion = null,
) {
  if (!seleccion) {
    return "";
  }

  const precio =
    importes[
      seleccion.indicePrecio
    ];

  const inicioCantidad =
    seleccion.indiceCantidad >= 0
      ? importes[
          seleccion.indiceCantidad
        ]
      : importes[0];

  let inicioDescripcion = 0;

  if (
    seleccion.indiceCantidad >= 0 &&
    inicioCantidad
  ) {
    inicioDescripcion =
      inicioCantidad.fin ??
      inicioCantidad.indice +
        String(
          inicioCantidad.texto || "",
        ).length;
  }

  let finDescripcion =
    precio?.indice ??
    String(texto).length;

  if (
    finDescripcion <=
    inicioDescripcion
  ) {
    inicioDescripcion = 0;
  }

  return normalizarEspacios(
    String(texto).slice(
      inicioDescripcion,
      finDescripcion,
    ),
  );
}

function calcularConfianzaLinea({
  descripcion,
  codigo,
  cantidad,
  precio_unitario,
  total_linea,
  diferencia,
  texto,
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
    precio_unitario > 0 &&
    total_linea > 0
  ) {
    puntuacion += 30;
  }

  const tolerancia =
    Math.max(
      0.05,
      total_linea * 0.03,
    );

  if (diferencia <= tolerancia) {
    puntuacion += 20;
  }

  if (
    obtenerUnidad(texto) !==
    "unidad"
  ) {
    puntuacion += 5;
  }

  return Math.max(
    0,
    Math.min(100, puntuacion),
  );
}

function parsearLineaProducto(
  linea,
) {
  const texto =
    normalizarEspacios(
      linea?.texto || linea || "",
    );

  if (
    !texto ||
    esCabeceraOTotal(texto)
  ) {
    return null;
  }

  const importes =
    obtenerImportes(linea);

  if (importes.length < 2) {
    return null;
  }

  const seleccion =
    elegirCantidadPrecioTotal(
      importes,
      texto,
    );

  if (!seleccion) {
    return null;
  }

  const codigo =
    detectarCodigoInicial(
      texto,
      importes[0],
    );

  const descripcionCruda =
    construirDescripcion(
      texto,
      importes,
      seleccion,
    );

  const descripcion =
    limpiarDescripcion(
      descripcionCruda,
      codigo,
    );

  if (
    !tieneDescripcionValida(
      descripcion,
    )
  ) {
    return null;
  }

  const confianza =
    calcularConfianzaLinea({
      descripcion,
      codigo,
      cantidad:
        seleccion.cantidad,
      precio_unitario:
        seleccion.precio_unitario,
      total_linea:
        seleccion.total_linea,
      diferencia:
        seleccion.diferencia,
      texto,
    });

  return {
    codigo,
    descripcion,
    nombre_normalizado:
      normalizarNombreArticulo(
        descripcion,
      ),
    cantidad:
      seleccion.cantidad,
    unidad: obtenerUnidad(texto),
    precio_unitario:
      seleccion.precio_unitario,
    iva: seleccion.iva,
    total_linea:
      seleccion.total_linea,
    confianza,
    necesita_revision:
      confianza < 70,
    texto_origen: texto,
  };
}

function unirLineasContinuacion(
  lineas = [],
) {
  const resultado = [];

  for (const linea of lineas) {
    const texto =
      normalizarEspacios(
        linea?.texto || linea || "",
      );

    if (!texto) {
      continue;
    }

    const importes =
      obtenerImportes(linea);

    const tieneImportes =
      importes.length >= 2;

    if (
      !tieneImportes &&
      !esCabeceraOTotal(texto) &&
      resultado.length > 0
    ) {
      const anterior =
        resultado[
          resultado.length - 1
        ];

      const importesAnterior =
        obtenerImportes(anterior);

      if (
        importesAnterior.length < 2
      ) {
        anterior.texto =
          normalizarEspacios(
            `${anterior.texto} ${texto}`,
          );

        anterior.importes =
          obtenerImportes(
            anterior.texto,
          );

        continue;
      }

      const siguientePareceDescripcion =
        /^[A-Za-zÀ-ÿ]/.test(texto);

      if (
        siguientePareceDescripcion &&
        texto.length <= 100
      ) {
        anterior.texto =
          normalizarEspacios(
            `${texto} ${anterior.texto}`,
          );

        anterior.importes =
          obtenerImportes(
            anterior.texto,
          );

        continue;
      }
    }

    resultado.push({
      ...(typeof linea === "object"
        ? linea
        : {}),
      texto,
      importes,
    });
  }

  return resultado;
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

function extraerProveedor(
  texto = "",
) {
  const lineas = String(texto)
    .split(/\n+/)
    .map(normalizarEspacios)
    .filter(Boolean)
    .slice(0, 20);

  const descartes =
    /^(albar[aá]n|factura|cliente|fecha|data|cif|nif|tel[eé]fono|direcci[oó]n|p[aá]gina|pedido|cantidad|descripci[oó]n|precio|importe|total|pastisseria cusachs)/i;

  const candidatas = lineas
    .map((linea, indice) => {
      let puntuacion = 0;

      const letras =
        linea.match(
          /[A-Za-zÀ-ÿ]/g,
        ) || [];

      if (
        linea.length >= 4 &&
        linea.length <= 90
      ) {
        puntuacion += 20;
      }

      if (letras.length >= 5) {
        puntuacion += 20;
      }

      if (
        /\b(s\.?l\.?|s\.?a\.?|scp|sc|coop|distribuciones|comercial|alimentaci[oó]n|foods?|cash|hosteler[ií]a)\b/i.test(
          linea,
        )
      ) {
        puntuacion += 35;
      }

      if (indice <= 5) {
        puntuacion += 15;
      }

      if (descartes.test(linea)) {
        puntuacion -= 100;
      }

      if (
        /@|\b(?:www|http|tel|fax)\b/i.test(
          linea,
        )
      ) {
        puntuacion -= 20;
      }

      return {
        linea,
        puntuacion,
      };
    })
    .filter(
      (item) =>
        item.puntuacion > 0,
    )
    .sort(
      (a, b) =>
        b.puntuacion -
        a.puntuacion,
    );

  return candidatas[0]?.linea || "";
}

export function recalcularAlbaranV2(
  lineas = [],
) {
  let baseImponible = 0;
  let totalIva = 0;

  for (const linea of lineas) {
    const cantidad =
      numeroEuropeo(
        linea.cantidad,
      ) ?? 0;

    const precio =
      numeroEuropeo(
        linea.precio_unitario,
      ) ?? 0;

    const totalLinea =
      redondear(
        cantidad * precio,
        2,
      );

    const iva =
      numeroEuropeo(linea.iva) ??
      10;

    baseImponible += totalLinea;
    totalIva +=
      totalLinea * (iva / 100);
  }

  return {
    base_imponible:
      redondear(
        baseImponible,
        2,
      ),
    total_iva:
      redondear(totalIva, 2),
    total: redondear(
      baseImponible + totalIva,
      2,
    ),
  };
}

export function analizarAlbaranV2(
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

  const lineasPreparadas =
    unirLineasContinuacion(
      lineasEntrada,
    );

  const lineasDetectadas =
    eliminarDuplicados(
      lineasPreparadas
        .map(parsearLineaProducto)
        .filter(Boolean),
    );

  const totales =
    recalcularAlbaranV2(
      lineasDetectadas,
    );

  const confianzaMedia =
    lineasDetectadas.length > 0
      ? redondear(
          lineasDetectadas.reduce(
            (total, linea) =>
              total +
              Number(
                linea.confianza || 0,
              ),
            0,
          ) /
            lineasDetectadas.length,
          2,
        )
      : 0;

  return {
    version_parser: "2.0.0",

    proveedor_nombre:
      extraerProveedor(texto),

    numero_albaran:
      extraerNumeroDocumento(
        texto,
      ),

    fecha_albaran:
      extraerFecha(texto),

    lineas: lineasDetectadas,

    ...totales,

    confianza_media:
      confianzaMedia,

    necesita_revision:
      lineasDetectadas.length === 0 ||
      confianzaMedia < 75 ||
      lineasDetectadas.some(
        (linea) =>
          linea.necesita_revision,
      ),

    diagnostico: {
      lineas_documento:
        lineasEntrada.length,

      lineas_preparadas:
        lineasPreparadas.length,

      productos_detectados:
        lineasDetectadas.length,

      productos_revision:
        lineasDetectadas.filter(
          (linea) =>
            linea.necesita_revision,
        ).length,

      calidad_lectura:
        lectura.calidad_lectura ||
        null,
    },
  };
}

export default analizarAlbaranV2;