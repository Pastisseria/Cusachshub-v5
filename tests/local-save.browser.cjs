const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function run(){
 const root=path.resolve(__dirname,'../dist');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const source=html.match(/src="([^"]*assets\/[^" ]+\.js)"/)[1];
 const base=source.startsWith('/')?source.split('assets/')[0]:'/';
 const server=http.createServer((req,res)=>{
  const file=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname.slice(base.length))||'index.html');
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404).end();return}
  res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 }).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const url=`http://127.0.0.1:${server.address().port}${base}`;
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 let page;
 try {
  const context=await browser.newContext();page=await context.newPage();const errors=[],mutations=[];
  page.on('pageerror',e=>errors.push(e.message));let unavailable=false;
  await page.route('https://ejemplo.supabase.co/**',async route=>{
   if(route.request().method()!=='GET'){mutations.push(route.request().method());return route.abort()}
   if(unavailable)return route.abort('internetdisconnected');
   const request=route.request().url();
   if(request.includes('/perfiles_usuario'))return route.fulfill({json:{id:'save-user',nombre:'Test',rol:'administrador'}});
   if(request.includes('/presupuestos'))return route.fulfill({json:[{id:'remote-1',numero:'REMOTO-001',cliente_id:'client-1',tipo_documento:'Catering',fecha:'2026-10-20',estado:'Borrador',created_at:'2026-10-20T12:00:00Z',clientes:{id:'client-1',nombre:'Cliente local'},total:22,subtotal:20,iva_total:2}]});
   if(request.includes('/presupuesto_lineas'))return route.fulfill({json:[{id:'line-1',presupuesto_id:'remote-1',descripcion:'LINEA ORIGINAL',cantidad:2,precio_unitario:10,iva:10}]});
   if(request.includes('/clientes'))return route.fulfill({json:[{id:'client-1',nombre:'Cliente local',activo:true}]});
   return route.fulfill({json:[]});
  });
  await page.goto(url);await page.waitForFunction(()=>navigator.serviceWorker.controller);await page.waitForSelector('form');
  await page.evaluate(()=>localStorage.setItem('sb-ejemplo-auth-token',JSON.stringify({access_token:'test-token',refresh_token:'test',expires_at:Date.now()/1000+3600,user:{id:'save-user',email:'test@example.com'}})));
  await page.goto(url+'#/presupuestos');await page.reload();await page.getByText('REMOTO-001',{exact:true}).first().waitFor();
  await page.locator('.tabla-facturas .boton-ficha').first().click();await page.getByText('LINEA ORIGINAL',{exact:true}).waitFor();await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  await context.setOffline(true);await page.reload();await page.getByText('REMOTO-001',{exact:true}).first().waitFor();
  await page.getByRole('button',{name:/Nuevo documento/}).click();
  await page.getByLabel(/Cliente/).selectOption('client-1');
  await page.getByLabel(/Descripción/).fill('PRESUPUESTO NUEVO OFFLINE');
  await page.getByLabel('Cantidad',{exact:true}).fill('3');await page.getByLabel('Precio sin IVA',{exact:true}).fill('12.50');
  await page.getByRole('button',{name:'💾 Guardar en este dispositivo',exact:true}).click();
  await page.getByText('Guardado solo en este dispositivo',{exact:true}).waitFor();await page.getByText('PRESUPUESTO NUEVO OFFLINE',{exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Abrir copia local',exact:true}).waitFor();
  await page.getByRole('button',{name:'Abrir copia local',exact:true}).click();await page.getByText('PRESUPUESTO NUEVO OFFLINE',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Editar copia local',exact:true}).click();await page.getByLabel('Cantidad',{exact:true}).fill('7');
  await page.getByRole('button',{name:'💾 Guardar en este dispositivo',exact:true}).click();await page.getByText('Guardado solo en este dispositivo',{exact:true}).waitFor();
  await page.reload();assert.equal(await page.getByRole('button',{name:'Abrir copia local',exact:true}).count(),1);
  await page.getByRole('button',{name:'Abrir copia local',exact:true}).click();assert.equal(await page.locator('article tbody tr td').nth(1).innerText(),'7');
  await page.getByRole('button',{name:'Cerrar copia local',exact:true}).click();
  // Saving edits to a server document makes a separate local copy.
  await page.locator('.tabla-facturas').first().getByRole('button',{name:/Editar/}).click();
  await page.getByLabel(/Descripción/).fill('CAMBIO SOLO LOCAL');
  await page.getByRole('button',{name:'💾 Guardar en este dispositivo',exact:true}).click();await page.getByText('CAMBIO SOLO LOCAL',{exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Abrir copia local',exact:true}).nth(1).waitFor();assert.equal(await page.getByRole('button',{name:'Abrir copia local',exact:true}).count(),2);
  // An explicit device save works even when navigator reports online but Internet is unreachable.
  unavailable=true;await context.setOffline(false);
  await page.getByRole('button',{name:/Nuevo documento/}).click();await page.getByLabel(/Cliente/).selectOption('client-1');await page.getByLabel(/Descripción/).fill('GUARDADO SIN RED REAL');
  await page.getByRole('button',{name:'Guardar copia en este dispositivo',exact:true}).click();await page.getByText('GUARDADO SIN RED REAL',{exact:true}).waitFor();
  await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'Abrir copia local',exact:true}).nth(2).waitFor();assert.equal(await page.getByRole('button',{name:'Abrir copia local',exact:true}).count(),3);
  // Storage failure must keep the form and never claim success.
  await page.getByRole('button',{name:/Nuevo documento/}).click();await page.getByLabel(/Cliente/).selectOption('client-1');await page.getByLabel(/Descripción/).fill('NO PERDER FORMULARIO');
  await page.evaluate(()=>{const original=indexedDB.open.bind(indexedDB);indexedDB.open=(name,...args)=>{if(name==='cusachs-local-budgets')throw new Error('quota');return original(name,...args)}});
  await page.getByRole('button',{name:'💾 Guardar en este dispositivo',exact:true}).click();await page.getByText(/No se pudo guardar o leer el documento local/).waitFor();assert.equal(await page.getByLabel(/Descripción/).inputValue(),'NO PERDER FORMULARIO');
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  // Change account offline. Neither saved local record is visible to this user.
  await page.evaluate(()=>{const session=JSON.parse(localStorage.getItem('sb-ejemplo-auth-token'));session.user.id='other-user';localStorage.setItem('sb-ejemplo-auth-token',JSON.stringify(session));localStorage.setItem('cusachs:perfil:sb-ejemplo-auth-token:other-user',JSON.stringify({id:'other-user',nombre:'Other',rol:'administrador'}))});
  await page.reload();await page.getByRole('button',{name:/Nuevo documento/}).waitFor();await page.waitForTimeout(500);
  assert.equal(await page.getByRole('button',{name:'Abrir copia local',exact:true}).count(),0);
  assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);
  console.log('PASS offline create, persistence after reload, edit same copy, separate copy of server budget, storage failure preserves form, account isolation; zero server mutations');
  await context.close();
 } catch(error){console.error('PAGE',await page?.locator('body').innerText().catch(()=>''));throw error}
 finally {await browser.close();await new Promise(resolve=>server.close(resolve))}
}
run().catch(error=>{console.error(error);process.exitCode=1});


