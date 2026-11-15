import assert from 'node:assert/strict';
import {validateVisual} from './tech-visual-validation.mjs';
import {validateKnowledgeVisuals} from './knowledge-visual-validation.mjs';
import {normalizeMetadata,normalizeKnowledgeMetadata} from './metadata.mjs';
export function validateContentPages(pages){
 const paths=pages.map(p=>p.path);
 assert(paths.length>=14,'Expected homepage, ten topic pages and three articles');
const routes=new Set(paths.map(p=>'/'+p.replace(/\.mdx?$/,'').replace(/(^|\/)index$/,'$1').replace(/\/$/,'')+'/').map(p=>p==='//' ? '/' : p));
for(const {path:p,content:s} of pages){
 assert(/^---\n[\s\S]*?\ntitle: .+/m.test(s)||/^---\ntitle: .+/.test(s),p+' missing title');
 assert(/^description: .+/m.test(s),p+' missing description');
 for(const m of s.matchAll(/\]\((\/[^)#\s]*)\)/g)) assert(routes.has(m[1].replace(/^\/khoahoctienghan(?=\/)/, '')),p+' broken link '+m[1]);
}
 return paths.length;
}
export function validateSidebar(config){assert(!/label:[^\n]+,\s*autogenerate:/.test(config),'Legacy Starlight sidebar group: wrap autogenerate in items');}
export function validateTechPosts(techPosts){
assert(!techPosts.some(post=>post.slug==='editorv2'),'Reserved route /techblog/editorv2/ cannot be used for an article');
for(const post of techPosts)for(const section of post.sections){if(section.visuals!==undefined){assert(Array.isArray(section.visuals),post.slug+' invalid visuals');for(const v of section.visuals)validateVisual(v);}}
}
export {validateKnowledgeVisuals};
export function validateStudioReferences(knowledgePages,studioDocs){
const studioRefs=new Set();
for(const p of knowledgePages)for(const m of p.content.matchAll(/<KnowledgeStudioDocument\b[^>]*>/g)){
 const exact=/^<KnowledgeStudioDocument id="([a-z0-9-]+)"\s*\/>$/.exec(m[0]);assert(exact&&p.path.endsWith('.mdx')&&Object.hasOwn(studioDocs,exact[1])&&!studioRefs.has(exact[1]),'Invalid studio document reference');studioRefs.add(exact[1]);
}
 return studioRefs;
}
export function assertUsedStudioDocument(studioRefs,id){assert(studioRefs.has(id),'Unused studio document');}
export function validateArticleMetadata(kbMetadata,techPosts,studioRefs){
assert(kbMetadata&&typeof kbMetadata==='object'&&!Array.isArray(kbMetadata),'Invalid studio metadata index');
for(const [id,value] of Object.entries(kbMetadata)){
 assert(studioRefs.has(id),'Orphan KB metadata: '+id);
 assert.deepEqual(value,normalizeKnowledgeMetadata(value),'Noncanonical KB metadata: '+id);
}
for(const post of techPosts){
 const canonical=normalizeMetadata(post);
 if(post.labels!==undefined)assert.deepEqual(post.labels,canonical.labels,'Invalid labels: '+post.slug);
 if(post.series!==undefined)assert.deepEqual(post.series,canonical.series,'Invalid series: '+post.slug);
}
}
