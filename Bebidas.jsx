import CrudPage from "../components/CrudPage.jsx";
export default function Bebidas(){return <CrudPage title="Bebidas" description="Catálogo y existencias de bebidas." table="bebidas" fields={[
{name:"nombre",label:"Bebida",required:true},{name:"categoria",label:"Categoría"},{name:"formato",label:"Formato"},{name:"stock",label:"Stock",type:"number"},{name:"coste",label:"Coste €",type:"number",step:"0.01"},{name:"precio_venta",label:"Venta €",type:"number",step:"0.01"},{name:"proveedor",label:"Proveedor"},{name:"activo",label:"Activo",type:"checkbox",default:true}
]}/>}
