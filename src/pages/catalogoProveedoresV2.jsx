import { supabase } from "../supabase.js";
import {
  normalizarNombreArticulo,
} from "../ai/parserAlbaranesV2.js";

export const ESTADOS_CATALOGO = {
  ENCONTRADO: "ENCONTRADO",
  PRECIO_NUEVO: "PRECIO_NUEVO",
  ARTICULO_NUEVO: "ARTICULO_NUEVO",
  POSIBLE_COINCIDENCIA: "POSIBLE_COINCIDENCIA",
  REVISAR: "REVISAR",
};

function numero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return 0;
  }

  let limpio = String(valor)
    .trim()
    .replace(/[€%\s]/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!limpio) {
    return 0;
  }

  const tieneComa =
    limpio.includes(",");

  const tienePunto =
    limpio.includes(".");

  if (tieneComa && tienePunto) {
    if (
      limpio.lastIndexOf(",") >
      limpio.lastIndexOf(".")
    ) {
      limpio = limpio
        .replace(/\./g, "")
        .replace(",", ".");
    } else {
      limpio =
        limpio.replace(/,/g, "");
    }
  } else if (tieneComa) {
    limpio =
      limpio.replace(",", ".");
  }

  const resultado =
    Number(limpio);

  return Number.isFinite(resultado)
    ? resultado
    : 0;
}

function redondear(
  valor,
  decimales = 4,
) {
  const resultado =
    numero(valor);

  return Number(
    resultado.toFixed(decimales),
  );
}

function normalizarCodigo(
  valor = "",
) {
  return String(valor)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9._/-]/g, "");
}

function obtenerNombreCatalogo(
  articulo = {},
) {
  return (
    articulo.producto ||
    articulo.nombre ||
    articulo.descripcion ||
    articulo.nombre_producto ||
    ""
  );
}

function obtenerCodigoCatalogo(
  articulo = {},
) {
  return normalizarCodigo(
    articulo.codigo_proveedor ||
      articulo.codigo ||
      articulo.referencia ||
      articulo.codigo_articulo ||
      "",
  );
}

function obtenerPrecioCatalogo(
  articulo = {},
) {
  const posiblesCampos = [
    articulo.precio_unitario,
    articulo.precio_sin_iva,
    articulo.precio,
    articulo.coste,
    articulo.precio_coste,
  ];

  for (const valor of posiblesCampos) {
    if (
      valor !== null &&
      valor !== undefined &&
      valor !== ""
    ) {
      return redondear(valor);
    }
  }

  return 0;
}

function obtenerNombreNormalizadoCatalogo(
  articulo = {},
) {
  return (
    articulo.nombre_normalizado ||
    normalizarNombreArticulo(
      obtenerNombreCatalogo(
        articulo,
      ),
    )
  );
}

function diferenciaPrecio(
  precioAnterior,
  precioNuevo,
) {
  return redondear(
    numero(precioNuevo) -
      numero(precioAnterior),
    4,
  );
}

function porcentajeCambio(
  precioAnterior,
  precioNuevo,
) {
  const anterior =
    numero(precioAnterior);

  const nuevo =
    numero(precioNuevo);

  if (anterior <= 0) {
    return nuevo > 0
      ? 100
      : 0;
  }

  return redondear(
    ((nuevo - anterior) /
      anterior) *
      100,
    2,
  );
}

function preciosIguales(
  precioA,
  precioB,
) {
  return (
    Math.abs(
      numero(precioA) -
        numero(precioB),
    ) <= 0.005
  );
}

function crearPalabras(
  texto = "",
) {
  return normalizarNombreArticulo(
    texto,
  )
    .split(" ")
    .filter(
      (palabra) =>
        palabra.length >= 2,
    );
}

function similitudPalabras(
  textoA = "",
  textoB = "",
) {
  const palabrasA =
    crearPalabras(textoA);

  const palabrasB =
    crearPalabras(textoB);

  if (
    palabrasA.length === 0 ||
    palabrasB.length === 0
  ) {
    return 0;
  }

  const conjuntoA =
    new Set(palabrasA);

  const conjuntoB =
    new Set(palabrasB);

  let coincidencias = 0;

  for (const palabra of conjuntoA) {
    if (
      conjuntoB.has(palabra)
    ) {
      coincidencias += 1;
    }
  }

  const totalUnicas =
    new Set([
      ...conjuntoA,
      ...conjuntoB,
    ]).size;

  if (totalUnicas === 0) {
    return 0;
  }

  return coincidencias /
    totalUnicas;
}

function distanciaLevenshtein(
  textoA = "",
  textoB = "",
) {
  const a =
    String(textoA);

  const b =
    String(textoB);

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

  const matriz =
    Array.from(
      {
        length: b.length + 1,
      },
      () =>
        Array(a.length + 1).fill(0),
    );

  for (
    let indice = 0;
    indice <= a.length;
    indice += 1
  ) {
    matriz[0][indice] = indice;
  }

  for (
    let indice = 0;
    indice <= b.length;
    indice += 1
  ) {
    matriz[indice][0] = indice;
  }

  for (
    let fila = 1;
    fila <= b.length;
    fila += 1
  ) {
    for (
      let columna = 1;
      columna <= a.length;
      columna += 1
    ) {
      const coste =
        b[fila - 1] ===
        a[columna - 1]
          ? 0
          : 1;

      matriz[fila][columna] =
        Math.min(
          matriz[fila - 1][
            columna
          ] + 1,

          matriz[fila][
            columna - 1
          ] + 1,

          matriz[fila - 1][
            columna - 1
          ] + coste,
        );
    }
  }

  return matriz[b.length][a.length];
}

function similitudTexto(
  textoA = "",
  textoB = "",
) {
  const a =
    normalizarNombreArticulo(
      textoA,
    );

  const b =
    normalizarNombreArticulo(
      textoB,
    );

  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  if (
    a.includes(b) ||
    b.includes(a)
  ) {
    const longitudMenor =
      Math.min(
        a.length,
        b.length,
      );

    const longitudMayor =
      Math.max(
        a.length,
        b.length,
      );

    return Math.max(
      0.82,
      longitudMenor /
        longitudMayor,
    );
  }

  const distancia =
    distanciaLevenshtein(a, b);

  const longitudMayor =
    Math.max(
      a.length,
      b.length,
    );

  const similitudCaracteres =
    longitudMayor > 0
      ? 1 -
        distancia /
          longitudMayor
      : 0;

  const similitudPorPalabras =
    similitudPalabras(a, b);

  return Math.max(
    similitudCaracteres,
    similitudPorPalabras,
    similitudCaracteres * 0.55 +
      similitudPorPalabras * 0.45,
  );
}

function prepararArticuloCatalogo(
  articulo = {},
) {
  return {
    ...articulo,

    nombre_catalogo:
      obtenerNombreCatalogo(
        articulo,
      ),

    nombre_normalizado:
      obtenerNombreNormalizadoCatalogo(
        articulo,
      ),

    codigo_normalizado:
      obtenerCodigoCatalogo(
        articulo,
      ),

    precio_catalogo:
      obtenerPrecioCatalogo(
        articulo,
      ),
  };
}

export async function cargarCatalogoProveedor(
  proveedorId,
) {
  if (!proveedorId) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "catalogo_proveedores",
    )
    .select("*")
    .eq(
      "proveedor_id",
      proveedorId,
    )
    .order(
      "producto",
      {
        ascending: true,
      },
    );

  if (error) {
    console.error(
      "Error cargando catálogo:",
      error,
    );

    throw new Error(
      error.message ||
        "No se ha podido cargar el catálogo del proveedor.",
    );
  }

  return (data || []).map(
    prepararArticuloCatalogo,
  );
}

function buscarPorCodigo(
  linea,
  catalogo,
) {
  const codigo =
    normalizarCodigo(
      linea.codigo,
    );

  if (!codigo) {
    return null;
  }

  return (
    catalogo.find(
      (articulo) =>
        articulo
          .codigo_normalizado ===
        codigo,
    ) || null
  );
}

function buscarPorNombreExacto(
  linea,
  catalogo,
) {
  const nombre =
    normalizarNombreArticulo(
      linea.descripcion,
    );

  if (!nombre) {
    return null;
  }

  return (
    catalogo.find(
      (articulo) =>
        articulo
          .nombre_normalizado ===
        nombre,
    ) || null
  );
}

function buscarPosibleCoincidencia(
  linea,
  catalogo,
) {
  const nombre =
    normalizarNombreArticulo(
      linea.descripcion,
    );

  if (!nombre) {
    return null;
  }

  const candidatos =
    catalogo
      .map((articulo) => ({
        articulo,
        similitud:
          similitudTexto(
            nombre,
            articulo
              .nombre_normalizado,
          ),
      }))
      .filter(
        (item) =>
          item.similitud >= 0.58,
      )
      .sort(
        (a, b) =>
          b.similitud -
          a.similitud,
      );

  if (
    candidatos.length === 0
  ) {
    return null;
  }

  return candidatos[0];
}

function crearResultadoComparacion({
  linea,
  estado,
  articuloCatalogo = null,
  similitud = 0,
  motivo = "",
}) {
  const precioLeido =
    redondear(
      linea.precio_unitario,
    );

  const precioAnterior =
    articuloCatalogo
      ? redondear(
          articuloCatalogo
            .precio_catalogo,
        )
      : 0;

  return {
    ...linea,

    estado_catalogo: estado,

    catalogo_id:
      articuloCatalogo?.id ||
      null,

    articulo_catalogo:
      articuloCatalogo,

    nombre_catalogo:
      articuloCatalogo
        ?.nombre_catalogo ||
      "",

    codigo_catalogo:
      articuloCatalogo
        ?.codigo_normalizado ||
      "",

    precio_anterior:
      precioAnterior,

    precio_nuevo:
      precioLeido,

    diferencia_precio:
      diferenciaPrecio(
        precioAnterior,
        precioLeido,
      ),

    porcentaje_cambio:
      porcentajeCambio(
        precioAnterior,
        precioLeido,
      ),

    similitud:
      redondear(
        similitud * 100,
        2,
      ),

    motivo,

    crear_articulo:
      estado ===
      ESTADOS_CATALOGO
        .ARTICULO_NUEVO,

    actualizar_precio:
      estado ===
      ESTADOS_CATALOGO
        .PRECIO_NUEVO,

    confirmado:
      estado !==
      ESTADOS_CATALOGO.REVISAR,

    necesita_revision:
      Boolean(
        linea.necesita_revision,
      ) ||
      estado ===
        ESTADOS_CATALOGO
          .POSIBLE_COINCIDENCIA ||
      estado ===
        ESTADOS_CATALOGO
          .REVISAR,
  };
}

export function compararLineaConCatalogo(
  linea,
  catalogo = [],
) {
  if (
    !linea?.descripcion?.trim()
  ) {
    return crearResultadoComparacion({
      linea,
      estado:
        ESTADOS_CATALOGO.REVISAR,
      motivo:
        "La línea no tiene una descripción válida.",
    });
  }

  const encontradoCodigo =
    buscarPorCodigo(
      linea,
      catalogo,
    );

  if (encontradoCodigo) {
    if (
      preciosIguales(
        encontradoCodigo
          .precio_catalogo,
        linea.precio_unitario,
      )
    ) {
      return crearResultadoComparacion({
        linea,
        estado:
          ESTADOS_CATALOGO
            .ENCONTRADO,
        articuloCatalogo:
          encontradoCodigo,
        similitud: 1,
        motivo:
          "Artículo encontrado por código y con el mismo precio.",
      });
    }

    return crearResultadoComparacion({
      linea,
      estado:
        ESTADOS_CATALOGO
          .PRECIO_NUEVO,
      articuloCatalogo:
        encontradoCodigo,
      similitud: 1,
      motivo:
        "Artículo encontrado por código, pero el precio es diferente.",
    });
  }

  const encontradoNombre =
    buscarPorNombreExacto(
      linea,
      catalogo,
    );

  if (encontradoNombre) {
    if (
      preciosIguales(
        encontradoNombre
          .precio_catalogo,
        linea.precio_unitario,
      )
    ) {
      return crearResultadoComparacion({
        linea,
        estado:
          ESTADOS_CATALOGO
            .ENCONTRADO,
        articuloCatalogo:
          encontradoNombre,
        similitud: 1,
        motivo:
          "Artículo encontrado por nombre y con el mismo precio.",
      });
    }

    return crearResultadoComparacion({
      linea,
      estado:
        ESTADOS_CATALOGO
          .PRECIO_NUEVO,
      articuloCatalogo:
        encontradoNombre,
      similitud: 1,
      motivo:
        "Artículo encontrado por nombre, pero el precio es diferente.",
    });
  }

  const posible =
    buscarPosibleCoincidencia(
      linea,
      catalogo,
    );

  if (
    posible &&
    posible.similitud >= 0.72
  ) {
    return crearResultadoComparacion({
      linea,
      estado:
        ESTADOS_CATALOGO
          .POSIBLE_COINCIDENCIA,
      articuloCatalogo:
        posible.articulo,
      similitud:
        posible.similitud,
      motivo:
        "Se ha encontrado un artículo parecido. Debes confirmar si es el mismo.",
    });
  }

  return crearResultadoComparacion({
    linea,
    estado:
      ESTADOS_CATALOGO
        .ARTICULO_NUEVO,
    motivo:
      "No existe ningún artículo suficientemente parecido en el catálogo.",
  });
}

export function compararLineasConCatalogo(
  lineas = [],
  catalogo = [],
) {
  return lineas.map(
    (linea) =>
      compararLineaConCatalogo(
        linea,
        catalogo,
      ),
  );
}

function prepararNuevoArticulo({
  linea,
  proveedorId,
  fechaDocumento,
}) {
  const precio =
    redondear(
      linea.precio_unitario,
    );

  const iva =
    numero(linea.iva) || 10;

  const unidad =
    linea.unidad ||
    "unidad";

  return {
    proveedor_id:
      proveedorId,

    producto:
      linea.descripcion.trim(),

    codigo:
      linea.codigo?.trim() ||
      null,

    codigo_proveedor:
      linea.codigo?.trim() ||
      null,

    nombre_normalizado:
      normalizarNombreArticulo(
        linea.descripcion,
      ),

    categoria: null,

    cantidad_formato: 1,

    unidad,

    precio_sin_iva:
      precio,

    iva,

    precio_con_iva:
      redondear(
        precio *
          (1 + iva / 100),
        4,
      ),

    precio_unitario:
      precio,

    observaciones:
      "Creado automáticamente desde el Lector Inteligente V2.",

    activo: true,

    fecha_precio:
      fechaDocumento ||
      new Date()
        .toISOString()
        .slice(0, 10),

    origen_ultima_actualizacion:
      "albaran_v2",
  };
}

async function crearArticuloCatalogo({
  linea,
  proveedorId,
  fechaDocumento,
}) {
  const payload =
    prepararNuevoArticulo({
      linea,
      proveedorId,
      fechaDocumento,
    });

  const {
    data,
    error,
  } = await supabase
    .from(
      "catalogo_proveedores",
    )
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error(
      "Error creando artículo:",
      error,
    );

    throw new Error(
      `No se ha podido crear “${linea.descripcion}”: ${error.message}`,
    );
  }

  return data;
}

async function guardarHistorialPrecio({
  articulo,
  linea,
  proveedorId,
  fechaDocumento,
  numeroDocumento,
  importacionAlbaranId,
}) {
  const payload = {
    catalogo_proveedor_id:
      articulo.id,

    proveedor_id:
      proveedorId,

    codigo_proveedor:
      linea.codigo ||
      obtenerCodigoCatalogo(
        articulo,
      ) ||
      null,

    producto:
      linea.descripcion ||
      obtenerNombreCatalogo(
        articulo,
      ),

    precio_anterior:
      obtenerPrecioCatalogo(
        articulo,
      ),

    precio_nuevo:
      redondear(
        linea.precio_unitario,
      ),

    fecha_precio:
      fechaDocumento ||
      new Date()
        .toISOString()
        .slice(0, 10),

    origen: "albaran_v2",

    numero_documento:
      numeroDocumento ||
      null,

    importacion_albaran_id:
      importacionAlbaranId ||
      null,
  };

  const {
    error,
  } = await supabase
    .from(
      "historial_precios_proveedores",
    )
    .insert(payload);

  if (error) {
    console.error(
      "Error guardando historial de precio:",
      error,
    );

    throw new Error(
      `No se ha podido guardar el historial de “${linea.descripcion}”: ${error.message}`,
    );
  }
}

async function actualizarPrecioCatalogo({
  articulo,
  linea,
  fechaDocumento,
}) {
  const precioAnterior =
    obtenerPrecioCatalogo(
      articulo,
    );

  const precioNuevo =
    redondear(
      linea.precio_unitario,
    );

  const iva =
    numero(
      linea.iva ??
        articulo.iva ??
        10,
    );

  const payload = {
    precio_sin_iva:
      precioNuevo,

    precio_unitario:
      precioNuevo,

    precio_con_iva:
      redondear(
        precioNuevo *
          (1 + iva / 100),
        4,
      ),

    iva,

    ultimo_precio_anterior:
      precioAnterior,

    fecha_ultimo_cambio_precio:
      fechaDocumento ||
      new Date()
        .toISOString()
        .slice(0, 10),

    fecha_precio:
      fechaDocumento ||
      new Date()
        .toISOString()
        .slice(0, 10),

    origen_ultima_actualizacion:
      "albaran_v2",

    nombre_normalizado:
      normalizarNombreArticulo(
        linea.descripcion ||
          obtenerNombreCatalogo(
            articulo,
          ),
      ),
  };

  if (
    linea.codigo?.trim()
  ) {
    payload.codigo_proveedor =
      linea.codigo.trim();
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "catalogo_proveedores",
    )
    .update(payload)
    .eq(
      "id",
      articulo.id,
    )
    .select()
    .single();

  if (error) {
    console.error(
      "Error actualizando precio:",
      error,
    );

    throw new Error(
      `No se ha podido actualizar “${linea.descripcion}”: ${error.message}`,
    );
  }

  return data;
}

export async function aplicarCambiosCatalogo({
  lineas = [],
  proveedorId,
  fechaDocumento,
  numeroDocumento,
  importacionAlbaranId = null,
}) {
  if (!proveedorId) {
    throw new Error(
      "Falta el proveedor para actualizar el catálogo.",
    );
  }

  const resumen = {
    articulos_creados: 0,
    precios_actualizados: 0,
    articulos_sin_cambios: 0,
    articulos_omitidos: 0,
    errores: [],
    resultados: [],
  };

  for (const linea of lineas) {
    try {
      if (
        linea.estado_catalogo ===
          ESTADOS_CATALOGO
            .ARTICULO_NUEVO &&
        linea.crear_articulo &&
        linea.confirmado !== false
      ) {
        const articuloCreado =
          await crearArticuloCatalogo({
            linea,
            proveedorId,
            fechaDocumento,
          });

        resumen.articulos_creados += 1;

        resumen.resultados.push({
          descripcion:
            linea.descripcion,
          accion:
            "articulo_creado",
          articulo:
            articuloCreado,
        });

        continue;
      }

      if (
        linea.estado_catalogo ===
          ESTADOS_CATALOGO
            .PRECIO_NUEVO &&
        linea.actualizar_precio &&
        linea.confirmado !== false &&
        linea.articulo_catalogo
      ) {
        await guardarHistorialPrecio({
          articulo:
            linea.articulo_catalogo,
          linea,
          proveedorId,
          fechaDocumento,
          numeroDocumento,
          importacionAlbaranId,
        });

        const articuloActualizado =
          await actualizarPrecioCatalogo({
            articulo:
              linea.articulo_catalogo,
            linea,
            fechaDocumento,
          });

        resumen.precios_actualizados += 1;

        resumen.resultados.push({
          descripcion:
            linea.descripcion,
          accion:
            "precio_actualizado",
          articulo:
            articuloActualizado,
        });

        continue;
      }

      if (
        linea.estado_catalogo ===
        ESTADOS_CATALOGO.ENCONTRADO
      ) {
        resumen.articulos_sin_cambios += 1;

        resumen.resultados.push({
          descripcion:
            linea.descripcion,
          accion:
            "sin_cambios",
        });

        continue;
      }

      resumen.articulos_omitidos += 1;

      resumen.resultados.push({
        descripcion:
          linea.descripcion,
        accion:
          "omitido",
        motivo:
          linea.motivo ||
          "No confirmado.",
      });
    } catch (error) {
      console.error(
        "Error aplicando cambio de catálogo:",
        error,
      );

      resumen.errores.push({
        descripcion:
          linea.descripcion,
        mensaje:
          error.message ||
          "Error desconocido.",
      });
    }
  }

  return resumen;
}

export function resolverPosibleCoincidencia({
  linea,
  usarArticuloExistente,
}) {
  if (!linea) {
    return linea;
  }

  if (
    usarArticuloExistente &&
    linea.articulo_catalogo
  ) {
    const precioAnterior =
      obtenerPrecioCatalogo(
        linea.articulo_catalogo,
      );

    const precioNuevo =
      redondear(
        linea.precio_unitario,
      );

    const mismoPrecio =
      preciosIguales(
        precioAnterior,
        precioNuevo,
      );

    return {
      ...linea,

      estado_catalogo:
        mismoPrecio
          ? ESTADOS_CATALOGO
              .ENCONTRADO
          : ESTADOS_CATALOGO
              .PRECIO_NUEVO,

      precio_anterior:
        precioAnterior,

      precio_nuevo:
        precioNuevo,

      diferencia_precio:
        diferenciaPrecio(
          precioAnterior,
          precioNuevo,
        ),

      porcentaje_cambio:
        porcentajeCambio(
          precioAnterior,
          precioNuevo,
        ),

      crear_articulo: false,

      actualizar_precio:
        !mismoPrecio,

      confirmado: true,

      necesita_revision: false,

      motivo:
        "Coincidencia confirmada manualmente.",
    };
  }

  return {
    ...linea,

    estado_catalogo:
      ESTADOS_CATALOGO
        .ARTICULO_NUEVO,

    catalogo_id: null,

    articulo_catalogo: null,

    nombre_catalogo: "",

    codigo_catalogo: "",

    precio_anterior: 0,

    crear_articulo: true,

    actualizar_precio: false,

    confirmado: true,

    necesita_revision: false,

    motivo:
      "El usuario ha indicado que es un artículo nuevo.",
  };
}

export default {
  cargarCatalogoProveedor,
  compararLineaConCatalogo,
  compararLineasConCatalogo,
  aplicarCambiosCatalogo,
  resolverPosibleCoincidencia,
};