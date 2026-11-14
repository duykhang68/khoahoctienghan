import {prepareV2,buildDocument,metadata,slugify} from './model.mjs';
const repo='/repos/duykhang68/khoahoctienghan';
export function githubClient(token,fetcher=fetch){
 const request=async(path,method='GET',body)=>{
  if(!path.startsWith('/')||path.startsWith('//'))throw Error('Invalid GitHub path');
  const response=await fetcher('https://api.github.com'+path,{method,redirect:'error',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok)throw Error('GitHub HTTP '+response.status+' — kiểm tra quyền token hoặc trạng thái repository.');
  return response.json();
 };
 async function verify(){
  const user=await request('/user');if(user.login!=='duykhang68')throw Error('Chỉ tài khoản chủ blog được gửi bài.');
  const target=await request(repo);
  if(target.full_name!=='duykhang68/khoahoctienghan'||target.permissions?.push!==true)throw Error('Token không có quyền ghi repository.');
  return user.login;
 }
 async function publish(draft,topicIds,progress=()=>{}){
  if(draft.kind==='knowledge'&&!topicIds.includes(draft.category))throw Error('Chuyên mục không hợp lệ.');
  if(!slugify(draft.title))throw Error('Nhập tiêu đề.');
  metadata(draft);await buildDocument(draft.blocks);
  await verify();progress('Đang đọc main…');
  const sha=(await request(repo+'/git/ref/heads/main')).object.sha;
  const commit=await request(repo+'/git/commits/'+sha);
  const tree=await request(repo+'/git/trees/'+commit.tree.sha+'?recursive=1');
  if(tree.truncated)throw Error('Danh sách file không đầy đủ; chưa ghi.');
  const paths=tree.tree.filter(f=>f.type==='blob').map(f=>f.path);
  const content=async path=>{
   const f=await request(repo+'/contents/'+path+'?ref='+sha);
   if(f.encoding!=='base64')throw Error('Không đọc được file dữ liệu.');
   return new TextDecoder().decode(Uint8Array.from(atob(f.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
  };
  const [posts,documents,meta,categorySource]=await Promise.all([content('src/data/techblog/posts.json').then(JSON.parse),content('src/data/studio-documents.json').then(JSON.parse),content('src/data/studio-metadata.json').then(JSON.parse),draft.kind==='knowledge'?content('src/content/docs/'+draft.category+'/index.md'):null]);
  const prepared=await prepareV2(draft,{paths,posts,documents,metadata:meta,categorySource},topicIds);
  progress('Đang chuẩn bị commit…');const entries=[];
  for(const [path,value] of prepared.changes){
   if(value.binary){const b=await request(repo+'/git/blobs','POST',{content:value.binary,encoding:'base64'});entries.push({path,mode:'100644',type:'blob',sha:b.sha})}
   else entries.push({path,mode:'100644',type:'blob',content:value.text});
  }
  const nextTree=await request(repo+'/git/trees','POST',{base_tree:commit.tree.sha,tree:entries});
  const next=await request(repo+'/git/commits','POST',{message:'content: add article from Editor V2',tree:nextTree.sha,parents:[sha]});
  if((await request(repo+'/git/ref/heads/main')).object.sha!==sha)throw Error('Main đã đổi. Thử lại, bản nháp vẫn còn.');
  const branch='content/editor-v2-'+crypto.randomUUID();
  await request(repo+'/git/refs','POST',{ref:'refs/heads/'+branch,sha:next.sha});
  progress('Đang tạo Draft PR…');
  let pr;try{pr=await request(repo+'/pulls','POST',{title:'content: '+draft.title.trim(),head:branch,base:'main',draft:true,body:'Created by independent Editor V2. Review content and native CI before merge.'})}catch{throw Error('Đã tạo nhánh '+branch+' nhưng chưa xác nhận PR. Kiểm tra GitHub trước khi gửi lại.')}
  if(pr.draft!==true||!Number.isInteger(pr.number))throw Error('Chưa xác nhận Draft PR; kiểm tra GitHub.');
  return {number:pr.number,url:'https://github.com/duykhang68/khoahoctienghan/pull/'+pr.number,route:prepared.route,sha:next.sha};
 }
 return {verify,publish};
}
