import {newBlock,buildDocument,inlineRuns} from './model.mjs';
import {githubClient} from './github.mjs';
const repo='/repos/duykhang68/khoahoctienghan',raw='https://raw.githubusercontent.com/duykhang68/khoahoctienghan/';
const validSha=s=>/^[a-f0-9]{40}$/.test(s||'');
const routePattern=/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const requireValue=(ok,msg)=>{if(!ok)throw Error(msg)};
const equal=(a,b)=>{const sort=v=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;return JSON.stringify(sort(a))===JSON.stringify(sort(b))};
const textBlock=(kind,text)=>({...newBlock(kind),text});
const textRuns=nodes=>{const runs=[];for(const n of nodes||[]){if(n.type==='hardBreak')runs.push({text:'\n',marks:[]});else{requireValue(n.type==='text'&&typeof n.text==='string'&&(n.marks||[]).every(m=>['bold','italic','underline','strike'].includes(m.type)&&Object.keys(m).length===1),'Khối có định dạng chưa hỗ trợ.');runs.push({text:n.text,marks:(n.marks||[]).map(m=>m.type)});}}return runs};
const plain=nodes=>{const runs=textRuns(nodes);requireValue(runs.every(r=>!r.marks.length),'Khối có định dạng chưa hỗ trợ.');return runs.map(r=>r.text).join('')};
const rich=(kind,nodes)=>{const runs=textRuns(nodes);return {...textBlock(kind,runs.map(r=>r.text).join('')),runs}};
async function readBlocks(doc){
 requireValue(doc?.type==='doc'&&Array.isArray(doc.content),'Thiếu tài liệu Studio.');
 const blocks=doc.content.map(n=>{
  if(n.type==='paragraph')return rich('paragraph',n.content);
  if(n.type==='heading'){const kind={2:'heading',3:'subheading',4:'detailheading'}[n.attrs?.level];requireValue(kind,'Cấp tiêu đề chưa hỗ trợ.');return textBlock(kind,plain(n.content))}
  if(n.type==='codeBlock')return textBlock('code',plain(n.content));
  if(n.type==='horizontalRule')return newBlock('divider');
  if(n.type==='blockquote'||n.type==='hdNote'){requireValue(n.content?.length===1&&n.content[0].type==='paragraph','Khối trích dẫn phức tạp chưa hỗ trợ.');const b=rich(n.type==='blockquote'?'quote':'note',n.content[0].content);if(n.type==='hdNote')b.tone=n.attrs?.kind;return b}
  if(n.type==='bulletList'||n.type==='orderedList'){const runs=[];for(const [i,item] of (n.content||[]).entries()){requireValue(item.type==='listItem'&&item.content?.length===1&&item.content[0].type==='paragraph','Danh sách lồng chưa hỗ trợ.');if(i)runs.push({text:'\n',marks:[]});runs.push(...textRuns(item.content[0].content));}return {...textBlock(n.type==='bulletList'?'bullet':'ordered',runs.map(x=>x.text).join('')),runs}}
  if(n.type==='table'){const rows=n.content.map(row=>row.content.map(cell=>{requireValue(cell.content?.length===1&&cell.content[0].type==='paragraph','Ô bảng phức tạp chưa hỗ trợ.');return plain(cell.content[0].content)}));return {...newBlock('table'),rows}}
  throw Error('Bài có khối hình ảnh hoặc minh họa chưa hỗ trợ nhập an toàn. Dùng Quản lý bài để giữ nguyên nội dung.');
 });
 requireValue(equal((await buildDocument(blocks)).body,doc),'Không thể chuyển đổi nguyên vẹn bài này. Dùng Quản lý bài.');
 return blocks;
}
function frontField(s,key){const f=s.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);requireValue(f,'Metadata không hỗ trợ.');const m=f[1].match(new RegExp('^'+key+':[ \\t]*(.*)$','m'));if(!m)return '';const v=m[1].trim();requireValue(!/^[>|]/.test(v),'Metadata nhiều dòng chưa hỗ trợ.');if(v.startsWith('"'))return JSON.parse(v);if(v.startsWith("'")&&v.endsWith("'"))return v.slice(1,-1).replace(/''/g,"'");return v}
function setFront(s,key,value){frontField(s,key);const f=s.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/),rule=new RegExp('^'+key+':[ \\t]*.*$','m');return s.replace(f[0],()=>f[0].replace(f[1],()=>rule.test(f[1])?f[1].replace(rule,()=>key+': '+JSON.stringify(value)):f[1]+'\n'+key+': '+JSON.stringify(value)))}
const json=v=>JSON.stringify(v,null,2)+'\n';
const walk=n=>n.type==='text'?n.text:(n.content||[]).map(walk).join(' ');
export async function loadRevision(route,fetcher=fetch){
 requireValue(routePattern.test(route),'URL bài viết không hợp lệ.');
 const requestText=async url=>{const response=await fetcher(url,{redirect:'error',cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(20000)});requireValue(response.ok,'Không tải được snapshot bài viết.');return response.text()};
 const snapshot=JSON.parse(await requestText('/admin/api/library/'));requireValue(validSha(snapshot.sha)&&Array.isArray(snapshot.rows),'Snapshot không hợp lệ.');
 const row=snapshot.rows.find(x=>x.category+'/'+x.slug===route);requireValue(row,'Bài không có trong bản phát hành.');
 const read=path=>requestText(raw+snapshot.sha+'/'+path),state={};let blocks,title,summary,extra,fixed=false;
 if(row.kind==='tech'){
  requireValue(row.category==='techblog'&&row.path==='src/data/techblog/posts.json','Nguồn bài không hợp lệ.');
  state.posts=JSON.parse(await read(row.path));const post=state.posts.find(p=>p.slug===row.slug);requireValue(post,'Không tìm thấy bài.');title=post.title;summary=post.summary||'';extra=post;
  if(post.studioBody)blocks=await readBlocks(post.studioBody);
  else{fixed=true;requireValue(Array.isArray(post.sections)&&post.sections.length,'Bài chưa hỗ trợ.');blocks=post.sections.flatMap(sec=>{requireValue(typeof sec.heading==='string'&&Array.isArray(sec.paragraphs)&&sec.paragraphs.every(x=>typeof x==='string'),'Bố cục cũ chưa hỗ trợ.');return [textBlock('heading',sec.heading),...sec.paragraphs.map(p=>textBlock('paragraph',p))]});}
 }else{
  requireValue(row.kind==='knowledge'&&['md','mdx'].some(ext=>row.path==='src/content/docs/'+route+'.'+ext),'Nguồn bài không hợp lệ.');
  state.source=await read(row.path);state.id=row.category+'--'+row.slug;requireValue(state.source.includes('<KnowledgeStudioDocument id="'+state.id+'" />'),'Bài Markdown/MDX cũ: chưa hỗ trợ sửa thân bài bằng Visual Editor. Dùng Quản lý bài để chỉnh metadata an toàn.');
  state.indexPath='src/content/docs/'+row.category+'/index.md';const [documents,meta,index]=await Promise.all([read('src/data/studio-documents.json'),read('src/data/studio-metadata.json'),read(state.indexPath)]);state.documents=JSON.parse(documents);extra=JSON.parse(meta)[state.id]||{};state.index=index;title=frontField(state.source,'title');summary=frontField(state.source,'description');blocks=await readBlocks(state.documents[state.id]);
 }
 requireValue(blocks.length>0&&blocks.length<=250,'Số khối chưa hỗ trợ.');
 const series=extra.series||{},draft={kind:row.kind,category:row.kind==='tech'?'ngon-ngu':row.category,title,summary,labels:(extra.labels||[]).join(', '),series:{enabled:!!extra.series,name:series.name||'',part:series.part||1,total_parts:series.total_parts||1,target_date:series.target_date||''},blocks};
 const original=structuredClone(draft);
 async function plan(edited){
  requireValue(edited.kind===original.kind&&edited.category===original.category,'Không được đổi đích bài cũ.');
  const title=edited.title.trim(),summary=edited.summary.trim();requireValue(title&&title.length<=180&&summary.length<=500&&!/[\u0000-\u001f\u007f]/.test(title+summary),'Tiêu đề hoặc mô tả không hợp lệ.');
  const files=[],write=(path,value)=>files.push({path,mode:'100644',type:'blob',content:value});
  let body,assets=new Map();
  if(fixed){requireValue(edited.blocks.length===original.blocks.length&&edited.blocks.every((b,i)=>b.kind===original.blocks[i].kind&&b.id===original.blocks[i].id&&b.text.trim()&&b.text.length<=50000&&inlineRuns(b).every(x=>!x.marks.length)),'Bài cũ chỉ được sửa chữ trong bố cục gốc.');}
  else ({body,assets}=await buildDocument(edited.blocks));
  if(row.kind==='tech'){
   const posts=structuredClone(state.posts),post=posts.find(x=>x.slug===row.slug);post.title=title;post.summary=summary;
   if(fixed){let i=0;for(const sec of post.sections){sec.heading=edited.blocks[i++].text;sec.paragraphs=sec.paragraphs.map(()=>edited.blocks[i++].text)}}
   else{post.studioBody=body;post.sections=[{heading:'Nội dung',paragraphs:[walk(body)]}]}
   write(row.path,json(posts));
  }else{
   const documents=structuredClone(state.documents);documents[state.id]=body;
   const suffix='](/khoahoctienghan/'+route+'/)',label=title.replace(/[\\[\]<>*_\x60{}&]/g,c=>'&#'+c.charCodeAt(0)+';');let matches=0;
   const index=state.index.split('\n').map(line=>{if(!line.trimEnd().endsWith(suffix))return line;requireValue(/^\s*-\s+\[/.test(line),'Liên kết chuyên mục không hỗ trợ.');matches++;return '- ['+label+suffix}).join('\n');
   requireValue(matches===1,'Cần đúng một liên kết chuyên mục.');
   write(row.path,setFront(setFront(state.source,'title',title),'description',summary));write(state.indexPath,index);write('src/data/studio-documents.json',json(documents));
  }
  return {files,assets};
 }
 return {draft,route,slug:row.slug,fixed,sha:snapshot.sha,connect(token){
  const auth=githubClient(token,fetcher);
  const request=async(path,method='GET',body)=>{const res=await fetcher('https://api.github.com'+path,{method,redirect:'error',cache:'no-store',credentials:'omit',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});requireValue(res.ok,'GitHub HTTP '+res.status);return res.json()};
  return {verify:auth.verify,async revise(edited){
   await auth.verify();const main=async()=>(await request(repo+'/git/ref/heads/main')).object.sha;requireValue(await main()===snapshot.sha,'Phiên bản main đã đổi. Mở lại bài từ thư viện.');
   const {files,assets}=await plan(edited),base=await request(repo+'/git/commits/'+snapshot.sha);requireValue(await main()===snapshot.sha,'Main vừa đổi. Không gửi thay đổi.');
   for(const [path,binary] of assets){const blob=await request(repo+'/git/blobs','POST',{content:binary,encoding:'base64'});files.push({path,mode:'100644',type:'blob',sha:blob.sha})}
   const tree=await request(repo+'/git/trees','POST',{base_tree:base.tree.sha,tree:files});
   const commit=await request(repo+'/git/commits','POST',{message:'content(library): edit '+route,tree:tree.sha,parents:[snapshot.sha]});
   requireValue(await main()===snapshot.sha,'Main vừa đổi. Không tạo nhánh.');
   const branch='review/library-edit-'+row.slug.slice(0,60)+'-'+crypto.randomUUID().slice(0,12);await request(repo+'/git/refs','POST',{ref:'refs/heads/'+branch,sha:commit.sha});
   const pr=await request(repo+'/pulls','POST',{title:'content(library): edit '+row.slug,head:branch,base:'main',draft:true,body:'Visual Editor revision of '+route+' at '+snapshot.sha+'. No automatic merge; review diff and CI.'});
   const url=new URL(pr.html_url);requireValue(url.origin==='https://github.com'&&/^\/duykhang68\/khoahoctienghan\/pull\/\d+$/.test(url.pathname),'Kiểm tra PR trên GitHub.');return {url:url.href,number:pr.number};
  }};
 }};
}
