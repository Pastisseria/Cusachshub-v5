const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
async function run(root,base){
 const browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER_CHANNEL || 'msedge'});
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  const file=path.join(root,decodeURIComponent(pathname.slice(base.length))||'index.html');
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404).end();return}
  res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 }).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const url=`http://127.0.0.1:${server.address().port}${base}`;
 try {
  const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let disconnected=false;
  await page.route('https://ejemplo.supabase.co/**',async route=>{
   if(disconnected)return route.abort('internetdisconnected');
   const request=route.request().url();
   if(request.includes('/perfiles_usuario'))return route.fulfill({json:{id:'budget-user',nombre:'Test',rol:'administrador'}});
   if(request.includes('/presupuesto_lineas'))return route.fulfill({json:[{id:'line-1',presupuesto_id:'budget-1',descripcion:'LINEA LOCAL VERIFICADA',cantidad:2,precio_unitario:10,iva:10,subtotal:20,total:22} ]});
   if(request.includes('/presupuestos'))return route.fulfill({json:[{id:'budget-1',numero:'P-OFFLINE-001',tipo_documento:'Catering',estado:'Borrador',fecha:'2026-10-18',created_at:'2026-10-18T10:00:00Z',total:22,subtotal:20,iva_total:2,clientes:{id:'client-1',nombre:'Cliente de prueba'},snapshot_padding:'x'.repeat(1600000)}]});
   return route.fulfill({json:[]});
  });
  await page.goto(url);await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await page.evaluate(()=>localStorage.setItem('sb-ejemplo-auth-token',JSON.stringify({access_token:'test-token',refresh_token:'test',expires_at:Date.now()/1000+3600,user:{id:'budget-user',email:'test@example.com'}})));
  await page.goto(url+'#/presupuestos');await page.reload();await page.getByText('P-OFFLINE-001',{exact:true}).first().waitFor();
  await page.locator('.tabla-facturas .boton-ficha').first().click();await page.getByText('LINEA LOCAL VERIFICADA',{exact:true}).waitFor();
  // Remove optional lookups: their absence must not suppress the stored budget.
  await page.evaluate(async()=>{
   for(const key of Object.keys(localStorage))if(key.startsWith('cusachs:data:')&&!key.includes('/presupuestos')&&!key.includes('/presupuesto_lineas'))localStorage.removeItem(key);
   await new Promise((resolve,reject)=>{const open=indexedDB.open('cusachs-offline-data',1);open.onerror=reject;open.onsuccess=()=>{const db=open.result,tx=db.transaction('snapshots','readwrite'),cursor=tx.objectStore('snapshots').openCursor();cursor.onsuccess=()=>{const item=cursor.result;if(!item)return;if(!item.key.includes('/presupuestos')&&!item.key.includes('/presupuesto_lineas'))item.delete();item.continue()};tx.oncomplete=()=>{db.close();resolve()}}});
   const session=JSON.parse(localStorage.getItem('sb-ejemplo-auth-token'));session.expires_at=1;localStorage.setItem('sb-ejemplo-auth-token',JSON.stringify(session));
  });
  disconnected=true;await context.setOffline(true);await page.reload();
  await page.getByText('P-OFFLINE-001',{exact:true}).first().waitFor({timeout:20000});
  await page.locator('.tabla-facturas .boton-ficha').first().click();await page.getByText('LINEA LOCAL VERIFICADA',{exact:true}).waitFor();
  assert(!/Cargando documentos/.test(await page.locator('body').innerText()));
  // False positive online: local network exists, Internet and auth refresh do not.
  await context.setOffline(false);await page.reload();
  await page.getByText('P-OFFLINE-001',{exact:true}).first().waitFor({timeout:25000});
  await page.locator('.tabla-facturas .boton-ficha').first().click();await page.getByText('LINEA LOCAL VERIFICADA',{exact:true}).waitFor({timeout:15000});
  assert.deepEqual(errors,[]);
  console.log('PASS budgets >1.5MB in IndexedDB, offline list/detail, expired session, missing lookups, navigator online with unreachable Internet; no page errors');
  await context.close();
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve))}
}
const repo=process.argv[2];
const root=repo?path.resolve('work',repo,'dist'):path.resolve(__dirname,'../dist');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=html.match(/src="([^"]*assets\/[^" ]+\.js)"/)[1];
const base=source.startsWith('/')?source.split('assets/')[0]:'/';
run(root,base).catch(error=>{console.error(error);process.exitCode=1});


