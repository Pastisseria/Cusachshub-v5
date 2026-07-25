import CrudPage from "../components/CrudPage.jsx";
export default function Compras(){return <CrudPage title="Compras" description="Pedidos a proveedores y control de recepción." table="compras" fields={[
{name:"numero",label:"N.º compra",required:true},{name:"fecha",label:"Fecha",type:"date",required:true},{name:"proveedor",label:"Proveedor",required:true},{name:"producto",label:"Producto"},{name:"cantidad",label:"Cantidad",type:"number",step:"0.01"},{name:"total",label:"Total €",type:"number",step:"0.01"},{name:"estado",label:"Estado",type:"select",options:["Borrador","Pedido","Recibido parcial","Recibido","Cancelado"],default:"Borrador"},{name:"fecha_entrega",label:"Entrega prevista",type:"date"},{name:"observaciones",label:"Observaciones",type:"textarea",full:true}
]}/>}
