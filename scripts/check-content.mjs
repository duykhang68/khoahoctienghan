import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='src/content/docs';
const paths=(await readdir(root,{recursive:true})).filter(p=>/\.mdx?$/.test(p));
assert(paths.length>=14,'Expected homepage, ten topic pages and three articles');
const routes=new Set(paths.map(p=>'/'+p.replace(/\.mdx?$/,'').replace(/(^|\/)index$/,'$1').replace(/\/$/,'')+'/').map(p=>p==='//' ? '/' : p));
for(const p of paths){
 const s=await readFile(root+'/'+p,'utf8');
 assert(/^---\n[\s\S]*?\ntitle: .+/m.test(s)||/^---\ntitle: .+/.test(s),p+' missing title');
 assert(/^description: .+/m.test(s),p+' missing description');
 for(const m of s.matchAll(/\]\((\/[^)#\s]*)\)/g)) assert(routes.has(m[1]),p+' broken link '+m[1]);
}
console.log('Validated '+paths.length+' content files');
