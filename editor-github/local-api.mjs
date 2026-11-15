import {randomBytes} from 'node:crypto';
import {verifyGithubOwner,createDraftPR} from '../editor/apps/web/studio-github.mjs';
import {cookie,allowedLocalRequest,validNonce,sessionId,activeSession,expiredSessionIds,createSession,driveClientConfig} from './core/session-policy.mjs';
const token=()=>randomBytes(32).toString('hex');
export function createLocalApi({verify=verifyGithubOwner,publish=createDraftPR,driveClient=process.env.GOOGLE_DRIVE_CLIENT_ID||process.env.VITE_GOOGLE_CLIENT_ID||''}={}){
 const sessions=new Map(),nonce=token();let sending=false;
 const lookup=req=>{const id=sessionId(req.headers.cookie);const value=sessions.get(id);if(activeSession(value,Date.now()))return {id,...value};if(id)sessions.delete(id);return null};
 function response(res,status,payload,extra={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(JSON.stringify(payload))}
 function allowed(req){return allowedLocalRequest(req.socket.remoteAddress,req.headers)}
 async function body(req){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw Error('Yêu cầu JSON');const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>12_000_000)throw Error('Bản nháp quá lớn');chunks.push(chunk)}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}
 return async (req,res,next)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(!path.startsWith('/api/')&&!path.startsWith('/auth/'))return next();
  if(!allowed(req))return response(res,403,{error:'Chỉ cho phép localhost:5173'});
  // Original Blogger/Drive and Cashflow are independent of GitHub authorization.
  if(path==='/api/status'&&req.method==='GET')return response(res,200,{connected:false,provider:'blogger',note:'Blogger không kết nối trong workspace GitHub'});
  if(path==='/api/drive-client-config'&&req.method==='GET'){return response(res,200,driveClientConfig(driveClient))}
  if(path==='/api/github-editor/session'&&req.method==='GET'){const s=lookup(req);return response(res,200,{connected:!!s,login:s?.owner.login||null,repository:'duykhang68/khoahoctienghan',nonce})}
  if(!['/api/github-editor/session','/api/github-editor/draft'].includes(path))return response(res,503,{error:'Dịch vụ Blogger/Cashflow gốc không kết nối ở workspace GitHub. Sử dụng website Cloudflare gốc nếu cần.'});
  if(!validNonce(req.headers,nonce))return response(res,403,{error:'Yêu cầu không hợp lệ'});
  try{
   if(path==='/api/github-editor/session'&&req.method==='POST'){
    const owner=await verify();const prior=lookup(req);if(prior)sessions.delete(prior.id);
    for(const key of expiredSessionIds(sessions,Date.now()))sessions.delete(key);
    if(sessions.size>=16)return response(res,429,{error:'Quá nhiều phiên local, hãy ngắt kết nối trước.'});
    const id=token();sessions.set(id,createSession(owner,Date.now()));
    return response(res,200,{connected:true,login:owner.login,repository:owner.repository,nonce},{'Set-Cookie':cookie+'='+id+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200'});
   }
   if(path==='/api/github-editor/session'&&req.method==='DELETE'){const s=lookup(req);if(s)sessions.delete(s.id);return response(res,200,{connected:false,nonce,repository:'duykhang68/khoahoctienghan'},{'Set-Cookie':cookie+'=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'})}
   if(path==='/api/github-editor/draft'&&req.method==='POST'){
    if(!lookup(req))return response(res,401,{error:'Kết nối GitHub trước'});
    if(sending)return response(res,409,{error:'Đang gửi một Draft PR'});
    sending=true;try{const payload=await body(req);if(payload.confirm!==true)throw Error('Cần xác nhận nội dung sẽ công khai');const result=await publish(payload.draft);return response(res,201,result)}finally{sending=false}
   }
   return response(res,405,{error:'Method not allowed'});
  }catch(e){return response(res,400,{error:String(e.message||'Không thực hiện được').slice(0,500)})}
 };
}
