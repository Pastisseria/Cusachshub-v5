export function determinarZonaProduccion(producto, nombreProducto = "", departamento = "") {
  const zonaConfigurada =
    producto?.zona_produccion ||
    producto?.zona ||
    producto?.seccion ||
    "";

  const zonaNormalizada = normalizarZonaConfigurada(departamento) || normalizarZonaConfigurada(zonaConfigurada);
  if (zonaNormalizada) return zonaNormalizada;

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

function normalizarZonaConfigurada(zona) {
  const valor = normalizarTextoProduccion(zona);
  if (valor === "obrador") return "Obrador";
  if (valor === "cocina") return "Cocina";
  if (valor === "barra") return "Barra";
  return "";
}

export function normalizarTextoProduccion(valor) {
  return String(valor || "")
    .trim()
    .toLocaleLowerCase("es-ES")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

