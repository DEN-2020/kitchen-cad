import { cp, mkdir, rm, writeFile, readFile, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=resolve(root,'dist');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
await cp(resolve(root,'index.html'),resolve(dist,'index.html'));await cp(resolve(root,'src'),resolve(dist,'src'),{recursive:true});
const chunks=[];for(let i=1;i<=4;i++) chunks.push(await readFile(resolve(root,`src/ui/app.part${i}.txt`),'utf8'));
await writeFile(resolve(dist,'src/ui/app.js'),chunks.join(''));
for(let i=1;i<=4;i++) await unlink(resolve(dist,`src/ui/app.part${i}.txt`));
await writeFile(resolve(dist,'.nojekyll'),'');
console.log('Built static Kitchen CAD site into dist/. No remote assets.');
