import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function ajustarTotalesPresupuesto() {
  return {
    name: "ajustar-totales-presupuesto",
    enforce: "pre",
    transform(code, id) {
      const ruta = String(id || "").replace(/\\/g, "/");

      if (!ruta.endsWith("/src/components/DocumentoEditor.jsx")) {
        return null;
      }

      const inicio = code.indexOf("function calcularTotales(");
      const fin = code.indexOf("function redondearA05(", inicio);

      if (inicio === -1 || fin === -1) {
        return null;
      }

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

  // La base imponible se redondea al euro entero más cercano.
  // Ejemplo: 893,75 € -> 894,00 €.
  const baseImponible = redondear(
    Math.round(baseProductos + baseTransporte),
  );

  // El IVA se calcula sobre la base ya redondeada para que cuadre exactamente.
  // Ejemplo: 894,00 € x 10 % = 89,40 €.
  const ivaTotal = redondear(
    baseImponible * (tipoIva / 100),
  );

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

      return {
        code: code.slice(0, inicio) + nuevaFuncion + code.slice(fin),
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [ajustarTotalesPresupuesto(), react()],
  base: "/Cusachshub-v5/",
});