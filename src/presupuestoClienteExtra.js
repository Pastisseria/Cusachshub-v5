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

async function completarDatosCliente() {
  const bloques = document.querySelectorAll(".presupuesto-print-cliente");
  if (!bloques.length) return;

  const clientes = await cargarClientes();
  if (!clientes.length) return;

  const clienteVinculado = await obtenerClienteDelPresupuesto(clientes);

  for (const bloqueCliente of bloques) {
    const nombreElemento = Array.from(bloqueCliente.children).find(
      (elemento) => elemento.tagName === "STRONG",
    );
    if (!nombreElemento) continue;

    const nombreVisible = nombreElemento.textContent?.trim();
    if (!nombreVisible || nombreVisible === "—" || nombreVisible === "Cliente") continue;

    const cliente = clienteVinculado || buscarClientePorNombre(clientes, nombreVisible);
    if (!cliente) continue;

    const claveActual = String(cliente.id || normalizar(nombreVisible));
    const existente = bloqueCliente.querySelector(".presupuesto-cliente-fiscal-extra");
    if (existente?.dataset?.cliente === claveActual) continue;
    if (existente) existente.remove();

    const direccionCompleta = [
      cliente.direccion,
      cliente.codigo_postal,
      cliente.poblacion,
      cliente.provincia,
    ]
      .filter((valor) => String(valor || "").trim())
      .join(" · ");

    const contenedor = document.createElement("div");
    contenedor.className = "presupuesto-cliente-fiscal-extra";
    contenedor.dataset.cliente = claveActual;
    contenedor.style.marginTop = "10px";
    contenedor.style.fontSize = "15px";
    contenedor.style.lineHeight = "1.5";
    contenedor.style.fontWeight = "500";

    if (cliente.nif_cif) {
      const nif = document.createElement("div");
      nif.textContent = `DNI / CIF: ${String(cliente.nif_cif)}`;
      contenedor.appendChild(nif);
    }

    if (direccionCompleta) {
      const direccion = document.createElement("div");
      direccion.textContent = `Dirección: ${direccionCompleta}`;
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
  setTimeout(completarDatosCliente, 800);
  setTimeout(completarDatosCliente, 1800);
  setTimeout(completarDatosCliente, 3500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar, { once: true });
} else {
  iniciar();
}
