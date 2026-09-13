import { useEffect, useMemo, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabase } from "../supabase.js";
import "../styles/preparacionsanidad-formatos.css";

const RESPUESTAS = ["Pendiente", "Sí", "No", "No aplica"];

const TRIMESTRAL = [
  [7,"Pla de control de l’aigua","Es disposa de bon subministrament d’aigua potable freda i/o calenta en tots els punts de la xarxa."],
  [8,"Pla de control de l’aigua","S’ha mesurat i registrat la concentració de clor lliure de l’aigua durant aquest període."],
  [11,"Pla de control de neteja i desinfecció","Els nous productes de neteja procedeixen d’indústries autoritzades, són aptes per a ús alimentari i se’n disposa de la fitxa tècnica."],
  [12,"Pla de control de neteja i desinfecció","Els productes de neteja estan emmagatzemats en un lloc aïllat, sempre tapats i amb etiqueta."],
  [13,"Pla de control de neteja i desinfecció","S’omple el registre de neteja."],
  [14,"Pla de control de neteja i desinfecció","S’han realitzat les neteges descrites en el full de freqüències."],
  [15,"Pla de control de neteja i desinfecció","Les operacions de neteja han seguit les indicacions descrites en el full de mètode."],
  [16,"Pla de control de neteja i desinfecció","Les bosses d’escombraries, tancades, es transporten al contenidor del carrer quan són plenes."],
  [19,"Pla de control de plagues","Les teles mosquiteres o atrapamosques es troben íntegres i en bon estat."],
  [20,"Pla de control de plagues","Es mantenen les zones on hi ha aliments ordenades i netes."],
  [21,"Pla de control de plagues","Es mantenen els aliments tapats i protegits a l’obrador i a la botiga."],
  [22,"Pla de control de plagues","Si aquest trimestre ha estat necessària la intervenció d’una empresa de control de plagues, es disposa de la documentació corresponent."],
  [25,"Pla de formació i capacitació del personal","Les persones que manipulen aliments han rebut formació."],
  [26,"Pla de formació i capacitació del personal","Es disposa dels certificats corresponents."],
  [27,"Pla de formació i capacitació del personal","Es disposa dels continguts del curs."],
  [30,"Pla de control de proveïdors","Si hi ha nous proveïdors, s’han afegit a la llista de proveïdors homologats."],
  [31,"Pla de control de proveïdors","Es realitza el control de recepció (dates de caducitat i temperatura) i es registra en l’albarà o en el registre corresponent."],
  [32,"Pla de control de proveïdors","El control de recepció preveu també la revisió de les condicions d’higiene i estiba dels vehicles dels proveïdors."],
  [33,"Pla de control de proveïdors","S’omple el registre de recepció per a totes les matèries primeres."],
  [36,"Pla de traçabilitat","Totes les matèries primeres es poden relacionar amb un albarà d’entrada."],
  [37,"Pla de traçabilitat","Totes les matèries primeres i els productes intermedis són en recipients tapats i correctament etiquetats."],
  [38,"Pla de traçabilitat","Tots els productes acabats envasats estan correctament etiquetats."],
  [39,"Pla de traçabilitat","La llista de fabricació diària conté dades sobre la data de producció, el producte i la quantitat fabricada."],
  [40,"Pla de traçabilitat","Els albarans de sortida indiquen la data, el destí, el producte i la seva quantitat."],
  [43,"Bones pràctiques","El personal es treu les joies i el rellotge per treballar."],
  [44,"Bones pràctiques","El personal fa servir barret i indumentària exclusiva i neta."],
  [45,"Bones pràctiques","El personal compleix la prohibició de fumar a les instal·lacions."],
  [46,"Bones pràctiques","El personal es renta les mans amb freqüència."],
  [49,"Requisits dels locals i equipament","La capacitat del magatzem és suficient."],
  [50,"Requisits dels locals i equipament","La capacitat de fred positiu i negatiu és suficient."],
  [51,"Requisits dels locals i equipament","El lector de temperatura a l’exterior d’expositors i cambres funciona correctament."],
  [52,"Requisits dels locals i equipament","Les cambres estan lliures d’aigua de condensació i gel."],
  [53,"Requisits dels locals i equipament","El terra, les parets, el sostre, la maquinària i els utensilis estan en bon estat."],
  [54,"Requisits dels locals i equipament","La il·luminació és suficient i està protegida."],
  [55,"Requisits dels locals i equipament","Els contenidors d’escombraries disposen de bossa fixada a la boca i tenen la tapa d’accionament no manual."],
  [56,"Requisits dels locals i equipament","L’accionament no manual dels rentamans funciona i estan ben equipats (paper de cel·lulosa, sabó i aigua calenta)."],
  [57,"Requisits dels locals i equipament","L’estat d’higiene dels vestidors és correcte i estan endreçats."],
  [60,"Gestió d’al·lèrgens","S’informa els clients de la presència d’al·lèrgens (ingredient o traça) en els productes."],
  [61,"Gestió d’al·lèrgens","Les fitxes de fabricació estan actualitzades."],
  [64,"Gestió de residus","Es compleix amb les mesures de separació de residus."],
  [65,"Gestió de residus","Es disposa d’una empresa de recollida de l’oli de fregir usat."],
  [68,"Emmagatzematge de matèries primeres","L’estiba és correcta, sense producte al terra ni contaminació encreuada."],
  [69,"Emmagatzematge de matèries primeres","Els productes crus estan ben separats dels elaborats o cuits."],
  [70,"Emmagatzematge de matèries primeres","Els aliments de diferent naturalesa estan ben separats."],
  [71,"Emmagatzematge de matèries primeres","Es fa rotació d’estocs d’acord amb la norma primer en entrar, primer en sortir (PEPS)."],
  [72,"Emmagatzematge de matèries primeres","Les temperatures d’emmagatzematge i exposició són correctes."],
  [75,"Manipulació","Es comprova la neteja de superfícies, equips i estris abans de començar a treballar."],
  [76,"Manipulació","Es treballa per evitar la contaminació encreuada a partir d’estris o dels manipuladors."],
  [77,"Manipulació","Es pesen correctament els additius."],
  [78,"Manipulació","S’utilitzen pinces o altres estris durant la venda de pastissos i brioixeria."],
  [79,"Manipulació","Es comprova la data de caducitat o de consum preferent de les matèries primeres abans d’usar-les."],
  [80,"Manipulació","Es respecta la separació temporal o física entre la manipulació de productes crus i cuits."],
  [81,"Manipulació","Es desinfecten els vegetals abans de formar part dels farcits."],
  [82,"Manipulació","Tots els productes amb llet, ous o ovoproductes, nata o formatge que hi ha a les cambres han estat elaborats fa menys de dos dies."],
  [83,"Manipulació","Es rebutgen els productes exposats per a la venda que es conserven a 8 ºC al final del dia."],
  [84,"Manipulació","S’etiqueten els productes envasats d’acord amb la normativa d’etiquetatge i al·lèrgens."],
  [87,"Cocció","Es controla el temps i la temperatura de cocció?"],
  [88,"Cocció","Es comprova l’estat de l’oli de fregir?"],
  [91,"Refredament","Els productes sensibles es refreden a 10 ºC en menys de dues hores?"],
  [92,"Refredament","Acabat el refredament, l’aliment es disposa ràpidament en cambra de fred?"]
].map(([fila,seccion,texto])=>({codigo:`RT${fila}`,seccion,texto}));

function periodoActual(){
  const d=new Date();
  return `${d.getFullYear()}-T${Math.floor(d.getMonth()/3)+1}`;
}

const claveLocal=p=>`cusachs-sanidad-trimestral-${p}`;
const claveCabecera=p=>`cusachs-sanidad-trimestral-cabecera-${p}`;

function textoPdf(valor=""){
  return String(valor)
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("·", "-")
    .replaceAll("≤", "<=")
    .replaceAll("≥", ">=")
    .replaceAll("–", "-")
    .replaceAll("—", "-");
}

function partirTexto(texto,font,size,maxWidth){
  const palabras=textoPdf(texto).split(/\s+/).filter(Boolean);
  const lineas=[];
  let linea="";
  for(const palabra of palabras){
    const prueba=linea?`${linea} ${palabra}`:palabra;
    if(font.widthOfTextAtSize(prueba,size)<=maxWidth){
      linea=prueba;
    }else{
      if(linea) lineas.push(linea);
      linea=palabra;
    }
  }
  if(linea) lineas.push(linea);
  return lineas.length?lineas:[""];
}

export default function RegistroTrimestral(){
  const [periodo,setPeriodo]=useState(periodoActual());
  const [respuestas,setRespuestas]=useState({});
  const [cabecera,setCabecera]=useState({fecha:"",responsable:"",ubicacion:""});
  const [mensaje,setMensaje]=useState("");
  const [guardando,setGuardando]=useState(false);
  const [generandoPdf,setGenerandoPdf]=useState(false);

  useEffect(()=>{
    let activo=true;
    (async()=>{
      let local={},cabLocal={};
      try{
        local=JSON.parse(localStorage.getItem(claveLocal(periodo))||"{}");
        cabLocal=JSON.parse(localStorage.getItem(claveCabecera(periodo))||"{}");
      }catch{}
      const {data,error}=await supabase.from("higiene_cuestionarios")
        .select("codigo,respuesta,nota,fecha_revision,responsable,ubicacion")
        .eq("tipo","trimestral")
        .eq("periodo",periodo);
      if(!activo)return;
      if(error){setRespuestas(local);setCabecera(cabLocal);return;}
      const remotas=Object.fromEntries((data||[]).map(r=>[r.codigo,{respuesta:r.respuesta,nota:r.nota||""}]));
      setRespuestas(data?.length?remotas:local);
      const p=data?.[0];
      setCabecera(p?{fecha:p.fecha_revision||"",responsable:p.responsable||"",ubicacion:p.ubicacion||""}:cabLocal);
    })();
    return()=>{activo=false};
  },[periodo]);

  const resumen=useMemo(()=>TRIMESTRAL.reduce((a,i)=>{
    const v=respuestas[i.codigo]?.respuesta||"Pendiente";
    a[v]=(a[v]||0)+1;
    return a;
  },{}),[respuestas]);

  function cambiarLocal(campo,valor,codigo){
    if(codigo){
      setRespuestas(a=>{
        const n={...a,[codigo]:{respuesta:a[codigo]?.respuesta||"Pendiente",nota:a[codigo]?.nota||"",[campo]:valor}};
        localStorage.setItem(claveLocal(periodo),JSON.stringify(n));
        return n;
      });
    }else{
      setCabecera(a=>{
        const n={...a,[campo]:valor};
        localStorage.setItem(claveCabecera(periodo),JSON.stringify(n));
        return n;
      });
    }
  }

  async function responder(item,respuesta){
    const sig={...(respuestas[item.codigo]||{nota:""}),respuesta};
    const n={...respuestas,[item.codigo]:sig};
    setRespuestas(n);
    localStorage.setItem(claveLocal(periodo),JSON.stringify(n));
    await supabase.from("higiene_cuestionarios").upsert({
      tipo:"trimestral",periodo,codigo:item.codigo,seccion:item.seccion,pregunta:item.texto,respuesta,
      nota:sig.nota?.trim()||null,fecha_revision:cabecera.fecha||null,
      responsable:cabecera.responsable.trim()||null,ubicacion:cabecera.ubicacion||null,
      actualizado_en:new Date().toISOString()
    },{onConflict:"tipo,periodo,codigo"});
  }

  async function guardar(){
    if(!cabecera.fecha||!cabecera.responsable.trim()||!cabecera.ubicacion){
      setMensaje("Indica fecha, responsable y zona antes de guardar.");
      return false;
    }
    setGuardando(true);
    const filas=TRIMESTRAL.map(i=>({
      tipo:"trimestral",periodo,codigo:i.codigo,seccion:i.seccion,pregunta:i.texto,
      respuesta:respuestas[i.codigo]?.respuesta||"Pendiente",
      nota:respuestas[i.codigo]?.nota?.trim()||null,
      fecha_revision:cabecera.fecha,responsable:cabecera.responsable.trim(),ubicacion:cabecera.ubicacion,
      actualizado_en:new Date().toISOString()
    }));
    const {error}=await supabase.from("higiene_cuestionarios").upsert(filas,{onConflict:"tipo,periodo,codigo"});
    localStorage.setItem(claveLocal(periodo),JSON.stringify(respuestas));
    localStorage.setItem(claveCabecera(periodo),JSON.stringify(cabecera));
    setGuardando(false);
    setMensaje(error?"Guardado en este ordenador; no se pudo completar la copia en Supabase.":"Registro guardado correctamente.");
    return true;
  }

  async function descargarPdf(){
    const ok=await guardar();
    if(!ok)return;
    setGenerandoPdf(true);
    setMensaje("Generando PDF…");
    try{
      const pdf=await PDFDocument.create();
      const normal=await pdf.embedFont(StandardFonts.Helvetica);
      const negrita=await pdf.embedFont(StandardFonts.HelveticaBold);
      const morado=rgb(0.36,0.16,0.43);
      const gris=rgb(0.35,0.35,0.35);
      const borde=rgb(0.83,0.78,0.85);
      const verde=rgb(0.08,0.5,0.24);
      const rojo=rgb(0.78,0.1,0.1);
      const naranja=rgb(0.85,0.45,0.05);
      const A4=[595.28,841.89];
      const margen=36;
      let page;
      let y;
      let numeroPagina=0;

      const nuevaPagina=()=>{
        page=pdf.addPage(A4);
        numeroPagina+=1;
        const {width,height}=page.getSize();
        page.drawText("PASTISSERIA CUSACHS",{x:margen,y:height-42,size:12,font:negrita,color:morado});
        page.drawText("REGISTRO TRIMESTRAL DE AUTOCONTROL",{x:margen,y:height-61,size:15,font:negrita,color:rgb(0.15,0.15,0.15)});
        page.drawText(`Periodo: ${textoPdf(periodo)}   Fecha: ${textoPdf(cabecera.fecha)}   Zona: ${textoPdf(cabecera.ubicacion)}`,{x:margen,y:height-82,size:9,font:normal,color:gris});
        page.drawText(`Responsable: ${textoPdf(cabecera.responsable)}`,{x:margen,y:height-97,size:9,font:normal,color:gris});
        page.drawLine({start:{x:margen,y:height-108},end:{x:width-margen,y:height-108},thickness:1,color:morado});
        y=height-126;
      };

      nuevaPagina();

      for(const item of TRIMESTRAL){
        const respuesta=respuestas[item.codigo]?.respuesta||"Pendiente";
        const nota=respuestas[item.codigo]?.nota?.trim()||"";
        const preguntaLineas=partirTexto(item.texto,normal,8.5,360);
        const notaLineas=nota?partirTexto(`Observación: ${nota}`,normal,8,485):[];
        const alto=Math.max(48,24+preguntaLineas.length*11+notaLineas.length*10);
        if(y-alto<52) nuevaPagina();

        page.drawRectangle({x:margen,y:y-alto+6,width:523,height:alto-4,borderWidth:0.7,borderColor:borde});
        page.drawText(textoPdf(item.codigo),{x:margen+9,y:y-16,size:9,font:negrita,color:morado});
        page.drawText(textoPdf(item.seccion),{x:margen+48,y:y-16,size:8,font:negrita,color:gris});

        let ty=y-30;
        for(const linea of preguntaLineas){
          page.drawText(linea,{x:margen+48,y:ty,size:8.5,font:normal,color:rgb(0.1,0.1,0.1)});
          ty-=11;
        }

        let colorRespuesta=gris;
        if(respuesta==="Sí") colorRespuesta=verde;
        else if(respuesta==="No") colorRespuesta=rojo;
        else if(respuesta==="Pendiente") colorRespuesta=naranja;
        page.drawText(textoPdf(respuesta),{x:470,y:y-20,size:9,font:negrita,color:colorRespuesta});

        if(notaLineas.length){
          let ny=Math.min(ty-2,y-alto+20+notaLineas.length*10);
          for(const linea of notaLineas){
            page.drawText(linea,{x:margen+48,y:ny,size:8,font:normal,color:rojo});
            ny-=10;
          }
        }
        y-=alto+7;
      }

      const totalPaginas=pdf.getPageCount();
      pdf.getPages().forEach((p,index)=>{
        p.drawText(`Página ${index+1} de ${totalPaginas}`,{x:490,y:24,size:8,font:normal,color:gris});
        p.drawText("Documento generado desde Cusachs Hub",{x:margen,y:24,size:8,font:normal,color:gris});
      });

      const bytes=await pdf.save();
      const blob=new Blob([bytes],{type:"application/pdf"});
      const url=URL.createObjectURL(blob);
      const enlace=document.createElement("a");
      enlace.href=url;
      enlace.download=`registro-trimestral-${periodo}-${cabecera.ubicacion.toLowerCase()}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
      setMensaje("PDF descargado correctamente.");
    }catch(error){
      console.error("Error generando PDF trimestral",error);
      setMensaje(`No se pudo generar el PDF: ${error?.message||"error desconocido"}`);
    }finally{
      setGenerandoPdf(false);
    }
  }

  return <main className="sanidad-page registro-trimestral-documento">
    <header className="sanidad-header"><div><span>AUTOCONTROL · REGISTRO OFICIAL</span><h1>Registro trimestral</h1><p>Rellena el formulario y descarga el PDF al terminar.</p></div><strong>✅</strong></header>

    <div className="trimestral-acciones">
      <button type="button" onClick={()=>window.close()}>← Cerrar esta pestaña</button>
      <button type="button" onClick={guardar} disabled={guardando||generandoPdf}>{guardando?"Guardando…":"💾 Guardar registro"}</button>
      <button type="button" className="boton-pdf" onClick={descargarPdf} disabled={guardando||generandoPdf}>{generandoPdf?"Generando PDF…":"📄 Descargar PDF"}</button>
    </div>

    <section className="trimestral-hoja">
      <header className="trimestral-cabecera-pdf"><div><strong>PASTISSERIA CUSACHS</strong><h1>REGISTRO TRIMESTRAL DE AUTOCONTROL</h1></div><div><b>Periodo:</b> {periodo}</div></header>
      <section className="sanidad-toolbar"><div><strong>Registro trimestral oficial</strong><p>{TRIMESTRAL.length} puntos de control.</p></div><div className="sanidad-cabecera-trimestral"><label>Periodo<input value={periodo} onChange={e=>setPeriodo(e.target.value)}/></label><label>Fecha<input type="date" value={cabecera.fecha||""} onChange={e=>cambiarLocal("fecha",e.target.value)}/></label><label>Responsable<input value={cabecera.responsable||""} onChange={e=>cambiarLocal("responsable",e.target.value)}/></label><fieldset><legend>Zona</legend><label><input type="radio" name="zona" checked={cabecera.ubicacion==="Obrador"} onChange={()=>cambiarLocal("ubicacion","Obrador")}/> Obrador</label><label><input type="radio" name="zona" checked={cabecera.ubicacion==="Botiga"} onChange={()=>cambiarLocal("ubicacion","Botiga")}/> Botiga</label></fieldset></div></section>
      <div className="sanidad-resumen">{RESPUESTAS.map(r=><span key={r}><b>{resumen[r]||0}</b>{r}</span>)}</div>
      <section className="sanidad-cuestionario">{TRIMESTRAL.map(item=><article key={item.codigo} className={`respuesta-${(respuestas[item.codigo]?.respuesta||"Pendiente").toLowerCase().replace(" ","-")}`}><div className="sanidad-pregunta"><span>{item.codigo}</span><div><small>{item.seccion}</small><p>{item.texto}</p></div></div><div className="sanidad-opciones">{RESPUESTAS.map(r=><button type="button" key={r} className={(respuestas[item.codigo]?.respuesta||"Pendiente")===r?"seleccionada":""} data-respuesta={r} onClick={()=>responder(item,r)}>{r}</button>)}</div><div className="sanidad-nota"><label>{(respuestas[item.codigo]?.respuesta||"Pendiente")==="No"?"Observación / medida correctora":"Nota opcional"}</label><textarea rows="2" value={respuestas[item.codigo]?.nota||""} onChange={e=>cambiarLocal("nota",e.target.value,item.codigo)}/></div></article>)}</section>
    </section>

    {mensaje&&<p className="mensaje-control">{mensaje}</p>}
  </main>;
}
