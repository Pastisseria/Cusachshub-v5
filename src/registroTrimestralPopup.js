import { supabase } from "./supabase.js";

const PREGUNTAS = [
  [7,"PLA DE CONTROL DE L'AIGUA","Es disposa de bon subministre d'aigua potable freda i/o calenta en tots els punts de la xarxa"],
  [8,"PLA DE CONTROL DE L'AIGUA","S'ha mesurat i registrat la concentació de clor lliure de l'aigua durant aquest període"],
  [11,"PLA DE CONTROL DE NETEJA I DESINFECCIÓ","Els nous productes de neteja procedeixen d’indústries autoritzades i són aptes per a ús alimentari. Es disposa de la seva fitxa tècnica"],
  [12,"PLA DE CONTROL DE NETEJA I DESINFECCIÓ","Els productes de neteja estan emmagatzemats en un lloc aïllat, sempre tapats, i amb etiqueta"],
  [13,"PLA DE CONTROL DE NETEJA I DESINFECCIÓ","S'omple el Registre de neteja"],
  [14,"PLA DE CONTROL DE NETEJA I DESINFECCIÓ","S'han realitzat les neteges descrites en el full de Freqüències"],
  [15,"PLA DE CONTROL DE NETEJA I DESINFECCIÓ","Les operacions de neteja han seguit les indicacions descrites en el full de Mètode"],
  [16,"PLA DE CONTROL DE NETEJA I DESINFECCIÓ","Les bosses d’escombraries, tancades, es transporten al contenidor del carrer quan són plenes"],
  [19,"PLA DE CONTROL DE PLAGUES","Les teles mosquiteres o atrapamosques es troben íntegres i en bon estat"],
  [20,"PLA DE CONTROL DE PLAGUES","Es mantenen les zones on hi ha aliments ordenades i netes"],
  [21,"PLA DE CONTROL DE PLAGUES","Es mantenen els aliments tapats i protegits a l’obrador i a la botiga"],
  [22,"PLA DE CONTROL DE PLAGUES","Si aquest trimestre ha estat necessària la intervenció d’una empresa de control de plagues, es disposa de la documentació corresponent"],
  [25,"PLA DE FORMACIÓ I CAPACITACIÓ DEL PERSONAL","Les persones que manipulen aliments han rebut formació"],
  [26,"PLA DE FORMACIÓ I CAPACITACIÓ DEL PERSONAL","Es disposa dels certificats corresponents"],
  [27,"PLA DE FORMACIÓ I CAPACITACIÓ DEL PERSONAL","Es disposa dels continguts del curs"],
  [30,"PLA DE CONTROL DE PROVEÏDORS","Si hi ha nous proveïdors, s'han afegit a la Llista de proveïdors homologats"],
  [31,"PLA DE CONTROL DE PROVEÏDORS","Es realitza el control de recepció (dates de caducitat, temperatura) i ho registreu en l’albarà o el registre corresponent"],
  [32,"PLA DE CONTROL DE PROVEÏDORS","El control de recepció preveu també la revisió de les condicions d’higiene i estiba dels vehicles dels proveïdors"],
  [33,"PLA DE CONTROL DE PROVEÏDORS","S'omple el registre de recepció per a totes les matèries primeres"],
  [36,"PLA DE TRAÇABILITAT","Totes les matèries primeres es poden relacionar amb un albarà d’entrada"],
  [37,"PLA DE TRAÇABILITAT","Totes les matèries primeres i els productes intermedis són en recipients tapats i correctament etiquetats"],
  [38,"PLA DE TRAÇABILITAT","Tots els productes acabats envasats estan correctament etiquetats"],
  [39,"PLA DE TRAÇABILITAT","La llista de fabricació diària conté dades sobre data de producció, producte i quantitat fabricada"],
  [40,"PLA DE TRAÇABILITAT","Els albarans de sortida indiquen la data, el destí, el producte i la seva quantitat"],
  [43,"BONES PRÀCTIQUES","El personal es treu les joies i el rellotge per treballar"],
  [44,"BONES PRÀCTIQUES","El personal fa servir barret i indumentària exclusiva i neta"],
  [45,"BONES PRÀCTIQUES","El personal compleix la prohibició de fumar a les instl·lacions"],
  [46,"BONES PRÀCTIQUES","El personal es renta les mans amb freqüència"],
  [49,"REQUISITS DELS LOCALS I EQUIPAMENT","La capacitat del magatzem és suficient"],
  [50,"REQUISITS DELS LOCALS I EQUIPAMENT","La capacitrat de fred positiu i negatiu és suficient"],
  [51,"REQUISITS DELS LOCALS I EQUIPAMENT","El lector de temperatura a l’exterior d’expositors i cambres funciona correctament"],
  [52,"REQUISITS DELS LOCALS I EQUIPAMENT","Les cambres estan lliures d'aigua de condensació i gel"],
  [53,"REQUISITS DELS LOCALS I EQUIPAMENT","El terra, les parets, el sostre i la maquinària i utensilis estan en bon estat"],
  [54,"REQUISITS DELS LOCALS I EQUIPAMENT","La il·luminació és suficient i està protegida"],
  [55,"REQUISITS DELS LOCALS I EQUIPAMENT","Els contenidors d’escombreries disposen de bossa fixada a la boca i tenen la tapa d’accionament no manual"],
  [56,"REQUISITS DELS LOCALS I EQUIPAMENT","L’accionament no manual dels rentamans funciona i estan ben equipats (paper de cel·lulosa, sabó i aigua calenta)"],
  [57,"REQUISITS DELS LOCALS I EQUIPAMENT","L’estat d’higiene dels vestidors és correcte i estan endreçats"],
  [60,"GESTIÓ D'AL·LÈRGENS","S'informa als clients de la presència d'al·lèrgens (ingredient, traça) en els productes"],
  [61,"GESTIÓ D'AL·LÈRGENS","Les fitxes de fabricació estan actualitzades"],
  [64,"GESTIÓ DE RESIDUS","Es compleix amb les mesures de separació de residus"],
  [65,"GESTIÓ DE RESIDUS","Es disposa d'una empresa de recollida de l'oli de fregir usat"],
  [68,"EMMAGATZEMATGE DE MATÈRIES PRIMERES","L'estiba és correcta, sense producte al terra ni contaminació encruada"],
  [69,"EMMAGATZEMATGE DE MATÈRIES PRIMERES","Els productes crus estan ben separats dels elaborats/cuits"],
  [70,"EMMAGATZEMATGE DE MATÈRIES PRIMERES","Els aliments de diferent naturalesa estan ben separats"],
  [71,"EMMAGATZEMATGE DE MATÈRIES PRIMERES","Es fa rotació d'estocs d'acord amb la norma primer en entrar primer en sortir (PEPS)"],
  [72,"EMMAGATZEMATGE DE MATÈRIES PRIMERES","Les temperatures d'emmagatzematge i exposició són correctes"],
  [75,"MANIPULACIÓ D'ALIMENTS","Es comprova la neteja de superfícies, equips i estris abans de començar a treballar"],
  [76,"MANIPULACIÓ D'ALIMENTS","Es treballa per evitar la contaminació encreuada a partir d’estris o dels manipuladors"],
  [77,"MANIPULACIÓ D'ALIMENTS","Es pesen correctament els additius"],
  [78,"MANIPULACIÓ D'ALIMENTS","Ús de pinces o altres estris durant la venda de pastissos i brioixeria"],
  [79,"MANIPULACIÓ D'ALIMENTS","Es comprova la data de caducitat o de consum preferent de les matèries primeres abans d’usar-les"],
  [80,"MANIPULACIÓ D'ALIMENTS","Es respecta la separació (temporal o física) entre la manipulació de productes crus i cuits"],
  [81,"MANIPULACIÓ D'ALIMENTS","Es desinfecten els vegetals abans de formar part dels farcits"],
  [82,"MANIPULACIÓ D'ALIMENTS","Tots els productes amb llet, ous o ovoproductes, nata o formatge que hi ha a les cambres han estat elaborats fa menys de dos dies"],
  [83,"MANIPULACIÓ D'ALIMENTS","Es rebutgen els productes exposats per a la venda que es conserven a 8 ºC al final del dia"],
  [84,"MANIPULACIÓ D'ALIMENTS","S'etiqueten els productes envasats d’acord a la normativa d’etiquetatge i al·lèrgens"],
  [87,"COCCIÓ","Es controla el temps i temperatura de cocció?"],
  [88,"COCCIÓ","Es comprova l'estat de l'oli de fregir?"],
  [91,"REFREDAMENT","Els productes sensibles es refreden a 10ºC en menys de 2 hores?"],
  [92,"REFREDAMENT","Acabat el refredament, l'aliment es disposa ràpidament en cambra de fred?"],
].map(([fila,seccion,pregunta])=>({codigo:`RT${fila}`,fila,seccion,pregunta}));

function trimestreActual(){
  const d=new Date();
  return `${d.getFullYear()}-T${Math.floor(d.getMonth()/3)+1}`;
}
function hoy(){ return new Date().toISOString().slice(0,10); }
function esc(v=""){ return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function claveLocal(periodo){ return `cusachs-sanidad-trimestral-${periodo}`; }
function claveFirma(periodo){ return `cusachs-sanidad-trimestral-firma-${periodo}`; }

function periodosDisponibles(){
  const d=new Date();
  const actual=d.getFullYear()*4+Math.floor(d.getMonth()/3);
  const out=[];
  for(let n=actual+2;n>=actual-7;n--){
    const y=Math.floor(n/4), t=(n%4)+1;
    out.push(`${y}-T${t}`);
  }
  return out;
}

async function abrirRegistroTrimestral(){
  const w=window.open("","_blank");
  if(!w){ alert("El navegador ha bloqueado la nueva pestaña. Permite ventanas emergentes para Cusachs Hub."); return; }
  w.document.open();
  w.document.write(`<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Registre trimestral · Cusachs Hub</title><style>
  :root{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#2c2030;background:#f2f3f7}*{box-sizing:border-box}body{margin:0;background:#f2f3f7}.top{position:sticky;top:0;z-index:20;background:#fff;border-bottom:1px solid #ddd5e2;padding:14px 24px;display:flex;gap:12px;align-items:center;justify-content:space-between;box-shadow:0 2px 12px #00000010}.brand{font-weight:900;color:#663579;font-size:21px}.actions{display:flex;gap:8px;flex-wrap:wrap}button{border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;background:#6d3b7d;color:#fff}button.secondary{background:#eee7f1;color:#50275e}button.danger{background:#a33b3b}button:disabled{opacity:.5;cursor:not-allowed}.wrap{max-width:1450px;margin:22px auto;padding:0 18px 60px}.paper{background:#fff;border-radius:18px;box-shadow:0 8px 32px #35223f18;overflow:hidden}.head{padding:24px 28px;background:linear-gradient(135deg,#5f2a70,#92529c);color:#fff}.head h1{margin:0 0 8px;font-size:34px}.head p{margin:0;opacity:.92}.meta{display:grid;grid-template-columns:1fr 1fr 1.3fr 1fr;gap:12px;padding:18px 22px;border-bottom:1px solid #eee}.meta label{font-size:12px;font-weight:900;color:#6d3b7d;text-transform:uppercase}.meta input,.meta select{width:100%;margin-top:6px;border:1px solid #cfc5d3;border-radius:9px;padding:10px;background:#fff;font:inherit}.status{padding:10px 22px;background:#faf7fb;border-bottom:1px solid #eee;font-weight:700;color:#5b4760}.table-wrap{overflow:auto}.reg{width:100%;border-collapse:collapse;min-width:980px}.reg th,.reg td{border:1px solid #ded7e1;padding:9px 10px;vertical-align:middle}.reg th{background:#f2e9f5;color:#542462;font-size:12px;text-transform:uppercase}.reg td.q{min-width:520px;font-size:14px;line-height:1.35}.reg td.choice{text-align:center;width:64px}.reg td.obs{width:260px}.reg input[type=radio]{width:20px;height:20px;accent-color:#70407f}.reg input[type=text]{width:100%;border:1px solid #d6ced9;border-radius:8px;padding:9px}.section-row td{background:#6b3a79;color:#fff;font-weight:900;letter-spacing:.01em}.footer{padding:24px}.notice{background:#fff6dc;border:1px solid #eed08a;padding:13px 15px;border-radius:10px;margin-bottom:18px}.sign-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:18px}.signature-box{border:2px dashed #bba8c2;border-radius:14px;padding:12px}.signature-box canvas{width:100%;height:180px;background:#fff;display:block;touch-action:none}.history{display:none;margin-top:20px;border-top:1px solid #eee;padding-top:18px}.history.show{display:block}.history-item{padding:10px 12px;border:1px solid #e3dce6;border-radius:10px;margin:8px 0;background:#faf8fb}.locked{background:#eaf8ed;border:1px solid #a9d7b0;color:#245c2c;padding:12px 14px;border-radius:10px;margin-bottom:15px;font-weight:800}.msg{font-weight:800;color:#5d286d;margin-left:4px}@media(max-width:850px){.meta{grid-template-columns:1fr 1fr}.sign-grid{grid-template-columns:1fr}.top{align-items:flex-start;flex-direction:column}}@media print{body{background:#fff}.top,.actions,.history-toggle,.notice{display:none!important}.wrap{max-width:none;margin:0;padding:0}.paper{box-shadow:none;border-radius:0}.head{-webkit-print-color-adjust:exact;print-color-adjust:exact}.reg{min-width:0}.reg th,.reg td{font-size:9px;padding:5px}.reg td.q{min-width:0}.reg td.obs{width:20%}.signature-box canvas{height:120px}.meta input,.meta select{border:0;padding:0}.footer{padding:12px}.section-row td{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body><div id="app"></div></body></html>`);
  w.document.close();
  const app=w.document.getElementById("app");
  let periodo=trimestreActual(), respuestas={}, finalizado=false, firmaData="", dibujando=false, ultimo=null;

  async function cargar(){
    finalizado=false; firmaData=""; respuestas={};
    try{ respuestas=JSON.parse(localStorage.getItem(claveLocal(periodo))||"{}"); }catch{ respuestas={}; }
    const {data,error}=await supabase.from("higiene_cuestionarios").select("*").eq("tipo","trimestral").eq("periodo",periodo);
    if(!error && data?.length){
      for(const r of data) respuestas[r.codigo]={respuesta:r.respuesta||"Pendiente",nota:r.nota||""};
      const h=data[0];
      respuestas.__cabecera={fecha:h.fecha_revision||hoy(),responsable:h.responsable||"",ubicacion:h.ubicacion||""};
    }
    const {data:cerrados}=await supabase.from("higiene_gestion_sanidad").select("*").eq("apartado",`registro-trimestral-${periodo}`).eq("estado","Preparado").order("created_at",{ascending:false}).limit(1);
    if(cerrados?.length){
      finalizado=true;
      try{ const n=JSON.parse(cerrados[0].notas||"{}"); firmaData=n.firma||""; }catch{}
    }else{
      try{ firmaData=localStorage.getItem(claveFirma(periodo))||""; }catch{}
    }
    render();
  }

  function cabecera(){ return respuestas.__cabecera||{fecha:hoy(),responsable:"",ubicacion:""}; }
  function setCabecera(campo,valor){ respuestas.__cabecera={...cabecera(),[campo]:valor}; guardarLocal(); }
  function guardarLocal(){ localStorage.setItem(claveLocal(periodo),JSON.stringify(respuestas)); }
  function estado(codigo){ return respuestas[codigo]?.respuesta||"Pendiente"; }
  function nota(codigo){ return respuestas[codigo]?.nota||""; }
  function setRespuesta(codigo,valor){ respuestas[codigo]={respuesta:valor,nota:nota(codigo)}; guardarLocal(); actualizarContador(); }
  function setNota(codigo,valor){ respuestas[codigo]={respuesta:estado(codigo),nota:valor}; guardarLocal(); }
  function resumen(){
    const r={pendiente:0,si:0,no:0,na:0};
    PREGUNTAS.forEach(p=>{const e=estado(p.codigo); if(e==="Sí")r.si++; else if(e==="No")r.no++; else if(e==="No aplica")r.na++; else r.pendiente++;});
    return r;
  }
  function actualizarContador(){ const r=resumen(), el=w.document.getElementById("status"); if(el) el.textContent=`${r.pendiente} pendents · ${r.si} Sí · ${r.no} No · ${r.na} No aplica`; }

  function filas(){
    let seccion=""; return PREGUNTAS.map(p=>{
      const cab=p.seccion!==seccion?(seccion=p.seccion,`<tr class="section-row"><td colspan="5">${esc(p.seccion)}</td></tr>`):"";
      const dis=finalizado?"disabled":"";
      return `${cab}<tr><td class="q">${esc(p.pregunta)}</td>${["Sí","No","No aplica"].map(v=>`<td class="choice"><input ${dis} type="radio" name="${p.codigo}" value="${v}" ${estado(p.codigo)===v?"checked":""}></td>`).join("")}<td class="obs"><input ${dis} type="text" data-nota="${p.codigo}" value="${esc(nota(p.codigo))}" placeholder="Observació"></td></tr>`;
    }).join("");
  }

  function render(){
    const h=cabecera();
    app.innerHTML=`<div class="top"><div class="brand">CUSACHS HUB · REGISTRE TRIMESTRAL</div><div class="actions"><button id="save">💾 Guardar borrador</button><button id="history" class="secondary">🗂 Histórico</button><button id="print" class="secondary">🖨 Imprimir / PDF</button><button id="finish">✍ Finalizar y firmar</button><span class="msg" id="msg"></span></div></div><div class="wrap"><div class="paper"><div class="head"><h1>Registre trimestral</h1><p>Format digital basat en el full “Registre trimestral” de Formats documentació.</p></div><div class="meta"><label>Període<select id="periodo">${periodosDisponibles().map(x=>`<option ${x===periodo?"selected":""}>${x}</option>`).join("")}</select></label><label>Data<input id="fecha" type="date" value="${esc(h.fecha||hoy())}" ${finalizado?"disabled":""}></label><label>Responsable<input id="responsable" value="${esc(h.responsable||"")}" placeholder="Nom i cognoms" ${finalizado?"disabled":""}></label><label>Zona<select id="ubicacion" ${finalizado?"disabled":""}><option value="">Selecciona</option><option value="Obrador" ${h.ubicacion==="Obrador"?"selected":""}>Obrador</option><option value="Botiga" ${h.ubicacion==="Botiga"?"selected":""}>Botiga</option></select></label></div><div class="status" id="status"></div><div class="table-wrap"><table class="reg"><thead><tr><th>Comprovació</th><th>SÍ</th><th>NO</th><th>NA</th><th>OBSERVACIÓ</th></tr></thead><tbody>${filas()}</tbody></table></div><div class="footer">${finalizado?`<div class="locked">✅ Registre finalitzat i bloquejat. Pots imprimir-lo o guardar-lo com a PDF.</div>`:""}<div class="notice">En cas que un “NO” representi una disconformitat real, registra la incidència i la mesura correctora corresponent. “No aplica” no genera incidència.</div><div class="sign-grid"><div class="signature-box"><strong>Signatura del responsable</strong><canvas id="signature" width="900" height="220"></canvas><div class="actions" style="margin-top:8px"><button id="clearSign" class="secondary" ${finalizado?"disabled":""}>Esborrar signatura</button></div></div><div><h3>Com tancar el registre</h3><p>1. Respon totes les comprovacions.<br>2. Completa responsable, data i zona.<br>3. Signa dins del requadre.<br>4. Prem “Finalizar y firmar”.</p><p>Després quedarà guardat a Cusachs Hub i bloquejat.</p></div></div><div id="historyPanel" class="history"></div></div></div></div>`;
    actualizarContador(); enlazar(); prepararFirma();
  }

  function enlazar(){
    const d=w.document;
    d.getElementById("periodo").onchange=e=>{ periodo=e.target.value; cargar(); };
    d.getElementById("fecha").onchange=e=>setCabecera("fecha",e.target.value);
    d.getElementById("responsable").oninput=e=>setCabecera("responsable",e.target.value);
    d.getElementById("ubicacion").onchange=e=>setCabecera("ubicacion",e.target.value);
    d.querySelectorAll('input[type="radio"]').forEach(x=>x.onchange=e=>setRespuesta(e.target.name,e.target.value));
    d.querySelectorAll("[data-nota]").forEach(x=>x.oninput=e=>setNota(e.target.dataset.nota,e.target.value));
    d.getElementById("save").onclick=guardarServidor;
    d.getElementById("finish").onclick=finalizar;
    d.getElementById("history").onclick=mostrarHistorico;
    d.getElementById("print").onclick=()=>w.print();
    d.getElementById("clearSign").onclick=()=>{ firmaData=""; localStorage.removeItem(claveFirma(periodo)); prepararFirma(true); };
    if(finalizado){ d.getElementById("save").disabled=true; d.getElementById("finish").disabled=true; }
  }

  function prepararFirma(limpiar=false){
    const c=w.document.getElementById("signature"), ctx=c.getContext("2d");
    ctx.lineWidth=3; ctx.lineCap="round"; ctx.strokeStyle="#2d1f32";
    if(limpiar) ctx.clearRect(0,0,c.width,c.height);
    if(firmaData){ const img=new Image(); img.onload=()=>ctx.drawImage(img,0,0,c.width,c.height); img.src=firmaData; }
    if(finalizado) return;
    const pos=e=>{const r=c.getBoundingClientRect(), p=e.touches?.[0]||e; return {x:(p.clientX-r.left)*c.width/r.width,y:(p.clientY-r.top)*c.height/r.height};};
    const inicio=e=>{e.preventDefault(); dibujando=true; ultimo=pos(e);};
    const mueve=e=>{if(!dibujando)return; e.preventDefault(); const p=pos(e); ctx.beginPath(); ctx.moveTo(ultimo.x,ultimo.y); ctx.lineTo(p.x,p.y); ctx.stroke(); ultimo=p; firmaData=c.toDataURL("image/png"); localStorage.setItem(claveFirma(periodo),firmaData);};
    const fin=()=>{dibujando=false;};
    c.onpointerdown=inicio; c.onpointermove=mueve; c.onpointerup=fin; c.onpointerleave=fin;
  }

  async function guardarServidor(){
    const msg=w.document.getElementById("msg"); msg.textContent="Guardando…";
    const h=cabecera();
    const payload=PREGUNTAS.map(p=>({tipo:"trimestral",periodo,codigo:p.codigo,seccion:p.seccion,pregunta:p.pregunta,respuesta:estado(p.codigo),nota:nota(p.codigo),fecha_revision:h.fecha||null,responsable:h.responsable||null,ubicacion:h.ubicacion||null,actualizado_en:new Date().toISOString()}));
    const {error}=await supabase.from("higiene_cuestionarios").upsert(payload,{onConflict:"tipo,periodo,codigo"});
    if(error){ msg.textContent=`Error: ${error.message}`; return false; }
    guardarLocal(); msg.textContent="✅ Borrador guardado"; setTimeout(()=>{if(msg)msg.textContent="";},2500); return true;
  }

  async function finalizar(){
    const h=cabecera(), r=resumen();
    if(r.pendiente>0){ alert(`Quedan ${r.pendiente} comprobaciones sin responder.`); return; }
    if(!h.fecha||!h.responsable?.trim()||!h.ubicacion){ alert("Completa la fecha, el responsable y la zona."); return; }
    if(!firmaData){ alert("Falta la firma del responsable."); return; }
    if(!(await guardarServidor())) return;
    const notas=JSON.stringify({periodo,fecha:h.fecha,zona:h.ubicacion,resumen:r,firma:firmaData,formato:"Registre trimestral Formats documentació"});
    const apartado=`registro-trimestral-${periodo}`;
    const {data:exist}=await supabase.from("higiene_gestion_sanidad").select("id").eq("apartado",apartado).order("created_at",{ascending:false}).limit(1);
    let error;
    if(exist?.length){ ({error}=await supabase.from("higiene_gestion_sanidad").update({titulo:`Registre trimestral ${periodo}`,estado:"Preparado",responsable:h.responsable,fecha_objetivo:h.fecha,notas}).eq("id",exist[0].id)); }
    else{ ({error}=await supabase.from("higiene_gestion_sanidad").insert({apartado,titulo:`Registre trimestral ${periodo}`,estado:"Preparado",responsable:h.responsable,fecha_objetivo:h.fecha,notas})); }
    if(error){ alert(`No se pudo cerrar el registro: ${error.message}`); return; }
    finalizado=true; render(); alert("Registro trimestral guardado, firmado y bloqueado correctamente.");
  }

  async function mostrarHistorico(){
    const panel=w.document.getElementById("historyPanel"); panel.classList.toggle("show");
    if(!panel.classList.contains("show")) return;
    panel.innerHTML="<strong>Cargando histórico…</strong>";
    const {data,error}=await supabase.from("higiene_gestion_sanidad").select("*").like("apartado","registro-trimestral-%").order("created_at",{ascending:false});
    if(error){ panel.innerHTML=`<p>Error: ${esc(error.message)}</p>`; return; }
    panel.innerHTML=`<h3>Histórico de registros trimestrales</h3>${data?.length?data.map(x=>`<div class="history-item"><strong>${esc(x.titulo)}</strong><br>${esc(x.responsable||"Sin responsable")} · ${esc(x.fecha_objetivo||"")} · ${esc(x.estado)}</div>`).join(""):"<p>Aún no hay registros finalizados.</p>"}`;
  }

  await cargar();
}

function interceptarRegistroTrimestral(evento){
  const hash=window.location.hash||"";
  if(!hash.includes("/higiene/preparacion-sanidad")) return;
  const boton=evento.target?.closest?.("button");
  if(!boton) return;
  if(boton.textContent.trim()!=="Registre trimestral") return;
  evento.preventDefault(); evento.stopPropagation(); evento.stopImmediatePropagation();
  abrirRegistroTrimestral();
}

document.addEventListener("click",interceptarRegistroTrimestral,true);
