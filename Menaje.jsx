import CrudPage from "../components/CrudPage.jsx";
export default function Menaje(){return <CrudPage title="Menaje" description="Stock, reservas, salidas y devoluciones." table="menaje" fields={[
{name:"nombre",label:"Artículo",required:true},{name:"categoria",label:"Categoría"},{name:"stock_total",label:"Stock total",type:"number"},{name:"stock_disponible",label:"Disponible",type:"number"},{name:"stock_reservado",label:"Reservado",type:"number"},{name:"precio_alquiler",label:"Alquiler €",type:"number",step:"0.01"},{name:"ubicacion",label:"Ubicación"},{name:"observaciones",label:"Observaciones",type:"textarea",full:true},{name:"activo",label:"Activo",type:"checkbox",default:true}
]}/>}
