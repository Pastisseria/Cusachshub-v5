import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function mejorasCusachs() {
  return {
    name: "mejoras-cusachs",
    enforce: "pre",
    transform(code, id) {
      const ruta = String(id || "").replace(/\\/g, "/");

      if (ruta.endsWith("/src/components/DocumentoEditor.jsx")) {
        let nuevoCodigo = code;

        const inicio = nuevoCodigo.indexOf("function calcularTotales(");
        const fin = nuevoCodigo.indexOf("function redondearA05(", inicio);

        if (inicio !== -1 && fin !== -1) {
          const nuevaFuncion = `function calcularTotales(
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

  const baseTransporte = convertirNumero(transporte);
  const tipoIva = convertirNumero(transporteIva) || 10;

  // La base imponible se redondea siempre al múltiplo de 0,05 € más cercano.
  // Ejemplo: 893,74 -> 893,75.
  const baseImponible = redondear(
    Math.round((baseProductos + baseTransporte + Number.EPSILON) * 20) / 20,
  );

  // El IVA se calcula sobre esa base y se redondea a céntimos.
  // Ejemplo: 893,75 × 10 % = 89,375 -> 89,38.
  const ivaTotal = redondear(
    baseImponible * (tipoIva / 100),
  );

  // El total siempre coincide con base + IVA.
  const total = redondear(baseImponible + ivaTotal);

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

`;

          nuevoCodigo =
            nuevoCodigo.slice(0, inicio) + nuevaFuncion + nuevoCodigo.slice(fin);
        }

        // Corrige también la visualización de presupuestos antiguos guardados.
        nuevoCodigo = nuevoCodigo.replace(
          `{formatearEuros(documentoAbierto.iva_total)}`,
          `{formatearEuros(redondear(Number(documentoAbierto.subtotal || 0) * ((Number(documentoAbierto.transporte_iva) || 10) / 100)))}`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `{formatearEuros(documentoAbierto.total)}`,
          `{formatearEuros(redondear(Number(documentoAbierto.subtotal || 0) + redondear(Number(documentoAbierto.subtotal || 0) * ((Number(documentoAbierto.transporte_iva) || 10) / 100))))}`,
        );

        const marcadorComponente = "function DocumentoEditor({";
        if (
          !nuevoCodigo.includes("CLAVE_BORRADOR_PRESUPUESTO") &&
          nuevoCodigo.includes(marcadorComponente)
        ) {
          const helpers = `const CLAVE_BORRADOR_PRESUPUESTO = "cusachs:borrador-presupuesto:v2";

function leerBorradorPresupuesto() {
  try {
    const texto = window.localStorage.getItem(CLAVE_BORRADOR_PRESUPUESTO);
    if (!texto) return null;
    const datos = JSON.parse(texto);
    return datos && datos.activo ? datos : null;
  } catch {
    return null;
  }
}

function borrarBorradorPresupuesto() {
  try {
    window.localStorage.removeItem(CLAVE_BORRADOR_PRESUPUESTO);
  } catch {
    // El navegador puede bloquear el almacenamiento; no impedimos trabajar.
  }
}

`;
          nuevoCodigo = nuevoCodigo.replace(
            marcadorComponente,
            helpers + marcadorComponente,
          );
        }

        nuevoCodigo = nuevoCodigo.replace(
          `}) {\n  const [clientes, setClientes] = useState([]);`,
          `}) {\n  const borradorInicial = leerBorradorPresupuesto();\n\n  const [clientes, setClientes] = useState([]);`,
        );

        nuevoCodigo = nuevoCodigo.replace(
          `const [mostrarFormulario, setMostrarFormulario] = useState(false);`,
          `const [mostrarFormulario, setMostrarFormulario] = useState(Boolean(borradorInicial?.activo));`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [documentoEditando, setDocumentoEditando] = useState(null);`,
          `const [documentoEditando, setDocumentoEditando] = useState(borradorInicial?.documentoEditando || null);`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [visitadorSeleccionadoId, setVisitadorSeleccionadoId] = useState("");`,
          `const [visitadorSeleccionadoId, setVisitadorSeleccionadoId] = useState(borradorInicial?.visitadorSeleccionadoId || "");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [tipoDocumento, setTipoDocumento] = useState(\n    tipoDocumentoFijo || "Catering",\n  );`,
          `const [tipoDocumento, setTipoDocumento] = useState(\n    borradorInicial?.tipoDocumento || tipoDocumentoFijo || "Catering",\n  );`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [clienteId, setClienteId] = useState("");`,
          `const [clienteId, setClienteId] = useState(borradorInicial?.clienteId || "");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [fecha, setFecha] = useState(fechaActual());`,
          `const [fecha, setFecha] = useState(borradorInicial?.fecha || fechaActual());`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [validezHasta, setValidezHasta] = useState("");`,
          `const [validezHasta, setValidezHasta] = useState(borradorInicial?.validezHasta || "");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [estado, setEstado] = useState("Borrador");`,
          `const [estado, setEstado] = useState(borradorInicial?.estado || "Borrador");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [idioma, setIdioma] = useState("es");`,
          `const [idioma, setIdioma] = useState(borradorInicial?.idioma || "es");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [horaEntrega, setHoraEntrega] = useState("");`,
          `const [horaEntrega, setHoraEntrega] = useState(borradorInicial?.horaEntrega || "");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [direccionEntrega, setDireccionEntrega] = useState("");`,
          `const [direccionEntrega, setDireccionEntrega] = useState(borradorInicial?.direccionEntrega || "");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [personaContacto, setPersonaContacto] = useState("");`,
          `const [personaContacto, setPersonaContacto] = useState(borradorInicial?.personaContacto || "");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [telefonoContacto, setTelefonoContacto] = useState("");`,
          `const [telefonoContacto, setTelefonoContacto] = useState(borradorInicial?.telefonoContacto || "");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [visitadorNombre, setVisitadorNombre] = useState("");`,
          `const [visitadorNombre, setVisitadorNombre] = useState(borradorInicial?.visitadorNombre || "");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [laboratorio, setLaboratorio] = useState("");`,
          `const [laboratorio, setLaboratorio] = useState(borradorInicial?.laboratorio || "");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [centroMedico, setCentroMedico] = useState("");`,
          `const [centroMedico, setCentroMedico] = useState(borradorInicial?.centroMedico || "");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [observaciones, setObservaciones] = useState("");`,
          `const [observaciones, setObservaciones] = useState(borradorInicial?.observaciones || "");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [transporte, setTransporte] = useState("");`,
          `const [transporte, setTransporte] = useState(borradorInicial?.transporte || "");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [transporteIva, setTransporteIva] = useState("10");`,
          `const [transporteIva, setTransporteIva] = useState(borradorInicial?.transporteIva || "10");`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [lineas, setLineas] = useState([nuevaLinea()]);`,
          `const [lineas, setLineas] = useState(\n    Array.isArray(borradorInicial?.lineas) && borradorInicial.lineas.length\n      ? borradorInicial.lineas\n      : [nuevaLinea()],\n  );`,
        );

        const marcadorEfecto = `  async function iniciarDictadoAsistente() {`;
        if (
          !nuevoCodigo.includes("Guardado automático del presupuesto") &&
          nuevoCodigo.includes(marcadorEfecto)
        ) {
          const efecto = `  // Guardado automático del presupuesto para no perderlo al cambiar de pantalla.\n  useEffect(() => {\n    if (!mostrarFormulario) return;\n\n    try {\n      window.localStorage.setItem(\n        CLAVE_BORRADOR_PRESUPUESTO,\n        JSON.stringify({\n          activo: true,\n          documentoEditando,\n          visitadorSeleccionadoId,\n          tipoDocumento,\n          clienteId,\n          fecha,\n          validezHasta,\n          estado,\n          idioma,\n          horaEntrega,\n          direccionEntrega,\n          personaContacto,\n          telefonoContacto,\n          visitadorNombre,\n          laboratorio,\n          centroMedico,\n          observaciones,\n          transporte,\n          transporteIva,\n          lineas,\n          actualizadoEn: new Date().toISOString(),\n        }),\n      );\n    } catch {\n      // El presupuesto sigue funcionando aunque el navegador bloquee localStorage.\n    }\n  }, [\n    mostrarFormulario,\n    documentoEditando,\n    visitadorSeleccionadoId,\n    tipoDocumento,\n    clienteId,\n    fecha,\n    validezHasta,\n    estado,\n    idioma,\n    horaEntrega,\n    direccionEntrega,\n    personaContacto,\n    telefonoContacto,\n    visitadorNombre,\n    laboratorio,\n    centroMedico,\n    observaciones,\n    transporte,\n    transporteIva,\n    lineas,\n  ]);\n\n`;
          nuevoCodigo = nuevoCodigo.replace(marcadorEfecto, efecto + marcadorEfecto);
        }

        nuevoCodigo = nuevoCodigo.replace(
          `  function cancelarFormulario() {\n    setMostrarFormulario(false);`,
          `  function cancelarFormulario() {\n    borrarBorradorPresupuesto();\n    setMostrarFormulario(false);`,
        );

        nuevoCodigo = nuevoCodigo.replace(
          `      setMostrarFormulario(false);\n      setDocumentoEditando(null);\n      setClienteId("");`,
          `      borrarBorradorPresupuesto();\n      setMostrarFormulario(false);\n      setDocumentoEditando(null);\n      setClienteId("");`,
        );

        return { code: nuevoCodigo, map: null };
      }

      if (ruta.endsWith("/src/pages/ImportadorAlbaranesV3.jsx")) {
        let nuevoCodigo = code;

        if (!nuevoCodigo.includes("CLAVE_BORRADOR_ALBARAN_V3")) {
          const marcador = "function crearIdTemporal() {";
          const helpers = `const CLAVE_BORRADOR_ALBARAN_V3 = "cusachs:borrador-albaran-v3:v1";\n\nfunction leerBorradorAlbaranV3() {\n  try {\n    const texto = window.localStorage.getItem(CLAVE_BORRADOR_ALBARAN_V3);\n    if (!texto) return null;\n    const datos = JSON.parse(texto);\n    return datos && datos.resultado ? datos : null;\n  } catch {\n    return null;\n  }\n}\n\nfunction borrarBorradorAlbaranV3() {\n  try {\n    window.localStorage.removeItem(CLAVE_BORRADOR_ALBARAN_V3);\n  } catch {\n    // No bloqueamos el lector si el navegador impide localStorage.\n  }\n}\n\n`;
          nuevoCodigo = nuevoCodigo.replace(marcador, helpers + marcador);
        }

        nuevoCodigo = nuevoCodigo.replace(
          `function ImportadorAlbaranesV3() {\n  const inputArchivoRef = useRef(null);`,
          `function ImportadorAlbaranesV3() {\n  const inputArchivoRef = useRef(null);\n  const borradorInicial = leerBorradorAlbaranV3();`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [archivoActual, setArchivoActual] = useState(null);`,
          `const [archivoActual, setArchivoActual] = useState(borradorInicial?.archivoActual || null);`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [lectura, setLectura] = useState(null);`,
          `const [lectura, setLectura] = useState(borradorInicial?.lectura || null);`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [resultado, setResultado] = useState(RESULTADO_VACIO);`,
          `const [resultado, setResultado] = useState(borradorInicial?.resultado || RESULTADO_VACIO);`,
        );
        nuevoCodigo = nuevoCodigo.replace(
          `const [mensaje, setMensaje] = useState("");`,
          `const [mensaje, setMensaje] = useState(\n    borradorInicial ? "Borrador recuperado automáticamente." : "",\n  );`,
        );

        const marcadorCarga = `  async function cargarProveedores() {`;
        if (
          !nuevoCodigo.includes("Guardado automático del albarán") &&
          nuevoCodigo.includes(marcadorCarga)
        ) {
          const efecto = `  // Guardado automático del albarán para poder cambiar de pantalla sin perder datos.\n  useEffect(() => {\n    if (!lectura && (!resultado?.lineas || resultado.lineas.length === 0)) return;\n\n    try {\n      window.localStorage.setItem(\n        CLAVE_BORRADOR_ALBARAN_V3,\n        JSON.stringify({\n          archivoActual: archivoActual\n            ? {\n                name: archivoActual.name || "albaran",\n                type: archivoActual.type || "",\n                size: Number(archivoActual.size || 0),\n              }\n            : null,\n          lectura,\n          resultado,\n          actualizadoEn: new Date().toISOString(),\n        }),\n      );\n    } catch {\n      // El lector sigue funcionando aunque no pueda persistir el borrador.\n    }\n  }, [archivoActual, lectura, resultado]);\n\n`;
          nuevoCodigo = nuevoCodigo.replace(marcadorCarga, efecto + marcadorCarga);
        }

        nuevoCodigo = nuevoCodigo.replace(
          `lineas = compararLineasIA(lineas, catalogoProveedor).map(prepararLinea);`,
          `lineas = compararLineasIA(lineas, catalogoProveedor).map((linea) =>\n          prepararLinea({\n            ...linea,\n            crear_articulo:\n              linea.estado_ia === ESTADOS_COMPARACION_IA.ARTICULO_NUEVO\n                ? true\n                : linea.crear_articulo,\n          }),\n        );`,
        );

        nuevoCodigo = nuevoCodigo.replace(
          `const lineasComparadas = compararLineasIA(\n        lineasBase,\n        catalogoProveedor,\n      ).map(prepararLinea);`,
          `const lineasComparadas = compararLineasIA(\n        lineasBase,\n        catalogoProveedor,\n      ).map((linea) =>\n        prepararLinea({\n          ...linea,\n          crear_articulo:\n            linea.estado_ia === ESTADOS_COMPARACION_IA.ARTICULO_NUEVO\n              ? true\n              : linea.crear_articulo,\n        }),\n      );`,
        );

        nuevoCodigo = nuevoCodigo.replace(
          `  function limpiarImportador() {\n    setArchivoActual(null);`,
          `  function limpiarImportador() {\n    borrarBorradorAlbaranV3();\n    setArchivoActual(null);`,
        );

        nuevoCodigo = nuevoCodigo.replace(
          `      const resumenFinal = resultadoImportacion.resumen;`,
          `      const resumenFinal = resultadoImportacion.resumen;\n      borrarBorradorAlbaranV3();`,
        );

        return { code: nuevoCodigo, map: null };
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [mejorasCusachs(), react()],
  base: "/Cusachshub-v5/",
});