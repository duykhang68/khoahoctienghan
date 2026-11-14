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

const {validateKnowledgeVisuals}=await import('../src/lib/knowledge-visual-validation.mjs');
const knowledgeVisuals=JSON.parse(await readFile('src/data/knowledge-visuals.json','utf8'));
const knowledgePages=await Promise.all(paths.map(async path=>({path,content:await readFile(root+'/'+path,'utf8')})));
const visualCount=validateKnowledgeVisuals(knowledgeVisuals,knowledgePages);
console.log('Validated '+visualCount+' Knowledge Base visual references');

const {normalizeDocument,assertImageFiles,webpDimensions}=await import('../src/lib/studio-document.mjs');
const {readFileSync}=await import('node:fs');
const studioDocs=JSON.parse(await readFile('src/data/studio-documents.json','utf8'));
const studioRefs=new Set();
for(const p of knowledgePages)for(const m of p.content.matchAll(/<KnowledgeStudioDocument\b[^>]*>/g)){
 const exact=/^<KnowledgeStudioDocument id="([a-z0-9-]+)"\s*\/>$/.exec(m[0]);assert(exact&&p.path.endsWith('.mdx')&&Object.hasOwn(studioDocs,exact[1])&&!studioRefs.has(exact[1]),'Invalid studio document reference');studioRefs.add(exact[1]);
}
for(const [id,body] of Object.entries(studioDocs)){assert(studioRefs.has(id),'Unused studio document');assertImageFiles(normalizeDocument(body),path=>readFileSync(path))}
for(const post of techPosts)if(post.studioBody)assertImageFiles(normalizeDocument(post.studioBody),path=>readFileSync(path));

const {normalizeMetadata}=await import('../src/lib/studio-metadata.mjs');
const kbMetadata=JSON.parse(await readFile('src/data/studio-metadata.json','utf8'));
assert(kbMetadata&&typeof kbMetadata==='object'&&!Array.isArray(kbMetadata),'Invalid studio metadata index');
for(const [id,value] of Object.entries(kbMetadata)){
 assert(studioRefs.has(id),'Orphan KB metadata: '+id);
 assert.deepEqual(value,normalizeMetadata(value),'Noncanonical KB metadata: '+id);
}
for(const post of techPosts){
 const canonical=normalizeMetadata(post);
 if(post.labels!==undefined)assert.deepEqual(post.labels,canonical.labels,'Invalid labels: '+post.slug);
 if(post.series!==undefined)assert.deepEqual(post.series,canonical.series,'Invalid series: '+post.slug);
}
