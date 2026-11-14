// Browser-native projection of the public Astro content contract; no V1 runtime.
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
export const kinds=['paragraph','heading','subheading','quote','bullet','ordered','code','note','table','image','divider'];
export const newBlock=kind=>({id:crypto.randomUUID(),kind,text:'',...(kind==='table'?{rows:[['Tiêu đề 1','Tiêu đề 2'],['','']]}:{}),...(kind==='note'?{tone:'info'}:{}),...(kind==='image'?{alt:'',src:'',width:0,height:0}:{}),marks:[]});
export async function buildDocument(blocks){
 requireValue(Array.isArray(blocks)&&blocks.length<=250,'Tối đa 250 khối mỗi bài.');
 const nodes=[],assets=new Map();let size=0;
 for(const b of blocks){
  requireValue(kinds.includes(b.kind),'Khối không hỗ trợ.');
  const text=String(b.text||'');size+=text.length;
  const marks=(Array.isArray(b.marks)?b.marks:[]).filter(x=>['bold','italic','underline','strike'].includes(x));
  requireValue(text.length<=50000,'Khối quá dài.');
  if(b.kind==='image'){
   requireValue(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(b.src||'')&&b.src.length<=2_000_030&&validText(b.alt,500)&&Number.isInteger(b.width)&&Number.isInteger(b.height)&&b.width>0&&b.height>0&&b.width<=1600&&b.height<=1600,'Ảnh cần WebP hợp lệ và mô tả.');
   const encoded=b.src.split(',')[1],bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
   requireValue(bytes.length<=1500000&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP','Ảnh không phải WebP.');
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
   const src='/media/studio/'+digest+'.webp';assets.set('public'+src,encoded);
   nodes.push({type:'image',attrs:{src,alt:b.alt.trim(),width:b.width,height:b.height}});continue;
  }
  if(b.kind==='divider'){nodes.push({type:'horizontalRule'});continue}
  if(b.kind==='table'){
   requireValue(Array.isArray(b.rows)&&b.rows.length>=2&&b.rows.length<=20&&b.rows[0].length>=2&&b.rows[0].length<=8&&b.rows.every(row=>Array.isArray(row)&&row.length===b.rows[0].length&&row.every(v=>typeof v==='string'&&v.length<=2000)),'Bảng không hợp lệ.');
   size+=b.rows.flat().join('').length;
   nodes.push({type:'table',content:b.rows.map((row,i)=>({type:'tableRow',content:row.map(cell=>({type:i?'tableCell':'tableHeader',content:[paragraph(cell)]}))}))});continue;
  }
  if(!text.trim())continue;
  if(b.kind==='heading'||b.kind==='subheading')nodes.push({type:'heading',attrs:{level:b.kind==='heading'?2:3},content:inline(text)});
  else if(b.kind==='quote')nodes.push({type:'blockquote',content:[paragraph(text,marks)]});
  else if(b.kind==='note')nodes.push({type:'hdNote',attrs:{kind:['info','tip','warning'].includes(b.tone)?b.tone:'info'},content:[paragraph(text,marks)]});
  else if(b.kind==='code')nodes.push({type:'codeBlock',content:[textNode(text)]});
  else if(b.kind==='bullet'||b.kind==='ordered')nodes.push({type:b.kind==='bullet'?'bulletList':'orderedList',...(b.kind==='ordered'?{attrs:{start:1}}:{}),content:text.split('\n').filter(s=>s.trim()).map(s=>({type:'listItem',content:[paragraph(s,marks)]}))});
  else nodes.push(paragraph(text,marks));
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
