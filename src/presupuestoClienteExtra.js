import { supabase } from "./supabase.js";

function normalizar(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

let clientesCache = null;
let cargandoClientes = null;

async function cargarClientes() {
  if (clientesCache) return clientesCache;
  if (cargandoClientes) return cargandoClientes;

  cargandoClientes = supabase
    .from("clientes")
    .select("id, nombre, empresa, nif_cif, direccion, codigo_postal, poblacion, provincia")
    .then(({ data, error }) => {
      if (error) throw error;
      clientesCache = data || [];
      return clientesCache;
    })
    .catch((error) => {
      console.warn("No se han podido cargar los datos fiscales del cliente", error);
      return [];
    })
    .finally(() => {
      cargandoClientes = null;
    });

  return cargandoClientes;
}

function buscarCliente(clientes, nombreVisible) {
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

async function completarDatosCliente() {
  const bloqueCliente = document.querySelector(".presupuesto-print-cliente");
  if (!bloqueCliente) return;

  const nombreElemento = bloqueCliente.querySelector(":scope > strong");
  if (!nombreElemento) return;

  const nombreVisible = nombreElemento.textContent?.trim();
  if (!nombreVisible || nombreVisible === "—" || nombreVisible === "Cliente") return;

  const claveActual = normalizar(nombreVisible);
  const existente = bloqueCliente.querySelector(".presupuesto-cliente-fiscal-extra");
  if (existente?.dataset?.cliente === claveActual) return;
  if (existente) existente.remove();

  const clientes = await cargarClientes();
  const cliente = buscarCliente(clientes, nombreVisible);
  if (!cliente) return;

  const direccionCompleta = [
    cliente.direccion,
    cliente.codigo_postal,
    cliente.poblacion,
    cliente.provincia,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!cliente.nif_cif && !direccionCompleta) return;

  const contenedor = document.createElement("div");
  contenedor.className = "presupuesto-cliente-fiscal-extra";
  contenedor.dataset.cliente = claveActual;

  if (cliente.nif_cif) {
    const nif = document.createElement("div");
    nif.className = "presupuesto-cliente-fiscal-linea";
    nif.innerHTML = `<strong>DNI / CIF:</strong> ${String(cliente.nif_cif)}`;
    contenedor.appendChild(nif);
  }

  if (direccionCompleta) {
    const direccion = document.createElement("div");
    direccion.className = "presupuesto-cliente-fiscal-linea";
    direccion.innerHTML = `<strong>Dirección:</strong> ${direccionCompleta}`;
    contenedor.appendChild(direccion);
  }

  nombreElemento.insertAdjacentElement("afterend", contenedor);
}

const observador = new MutationObserver(() => {
  completarDatosCliente();
});

function iniciar() {
  observador.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  completarDatosCliente();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar, { once: true });
} else {
  iniciar();
}
