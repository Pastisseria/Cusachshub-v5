import CrudPage from "../components/CrudPage.jsx";
export default function Presupuestos(){return <CrudPage title="Presupuestos" description="Ofertas comerciales y seguimiento de aceptación." table="presupuestos" fields={[
{name:"numero",label:"Número",required:true},{name:"cliente",label:"Cliente",required:true},{name:"fecha_evento",label:"Fecha evento",type:"date"},{name:"descripcion",label:"Descripción",required:true},{name:"estado",label:"Estado",type:"select",options:["Borrador","Enviado","Aceptado","Rechazado","Facturado"],default:"Borrador"},{name:"total",label:"Total €",type:"number",step:"0.01"},{name:"iva",label:"IVA %",type:"number",default:10},{name:"observaciones",label:"Observaciones",type:"textarea",full:true}
]}/>}
