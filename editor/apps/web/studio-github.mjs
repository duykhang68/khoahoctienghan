import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {prepareArticle} from './studio-adapter.mjs';
const repo='repos/duykhang68/khoahoctienghan';
function gh(path,method='GET',body){
 return new Promise((resolve,reject)=>{
  const child=spawn('gh',['api','--hostname','github.com','--method',method,path,...(body?['--input','-']:[])],{stdio:['pipe','pipe','pipe'],env:{...process.env,GH_PROMPT_DISABLED:'1'}});
  let out='',error='',settled=false;const timer=setTimeout(()=>{child.kill();reject(Error('GitHub CLI timeout'))},30000);
  child.stdout.on('data',c=>{out+=c;if(out.length>15_000_000)child.kill()});child.stderr.on('data',c=>{if(error.length<4000)error+=c});
  child.on('error',()=>{clearTimeout(timer);reject(Error('Cần cài GitHub CLI (gh) và đăng nhập bằng gh auth login'))});
  child.on('close',code=>{clearTimeout(timer);if(code!==0)return reject(Error('GitHub CLI request failed; kiểm tra gh auth status và quyền repo.'));try{resolve(JSON.parse(out))}catch{reject(Error('Invalid GitHub response'))}});
  child.stdin.on('error',()=>{});child.stdin.end(body?JSON.stringify(body):undefined);
 });
}
export async function verifyGithubOwner(){
 const owner=await gh('user');
 assert(owner.login==='duykhang68','Chỉ tài khoản GitHub duykhang68 được kết nối.');
 const target=await gh(repo);
 assert(target.full_name==='duykhang68/khoahoctienghan'&&target.permissions?.push===true,'Tài khoản thiếu quyền ghi repository.');
 return {login:owner.login,repository:target.full_name};
}
export async function createDraftPR(draft){
 await verifyGithubOwner();
 const main=await gh(repo+'/git/ref/heads/main'),sha=main.object.sha,commit=await gh(repo+'/git/commits/'+sha);
 const tree=await gh(repo+'/git/trees/'+commit.tree.sha+'?recursive=1');assert(!tree.truncated,'Repository tree incomplete');
 const paths=tree.tree.filter(f=>f.type==='blob').map(f=>f.path);
 assert(paths.includes('src/data/studio-documents.json')&&paths.includes('src/data/studio-metadata.json')&&paths.includes('src/components/StudioDocument.astro'),'Migration chưa merge vào main. Chỉ lưu local lúc này.');
 const content=async path=>{const result=await gh(repo+'/contents/'+path+'?ref='+sha);assert(result.encoding==='base64','Invalid file');return Buffer.from(result.content,'base64').toString('utf8')};
 // Validate destination before interpolating any path.
 const validCats=['ngon-ngu','lich-su','van-hoa','am-thuc','dia-ly-du-lich','kinh-te-cong-nghe','giao-duc-du-hoc','hallyu','doi-song','the-che'];
 if(draft.kind==='knowledge')assert(validCats.includes(draft.category),'Invalid category');
 const [posts,documents,categorySource,metadata]=await Promise.all([content('src/data/techblog/posts.json').then(JSON.parse),content('src/data/studio-documents.json').then(JSON.parse),draft.kind==='knowledge'?content('src/content/docs/'+draft.category+'/index.md'):null,content('src/data/studio-metadata.json').then(JSON.parse)]);
 const prepared=prepareArticle(draft,{paths,posts,documents,categorySource,metadata});const entries=[];
 for(const [path,value] of prepared.changes){if(value.binary){const b=await gh(repo+'/git/blobs','POST',{content:value.binary.toString('base64'),encoding:'base64'});entries.push({path,mode:'100644',type:'blob',sha:b.sha})}else entries.push({path,mode:'100644',type:'blob',content:value.text})}
 const nextTree=await gh(repo+'/git/trees','POST',{base_tree:commit.tree.sha,tree:entries});const next=await gh(repo+'/git/commits','POST',{message:'content: add article from Editorial Studio',tree:nextTree.sha,parents:[sha]});
 assert((await gh(repo+'/git/ref/heads/main')).object.sha===sha,'Main đã thay đổi. Thử lại.');
 const branch='content/studio-'+Date.now()+'-'+randomBytes(5).toString('hex');await gh(repo+'/git/refs','POST',{ref:'refs/heads/'+branch,sha:next.sha});
 const pr=await gh(repo+'/pulls','POST',{title:'content: '+draft.title.trim(),head:branch,base:'main',draft:true,body:'Created by Editorial Studio. Draft for visual and content review; standard gates apply. No immediate publication.'});
 assert(pr.draft===true,'GitHub chưa xác nhận Draft PR; kiểm tra branch '+branch);
 return {number:pr.number,url:pr.html_url,sha:next.sha,route:prepared.route};
}
