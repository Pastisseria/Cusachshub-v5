import {test} from 'node:test';
import assert from 'node:assert/strict';
import {offlineFetch,setLocalUser,readLocal,writeLocal} from '../src/lib/local-data.js';
const store=new Map();
Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
globalThis.window={dispatchEvent(){}};
globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
test('local snapshots isolate accounts, queries and range headers; offline mutations fail',async()=>{
 let calls=0;
 const request=offlineFetch('https://project.supabase.co',async()=>{calls++;return new Response('[{"id":1}]',{headers:{'content-type':'application/json','content-range':'0-0/1'}})});
 const url='https://project.supabase.co/rest/v1/orders?select=id';
 const options={headers:{Authorization:'Bearer secret',apikey:'secret-key',range:'0-9'}};
 setLocalUser('a');await request(url,options);navigator.onLine=false;
 assert.deepEqual(await (await request(url,options)).json(),[{id:1}]);assert.equal(calls,1);
 assert(!JSON.stringify([...store]).includes('secret'));
 await assert.rejects(request(url,{headers:{range:'10-19'}}),/aún no están guardados/);
 await assert.rejects(request(url+'&id=eq.2',options),/aún no están guardados/);
 setLocalUser('b');await assert.rejects(request(url,options),/aún no están guardados/);
 setLocalUser(null);await assert.rejects(request(url,options));
 setLocalUser('a');await assert.rejects(request(url,{method:'POST',body:'{}'}),/no se ha enviado ni guardado/);
 assert.equal(calls,1);navigator.onLine=true;
 const denied=offlineFetch('https://project.supabase.co',async()=>new Response('{}',{status:403}));
 assert.equal((await denied(url,options)).status,403);
 const disconnected=offlineFetch('https://project.supabase.co',async()=>{throw new TypeError('network')});
 assert.deepEqual(await (await disconnected(url,options)).json(),[{id:1}]);
});
test('disabled or corrupt storage does not crash startup',()=>{
 store.set('broken','{');assert.equal(readLocal('broken'),null);
 const original=localStorage.setItem;localStorage.setItem=()=>{throw new Error('quota')};
 assert.doesNotThrow(()=>writeLocal('x',{}));localStorage.setItem=original;
});

test('blocked IndexedDB falls back to legacy snapshots without breaking successful queries',async()=>{
 globalThis.indexedDB={open(){throw new Error('blocked storage')}};
 navigator.onLine=true;setLocalUser('storage-test');
 const transport=offlineFetch('https://project.supabase.co',async()=>new Response('[{"id":9}]'));
 const url='https://project.supabase.co/rest/v1/presupuestos?select=*';
 assert.equal((await transport(url)).status,200);
 navigator.onLine=false;assert.deepEqual(await (await transport(url)).json(),[{id:9}]);
 navigator.onLine=true;delete globalThis.indexedDB;
});
