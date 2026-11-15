import {requireValue} from './contracts.mjs';
/** @typedef {Readonly<{text:string,marks:readonly string[]}>} InlineRun */
// Canonical inline runs: plain text plus an allowlisted set of marks. No HTML is stored.
export const richKinds=Object.freeze(['paragraph','quote','note','bullet','ordered']);
export const inlineMarks=Object.freeze(['bold','italic','underline','strike']);
const cleanMarks=marks=>inlineMarks.filter(m=>Array.isArray(marks)&&marks.includes(m));
export function mergeRuns(parts){const result=[];for(const p of parts){if(!p.text)continue;const marks=cleanMarks(p.marks),last=result.at(-1);if(last&&last.marks.join()===marks.join())last.text+=p.text;else result.push({text:p.text,marks});}return result;}
export function inlineRuns(block){
 const text=String(block.text||'');
 if(block.runs===undefined)return text?[{text,marks:cleanMarks(block.marks)}]:[];
 requireValue(richKinds.includes(block.kind)&&Array.isArray(block.runs)&&block.runs.length<=2000,'Định dạng nội tuyến không hợp lệ.');
 for(const p of block.runs)requireValue(p&&typeof p.text==='string'&&p.text.length<=50000&&Array.isArray(p.marks)&&p.marks.every(m=>inlineMarks.includes(m)),'Định dạng nội tuyến không hợp lệ.');
 requireValue(block.runs.map(p=>p.text).join('')===text,'Nội dung định dạng không khớp văn bản.');
 return mergeRuns(block.runs);
}
export function toggleInline(runs,start,end,mark){
 if(!inlineMarks.includes(mark)||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>runs.map(p=>p.text).join('').length)return runs;
 let offset=0;const selected=runs.filter(p=>{const from=offset;offset+=p.text.length;return from<end&&offset>start;});
 const remove=selected.every(p=>p.marks.includes(mark));offset=0;
 const out=[];for(const p of runs){const a=Math.max(0,Math.min(p.text.length,start-offset)),z=Math.max(a,Math.min(p.text.length,end-offset));out.push({text:p.text.slice(0,a),marks:p.marks},{text:p.text.slice(a,z),marks:remove?p.marks.filter(m=>m!==mark):[...p.marks,mark]},{text:p.text.slice(z),marks:p.marks});offset+=p.text.length;}
 const normalized=mergeRuns(out);requireValue(normalized.length<=2000,'Tối đa 2000 đoạn định dạng mỗi khối.');return normalized;
}
export function richLines(runs){const lines=[[]];for(const p of runs){p.text.split('\n').forEach((text,i)=>{if(i)lines.push([]);if(text)lines.at(-1).push({text,marks:p.marks});});}return lines;}
