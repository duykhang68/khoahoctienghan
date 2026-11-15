import {newBlock,buildDocument} from './model.mjs';
import {githubClient} from './github.mjs';
const repo='/repos/duykhang68/khoahoctienghan',raw='https://raw.githubusercontent.com/duykhang68/khoahoctienghan/';
const validSha=s=>/^[a-f0-9]{40}$/.test(s||'');
const routePattern=/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const requireValue=(ok,msg)=>{if(!ok)throw Error(msg)};
import {equal,parseRevisionBlocks,frontField} from './core/revision-parser.mjs';
import {revisionInputs,planRevision} from './core/revision-plan.mjs';
const textBlock=(kind,text)=>({...newBlock(kind),text});
async function readBlocks(doc){
 requireValue(doc?.type==='doc'&&Array.isArray(doc.content),'Thiếu tài liệu Studio.');
 const blocks=parseRevisionBlocks(doc,doc.content.map(()=>crypto.randomUUID()));
 requireValue(equal((await buildDocument(blocks)).body,doc),'Không thể chuyển đổi nguyên vẹn bài này. Dùng Quản lý bài.');
 return blocks;
}
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
  const {title,summary}=revisionInputs(edited,original,fixed);
  const {body,assets}=fixed?{body:undefined,assets:new Map()}:await buildDocument(edited.blocks);
  return planRevision({edited,row,state,route,fixed,title,summary,body,assets});
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
