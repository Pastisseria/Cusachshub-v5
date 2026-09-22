import { useMemo, useState } from "react";
import { supabase } from "../supabase.js";

const GRUPOS = [
  { titulo: "PASTELERÍA", items: ["Lacets", "Palmiers", "Coques de llardons", "Bretzels", "Bacarissa", "Tarta de poma", "Nius de crema", "Banda de fruita", "Bracet de nata", "Bracet de crema", "Braç crema petit", "Coca de crema", "Coca de xocolata", "Enquesadas", "Merengues", "Bulgaros", "Borratxos"] },
  { titulo: "TARTALETES", items: ["Maduixa", "Macedonia", "Gerds", "Kiwi", "Arándanos", "Moras", "Mandarina", "Mango", "Flam", "Llimona", "Llimona merengue", "Xocolata", "Xocolata nous", "Xocolata taronja", "Xocolata gerds", "Xocolata llet"] },
  { titulo: "ELABORACIONES", items: ["Sara", "Negritos", "Pastís Sara", "Pastís de formatge", "Pastís de formatge i gerds", "Pastar hojaldre", "Pastar brioix", "Bizcocho", "Melindros", "Pastar cocas", "Pasta de té", "Pastar croissants", "Crema", "Crema limón", "Crema naranja", "Yema", "Mazapán", "Pasta brisa", "Crema de mantequilla", "Almíbar", "Baño chocolate", "Trufa cocida", "Tocinitos", "Trufas", "Repostería", "Canapés", "Pasta salada", "Quiches"] },
  { titulo: "OTROS", items: ["Emparedados", "Coca de verdures", "Hacer pasteles", "Planchas bizcocho", "Brazos", "Cocer verdura", "Escalivar", "Bocadillos", "Panecillos", "Turrones"] },
];

const ITEMS = GRUPOS.flatMap((g) => g.items);
const INICIO = "2026-09-22";
const FIN = "2026-12-31";
const hoy = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return local < INICIO ? INICIO : local > FIN ? FIN : local;
};

export default function ProduccionInternaPasteleria() {
  const [fecha, setFecha] = useState(hoy());
  const [cantidades, setCantidades] = useState({});
  const [mensaje, setMensaje] = useState("");
  const fechaBonita = useMemo(() => fecha.split("-").reverse().join("/"), [fecha]);

  async function guardar() {
    setMensaje("Guardando…");
    const { data, error: lecturaError } = await supabase.from("produccion_interna_pasteleria").select("*").eq("fecha", fecha).maybeSingle();
    if (lecturaError) return setMensaje(`Error: ${lecturaError.message}`);
    const payload = { fecha, cantidades: Object.fromEntries(ITEMS.map((x) => [x, Number(cantidades[x] || 0)])), updated_at: new Date().toISOString() };
    const { error } = data
      ? await supabase.from("produccion_interna_pasteleria").update(payload).eq("fecha", fecha)
      : await supabase.from("produccion_interna_pasteleria").insert(payload);
    setMensaje(error ? `Error: ${error.message}` : "✓ Guardado");
  }

  async function cargar(nuevaFecha) {
    setFecha(nuevaFecha);
    setMensaje("");
    const { data } = await supabase.from("produccion_interna_pasteleria").select("cantidades").eq("fecha", nuevaFecha).maybeSingle();
    setCantidades(data?.cantidades || {});
  }

  function mover(dias) {
    const d = new Date(`${fecha}T12:00:00`); d.setDate(d.getDate() + dias);
    const f = d.toISOString().slice(0, 10); if (f >= INICIO && f <= FIN) cargar(f);
  }

  return <div className="pip-page">
    <div className="pip-tools no-print">
      <h1>Producción interna Pastelería</h1>
      <div className="pip-nav"><button onClick={() => mover(-1)}>←</button><input type="date" min={INICIO} max={FIN} value={fecha} onChange={(e) => cargar(e.target.value)} /><button onClick={() => mover(1)}>→</button><button className="pip-save" onClick={guardar}>Guardar</button><button onClick={() => window.print()}>🖨 Imprimir A4</button></div>
      {mensaje && <b>{mensaje}</b>}
    </div>

    <div className="pip-sheet" id="pip-print">
      <header><div><b>PASTISSERIA CUSACHS</b><br/><span>PRODUCCIÓN INTERNA PASTELERÍA</span></div><strong>DÍA: {fechaBonita}</strong></header>
      <div className="pip-columns">
        {GRUPOS.map((g) => <section key={g.titulo} className="pip-group"><h3>{g.titulo}</h3>{g.items.map((item) => <div className="pip-row" key={item}><label>{item}</label><input type="number" min="0" value={cantidades[item] ?? ""} onChange={(e) => setCantidades((p) => ({...p,[item]:e.target.value}))}/></div>)}</section>)}
      </div>
      <footer>Responsable: ________________________________ &nbsp;&nbsp;&nbsp; Firma: ________________________________</footer>
    </div>

    <style>{`
      .pip-page{padding:20px;max-width:1200px;margin:auto}.pip-tools{margin-bottom:16px}.pip-tools h1{margin:0 0 12px}.pip-nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.pip-nav button,.pip-nav input{height:40px;padding:0 12px;border:1px solid #aaa;border-radius:6px;background:#fff}.pip-save{font-weight:700}.pip-sheet{width:210mm;min-height:297mm;box-sizing:border-box;margin:auto;background:#fff;color:#000;padding:10mm;border:1px solid #bbb}.pip-sheet header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #000;padding-bottom:4mm;margin-bottom:4mm}.pip-sheet header span{font-size:18px;font-weight:700}.pip-columns{column-count:2;column-gap:8mm}.pip-group{break-inside:avoid;margin:0 0 4mm}.pip-group h3{font-size:12px;margin:0;border:1px solid #000;background:#eee;padding:2mm}.pip-row{display:grid;grid-template-columns:1fr 24mm;min-height:7.2mm;border:1px solid #000;border-top:0;align-items:center}.pip-row label{padding:1mm 2mm;font-size:10.5px}.pip-row input{width:100%;height:100%;min-height:7mm;box-sizing:border-box;border:0;border-left:1px solid #000;text-align:center;font-size:11px;background:#fff;color:#000}.pip-sheet footer{margin-top:5mm;font-size:10px;border-top:1px solid #000;padding-top:4mm}
      @media(max-width:900px){.pip-sheet{width:100%;min-height:auto}.pip-columns{column-count:1}}
      @media print{@page{size:A4 portrait;margin:0}html,body,#root,.app,.contenido{margin:0!important;padding:0!important;width:100%!important;min-width:0!important;background:#fff!important}.sidebar,.boton-menu-tablet,.fondo-menu-tablet,.no-print{display:none!important}.pip-page{padding:0!important;margin:0!important;max-width:none!important}.pip-sheet{display:block!important;width:210mm!important;height:297mm!important;min-height:297mm!important;margin:0!important;padding:8mm!important;border:0!important;overflow:hidden!important;box-shadow:none!important}.pip-columns{column-count:2!important;column-gap:6mm!important}.pip-group{margin-bottom:2.5mm!important}.pip-group h3{font-size:10px!important;padding:1mm!important;background:#fff!important}.pip-row{min-height:5.5mm!important;height:5.5mm!important}.pip-row label{font-size:8.5px!important;padding:.5mm 1mm!important}.pip-row input{min-height:5.3mm!important;font-size:9px!important;border-radius:0!important}.pip-sheet header{margin-bottom:2mm!important;padding-bottom:2mm!important}.pip-sheet header span{font-size:14px!important}.pip-sheet footer{margin-top:2mm!important;padding-top:2mm!important;font-size:8px!important}*{-webkit-print-color-adjust:economy!important;print-color-adjust:economy!important}}
    `}</style>
  </div>;
}
