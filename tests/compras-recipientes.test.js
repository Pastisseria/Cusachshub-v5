import test from "node:test";
import assert from "node:assert/strict";
import { calcularRecipientes, resumirRecipientes } from "../src/lib/compras-recipientes.js";
const zona = p => p?.zona_produccion;
const linea = {id:"l1",presupuesto_id:"p1",producto_id:"ensalada",cantidad:10,unidad:"pieza",productos:{nombre:"Ensalada",zona_produccion:"Cocina"}};
const c = {id:"c1",presupuesto_id:"p1",estado:"Confirmado",fecha:"2026-10-19"};
test("one container per piece; source duplicates excluded; forecasts separate", () => {
  const datos = {caterings:[c,c,{...c,id:"c2",estado:"Pendiente"},{...c,id:"c3",estado:"Cancelado"}],lineas:[linea,linea,{...linea,id:"l2",cantidad:5},{...linea,id:"l3",cantidad:0},{...linea,id:"l4",productos:{nombre:"Agua",zona_produccion:"Barra"}}]};
  const filas = calcularRecipientes(datos,"confirmados",zona);
  assert.equal(filas.length,1);
  assert.equal(filas[0].total,15);
  assert.equal(calcularRecipientes(datos,"previsiones",zona)[0].total,15);
  assert.equal(resumirRecipientes(filas,{}).length,0);
  const reglas = {[filas[0].clave]:{activo:true,recipiente:"Vaso ensalada"}};
  assert.equal(resumirRecipientes(filas,reglas)[0].total,15);
});
test("same container sums products and days; inactive rules excluded", () => {
  const filas = [{clave:"a",total:10,dias:{"2026-10-19":10}},{clave:"b",total:7,dias:{"2026-10-20":7}},{clave:"c",total:30,dias:{"2026-10-19":30}}];
  const resumen = resumirRecipientes(filas,{a:{activo:true,recipiente:"Caja"},b:{activo:true,recipiente:" caja "},c:{activo:false,recipiente:"Caja"}});
  assert.equal(resumen.length,1);
  assert.equal(resumen[0].total,17);
  assert.equal(resumen[0].dias["2026-10-20"],7);
});
test("same product with different budget units has independent assignments", () => {
  const filas = calcularRecipientes({caterings:[c],lineas:[linea,{...linea,id:"l2",unidad:"bandeja"}]},"confirmados",zona);
  assert.equal(filas.length,2);
  assert.notEqual(filas[0].clave,filas[1].clave);
});
