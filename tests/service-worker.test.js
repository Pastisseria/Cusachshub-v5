import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
async function entorno({online=true}={}) {
 const listeners={},calls=[];
 const local={match:async key=>String(key).endsWith('index.html')?'offline-html':undefined,addAll:async()=>calls.push('precache')};
 const self={location:{href:'https://example.com/app/sw.js'},addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting:async()=>calls.push('activate-new'),clients:{claim:async()=>calls.push('claim')}};
 const template=await readFile('scripts/sw-template.js','utf8');
 runInNewContext(template.replace('__VERSION__','test').replace('__FILES__','["index.html"]'),{URL,self,caches:{open:async()=>local,match:async()=>undefined},fetch:async()=>{if(!online)throw Error('offline');return {ok:true,body:'new-html'}}});
 return {listeners,calls};
}
test('install caches release fully before activating even with older tabs open',async()=>{
 const {listeners,calls}=await entorno();let done;
 listeners.install({waitUntil:p=>done=p});await done;
 assert.deepEqual(calls,['precache','activate-new']);
});
test('online navigation fetches current HTML; offline retains installed shell',async()=>{
 for(const online of [true,false]){
  const {listeners}=await entorno({online});let response;
  listeners.fetch({request:{method:'GET',url:'https://example.com/app/?version=10',mode:'navigate'},respondWith:p=>response=p});
  assert.equal(online?(await response).body:await response,online?'new-html':'offline-html');
 }
});
