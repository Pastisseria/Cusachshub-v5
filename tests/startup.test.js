import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const source = await readFile('public/inicio.js', 'utf8');
function inicio() {
  const elements = Object.fromEntries(['inicio-error','inicio-detalle','inicio-reintentar'].map(id => [id, {hidden:true}]));
  const listeners = {};
  let timer, replaced;
  const window = { location:{href:'https://example.com/app/?version=10#/presupuestos',replace:url=>{replaced=url;}}, addEventListener:(name,fn)=>{listeners[name]=fn;} };
  runInNewContext(source, {window,document:{getElementById:id=>elements[id]},URL,Date,setTimeout:fn=>{timer=fn;return 1;},clearTimeout:()=>{timer=null;}});
  return {window,elements,listeners,timeout:()=>timer?.(),replacement:()=>replaced};
}
test('failed script and uncompleted boot display recovery; retry preserves route', () => {
  const env=inicio();env.listeners.error({target:{tagName:'SCRIPT'}});
  assert.equal(env.elements['inicio-error'].hidden,false);
  env.elements['inicio-reintentar'].onclick();
  assert.equal(new URL(env.replacement()).hash,'#/presupuestos');
  assert.equal(new URL(env.replacement()).searchParams.get('version'),'10');
  const stalled=inicio();stalled.timeout();assert.equal(stalled.elements['inicio-error'].hidden,false);
});
test('successful boot cancels timeout; render errors can still open recovery', () => {
  const env=inicio();env.window.cusachsInicioListo();env.timeout();
  assert.equal(env.elements['inicio-error'].hidden,true);
  env.window.cusachsErrorInicio('Error de pantalla');assert.equal(env.elements['inicio-error'].hidden,false);
  assert.equal(env.elements['inicio-detalle'].textContent,'Error de pantalla');
});
