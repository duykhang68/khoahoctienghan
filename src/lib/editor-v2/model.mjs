// Browser-native projection of the public Astro content contract; no V1 runtime.
import {drawioPath} from './drawio-source.mjs';
const requireValue=(ok,message)=>{if(!ok)throw Error(message)};
export const slugify=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80).replace(/-+$/,'');
const textNode=(text,marks=[])=>{const node={type:'text',text};if(marks.length)node.marks=marks.map(type=>({type}));return node};
const inline=(text,marks=[])=>String(text).split('\n').flatMap((line,i)=>[...(i?[{type:'hardBreak'}]:[]),...(line?[textNode(line,marks)]:[])]);
const paragraph=(text,marks=[])=>({type:'paragraph',content:inline(text,marks)});
const validText=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max&&!/[\u0000-\u001f\u007f]/u.test(v);
export function metadata(draft){
 const labels=String(draft.labels||'').split(',').map(s=>s.trim().normalize('NFC')).filter(Boolean);
 requireValue(labels.length<=40&&labels.every(v=>validText(v,120)),'Tối đa 40 nhãn, 120 ký tự mỗi nhãn.');
 const value={labels:[...new Set(labels)]};
 if(draft.series?.enabled){
  const {name,target_date=''}=draft.series,part=Number(draft.series.part),total_parts=Number(draft.series.total_parts);
  requireValue(validText(name,180)&&Number.isInteger(part)&&Number.isInteger(total_parts)&&part>=1&&part<=total_parts&&total_parts<=9999,'Kiểm tra tên và số tập Series.');
  requireValue(!target_date||(/^\d{4}-\d{2}-\d{2}$/.test(target_date)&&Number.isFinite(Date.parse(target_date+'T00:00:00Z'))&&new Date(target_date+'T00:00:00Z').toISOString().slice(0,10)===target_date),'Ngày Series không hợp lệ.');
  value.series={name:name.trim().normalize('NFC'),part,total_parts,target_date,status:part===total_parts?'completed':'in_progress'};
 }
 return value;
}
// Canonical inline runs: plain text plus an allowlisted set of marks. No HTML is stored.
export const richKinds=['paragraph','quote','note','bullet','ordered'];
export const inlineMarks=['bold','italic','underline','strike'];
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
const richNodes=runs=>richLines(runs).flatMap((line,i)=>[...(i?[{type:'hardBreak'}]:[]),...line.map(p=>textNode(p.text,p.marks))]);
export const kinds=['paragraph','heading','subheading','detailheading','quote','bullet','ordered','code','note','table','image','diagram','divider'];
export const newBlock=kind=>({id:crypto.randomUUID(),kind,text:'',...(kind==='table'?{rows:[['Tiêu đề 1','Tiêu đề 2'],['','']]}:{}),...(kind==='note'?{tone:'info'}:{}),...(['image','diagram'].includes(kind)?{alt:'',src:'',width:0,height:0}:{}),...(kind==='diagram'?{drawioXml:'',caption:''}:{}),marks:[]});
export async function buildDocument(blocks){
 requireValue(Array.isArray(blocks)&&blocks.length<=250,'Tối đa 250 khối mỗi bài.');
 const nodes=[],assets=new Map();let size=0;
 for(const b of blocks){
  requireValue(kinds.includes(b.kind),'Khối không hỗ trợ.');
  const text=String(b.text||'');size+=text.length;
  const runs=richKinds.includes(b.kind)?inlineRuns(b):null;
  const richParagraph=()=>({type:'paragraph',content:richNodes(runs)});
  requireValue(text.length<=50000,'Khối quá dài.');
  if(b.kind==='image'||b.kind==='diagram'){
   requireValue(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(b.src||'')&&b.src.length<=2_000_030&&validText(b.alt,500)&&Number.isInteger(b.width)&&Number.isInteger(b.height)&&b.width>0&&b.height>0&&b.width<=1600&&b.height<=1600,'Ảnh cần WebP hợp lệ và mô tả.');
   const encoded=b.src.split(',')[1],bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
   requireValue(bytes.length<=1500000&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP','Ảnh không phải WebP.');
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
   const src='/media/studio/'+digest+'.webp';assets.set('public'+src,encoded);
   const image={type:'image',attrs:{src,alt:b.alt.trim(),width:b.width,height:b.height}};
   if(b.kind==='diagram'){
    const source=await drawioPath(digest,b.drawioXml);assets.set(source.path,source.binary);
    const caption=String(b.caption||'').trim();requireValue(caption.length<=1000,'Chú thích sơ đồ tối đa 1000 ký tự.');
    nodes.push(caption?{type:'articleFigure',content:[image,{type:'articleCaption',content:inline(caption)}]}:image);
   }else nodes.push(image);
   continue;
  }
  if(b.kind==='divider'){nodes.push({type:'horizontalRule'});continue}
  if(b.kind==='table'){
   requireValue(Array.isArray(b.rows)&&b.rows.length>=2&&b.rows.length<=20&&b.rows[0].length>=2&&b.rows[0].length<=8&&b.rows.every(row=>Array.isArray(row)&&row.length===b.rows[0].length&&row.every(v=>typeof v==='string'&&v.length<=2000)),'Bảng không hợp lệ.');
   size+=b.rows.flat().join('').length;
   nodes.push({type:'table',content:b.rows.map((row,i)=>({type:'tableRow',content:row.map(cell=>({type:i?'tableCell':'tableHeader',content:[paragraph(cell)]}))}))});continue;
  }
  if(!text.trim())continue;
  if(['heading','subheading','detailheading'].includes(b.kind))nodes.push({type:'heading',attrs:{level:{heading:2,subheading:3,detailheading:4}[b.kind]},content:inline(text)});
  else if(b.kind==='quote')nodes.push({type:'blockquote',content:[richParagraph()]});
  else if(b.kind==='note')nodes.push({type:'hdNote',attrs:{kind:['info','tip','warning'].includes(b.tone)?b.tone:'info'},content:[richParagraph()]});
  else if(b.kind==='code')nodes.push({type:'codeBlock',content:[textNode(text)]});
  else if(b.kind==='bullet'||b.kind==='ordered')nodes.push({type:b.kind==='bullet'?'bulletList':'orderedList',...(b.kind==='ordered'?{attrs:{start:1}}:{}),content:richLines(runs).filter(line=>line.map(p=>p.text).join('').trim()).map(line=>({type:'listItem',content:[{type:'paragraph',content:richNodes(line)}]}))});
  else nodes.push(richParagraph());
 }
 requireValue(size<=200000&&nodes.length>0&&nodes.some(n=>n.type!=='horizontalRule'),'Bài viết trống hoặc quá dài.');
 return {body:{type:'doc',content:nodes},assets};
}
const docText=n=>n.type==='text'?n.text:(n.content||[]).map(docText).join(' ');
export async function prepareV2(draft,snapshot,topicIds,now=new Date()){
 const title=String(draft.title||'').trim(),summary=String(draft.summary||'').trim()||title,slug=slugify(title);
 requireValue(validText(title,180)&&summary.length<=500&&slug&&slug!=='index'&&slug!=='editorv2','Tiêu đề, mô tả hoặc URL không hợp lệ.');
 requireValue(['tech','knowledge'].includes(draft.kind),'Nơi xuất bản không hợp lệ.');
 const date=new Date(now.getTime()+7*3600000).toISOString().slice(0,19)+'+07:00';
 const extra=metadata(draft),{body,assets}=await buildDocument(draft.blocks);
 const paths=new Set(snapshot.paths),changes=new Map();
 for(const [path,binary] of assets)if(!paths.has(path))changes.set(path,{binary});
 let route;
 if(draft.kind==='tech'){
  requireValue(!snapshot.posts.some(p=>p.slug===slug),'URL đã tồn tại.');
  route='techblog/'+slug+'/';
  const post={slug,title,summary,date,sections:[{heading:'Nội dung',paragraphs:[docText(body)]}],issues:[],studioBody:body,...extra};
  changes.set('src/data/techblog/posts.json',{text:JSON.stringify([...snapshot.posts,post],null,2)+'\n'});
 }else{
  const category=draft.category;requireValue(topicIds.includes(category),'Chuyên mục không hợp lệ.');
  const stem='src/content/docs/'+category+'/'+slug,id=category+'--'+slug,index='src/content/docs/'+category+'/index.md';
  requireValue(!paths.has(stem+'.md')&&!paths.has(stem+'.mdx')&&!Object.hasOwn(snapshot.documents,id)&&!Object.hasOwn(snapshot.metadata,id),'URL đã tồn tại.');
  requireValue(paths.has(index)&&typeof snapshot.categorySource==='string','Thiếu trang chuyên mục.');
  route=category+'/'+slug+'/';
  changes.set(stem+'.mdx',{text:'---\ntitle: '+JSON.stringify(title)+'\ndescription: '+JSON.stringify(summary)+'\n---\n\nimport KnowledgeStudioDocument from "../../../components/KnowledgeStudioDocument.astro";\n\n<KnowledgeStudioDocument id="'+id+'" />\n'});
  changes.set('src/data/studio-documents.json',{text:JSON.stringify({...snapshot.documents,[id]:body},null,2)+'\n'});
  changes.set('src/data/studio-metadata.json',{text:JSON.stringify({...snapshot.metadata,[id]:{...extra,date}},null,2)+'\n'});
  const label=title.replace(/[\\[\]<>*_\x60{}&]/g,c=>'&#'+c.charCodeAt(0)+';');
  changes.set(index,{text:snapshot.categorySource.trimEnd()+'\n\n- ['+label+'](/khoahoctienghan/'+route+')\n'});
 }
 return {route,changes};
}
