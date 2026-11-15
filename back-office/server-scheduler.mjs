import {buildDocument,metadata,slugify} from '../src/lib/editor-v2/model.mjs';
import {validateCopy,vietnamTime} from '../src/lib/editor-v2/draft-schedule.mjs';
import {githubClient} from '../src/lib/editor-v2/github.mjs';
import {parseQueueIssue} from '../src/lib/sheet-blog/progress.mjs';
const repo='duykhang68/khoahoctienghan', api='https://api.github.com', site='https://duykhang68.github.io/khoahoctienghan/';
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const digestId=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const err=(code,status=400)=>Object.assign(Error(code),{code,httpStatus:status});
const active="'scheduled','sending','retry','awaiting_issue','blocked'";
const fields='id,title,route,due_at,created_at,state,attempts,receipt_sha,issue_number,error_code';
const encoder=new TextEncoder(), decoder=new TextDecoder('utf-8',{fatal:true});
const hex=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const numeric=x=>/^[1-9][0-9]*$/.test(String(x||''));
export const schedulerConfigured=env=>Boolean(env?.SCHEDULE_DB&&env.SCHEDULER_ENABLED==='true'&&numeric(env.SCHEDULER_APP_ID)&&numeric(env.SCHEDULER_INSTALLATION_ID)&&numeric(env.SCHEDULER_APP_BOT_ID)&&/^[a-z0-9-]+\[bot\]$/.test(env.SCHEDULER_APP_BOT_LOGIN||'')&&typeof env.SCHEDULER_APP_PRIVATE_KEY==='string'&&env.SCHEDULER_APP_PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----'));
const stmt=(db,sql,...args)=>db.prepare(sql).bind(...args);
const get=(db,sql,...args)=>stmt(db,sql,...args).first();
const all=async(db,sql,...args)=>(await stmt(db,sql,...args).all()).results;
const run=(db,sql,...args)=>stmt(db,sql,...args).run();
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const jwtPiece=o=>b64url(encoder.encode(JSON.stringify(o)));
async function safeFetch(url,options={},fetcher=fetch){
 const target=new URL(url);if(target.origin!==api&&target.origin!=='https://duykhang68.github.io')throw Error('Unapproved upstream');
 const response=await fetcher(url,{...options,redirect:'manual',signal:AbortSignal.timeout(12000)});
 if(response.status>=300&&response.status<400)throw Error('Rejected upstream redirect');
 return response;
}
export async function mintSchedulerToken(env,fetcher=fetch,now=Date.now()){
 if(!schedulerConfigured(env))throw err('CONFIG_REQUIRED',503);
 const pem=env.SCHEDULER_APP_PRIVATE_KEY.trim();
 const bytes=Uint8Array.from(atob(pem.replace('-----BEGIN PRIVATE KEY-----','').replace('-----END PRIVATE KEY-----','').replace(/\s/g,'')),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',bytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const t=Math.floor(now/1000),unsigned=jwtPiece({alg:'RS256',typ:'JWT'})+'.'+jwtPiece({iat:t-60,exp:t+480,iss:String(env.SCHEDULER_APP_ID)});
 const jwt=unsigned+'.'+b64url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,encoder.encode(unsigned))));
 const request=async(path,token=jwt,body)=>{
  const res=await safeFetch(api+path,{method:body?'POST':'GET',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'User-Agent':'korean-editorial-scheduler','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})},fetcher);
  if(!res.ok)throw Object.assign(Error('GitHub App request failed'),{status:res.status});return res.json();
 };
 const app=await request('/app');
 if(String(app.id)!==String(env.SCHEDULER_APP_ID)||app.slug+'[bot]'!==env.SCHEDULER_APP_BOT_LOGIN)throw err('APP_IDENTITY_MISMATCH');
 const path='/app/installations/'+env.SCHEDULER_INSTALLATION_ID;
 const installation=await request(path);
 if(String(installation.app_id)!==String(env.SCHEDULER_APP_ID)||installation.account?.login!=='duykhang68'||installation.suspended_at)throw err('APP_INSTALLATION_MISMATCH');
 const access=await request(path+'/access_tokens',jwt,{repositories:['khoahoctienghan'],permissions:{contents:'write',issues:'read'}});
 if(typeof access.token!=='string'||access.permissions?.contents!=='write'||access.permissions?.issues!=='read')throw err('APP_PERMISSIONS_MISMATCH');
 const bot=await request('/users/'+encodeURIComponent(env.SCHEDULER_APP_BOT_LOGIN),access.token);
 if(String(bot.id)!==String(env.SCHEDULER_APP_BOT_ID)||bot.login!==env.SCHEDULER_APP_BOT_LOGIN||bot.type!=='Bot')throw err('APP_BOT_MISMATCH');
 return access.token;
}
export async function prepareSchedule(input,topics,now=Date.now()){
 if(input?.consent!==true)throw err('CONSENT_REQUIRED');
 let due;try{due=vietnamTime(input.dueLocal)}catch{throw err('INVALID_DATE')}
 if(due<=now||due>now+366*86400000)throw err('INVALID_DATE');
 let draft;try{draft=validateCopy(input.draft);const slug=slugify(draft.title);if(!slug||['index','editorv2'].includes(slug)||draft.title.trim().length>180||draft.summary.length>500||(draft.kind==='knowledge'&&!topics.includes(draft.category)))throw Error('Invalid metadata');metadata(draft);await buildDocument(draft.blocks);}catch{throw err('INVALID_DRAFT')}
 const bytes=encoder.encode(JSON.stringify({version:1,draft}));if(bytes.length>8000000)throw err('INVALID_DRAFT');
 return {id:await hex(bytes),title:draft.title,route:(draft.kind==='tech'?'techblog':draft.category)+'/'+slugify(draft.title)+'/',due,bytes};
}
export async function schedulerStatus(env,now=Date.now()){
 if(!env.SCHEDULE_DB)return {configured:false,ready:false,lastTick:null,jobs:[]};
 const db=env.SCHEDULE_DB,health=await get(db,'SELECT last_tick FROM scheduler_health WHERE id=1'),lastTick=health?.last_tick??null,configured=schedulerConfigured(env);
 const open=await all(db,'SELECT '+fields+' FROM scheduler_jobs WHERE state IN ('+active+') ORDER BY due_at,created_at,id');
 const history=await all(db,'SELECT '+fields+' FROM scheduler_jobs WHERE state IN (\'submitted\',\'cancelled\') ORDER BY created_at DESC LIMIT 50');
 // Ready means cron has checked in; GitHub credentials are verified before sending.
 return {configured,ready:configured&&Number.isSafeInteger(lastTick)&&now-lastTick>=0&&now-lastTick<=300000,lastTick,jobs:[...open,...history]};
}
async function createSchedule(env,input,topics,now){
 if(!(await schedulerStatus(env,now)).ready)throw err('SCHEDULER_NOT_READY',503);
 const db=env.SCHEDULE_DB,x=await prepareSchedule(input,topics,now);
 const existing=await get(db,'SELECT '+fields+' FROM scheduler_jobs WHERE id=?',x.id);
 if(existing&&existing.state!=='cancelled'){if(existing.due_at===x.due)return existing;throw err('SCHEDULE_EXISTS',409)}
 const queries=[stmt(db,'INSERT INTO scheduler_jobs(id,title,route,due_at,created_at,consented_at,state,next_at) SELECT ?,?,?,?,?,?,\'scheduled\',? WHERE (SELECT count(*) FROM scheduler_jobs WHERE state IN ('+active+')) < 50 ON CONFLICT(id) DO UPDATE SET due_at=excluded.due_at,created_at=excluded.created_at,consented_at=excluded.consented_at,state=\'scheduled\',next_at=excluded.next_at,attempts=0,lease_until=NULL,lease=NULL,receipt_sha=NULL,issue_number=NULL,error_code=NULL WHERE scheduler_jobs.state=\'cancelled\'',x.id,x.title,x.route,x.due,now,now,x.due)];
 for(let i=0,part=0;i<x.bytes.length;i+=900000,part++){const chunk=x.bytes.slice(i,i+900000);queries.push(stmt(db,'INSERT OR IGNORE INTO scheduler_chunks(job_id,part,payload) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM scheduler_jobs WHERE id=? AND state=\'scheduled\' AND due_at=?)',x.id,part,chunk.buffer,x.id,x.due))}
 try{await db.batch(queries)}catch(e){if(/UNIQUE constraint/i.test(String(e.message)))throw err('ROUTE_ALREADY_SCHEDULED',409);throw e}
 const saved=await get(db,'SELECT '+fields+' FROM scheduler_jobs WHERE id=?',x.id);if(!saved||saved.state==='cancelled'||saved.due_at!==x.due)throw err('SCHEDULE_CONFLICT_OR_LIMIT',409);
 return saved;
}
async function changeSchedule(env,input,now){
 if(!env.SCHEDULE_DB)throw err('CONFIG_REQUIRED',503);
 if(!digestId(input.id))throw err('INVALID_ID');
 const db=env.SCHEDULE_DB;
 if(input.action==='cancel'){
  await db.batch([stmt(db,"UPDATE scheduler_jobs SET state='cancelled',error_code=NULL WHERE id=? AND state='scheduled' AND attempts=0",input.id),stmt(db,"DELETE FROM scheduler_chunks WHERE job_id=? AND EXISTS(SELECT 1 FROM scheduler_jobs WHERE id=? AND state='cancelled')",input.id,input.id)]);
  const row=await get(db,'SELECT '+fields+' FROM scheduler_jobs WHERE id=?',input.id);if(row?.state!=='cancelled')throw err('CANNOT_CANCEL',409);return row;
 }
 if(input.action==='retry'){
  if(input.consent!==true)throw err('CONSENT_REQUIRED');if(!(await schedulerStatus(env,now)).ready)throw err('SCHEDULER_NOT_READY',503);
  const result=await run(db,"UPDATE scheduler_jobs SET state='retry',attempts=0,next_at=?,error_code=NULL,lease=NULL,lease_until=NULL WHERE id=? AND state='blocked'",now,input.id);
  if(!result.meta?.changes)throw err('CANNOT_RETRY',409);return get(db,'SELECT '+fields+' FROM scheduler_jobs WHERE id=?',input.id);
 }
 throw err('INVALID_ACTION');
}
async function readBoundedJson(req){
 if(!req.body)throw err('INVALID_BODY');
 const reader=req.body.getReader(),text=new TextDecoder('utf-8',{fatal:true});let raw='',size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8100000){await reader.cancel();throw err('BODY_TOO_LARGE',413)}raw+=text.decode(value,{stream:true})}raw+=text.decode();return JSON.parse(raw)}catch(e){if(e.httpStatus)throw e;throw err('INVALID_BODY')}
}
export async function schedulerApi(req,env,topics,now=Date.now()){
 try{
  const url=new URL(req.url);if(url.search)throw err('INVALID_QUERY');
  if(req.method==='GET')return {status:200,body:await schedulerStatus(env,now)};
  if(req.method!=='POST')throw err('METHOD_NOT_ALLOWED',405);
  if(req.headers.get('Origin')!==env.BACKOFFICE_ORIGIN||req.headers.get('Content-Type')?.split(';')[0]!=='application/json')throw err('FORBIDDEN',403);
  const input=await readBoundedJson(req);const result=input?.action==='create'?await createSchedule(env,input,topics,now):await changeSchedule(env,input||{},now);
  return {status:200,body:result};
 }catch(e){return {status:e.httpStatus||503,body:{error:e.httpStatus?e.code:'SCHEDULER_UNAVAILABLE'}}}
}
async function loadPayload(db,id){
 const chunks=await all(db,'SELECT part,payload FROM scheduler_chunks WHERE job_id=? ORDER BY part',id);
 if(!chunks.length||chunks.length>9||chunks.some((c,i)=>c.part!==i))throw err('PAYLOAD_MISSING');
 const arrays=chunks.map(c=>new Uint8Array(c.payload)),size=arrays.reduce((n,a)=>n+a.length,0);if(size>8000000)throw err('PAYLOAD_INVALID');
 const bytes=new Uint8Array(size);let offset=0;for(const a of arrays){bytes.set(a,offset);offset+=a.length}
 if(await hex(bytes)!==id)throw err('PAYLOAD_DIGEST_MISMATCH');
 const data=JSON.parse(decoder.decode(bytes));if(data.version!==1||!data.draft)throw err('PAYLOAD_INVALID');return data.draft;
}
const retryable=e=>e&&(e.status===429||(e.status>=500&&e.status<=599)||['TimeoutError','AbortError','TypeError'].includes(e.name)||retryable(e.cause));
const code=e=>['APP_IDENTITY_MISMATCH','APP_INSTALLATION_MISMATCH','APP_PERMISSIONS_MISMATCH','APP_BOT_MISMATCH','PAYLOAD_MISSING','PAYLOAD_INVALID','PAYLOAD_DIGEST_MISMATCH','ROUTE_EXISTS','RECEIPT_MISMATCH'].includes(e?.code)?e.code:retryable(e)?'UPSTREAM_TEMPORARY':'PUBLISH_BLOCKED';
function publisher(env,topics,fetcher){
 const auth=()=>mintSchedulerToken(env,fetcher);
 const wrapped=(url,opts={})=>safeFetch(url,{...opts,headers:{...opts.headers,'User-Agent':'korean-editorial-scheduler'}},fetcher);
 return {
  async publish(draft){
   const token=await auth();
   return githubClient(token,wrapped,{installation:true,beforeCreate:async route=>{const res=await safeFetch(site+route,{method:'HEAD',headers:{'Cache-Control':'no-cache'}},fetcher);if(res.status===200)throw err('ROUTE_EXISTS');if(res.status!==404)throw Object.assign(Error('Site route check failed'),{status:res.status});}}).publish(draft,topics);
  },
  async findIssue(id,source){
   const token=await auth();
   for(let page=1;page<=5;page++){
    const res=await wrapped(api+'/repos/'+repo+'/issues?state=all&sort=created&direction=desc&per_page=100&page='+page,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'}});
    if(!res.ok)throw Object.assign(Error('Issue lookup failed'),{status:res.status});
    const rows=await res.json();if(!Array.isArray(rows))throw Error('Invalid issue list');
    const item=rows.map(parseQueueIssue).filter(Boolean).find(x=>x.id===id);
    if(item){if(item.source!==source)throw err('RECEIPT_MISMATCH');return item.number}if(rows.length<100)break;
   }return null;
  }
 };
}
// Cron, not a browser timer. Exactly one due head is allowed to advance per tick.
export async function runScheduler(env,topics,{now=Date.now(),fetcher=fetch,transport=publisher(env,topics,fetcher)}={}){
 if(!schedulerConfigured(env))return 'disabled';
 const db=env.SCHEDULE_DB;
 await run(db,'INSERT INTO scheduler_health(id,last_tick) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET last_tick=MAX(last_tick,excluded.last_tick)',now);
 await run(db,"UPDATE scheduler_jobs SET state='blocked',error_code='ATTEMPTS_EXHAUSTED',lease=NULL,lease_until=NULL WHERE state='sending' AND lease_until<=? AND attempts>=3",now);
 const head=await get(db,'SELECT * FROM scheduler_jobs WHERE due_at<=? AND state IN ('+active+') ORDER BY due_at,created_at,id LIMIT 1',now);
 if(!head||head.state==='blocked')return head?'blocked':'idle';
 if(head.state==='awaiting_issue'){
  try{
   const number=await transport.findIssue(head.id,head.receipt_sha);
   if(Number.isSafeInteger(number)&&number>0){
    await db.batch([stmt(db,"UPDATE scheduler_jobs SET state='submitted',issue_number=?,error_code=NULL WHERE id=? AND state='awaiting_issue' AND receipt_sha=?",number,head.id,head.receipt_sha),stmt(db,"DELETE FROM scheduler_chunks WHERE job_id=? AND EXISTS(SELECT 1 FROM scheduler_jobs WHERE id=? AND state='submitted')",head.id,head.id)]);
    return 'accepted';
   }
   if(now<head.next_at)return 'awaiting_issue';
  }catch(e){if(e.code==='RECEIPT_MISMATCH'){await run(db,"UPDATE scheduler_jobs SET state='blocked',error_code='RECEIPT_MISMATCH' WHERE id=? AND state='awaiting_issue'",head.id);return 'blocked'}if(now<head.next_at)return 'awaiting_issue'}
  await run(db,"UPDATE scheduler_jobs SET state='blocked',error_code='ISSUE_NOT_CONFIRMED' WHERE id=? AND state='awaiting_issue'",head.id);return 'blocked';
 }
 const lease=crypto.randomUUID();
 const claimed=await get(db,"UPDATE scheduler_jobs SET state='sending',attempts=attempts+1,lease=?,lease_until=?,error_code=NULL WHERE id=(SELECT id FROM scheduler_jobs WHERE due_at<=? AND state IN ("+active+") ORDER BY due_at,created_at,id LIMIT 1) AND attempts<3 AND ((state IN ('scheduled','retry') AND next_at<=?) OR (state='sending' AND lease_until<=?)) RETURNING *",lease,now+600000,now,now,now);
 if(!claimed)return 'waiting';
 try{
  const draft=await loadPayload(db,claimed.id),result=await transport.publish(draft);
  if(result.id!==claimed.id||!sha(result.sha)||result.route!==claimed.route||(claimed.receipt_sha&&claimed.receipt_sha!==result.sha))throw err('RECEIPT_MISMATCH');
  await run(db,"UPDATE scheduler_jobs SET state='awaiting_issue',receipt_sha=?,next_at=?,lease=NULL,lease_until=NULL WHERE id=? AND state='sending' AND lease=?",result.sha,now+900000,claimed.id,lease);
  return 'dispatched';
 }catch(e){
  const again=retryable(e)&&claimed.attempts<3;
  await run(db,"UPDATE scheduler_jobs SET state=?,next_at=?,error_code=?,lease=NULL,lease_until=NULL WHERE id=? AND state='sending' AND lease=?",again?'retry':'blocked',now+120000*claimed.attempts,code(e),claimed.id,lease);
  return again?'retry':'blocked';
 }
}
