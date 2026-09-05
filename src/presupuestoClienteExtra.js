import { supabase } from "./supabase.js";

function normalizar(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

let cargandoClientes = null;

async function cargarClientes() {
  if (cargandoClientes) return cargandoClientes;

  cargandoClientes = (async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, empresa, nif_cif, direccion, codigo_postal, poblacion, provincia");

    if (error) {
      console.warn("No se han podido cargar los datos fiscales del cliente", error);
      return [];
    }

    return data || [];
  })();

  try {
    return await cargandoClientes;
  } finally {
    cargandoClientes = null;
  }
}

function buscarClientePorNombre(clientes, nombreVisible) {
  const buscado = normalizar(nombreVisible);
  if (!buscado) return null;

  return (
    clientes.find((cliente) => normalizar(cliente.empresa) === buscado) ||
    clientes.find((cliente) => normalizar(cliente.nombre) === buscado) ||
    clientes.find((cliente) => {
      const empresa = normalizar(cliente.empresa);
      const nombre = normalizar(cliente.nombre);
      return (
        (empresa && (empresa.includes(buscado) || buscado.includes(empresa))) ||
        (nombre && (nombre.includes(buscado) || buscado.includes(nombre)))
      );
    }) ||
    null
  );
}

async function obtenerClienteDelPresupuesto(clientes) {
  if (!clientes.length) return null;

  const numero = document.querySelector(".presupuesto-print-numero")?.textContent?.trim();
  if (!numero) return null;

  const { data, error } = await supabase
    .from("presupuestos")
    .select("cliente_id")
    .eq("numero", numero)
    .maybeSingle();

  if (error || !data?.cliente_id) return null;

  return clientes.find((cliente) => String(cliente.id) === String(data.cliente_id)) || null;
}

function obtenerCifDesdeBloqueVisitador() {
  const bloque = document.querySelector(".presupuesto-print-bloque-extra");
  if (!bloque) return "";

  const lineas = Array.from(bloque.querySelectorAll("p"));
  const laboratorio = lineas.find((linea) =>
    normalizar(linea.textContent).startsWith("laboratorio:"),
  );

  if (!laboratorio) return "";

  const texto = laboratorio.textContent || "";
  return texto.replace(/^\s*Laboratorio:\s*/i, "").trim();
}

function obtenerDireccionEntregaVisible() {
  const filas = Array.from(document.querySelectorAll(".presupuesto-print-detalles p"));
  const filaDireccion = filas.find((fila) => {
    const etiqueta = normalizar(fila.querySelector("strong")?.textContent || "");
    return etiqueta.includes("direccion") || etiqueta.includes("adreca") || etiqueta.includes("address");
  });

  const valor = filaDireccion?.querySelector("span")?.textContent?.trim() || "";
  return valor && valor !== "—" ? valor : "";
}

async function completarDatosCliente() {
  const bloques = document.querySelectorAll(".presupuesto-print-cliente");
  if (!bloques.length) return;

  const clientes = await cargarClientes();
  const clienteVinculado = await obtenerClienteDelPresupuesto(clientes);
  const cifVisitador = obtenerCifDesdeBloqueVisitador();
  const direccionEntrega = obtenerDireccionEntregaVisible();

  for (const bloqueCliente of bloques) {
    const nombreElemento = Array.from(bloqueCliente.children).find(
      (elemento) => elemento.tagName === "STRONG",
    );
    if (!nombreElemento) continue;

    const nombreVisible = nombreElemento.textContent?.trim();
    if (!nombreVisible || nombreVisible === "—" || nombreVisible === "Cliente") continue;

    const cliente = clienteVinculado || buscarClientePorNombre(clientes, nombreVisible);
    const cif = cliente?.nif_cif || cifVisitador || "";

    const direccionFiscal = cliente
      ? [
          cliente.direccion,
          cliente.codigo_postal,
          cliente.poblacion,
          cliente.provincia,
        ]
          .filter((valor) => String(valor || "").trim())
          .join(" · ")
      : "";

    const direccionCompleta = direccionFiscal || direccionEntrega;
    if (!cif && !direccionCompleta) continue;

    const claveActual = String(cliente?.id || normalizar(nombreVisible));
    const textoBloque = bloqueCliente.textContent || "";
    const yaTieneCif = cif && textoBloque.includes(cif);
    const yaTieneDireccion = direccionCompleta && textoBloque.includes(direccionCompleta);

    let contenedor = bloqueCliente.querySelector(".presupuesto-cliente-fiscal-extra");
    if (contenedor) contenedor.remove();

    if (yaTieneCif && yaTieneDireccion) continue;

    contenedor = document.createElement("div");
    contenedor.className = "presupuesto-cliente-fiscal-extra";
    contenedor.dataset.cliente = claveActual;
    contenedor.style.marginTop = "8px";
    contenedor.style.fontSize = "15px";
    contenedor.style.lineHeight = "1.5";
    contenedor.style.fontWeight = "500";

    if (cif && !yaTieneCif) {
      const nif = document.createElement("div");
      nif.innerHTML = `<strong>DNI / CIF:</strong> ${String(cif)}`;
      contenedor.appendChild(nif);
    }

    if (direccionCompleta && !yaTieneDireccion) {
      const direccion = document.createElement("div");
      direccion.innerHTML = `<strong>Dirección:</strong> ${direccionCompleta}`;
      contenedor.appendChild(direccion);
    }

    if (contenedor.children.length) {
      nombreElemento.insertAdjacentElement("afterend", contenedor);
    }
  }
}

let temporizador = null;
const observador = new MutationObserver(() => {
  clearTimeout(temporizador);
  temporizador = setTimeout(completarDatosCliente, 150);
});

function iniciar() {
  observador.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  completarDatosCliente();
  setTimeout(completarDatosCliente, 700);
  setTimeout(completarDatosCliente, 1600);
  setTimeout(completarDatosCliente, 3200);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar, { once: true });
} else {
  iniciar();
}
