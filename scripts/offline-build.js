import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export default function offlineBuild(){
 let config;
 return {name:'cusachs-offline-shell',configResolved(c){config=c},async closeBundle(){
  const dir=config.build.outDir;
  async function walk(path=''){const entries=await readdir(dir+'/'+path,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?walk(path+e.name+'/'):path+e.name))).flat()}
  const files=(await walk()).filter(f=>f!=='sw.js');
  const hash=createHash('sha256');for(const file of files)hash.update(await readFile(dir+'/'+file));
  const template=await readFile('scripts/sw-template.js','utf8');
  await writeFile(dir+'/sw.js',template.replace('__VERSION__',hash.digest('hex').slice(0,16)).replace('__FILES__',JSON.stringify(files)));
 }};
}
