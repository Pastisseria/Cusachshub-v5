import CrudPage from "../components/CrudPage.jsx";
export default function Dietario(){return <CrudPage title="Dietario anual" description="Unidades diarias y anotaciones de obrador." table="dietario_anual" fields={[
{name:"fecha",label:"Fecha",type:"date",required:true},{name:"producto",label:"Producto",required:true},{name:"unidades",label:"Unidades",type:"number"},{name:"turno",label:"Turno",type:"select",options:["Mañana","Tarde","Noche"]},{name:"responsable",label:"Responsable"},{name:"festivo",label:"Festivo",type:"checkbox",default:false},{name:"notas",label:"Notas",type:"textarea",full:true}
]}/>}
