import CrudPage from "../components/CrudPage.jsx";
export default function Clientes(){return <CrudPage title="Clientes" description="Agenda comercial y datos de facturación." table="clientes" fields={[
{name:"nombre",label:"Nombre / Empresa",required:true},{name:"contacto",label:"Persona de contacto"},{name:"telefono",label:"Teléfono"},{name:"email",label:"Email",type:"email"},{name:"cif",label:"CIF / NIF"},{name:"direccion",label:"Dirección",full:true},{name:"poblacion",label:"Población"},{name:"codigo_postal",label:"Código postal"},{name:"observaciones",label:"Observaciones",type:"textarea",full:true},{name:"activo",label:"Activo",type:"checkbox",default:true}
]}/>}
