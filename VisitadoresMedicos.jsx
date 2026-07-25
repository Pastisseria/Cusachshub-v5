import CrudPage from "../components/CrudPage.jsx";
export default function VisitadoresMedicos(){return <CrudPage title="Visitadores médicos" description="Contactos, centros y seguimiento de solicitudes." table="visitadores_medicos" fields={[
{name:"nombre",label:"Nombre",required:true},{name:"laboratorio",label:"Laboratorio / Empresa"},{name:"telefono",label:"Teléfono"},{name:"email",label:"Email",type:"email"},{name:"zona",label:"Zona"},{name:"ultimo_contacto",label:"Último contacto",type:"date"},{name:"observaciones",label:"Observaciones",type:"textarea",full:true},{name:"activo",label:"Activo",type:"checkbox",default:true}
]}/>}
