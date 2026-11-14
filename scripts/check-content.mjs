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
 for(const m of s.matchAll(/\]\((\/[^)#\s]*)\)/g)) assert(routes.has(m[1].replace(/^\/khoahoctienghan(?=\/)/, '')),p+' broken link '+m[1]);
}
console.log('Validated '+paths.length+' content files');

const config = await readFile('astro.config.mjs','utf8');
assert(!/label:[^\n]+,\s*autogenerate:/.test(config), 'Legacy Starlight sidebar group: wrap autogenerate in items');

// Rich article content validation; keep existing checks intact.
const {validateVisual}=await import('../src/lib/tech-visual-validation.mjs');
const techPosts=JSON.parse(await readFile('src/data/techblog/posts.json','utf8'));
for(const post of techPosts)for(const section of post.sections){if(section.visuals!==undefined){assert(Array.isArray(section.visuals),post.slug+' invalid visuals');for(const v of section.visuals)validateVisual(v);}}
