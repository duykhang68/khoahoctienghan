import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {allowed,digest,applyChanges} from './core.mjs';
import {selectNativeCI,publishPhase,validSha} from './publishing.mjs';
import {createPreview,disposePreview} from './preview.mjs';
import {mediaPath} from '../src/lib/editor-media.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const REPO='duykhang68/khoahoctienghan', API='https://api.github.com', prefix='/repos/'+REPO;
const PORT=Number(process.env.EDITOR_PORT||4317);if(!Number.isInteger(PORT)||PORT<1024||PORT>65535)throw Error('Invalid local port');const hosts=new Set(['127.0.0.1:'+PORT,'localhost:'+PORT]);
const nonce=randomBytes(32).toString('hex');
let token=null,login=null,writing=false;
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});
function local(){
 const sha=git('rev-parse','HEAD').trim(),paths=git('ls-tree','-r','--name-only',sha).split('\n').filter(allowed);
 return {sha,files:Object.fromEntries(paths.map(p=>{const content=mediaPath(p)?execFileSync('git',['show',sha+':'+p],{cwd:ROOT,maxBuffer:2_000_000}).toString('base64'):git('show',sha+':'+p);return [p,{content,hash:digest(content)}];}))};
}
async function gh(path,method='GET',body,credential=token){
 if(!credential)throw Error('Cần Connect GitHub trước');
 const res=await fetch(API+path,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+credential,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'trithuchanquoc-local-editor','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 if(!res.ok)throw Error('GitHub HTTP '+res.status+' — kiểm tra quyền, giới hạn API hoặc trạng thái repository');
 return res.json();
}
async function remote(){
 const sha=(await gh(prefix+'/git/ref/heads/main')).object.sha;
 const commit=await gh(prefix+'/git/commits/'+sha);
 const tree=await gh(prefix+'/git/trees/'+commit.tree.sha+'?recursive=1');
 if(tree.truncated)throw Error('Danh sách GitHub không đầy đủ');
 const files={},entries=tree.tree.filter(x=>x.type==='blob'&&x.mode==='100644'&&allowed(x.path));
 if(entries.length>1000)throw Error('Danh sách vượt giới hạn Editor');
 for(let i=0;i<entries.length;i+=8)await Promise.all(entries.slice(i,i+8).map(async e=>{
  if(e.size>2_000_000)throw Error('Tệp vượt giới hạn');
  const blob=await gh(prefix+'/git/blobs/'+e.sha);
  if(blob.encoding!=='base64')throw Error('Định dạng blob không hỗ trợ');
  const bytes=Buffer.from(blob.content,'base64');const content=mediaPath(e.path)?bytes.toString('base64'):bytes.toString('utf8');
  files[e.path]={content,hash:digest(content)};
 }));
 return {sha,tree:commit.tree.sha,files};
}
const PUBLIC='https://duykhang68.github.io/khoahoctienghan/';
async function markerStatus(){
 try{
  const response=await fetch(PUBLIC+'release-sha.json?v='+Date.now(),{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)return null;const marker=await response.json();if(!validSha(marker.sha))return null;
  const routes=await Promise.all(['','ngon-ngu/hangul/','techblog/'].map(async p=>{try{return (await fetch(PUBLIC+p,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)})).ok}catch{return false}}));
  return {sha:marker.sha,routesOK:routes.every(Boolean)};
 }catch{return null}
}
async function publishingStatus(numbers){
 if(!Array.isArray(numbers)||numbers.length>8||numbers.some(n=>!Number.isSafeInteger(n)||n<1))throw Error('Chỉ kiểm tra tối đa 8 PR hợp lệ.');
 const marker=await markerStatus();
 const results=[];
 for(const number of [...new Set(numbers)]){
  try{
   const pr=await gh(prefix+'/pulls/'+number);
   if(pr.head?.repo?.full_name!==REPO||!pr.head.ref.startsWith('content/editor-'))throw Error('PR không thuộc Editor');
   const runs=await gh(prefix+'/actions/workflows/ci.yml/runs?head_sha='+pr.head.sha+'&per_page=30').catch(()=>null);
   const ci=selectNativeCI(runs?.workflow_runs||[],pr.head.sha,pr.head.ref);
   const sha=pr.merged&&validSha(pr.merge_commit_sha)?pr.merge_commit_sha:null;
   let relation=null;
   if(sha&&marker){if(sha===marker.sha)relation='exact';else{const compare=await gh(prefix+'/compare/'+sha+'...'+marker.sha).catch(()=>null);if(compare?.status==='ahead')relation='ancestor'}}
   let deployment=null;
   if(sha&&marker&&relation){
    const list=await gh(prefix+'/deployments?environment=github-pages&sha='+marker.sha+'&per_page=10').catch(()=>[]);
    for(const dep of list||[]){if(dep.sha!==marker.sha)continue;const states=await gh(prefix+'/deployments/'+dep.id+'/statuses?per_page=1').catch(()=>[]);if(states?.[0]?.state==='success'){deployment={id:dep.id,sha:dep.sha,state:'success'};break}}
   }
   results.push({number,title:pr.title,head:pr.head.sha,mergeSha:sha,merged:pr.merged,state:pr.state,ci:ci?{id:ci.id,status:ci.status,conclusion:ci.conclusion}:null,relation,deployment,phase:publishPhase(pr,ci,marker,relation)});
  }catch(e){results.push({number,error:e.message,phase:'UNKNOWN'})}
 }
 return {marker,results,checkedAt:new Date().toISOString()};
}
async function body(req){
 const chunks=[];let n=0;
 for await(const chunk of req){n+=chunk.length;if(n>12_000_000)throw Error('Yêu cầu quá lớn');chunks.push(chunk);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
}
const assets={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
const mime={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
 const json=(status,v)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(v));};
 if(!hosts.has(req.headers.host)||req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host))return json(403,{error:'Chỉ cho phép truy cập localhost cùng origin'});
 try{
  const path=req.url;
  if(req.method==='GET'&&Object.hasOwn(assets,path)){
   const file=assets[path];res.writeHead(200,{'Content-Type':mime[file.split('.').pop()]});return res.end(await readFile(new URL('./web/'+file,import.meta.url)));
  }
  if(req.method==='GET'&&path==='/api/session')return json(200,{nonce,login});
  if(req.method==='GET'&&path==='/api/local')return json(200,local());
  if(req.method!=='POST'||req.headers['x-editor-nonce']!==nonce||req.headers.origin!=='http://'+req.headers.host||!req.headers['content-type']?.startsWith('application/json'))return json(403,{error:'Yêu cầu không hợp lệ'});
  if(writing&&['/api/connect','/api/disconnect','/api/sync'].includes(path))return json(409,{error:'Đang đồng bộ'});
  const data=await body(req);
  if(path==='/api/connect'){
   if(typeof data.token!=='string'||data.token.length<10||data.token.length>4096||/\s/.test(data.token))throw Error('Token không hợp lệ');
   const u=await gh('/user','GET',undefined,data.token);
   const repo=await gh(prefix,'GET',undefined,data.token);
   if(u.login!=='duykhang68'||repo.full_name!==REPO||!repo.permissions?.push)throw Error('Cần token của chủ repository có quyền ghi');
   token=data.token;login=u.login;return json(200,{login});
  }
  if(path==='/api/disconnect'){token=null;login=null;return json(200,{login:null});}
  if(path==='/api/preview'){
   const snap=local();if(data.base!==snap.sha)throw Error('Preview cần checkout cùng SHA với bản nháp. Cập nhật Git local, mở lại Editor và Pull.');
   if(!Array.isArray(data.changes))throw Error('Invalid preview changes');
   try{return json(200,await createPreview(ROOT,snap,data.changes,data.route))}
   catch(e){throw Error('Không dựng được preview Astro: '+(e.code?'build không thành công; kiểm tra checkout/npm ci và nội dung.':e.message))}
  }
  if(path==='/api/pull')return json(200,await remote());
  if(path==='/api/publishing'){if(!token)return json(401,{error:'Kết nối GitHub trước'});return json(200,await publishingStatus(data.numbers));}
  if(path==='/api/sync'){
   if(writing)return json(409,{error:'Đang đồng bộ'});
   writing=true;
   try{
    const snap=await remote();
    const old=new Map(Object.entries(snap.files).map(([p,v])=>[p,v.content]));
    applyChanges(old,data.changes);
    const diff=data.changes.filter(c=>(old.get(c.path)??null)!==c.content);
    if(!diff.length)throw Error('Không có thay đổi mới');
    const base=(await gh(prefix+'/git/ref/heads/main')).object.sha;
    if(base!==snap.sha)throw Error('Main vừa thay đổi; Pull lại trước khi Sync');
    const entries=[];
    for(const c of diff){
     if(c.content===null)entries.push({path:c.path,mode:'100644',type:'blob',sha:null});
     else if(mediaPath(c.path)){const blob=await gh(prefix+'/git/blobs','POST',{content:c.content,encoding:'base64'});entries.push({path:c.path,mode:'100644',type:'blob',sha:blob.sha})}
     else entries.push({path:c.path,mode:'100644',type:'blob',content:c.content});
    }
    const tree=await gh(prefix+'/git/trees','POST',{base_tree:snap.tree,tree:entries});
    const menuOnly=diff.every(c=>c.path==='src/data/knowledge-menu.json');
    const title=menuOnly?'content: update knowledge navigation':'content: update knowledge content and menus';
    const commit=await gh(prefix+'/git/commits','POST',{message:title,tree:tree.sha,parents:[base]});
    const branch='content/editor-'+Date.now()+'-'+randomBytes(4).toString('hex');
    await gh(prefix+'/git/refs','POST',{ref:'refs/heads/'+branch,sha:commit.sha});
    let pr;
    try{pr=await gh(prefix+'/pulls','POST',{title,head:branch,base:'main',body:'Published explicitly from Trithuchanquoc Editor. Standard CI, review and release gates apply. No direct main write.'});}
    catch{throw Error('Đã tạo branch '+branch+' nhưng chưa tạo PR; mở GitHub để kiểm tra trước khi thử lại.');}
    return json(200,{number:pr.number,url:pr.html_url,sha:commit.sha,base,branch});
   }finally{writing=false;}
  }
  return json(404,{error:'Không tìm thấy'});
 }catch(e){return json(400,{error:e instanceof Error?e.message:'Không thể xử lý yêu cầu'});}
});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await disposePreview();server.close(()=>process.exit(0))});
server.listen(PORT,'127.0.0.1',()=>console.log('Trithuchanquoc Editor: http://127.0.0.1:'+PORT));
