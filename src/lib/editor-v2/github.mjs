import {buildDocument,metadata,slugify} from './model.mjs';
const repo='/repos/duykhang68/khoahoctienghan';
export function githubClient(token,fetcher=fetch,{installation=false,beforeCreate=async()=>{}}={}){
 const request=async(path,method='GET',body,optional=false)=>{
  if(!path.startsWith('/')||path.startsWith('//'))throw Error('Invalid GitHub path');
  const response=await fetcher('https://api.github.com'+path,{method,redirect:'error',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(optional&&response.status===404)return null;
  if(!response.ok)throw Object.assign(Error('GitHub HTTP '+response.status+' — kiểm tra quyền token hoặc repository.'),{status:response.status});
  return response.status===204?null:response.json();
 };
 async function verify(){
  if(installation){const access=await request('/installation/repositories?per_page=100');if(access.total_count!==1||access.repositories?.length!==1||access.repositories[0]?.full_name!=='duykhang68/khoahoctienghan')throw Error('Installation must be scoped to exactly this repository.');return 'scheduler-app';}
  const user=await request('/user');if(user.login!=='duykhang68')throw Error('Chỉ tài khoản chủ blog được gửi bài.');
  const target=await request(repo);
  if(target.full_name!=='duykhang68/khoahoctienghan'||target.permissions?.push!==true)throw Error('Token không có quyền ghi repository.');
  return user.login;
 }
 async function publish(draft,topicIds,progress=()=>{}){
  const slug=slugify(draft.title);
  if(!slug||['index','editorv2'].includes(slug)||draft.title.trim().length>180||String(draft.summary||'').length>500)throw Error('Tiêu đề, URL hoặc mô tả không hợp lệ.');
  if(!['tech','knowledge'].includes(draft.kind)||(draft.kind==='knowledge'&&!topicIds.includes(draft.category)))throw Error('Chuyên mục không hợp lệ.');
  metadata(draft);await buildDocument(draft.blocks);
  const payload=JSON.stringify({version:1,draft});
  const bytes=new TextEncoder().encode(payload);
  if(bytes.length>8_000_000)throw Error('Bản gửi tối đa 8 MB. Giảm dung lượng ảnh.');
  const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  const branch='content/editor-v2-'+id,path='editor-submissions/'+id+'.json';
  const route=(draft.kind==='tech'?'techblog':draft.category)+'/'+slug+'/';
  await verify();progress('Đang gửi commit vào hàng đợi…');
  const result=sha=>({sha,route,id,commitUrl:'https://github.com/duykhang68/khoahoctienghan/commit/'+sha,queueUrl:'https://github.com/duykhang68/khoahoctienghan/issues?q=is%3Aissue+%22Editor+V2%22+in%3Atitle'});
  const notify=async sha=>{try{await request(repo+'/dispatches','POST',{event_type:'editor-v2-submit',client_payload:{ref:'refs/heads/'+branch,sha}})}catch(e){throw Error('Commit đã gửi. Chưa xác nhận tín hiệu hàng đợi; gửi lại đúng bản nháp để thử lại, không tạo bản trùng.',{cause:e})}return result(sha)};
  const existing=await request(repo+'/git/ref/heads/'+branch,'GET',null,true);
  if(existing){const previous=await request(repo+'/commits/'+existing.object.sha);if(previous.files?.length!==1||previous.files[0].filename!==path)throw Error('Nhánh gửi không khớp. Kiểm tra GitHub.');if(installation){const f=previous.files[0];if(previous.parents?.length!==1||previous.commit?.message!=='content(editor-v2): enqueue '+id||f.status!=='added'||!/^[a-f0-9]{40}$/.test(f.sha||''))throw Error('Invalid existing submission');const blob=await request(repo+'/git/blobs/'+f.sha);if(blob.encoding!=='base64')throw Error('Invalid existing blob');const raw=Uint8Array.from(atob(blob.content.replace(/\s/g,'')),c=>c.charCodeAt(0)),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==id)throw Error('Submission digest mismatch');}return notify(existing.object.sha)}
  await beforeCreate(route);
  const sha=(await request(repo+'/git/ref/heads/main')).object.sha,commit=await request(repo+'/git/commits/'+sha);
  const blob=await request(repo+'/git/blobs','POST',{content:payload,encoding:'utf-8'});
  const nextTree=await request(repo+'/git/trees','POST',{base_tree:commit.tree.sha,tree:[{path,mode:'100644',type:'blob',sha:blob.sha}]});
  const next=await request(repo+'/git/commits','POST',{message:'content(editor-v2): enqueue '+id,tree:nextTree.sha,parents:[sha]});
  try{await request(repo+'/git/refs','POST',{ref:'refs/heads/'+branch,sha:next.sha})}
  catch(e){const after=await request(repo+'/git/ref/heads/'+branch,'GET',null,true);if(!after||after.object.sha!==next.sha)throw Error('Chưa xác nhận nhánh gửi. Giữ nguyên bản nháp và kiểm tra hàng đợi trước khi thử lại.',{cause:e})}
  return notify(next.sha);
 }
 return {verify,publish};
}
