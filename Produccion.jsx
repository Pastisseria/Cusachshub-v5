import CrudPage from "../components/CrudPage.jsx";
export default function Produccion(){return <CrudPage title="Producción" description="Plan diario por pedido y cliente." table="produccion" fields={[
{name:"fecha",label:"Fecha",type:"date",required:true},{name:"cliente",label:"Cliente",required:true},{name:"pedido",label:"Pedido / Evento"},{name:"producto",label:"Producto",required:true},{name:"cantidad",label:"Cantidad",type:"number",step:"0.01"},{name:"unidad",label:"Unidad"},{name:"estado",label:"Estado",type:"select",options:["Pendiente","En preparación","Terminado","Entregado"],default:"Pendiente"},{name:"responsable",label:"Responsable"},{name:"notas",label:"Notas",type:"textarea",full:true}
]}/>}
