import { supabase } from './supabase.js'

const KEY='cusachs_presupuesto_pendiente_facturar'
let montando=false
function pendiente(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{return null}}
function eur(n){return Number(n||0).toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2})}
async function montar(){
  const p=pendiente(); if(!p?.registroId||!String(location.hash).startsWith('#/facturacion')||montando)return
  if(document.getElementById('datos-factura-simple'))return
  const cab=document.querySelector('.facturacion-cabecera'); if(!cab)return
  montando=true
  try{
    const {data:r,error}=await supabase.from('facturas').select('*').eq('id',p.registroId).single(); if(error)throw error
    let lineas=Array.isArray(r.lineas)?r.lineas:[]; if(typeof r.lineas==='string'){try{lineas=JSON.parse(r.lineas)||[]}catch{lineas=[]}}
    const baseInicial=Number(r.base_imponible??r.subtotal??0)||lineas.reduce((s,l)=>s+(Number(l.cantidad)||0)*(Number(l.precio_unitario)||0),0)
    const detalleInicial=r.detalle_concepto||''
    const box=document.createElement('section'); box.id='datos-factura-simple'; box.className='no-imprimir'; box.style.cssText='width:100%;margin-top:16px;padding:18px;border:2px solid #6b2c7d;border-radius:16px;background:#fbf7fc'
    box.innerHTML=`<h3 style="margin:0 0 6px;color:#4b175b">Datos de este catering para la factura</h3><p style="margin:0 0 16px">Aquí puedes sustituir el listado de productos por un único concepto para el PDF.</p><div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px"><label style="font-weight:800">Detalle / concepto<input id="df-detalle" style="width:100%;margin-top:6px;padding:10px;border:1px solid #d8cadd;border-radius:9px" value="${String(detalleInicial).replaceAll('&','&amp;').replaceAll('"','&quot;')}" placeholder="Ej.: Servicio catering día 16/09 para 20 pax"></label><label style="font-weight:800">Base imponible<input id="df-base" type="number" step="0.01" min="0" style="width:100%;margin-top:6px;padding:10px;border:1px solid #d8cadd;border-radius:9px" value="${baseInicial.toFixed(2)}"></label><label style="font-weight:800">IVA<select id="df-iva" style="width:100%;margin-top:6px;padding:10px;border:1px solid #d8cadd;border-radius:9px"><option value="10">IVA incluido · 10 %</option><option value="0">Sin incluir IVA</option></select></label></div><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap"><div><span>Importe resultante: </span><strong id="df-total" style="font-size:22px;color:#4b175b"></strong></div><button id="df-guardar" type="button" class="boton-principal">Guardar datos para el PDF</button></div>`
    cab.appendChild(box)
    const det=box.querySelector('#df-detalle'),base=box.querySelector('#df-base'),iva=box.querySelector('#df-iva'),total=box.querySelector('#df-total'),guardar=box.querySelector('#df-guardar')
    iva.value=r.iva_incluido===false?'0':'10'
    const recal=()=>{const b=Number(base.value)||0;const t=iva.value==='10'?b*1.10:b;total.textContent=eur(t)}; base.addEventListener('input',recal);iva.addEventListener('change',recal);recal()
    guardar.addEventListener('click',async()=>{const concepto=det.value.trim();const b=Number(base.value)||0;if(!concepto){alert('Escribe el detalle del servicio.');return}guardar.disabled=true;guardar.textContent='Guardando...';const pct=Number(iva.value);const imp=Number((b*pct/100).toFixed(2));const t=Number((b+imp).toFixed(2));const nueva=[{orden:1,descripcion:concepto,cantidad:1,precio_unitario:b,iva:pct}];const {error:e}=await supabase.from('facturas').update({detalle_concepto:concepto,lineas:nueva,base_imponible:b,subtotal:b,iva:imp,total_iva:imp,importe:t,total:t,iva_incluido:pct>0,updated_at:new Date().toISOString()}).eq('id',p.registroId);if(e){alert('No se ha podido guardar: '+e.message);guardar.disabled=false;guardar.textContent='Guardar datos para el PDF';return}guardar.textContent='✓ Guardado';setTimeout(()=>location.reload(),500)})
  }catch(e){console.error(e)}finally{montando=false}
}
const obs=new MutationObserver(()=>setTimeout(montar,30));obs.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('hashchange',()=>setTimeout(montar,100));setTimeout(montar,150)
