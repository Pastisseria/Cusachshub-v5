import CrudPage from "../components/CrudPage.jsx";
export default function Catering(){return <CrudPage title="Calendario de catering" description="Eventos, horarios, direcciones y necesidades de servicio." table="catering" fields={[
{name:"cliente",label:"Cliente",required:true},{name:"fecha",label:"Fecha",type:"date",required:true},{name:"hora_inicio",label:"Hora inicio",type:"time"},{name:"hora_fin",label:"Hora fin",type:"time"},{name:"lugar",label:"Lugar"},{name:"personas",label:"Personas",type:"number"},{name:"estado",label:"Estado",type:"select",options:["Pendiente","Confirmado","En producción","Finalizado","Cancelado"],default:"Pendiente"},{name:"responsable",label:"Responsable"},{name:"observaciones",label:"Notas",type:"textarea",full:true}
]}/>}
