function normalizar(texto = "") {
  return String(texto).trim();
}

function imprimirDatosFactura() {
  const detalle = document.querySelector(".facturacion-page .factura-vista-completa");
  if (!detalle) return;
  document.body.classList.add("imprimiendo-datos-factura");
  const cliente = detalle.querySelector(".factura-documento h2")?.textContent?.trim() || "Datos para la factura";
  const tituloAnterior = document.title;
  document.title = `Datos para la factura - ${cliente}`;
  const limpiar = () => {
    document.body.classList.remove("imprimiendo-datos-factura");
    document.title = tituloAnterior;
    window.removeEventListener("afterprint", limpiar);
  };
  window.addEventListener("afterprint", limpiar);
  window.print();
  setTimeout(limpiar, 3000);
}

function asegurarAccionesDetalle() {
  if (!location.hash.includes("/facturacion")) return;
  const barra = document.querySelector(".facturacion-page .factura-vista-completa .factura-barra-acciones");
  if (!barra || barra.querySelector(".datos-factura-acciones-extra")) return;
  const botonCerrar = Array.from(barra.querySelectorAll("button")).find((b) => normalizar(b.textContent).toLowerCase() === "cerrar");
  const acciones = document.createElement("div");
  acciones.className = "datos-factura-acciones-extra";
  const imprimir = document.createElement("button");
  imprimir.type = "button";
  imprimir.className = "datos-factura-boton-accion";
  imprimir.textContent = "🖨 Imprimir";
  imprimir.addEventListener("click", imprimirDatosFactura);
  const pdf = document.createElement("button");
  pdf.type = "button";
  pdf.className = "datos-factura-boton-accion";
  pdf.textContent = "📄 Guardar PDF";
  pdf.addEventListener("click", imprimirDatosFactura);
  acciones.append(imprimir, pdf);
  if (botonCerrar) barra.insertBefore(acciones, botonCerrar);
  else barra.appendChild(acciones);
}

function instalarEstilos() {
  if (document.getElementById("datos-factura-acciones-estilos")) return;
  const estilo = document.createElement("style");
  estilo.id = "datos-factura-acciones-estilos";
  estilo.textContent = `
    .facturacion-page .factura-barra-acciones{gap:12px!important}
    .facturacion-page .datos-factura-acciones-extra{display:flex;gap:10px;margin-left:auto}
    .facturacion-page .datos-factura-boton-accion{min-height:46px;padding:0 18px;border:0;border-radius:12px;background:#fff;color:#3d004f;font-weight:800;cursor:pointer}
    @media print{
      @page{size:A4 portrait;margin:12mm}
      body.imprimiendo-datos-factura *{visibility:hidden!important}
      body.imprimiendo-datos-factura .factura-vista-completa,
      body.imprimiendo-datos-factura .factura-vista-completa *{visibility:visible!important}
      body.imprimiendo-datos-factura .factura-barra-acciones{display:none!important}
      body.imprimiendo-datos-factura .factura-vista-completa{display:block!important;position:absolute!important;left:0!important;top:0!important;width:100%!important;height:auto!important;inset:auto!important;overflow:visible!important;padding:0!important;margin:0!important;background:#fff!important}
      body.imprimiendo-datos-factura .factura-documento{display:block!important;width:100%!important;max-width:none!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;background:#fff!important}
      body.imprimiendo-datos-factura .tabla-facturas{width:100%!important}
    }
  `;
  document.head.appendChild(estilo);
}

let temporizador=null;
function programar(){clearTimeout(temporizador);temporizador=setTimeout(asegurarAccionesDetalle,80)}
function iniciar(){instalarEstilos();const observador=new MutationObserver(programar);observador.observe(document.body,{childList:true,subtree:true});window.addEventListener("hashchange",programar);programar()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar,{once:true});else iniciar();
