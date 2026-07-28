export function prepararPropuestaDesdeEmail(texto = "") {
  const limpio = String(texto).trim();

  return {
    asunto: "",
    remitente: "",
    cuerpo: limpio,
    propuesta: null,
    confirmacionNecesaria: true,
    advertencias: [
      "Mòdul preparat per a una fase posterior.",
      "No s'ha creat cap pressupost ni client.",
    ],
  };
}
