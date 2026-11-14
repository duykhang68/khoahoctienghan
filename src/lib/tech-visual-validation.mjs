import assert from 'node:assert/strict';
const kinds=new Set(['swatches','buttons','type','spacing','wireframe','table','flow','bars','code']);
const str=s=>typeof s==='string'&&s.trim().length>0;
const hex=s=>typeof s==='string'&&/^#[0-9a-f]{6}$/i.test(s);
export function validateVisual(v){
 assert(v&&kinds.has(v.kind)&&str(v.caption),'Invalid visual kind/caption');
 if(v.variant!==undefined)assert((v.kind==='bars'&&v.variant==='summary')||(v.kind==='flow'&&v.variant==='cycle'),'Invalid visual variant');
 if(v.variant==='cycle')assert(v.items?.length===5,'Cycle requires five stages');
 if(v.variant==='summary')assert(v.items?.length>=2&&v.items.length<=5,'Summary requires 2–5 metrics');
 if(v.kind==='wireframe'){assert(['listing','article','responsive'].includes(v.layout),'Unknown wireframe');return;}
 if(v.kind==='code'){assert(str(v.code)&&str(v.language),'Code requires language and content');return;}
 if(v.kind==='table'){assert(Array.isArray(v.columns)&&v.columns.length>0&&v.columns.every(str)&&Array.isArray(v.rows)&&v.rows.length&&v.rows.every(r=>Array.isArray(r)&&r.length===v.columns.length&&r.every(str)),'Invalid table');return;}
 assert(Array.isArray(v.items)&&v.items.length>0&&v.items.length<=50&&v.items.every(i=>i&&str(i.label)),'Invalid visual items');
 for(const i of v.items){
 if(v.kind==='swatches'||v.kind==='buttons')assert(hex(i.color),'Invalid HEX');
 if(v.kind==='buttons')assert(hex(i.foreground)&&hex(i.hover)&&str(i.value),'Invalid button state');
 if(v.kind==='type'||v.kind==='spacing')assert(Number.isInteger(i.size)&&i.size>0&&i.size<=(v.kind==='type'?80:160),'Invalid size');
 if(v.kind==='type')assert(Number.isInteger(i.weight)&&i.weight>=100&&i.weight<=900,'Invalid weight');
 if(v.kind==='bars')assert(str(i.value)&&Number.isFinite(Number(i.value))&&Number(i.value)>=0,'Invalid bar value');
 }
 if(v.kind==='bars')assert(str(v.unit)&&str(v.source),'Bars require units and source');
 if(v.variant==='summary')assert(v.items.reduce((sum,i)=>sum+Number(i.value),0)>0&&v.items.every(i=>hex(i.color)),'Summary requires positive total and colors');
}
