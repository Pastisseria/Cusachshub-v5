import test from 'node:test';
import assert from 'node:assert/strict';
import { nombreVisitador, resolverVisitador, leerTodasLasFilas, admiteVinculoVisitador } from '../src/lib/visitador-presupuestos.js';

const alex = { id: 1, nombre: 'ALEX', apellidos: 'MERCADER' };
const doc = (campos = {}) => ({ tipo_documento: 'Visitador médico', visitador_nombre: 'ALEX', ...campos });

test('recupera ALEX antiguo y guarda el nombre completo para documentos nuevos', () => {
  assert.equal(nombreVisitador(alex), 'ALEX MERCADER');
  assert.equal(resolverVisitador(doc(), [alex]), alex);
  assert.equal(resolverVisitador(doc({visitador_nombre:'  alex   mercader '}), [alex]), alex);
});
test('el identificador permanece aunque cambie el nombre y nunca se reasigna por texto', () => {
  assert.equal(resolverVisitador(doc({visitador_id:'1',visitador_nombre:'Nombre antiguo'}), [alex]), alex);
  assert.equal(resolverVisitador(doc({visitador_id:2}), [alex]), null);
});
test('no mezcla homónimos, ni siquiera si el nombre completo coincide con un nombre corto', () => {
  assert.equal(resolverVisitador(doc(), [alex, {id:2,nombre:'Alex',apellidos:'Otro'}]), null);
  assert.equal(resolverVisitador(doc({visitador_nombre:'ALEX MERCADER'}), [alex,{id:2,nombre:'Alex Mercader'}]), null);
});
test('ignora documentos de otros tipos y nombres vacíos', () => {
  assert.equal(resolverVisitador(doc({tipo_documento:'Empresa',visitador_id:1}), [alex]), null);
  assert.equal(resolverVisitador(doc({visitador_nombre:''}), [alex]), null);
});
test('no interpreta los comodines como nombres de otra persona', () => {
  assert.equal(resolverVisitador(doc({visitador_nombre:'A%'}),[alex]),null);
});
test('lee todas las páginas y no oculta errores de consulta', async () => {
  const rows=Array.from({length:1001},(_,id)=>({id}));
  const client={from:()=>({select:()=>({order:()=>({range:async(a,b)=>({data:rows.slice(a,b+1)})})})})};
  assert.equal((await leerTodasLasFilas(client,'presupuestos')).length,1001);
  const fail={from:()=>({select:()=>({order:()=>({range:async()=>({error:new Error('Sin acceso')})})})})};
  await assert.rejects(leerTodasLasFilas(fail,'presupuestos'),/Sin acceso/);
});
test('compatibilidad con la base anterior sin ocultar fallos de permisos',async()=>{
  const client=error=>({from:()=>({select:()=>({limit:async()=>({error})})})});
  assert.equal(await admiteVinculoVisitador(client(null)),true);
  assert.equal(await admiteVinculoVisitador(client({code:'42703'})),false);
  await assert.rejects(admiteVinculoVisitador(client(new Error('Sin acceso'))),/Sin acceso/);
});
