import assert from 'node:assert/strict';
import {validateVisual} from './tech-visual-validation.mjs';
const idPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validateKnowledgeVisuals(records,pages){
 assert(records&&typeof records==='object'&&!Array.isArray(records),'Expected a knowledge visual catalogue');
 const used=new Set();let count=0;
 for(const [id,visual] of Object.entries(records)){
  assert(idPattern.test(id),'Invalid knowledge visual ID: '+id);
  validateVisual(visual);
  if(visual.variant==='cycle')assert(visual.centerLabel,'Knowledge cycle needs local center labels: '+id);
 }
 for(const {path,content} of pages){
  // Canonical component usage is self-closing, with a single literal ID.
  for(const match of content.matchAll(/<KnowledgeVisual\b[^>]*>/g)){
   const exact=/^<KnowledgeVisual\s+id="([a-z0-9]+(?:-[a-z0-9]+)*)"\s*\/>$/.exec(match[0]);
   assert(exact,path+' requires a literal KnowledgeVisual ID and no other props');
   assert(path.endsWith('.mdx'),path+' must be MDX to render KnowledgeVisual');
   assert(Object.hasOwn(records,exact[1]),path+' unknown KnowledgeVisual: '+exact[1]);
   used.add(exact[1]);count++;
  }
 }
 for(const id of Object.keys(records))assert(used.has(id),'Unused knowledge visual: '+id);
 return count;
}
