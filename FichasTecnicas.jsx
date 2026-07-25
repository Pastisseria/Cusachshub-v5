import CrudPage from "../components/CrudPage.jsx";
export default function FichasTecnicas(){return <CrudPage title="Fichas técnicas" description="Elaboración, conservación, alérgenos y presentación." table="fichas_tecnicas" fields={[
{name:"producto",label:"Producto",required:true},{name:"version",label:"Versión"},{name:"rendimiento",label:"Rendimiento"},{name:"elaboracion",label:"Elaboración",type:"textarea",full:true},{name:"conservacion",label:"Conservación"},{name:"caducidad",label:"Caducidad"},{name:"alergenos",label:"Alérgenos"},{name:"presentacion",label:"Presentación",type:"textarea",full:true},{name:"activo",label:"Activo",type:"checkbox",default:true}
]}/>}
