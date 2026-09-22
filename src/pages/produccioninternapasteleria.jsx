import { useMemo, useState } from "react";

const GRUPOS = [
  { titulo: "PASTELERÍA", items: ["Lacets", "Palmiers", "Coques de llardons", "Bretzels", "Bacarissa", "Tarta de poma", "Nius de crema", "Banda de fruita", "Bracet de nata", "Bracet de crema", "Braç crema petit", "Coca de crema", "Coca de xocolata", "Enquesadas", "Merengues", "Bulgaros", "Borratxos"] },
  { titulo: "TARTALETES", items: ["Maduixa", "Macedonia", "Gerds", "Kiwi", "Arándanos", "Moras", "Mandarina", "Mango", "Flam", "Llimona", "Llimona merengue", "Xocolata", "Xocolata nous", "Xocolata taronja", "Xocolata gerds", "Xocolata llet"] },
  { titulo: "ELABORACIONES", items: ["Sara", "Negritos", "Pastís Sara", "Pastís de formatge", "Pastís de formatge i gerds", "Pastar hojaldre", "Pastar brioix", "Bizcocho", "Melindros", "Pastar cocas", "Pasta de té", "Pastar croissants", "Crema", "Crema limón", "Crema naranja", "Yema", "Mazapán", "Pasta brisa", "Crema de mantequilla", "Almíbar", "Baño chocolate", "Trufa cocida", "Tocinitos", "Trufas", "Repostería", "Canapés", "Pasta salada", "Quiches"] },
  { titulo: "OTROS", items: ["Emparedados", "Coca de verdures", "Hacer pasteles", "Planchas bizcocho", "Brazos", "Cocer verdura", "Escalivar", "Bocadillos", "Panecillos", "Turrones"] },
];
const INICIO="2026-09-22", FIN="2026-12-31";
const hoy=()=>{const d=new Date();const f=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);return f<INICIO?INICIO:f>FIN?FIN:f};

export default function ProduccionInternaPasteleria(){
 const[fecha,setFecha]=useState(hoy()); const fechaBonita=useMemo(()=>fecha.split("-").reverse().join("/"),[fecha]);
 function mover(n){const d=new Date(`${fecha}T12:00:00`);d.setDate(d.getDate()+n);const f=d.toISOString().slice(0,10);if(f>=INICIO&&f<=FIN)setFecha(f)}
 return <div className="pip-page">
  <div className="pip-tools no-print"><h1>Producción interna Pastelería</h1><p>Plantilla diaria para imprimir y rellenar manualmente.</p><div className="pip-nav"><button onClick={()=>mover(-1)}>← Día anterior</button><input type="date" min={INICIO} max={FIN} value={fecha} onChange={e=>setFecha(e.target.value)}/><button onClick={()=>mover(1)}>Día siguiente →</button><button className="print-btn" onClick={()=>window.print()}>🖨 Imprimir A4</button></div></div>
  <div className="pip-sheet">
   <header><div><b>PASTISSERIA CUSACHS</b><br/><span>PRODUCCIÓN INTERNA PASTELERÍA</span></div><strong>DÍA: {fechaBonita}</strong></header>
   <div className="pip-columns">{GRUPOS.map(g=><section key={g.titulo} className="pip-group"><h3>{g.titulo}<span>UNIDADES</span></h3>{g.items.map(item=><div className="pip-row" key={item}><div>{item}</div><div className="pip-box">&nbsp;</div></div>)}</section>)}</div>
   <footer><span>Responsable: __________________________________</span><span>Firma: __________________________________</span></footer>
  </div>
  <style>{`
   .pip-page{padding:20px;max-width:1200px;margin:auto}.pip-tools{margin-bottom:16px}.pip-tools h1{margin:0}.pip-tools p{margin:5px 0 12px}.pip-nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.pip-nav button,.pip-nav input{height:40px;padding:0 12px;border:1px solid #888;border-radius:6px;background:#fff;color:#000}.print-btn{font-weight:700}.pip-sheet{width:210mm;height:297mm;box-sizing:border-box;margin:auto;background:#fff;color:#000;padding:8mm;border:1px solid #888;overflow:hidden}.pip-sheet header{height:16mm;box-sizing:border-box;display:flex;justify-content:space-between;align-items:flex-end;border:2px solid #000;padding:2.5mm 3mm;margin-bottom:3mm}.pip-sheet header span{font-size:15px;font-weight:700}.pip-columns{column-count:2;column-gap:5mm}.pip-group{break-inside:avoid;margin:0 0 2.5mm;border:1.5px solid #000}.pip-group h3{display:flex;justify-content:space-between;font-size:10px;margin:0;padding:1.2mm 2mm;border-bottom:1.5px solid #000}.pip-group h3 span{font-size:8px}.pip-row{display:grid;grid-template-columns:1fr 23mm;height:5.55mm;border-bottom:1px solid #000;box-sizing:border-box;font-size:8.8px}.pip-row:last-child{border-bottom:0}.pip-row>div:first-child{display:flex;align-items:center;padding:0 1.5mm}.pip-box{border-left:1.5px solid #000}.pip-sheet footer{display:flex;justify-content:space-between;border:1.5px solid #000;margin-top:3mm;padding:2mm 3mm;font-size:8.5px}
   @media(max-width:900px){.pip-sheet{width:100%;height:auto;min-height:297mm}.pip-columns{column-count:1}}
   @media print{
    @page{size:A4 portrait;margin:0}
    body *{visibility:hidden!important}
    .pip-sheet,.pip-sheet *{visibility:visible!important}
    .pip-sheet{position:fixed!important;display:block!important;left:0!important;top:0!important;width:210mm!important;height:297mm!important;min-height:297mm!important;margin:0!important;padding:8mm!important;border:0!important;overflow:hidden!important;box-sizing:border-box!important;background:#fff!important;color:#000!important;z-index:2147483647!important}
    .pip-sheet header{display:flex!important}.pip-columns{display:block!important;column-count:2!important;column-gap:5mm!important}.pip-group{display:inline-block!important;width:100%!important;break-inside:avoid!important;margin:0 0 2.5mm!important;border:1.5px solid #000!important;box-sizing:border-box!important}.pip-row{display:grid!important;grid-template-columns:1fr 23mm!important;height:5.55mm!important;border-bottom:1px solid #000!important}.pip-box{border-left:1.5px solid #000!important}.pip-sheet footer{display:flex!important}html,body,#root{width:210mm!important;height:297mm!important;margin:0!important;padding:0!important;background:#fff!important;overflow:visible!important}
   }
  `}</style>
 </div>
}
