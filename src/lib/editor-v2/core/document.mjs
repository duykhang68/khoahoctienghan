import {requireValue} from './contracts.mjs';
import {kinds} from './blocks.mjs';
import {richKinds,inlineRuns,richLines} from './rich-text.mjs';
const textNode=(text,marks=[])=>{const node={type:'text',text};if(marks.length)node.marks=marks.map(type=>({type}));return node};
export const inline=(text,marks=[])=>String(text).split('\n').flatMap((line,i)=>[...(i?[{type:'hardBreak'}]:[]),...(line?[textNode(line,marks)]:[])]);
const paragraph=(text,marks=[])=>({type:'paragraph',content:inline(text,marks)});
const richNodes=runs=>richLines(runs).flatMap((line,i)=>[...(i?[{type:'hardBreak'}]:[]),...line.map(p=>textNode(p.text,p.marks))]);
/** @typedef {Readonly<{kind:string,text?:string,marks?:readonly string[],runs?:readonly object[],rows?:readonly (readonly string[])[]}>} EditorialBlock */
export function inspectBlock(b){
 requireValue(kinds.includes(b.kind),'Khối không hỗ trợ.');
 const text=String(b.text||'');
 const runs=richKinds.includes(b.kind)?inlineRuns(b):null;
 requireValue(text.length<=50000,'Khối quá dài.');
 return {text,runs};
}
export function projectTextBlock(b,{text,runs}){
 let node;
 const richParagraph=()=>({type:'paragraph',content:richNodes(runs)});
  if(b.kind==='divider')return {node:{type:'horizontalRule'},extraSize:0};
  if(b.kind==='table'){
   requireValue(Array.isArray(b.rows)&&b.rows.length>=2&&b.rows.length<=20&&b.rows[0].length>=2&&b.rows[0].length<=8&&b.rows.every(row=>Array.isArray(row)&&row.length===b.rows[0].length&&row.every(v=>typeof v==='string'&&v.length<=2000)),'Bảng không hợp lệ.');
   return {node:{type:'table',content:b.rows.map((row,i)=>({type:'tableRow',content:row.map(cell=>({type:i?'tableCell':'tableHeader',content:[paragraph(cell)]}))}))},extraSize:b.rows.flat().join('').length};
  }
  if(!text.trim())return {node:null,extraSize:0};
  if(['heading','subheading','detailheading'].includes(b.kind))node=({type:'heading',attrs:{level:{heading:2,subheading:3,detailheading:4}[b.kind]},content:inline(text)});
  else if(b.kind==='quote')node=({type:'blockquote',content:[richParagraph()]});
  else if(b.kind==='note')node=({type:'hdNote',attrs:{kind:['info','tip','warning'].includes(b.tone)?b.tone:'info'},content:[richParagraph()]});
  else if(b.kind==='code')node=({type:'codeBlock',content:[textNode(text)]});
  else if(b.kind==='bullet'||b.kind==='ordered')node=({type:b.kind==='bullet'?'bulletList':'orderedList',...(b.kind==='ordered'?{attrs:{start:1}}:{}),content:richLines(runs).filter(line=>line.map(p=>p.text).join('').trim()).map(line=>({type:'listItem',content:[{type:'paragraph',content:richNodes(line)}]}))});
  else node=(richParagraph());
 return {node,extraSize:0};
}
export function projectMediaBlock(b,digest,source){
 const src='/media/studio/'+digest+'.webp';
 const image={type:'image',attrs:{src,alt:b.alt.trim(),width:b.width,height:b.height}};
 if(b.kind!=='diagram')return image;
 const caption=String(b.caption||'').trim();
 requireValue(caption.length<=1000,'Chú thích sơ đồ tối đa 1000 ký tự.');
 return caption?{type:'articleFigure',content:[image,{type:'articleCaption',content:inline(caption)}]}:image;
}
export function finishDocument(nodes,size){
 requireValue(size<=200000&&nodes.length>0&&nodes.some(n=>n.type!=='horizontalRule'),'Bài viết trống hoặc quá dài.');
 return {type:'doc',content:nodes};
}
export const docText=n=>n.type==='text'?n.text:(n.content||[]).map(docText).join(' ');
