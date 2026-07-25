import CrudPage from "../components/CrudPage.jsx";
export default function Productos(){return <CrudPage title="Productos" description="Catálogo de venta, costes y precios." table="productos" fields={[
{name:"nombre",label:"Producto",required:true},{name:"referencia",label:"Referencia"},{name:"categoria",label:"Categoría"},{name:"unidad",label:"Unidad",type:"select",options:["unidad","kg","g","litro","ración","bandeja"],default:"unidad"},{name:"coste",label:"Coste €",type:"number",step:"0.01"},{name:"precio_venta",label:"Precio venta €",type:"number",step:"0.01"},{name:"iva",label:"IVA %",type:"number",default:10},{name:"observaciones",label:"Observaciones",type:"textarea",full:true},{name:"activo",label:"Activo",type:"checkbox",default:true}
]}/>}
