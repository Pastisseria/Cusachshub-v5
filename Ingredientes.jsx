import CrudPage from "../components/CrudPage.jsx";
export default function Ingredientes(){return <CrudPage title="Ingredientes" description="Materia prima para escandallos y producción." table="ingredientes" fields={[
{name:"nombre",label:"Ingrediente",required:true},{name:"categoria",label:"Categoría"},{name:"proveedor",label:"Proveedor"},{name:"formato",label:"Formato compra"},{name:"cantidad_formato",label:"Cantidad",type:"number",step:"0.001"},{name:"unidad",label:"Unidad",type:"select",options:["kg","g","l","ml","unidad"]},{name:"precio_formato",label:"Precio formato €",type:"number",step:"0.01"},{name:"precio_unitario",label:"Precio unitario €",type:"number",step:"0.0001"},{name:"alergenos",label:"Alérgenos"},{name:"activo",label:"Activo",type:"checkbox",default:true}
]}/>}
