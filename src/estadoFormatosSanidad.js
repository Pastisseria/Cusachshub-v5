import { supabase } from "./supabase.js";

function lunes(d){const x=new Date(d);const day=x.getDay()||7;x.setHours(12,0,0,0);x.setDate(x.getDate()-day+1);return x;}
function sumarDias(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function semanasDesdeEnero(){const ahora=new Date(),inicio=lunes(new Date(ahora.getFullYear(),0,1)),fin=lunes(ahora);let n=0;for(let d=new Date(inicio);d<=fin;d=sumarDias(d,7))n++;return n;}

function buscarTarjeta(numero){
  return [...document.querySelectorAll('.sanidad-formatos-grid article')].find(a=>a.textContent.includes(`FORMATO ${numero}`));
}

function pintarEstado(card,texto,tipo="ok"){
  if(!card)return;
  const badge=card.querySelector('.formato-estado');
  if(!badge)return;
  badge.textContent=texto;
  badge.className='formato-estado';
  badge.style.background=tipo==='ok'?'#d9f7e5':tipo==='warn'?'#fff2c9':'#fde1e1';
  badge.style.color=tipo==='ok'?'#157a3b':tipo==='warn'?'#8a6500':'#a11f1f';
}

function añadirDetalle(card,texto){
  if(!card)return;
  let el=card.querySelector('.estado-dinamico-sanidad');
  if(!el){
    el=document.createElement('div');
    el.className='estado-dinamico-sanidad';
    el.style.marginTop='10px';
    el.style.fontSize='13px';
    el.style.fontWeight='700';
    el.style.color='#5f4c63';
    card.appendChild(el);
  }
  el.textContent=texto;
}

async function actualizarFormato1(){
  const card=buscarTarjeta(1); if(!card)return;
  const [{data:gestiones,error:e1},{data:req,error:e2}]=await Promise.all([
    supabase.from('higiene_gestion_sanidad').select('id,apartado,estado,archivo_nombre,created_at').like('apartado','alta-%'),
    supabase.from('higiene_cuestionarios').select('codigo,respuesta').eq('tipo','requisitos')
  ]);
  if(e1&&e2){
    pintarEstado(card,'REVISAR','warn');
    añadirDetalle(card,'No se ha podido comprobar automáticamente la documentación.');
    return;
  }
  const docs=(gestiones||[]).filter(x=>x.archivo_nombre||x.estado==='Preparado').length;
  const contestadas=(req||[]).filter(x=>x.respuesta&&x.respuesta!=='Pendiente').length;
  if(docs>0||contestadas>0){
    pintarEstado(card,'EN CURSO','ok');
    añadirDetalle(card,`${docs} documento${docs===1?'':'s'} preparado${docs===1?'':'s'} · ${contestadas} requisito${contestadas===1?'':'s'} revisado${contestadas===1?'':'s'}. Solo quedará pendiente lo que realmente falte.`);
  }else{
    pintarEstado(card,'REVISAR','warn');
    añadirDetalle(card,'El formato está disponible; entra para revisar únicamente la documentación que falte.');
  }
}

async function actualizarFormato2(){
  const card=buscarTarjeta(2); if(!card)return;
  const total=semanasDesdeEnero();
  const {data,error}=await supabase.from('higiene_gestion_sanidad').select('id,apartado,estado').like('apartado','registro-setmanal-%');
  if(error){
    pintarEstado(card,'YA DISPONIBLE','ok');
    añadirDetalle(card,'Registro semanal disponible para completar desde enero hasta hoy.');
    return;
  }
  const unicos=new Map();
  (data||[]).forEach(x=>unicos.set(x.apartado,x));
  const guardadas=unicos.size;
  const cerradas=[...unicos.values()].filter(x=>x.estado==='Preparado').length;
  if(guardadas>=total&&cerradas>=total){
    pintarEstado(card,'COMPLETO','ok');
    añadirDetalle(card,`${cerradas}/${total} semanas finalizadas desde enero.`);
  }else if(guardadas>0){
    pintarEstado(card,'EN CURSO','ok');
    añadirDetalle(card,`${guardadas}/${total} semanas guardadas · ${cerradas} finalizadas. Puedes completar las anteriores cuando quieras.`);
  }else{
    pintarEstado(card,'YA DISPONIBLE','ok');
    añadirDetalle(card,`Registro preparado para rellenar las ${total} semanas desde enero hasta la semana actual.`);
  }
}

function quitarFormato13DePendientes(){
  const secciones=[...document.querySelectorAll('section')];
  const pendientes=secciones.find(s=>s.textContent.includes('Solo lo que todavía falta'));
  if(!pendientes)return;
  const candidatos=[...pendientes.querySelectorAll('div,li,article')]
    .filter(el=>el.textContent.trim().includes('Models etiquetes'))
    .sort((a,b)=>a.textContent.length-b.textContent.length);
  const item=candidatos[0];
  if(item)item.style.display='none';
}

function actualizarFormato13(){
  const card=buscarTarjeta(13); if(!card)return;
  pintarEstado(card,'YA DISPONIBLE','ok');
  añadirDetalle(card,'Muestra aprobada. El modelo de etiquetas ya está preparado para utilizarlo y ajustarlo cuando haga falta.');
  quitarFormato13DePendientes();
}

let ejecutando=false;
async function actualizar(){
  if(ejecutando||!location.hash.includes('/higiene/preparacion-sanidad'))return;
  const c1=buscarTarjeta(1),c2=buscarTarjeta(2),c13=buscarTarjeta(13);
  if(!c1&&!c2&&!c13)return;
  ejecutando=true;
  try{
    await Promise.all([actualizarFormato1(),actualizarFormato2()]);
    actualizarFormato13();
  }finally{
    ejecutando=false;
  }
}

const obs=new MutationObserver(()=>setTimeout(actualizar,120));
obs.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('hashchange',()=>setTimeout(actualizar,200));
window.addEventListener('focus',()=>setTimeout(actualizar,150));
setTimeout(actualizar,600);
