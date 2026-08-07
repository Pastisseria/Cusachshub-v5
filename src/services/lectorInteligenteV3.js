import { supabase } from "../supabase.js";
import { leerDocumento } from "./lectordocumentos.js";

const VERSION = "3.1.0";

function limpiar(texto = "") {
  return String(texto)
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/(\d)\s*,\s*(\d)/g, "$1,$2")
    .replace(/(\d)\s*\.\s*(\d)/g, "$1.$2")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizarBusqueda(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function analizarLinea(texto, indice) {
  return {
    indice,
    texto: String(texto).trim(),
  };
}

async function cargarProveedores() {
  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .order("nombre");

  if (error) throw error;
  return data || [];
}

function nombreProveedor(p = {}) {
  return p.nombre || p.nombre_comercial || p.razon_social || p.empresa || "";
}

function cifProveedor(p = {}) {
  return p.nif_cif || p.cif || p.nif || "";
}

function detectarProveedor(texto, proveedores, proveedorIdForzado = "") {
  if (proveedorIdForzado) {
    return (
      proveedores.find(
        (p) => String(p.id) === String(proveedorIdForzado),
      ) || null
    );
  }

  const documento = normalizarBusqueda(texto);

  const candidatos = proveedores
    .map((p) => {
      const nombre = normalizarBusqueda(nombreProveedor(p));
      const cif = normalizarBusqueda(cifProveedor(p));
      let puntos = 0;

      if (cif.length >= 6 && documento.includes(cif)) puntos += 150;
      if (nombre.length >= 5 && documento.includes(nombre)) puntos += 110;

      return { p, puntos };
    })
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos);

  return candidatos[0]?.p || null;
}

async function cargarAprendizaje(proveedorId) {
  if (!proveedorId) {
    return {
      configuracion: null,
      diccionario: [],
      reglas: [],
    };
  }

  const [config, diccionario, reglas] = await Promise.all([
    supabase
      .from("proveedores_ia")
      .select("*")
      .eq("proveedor_id", proveedorId)
      .eq("activo", true)
      .maybeSingle(),

    supabase
      .from("diccionario_articulos")
      .select("*")
      .eq("proveedor_id", proveedorId)
      .eq("activo", true),

    supabase
      .from("aprendizaje_ia")
      .select("*")
      .eq("proveedor_id", proveedorId)
      .eq("activo", true),
  ]);

  if (config.error) throw config.error;
  if (diccionario.error) throw diccionario.error;
  if (reglas.error) throw reglas.error;

  return {
    configuracion: config.data || null,
    diccionario: diccionario.data || [],
    reglas: reglas.data || [],
  };
}

function aplicarReglas(texto, reglas = []) {
  let salida = texto;

  for (const regla of reglas) {
    if (
      regla.tipo !== "correccion_ocr" ||
      !regla.valor_original ||
      !regla.valor_corregido
    ) {
      continue;
    }

    const escapado = String(regla.valor_original).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    salida = salida.replace(
      new RegExp(escapado, "gi"),
      regla.valor_corregido,
    );
  }

  return salida;
}

function aplicarDiccionario(lineas, diccionario = []) {
  return lineas.map((linea) => {
    const texto = normalizarBusqueda(linea.texto);

    const exacta = diccionario.find(
      (d) =>
        normalizarBusqueda(
          d.texto_normalizado || d.texto_original,
        ) === texto,
    );

    if (!exacta) return linea;

    return {
      ...linea,
      aprendizaje_diccionario: {
        id: exacta.id,
        producto_id: exacta.producto_id || null,
        catalogo_proveedor_id: exacta.catalogo_proveedor_id || null,
        codigo_proveedor: exacta.codigo_proveedor || null,
        nombre_corregido: exacta.nombre_corregido || null,
        unidad_corregida: exacta.unidad_corregida || null,
      },
    };
  });
}

export async function leerDocumentoInteligenteV3(
  archivo,
  opciones = {},
) {
  if (!archivo) {
    throw new Error("No se ha seleccionado ningún documento.");
  }

  const {
    onProgreso,
    proveedorId = "",
    proveedores: proveedoresRecibidos,
  } = opciones;

  if (typeof onProgreso === "function") {
    onProgreso({
      estado: "Leyendo documento",
      progreso: 1,
    });
  }

  const textoOriginal = await leerDocumento(
    archivo,
    onProgreso,
  );

  let textoNormalizado = limpiar(textoOriginal);

  const proveedores = Array.isArray(proveedoresRecibidos)
    ? proveedoresRecibidos
    : await cargarProveedores();

  const proveedor = detectarProveedor(
    textoNormalizado,
    proveedores,
    proveedorId,
  );

  const proveedorDetectadoId =
    proveedor?.id || proveedorId || "";

  const aprendizaje = await cargarAprendizaje(
    proveedorDetectadoId,
  );

  textoNormalizado = limpiar(
    aplicarReglas(
      textoNormalizado,
      aprendizaje.reglas,
    ),
  );

  let lineas = textoNormalizado
    .split("\n")
    .map((t, indice) => analizarLinea(t, indice))
    .filter((l) => l.texto);

  const primera = Number(
    aprendizaje.configuracion?.primera_linea_producto,
  );

  if (Number.isInteger(primera) && primera >= 0) {
    lineas = lineas.filter(
      (l) => l.indice >= primera,
    );
  }

  lineas = aplicarDiccionario(
    lineas,
    aprendizaje.diccionario,
  );

  const caracteres =
    textoNormalizado.replace(/\s/g, "").length;

  const calidad = Math.max(
    0,
    Math.min(
      100,
      caracteres >= 100
        ? 85
        : caracteres >= 30
          ? 60
          : 20,
    ),
  );

  if (typeof onProgreso === "function") {
    onProgreso({
      estado: "Documento preparado",
      progreso: 100,
    });
  }

  return {
    version: VERSION,

    archivo: {
      nombre: archivo.name,
      tipo_mime: archivo.type || "",
      tamaño_bytes: Number(archivo.size || 0),
    },

    texto_original: textoOriginal,
    texto_normalizado: textoNormalizado,
    lineas,

    proveedor_id: proveedorDetectadoId,

    proveedor_detectado: proveedor
      ? {
          id: proveedor.id,
          nombre: nombreProveedor(proveedor),
          identificador_fiscal: cifProveedor(proveedor),
        }
      : null,

    configuracion_proveedor:
      aprendizaje.configuracion,

    calidad_lectura: {
      puntuacion: calidad,
      nivel: calidad >= 75 ? "buena" : "aceptable",
    },

    calidad_lectura_v3: {
      puntuacion: Math.min(
        100,
        calidad +
          (proveedor ? 8 : 0) +
          (aprendizaje.configuracion ? 7 : 0),
      ),
      proveedor_detectado: Boolean(proveedor),
      configuracion_aplicada: Boolean(
        aprendizaje.configuracion,
      ),
      entradas_diccionario:
        aprendizaje.diccionario.length,
    },

    aprendizaje: {
      tiene_plantilla: Boolean(
        aprendizaje.configuracion,
      ),
      diccionario_articulos:
        aprendizaje.diccionario.length,
      reglas_aprendidas:
        aprendizaje.reglas.length,
    },

    necesita_revision:
      !proveedorDetectadoId || calidad < 75,
  };
}

export default leerDocumentoInteligenteV3;
