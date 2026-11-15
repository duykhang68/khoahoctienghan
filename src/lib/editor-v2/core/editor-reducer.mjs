import {kinds} from './blocks.mjs';
export const validDraft=saved=>saved&&Array.isArray(saved.blocks)&&saved.blocks.every(b=>kinds.includes(b.kind));
export function selectWorkspace(requested,remembered,legacy,workspaces){
 if(Object.hasOwn(workspaces,requested))return requested;
 if(Object.hasOwn(workspaces,remembered))return remembered;
 if(validDraft(legacy)&&Object.hasOwn(workspaces,legacy.kind))return legacy.kind;
 return 'tech';
}
export function moveBlock(blocks,index,offset){
 const j=index+offset;
 if(j<0||j>=blocks.length)return blocks;
 const next=blocks.slice();[next[index],next[j]]=[next[j],next[index]];return next;
}
export function readingMinutes(blocks){
 return Math.max(1,Math.ceil(blocks.map(b=>b.text||'').join(' ').trim().split(/\s+/).length/200));
}
