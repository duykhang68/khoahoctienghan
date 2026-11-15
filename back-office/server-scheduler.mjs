import {buildDocument} from '../src/lib/editor-v2/model.mjs';
import {digestId,err,schedulerConfigured,scheduleDue,scheduleDraft,schedulePayload,scheduleRoute} from '../core/scheduler/validation.mjs';
import {schedulerReady,headDisposition,receiptMatches,isConfirmedIssue,awaitingDeadline,leaseDeadline} from '../core/scheduler/transition.mjs';
import {planScheduleFailure} from '../core/scheduler/retry-policy.mjs';
import {active,fields,stmt,get,all,run,schedulerHead,acceptScheduledIssue,claimScheduledHead,markAwaitingIssue,markScheduleFailure} from './repositories/scheduler.mjs';
export {schedulerConfigured} from '../core/scheduler/validation.mjs';
import {githubClient} from '../src/lib/editor-v2/github.mjs';
import {parseQueueIssue} from '../src/lib/sheet-blog/progress.mjs';
const repo='duykhang68/khoahoctienghan', api='https://api.github.com', site='https://duykhang68.github.io/khoahoctienghan/';
const encoder=new TextEncoder(), decoder=new TextDecoder('utf-8',{fatal:true});
const hex=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
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
 // The binding contains only base64 DER, not a PEM document. WebCrypto validates PKCS#8 structure.
 const bytes=Uint8Array.from(atob(env.SCHEDULER_APP_PKCS8_B64),c=>c.charCodeAt(0));
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
 const due=scheduleDue(input,now);
 let draft;try{draft=scheduleDraft(input,topics);await buildDocument(draft.blocks);}catch{throw err('INVALID_DRAFT')}
 const bytes=schedulePayload(draft);
 return {id:await hex(bytes),title:draft.title,route:scheduleRoute(draft),due,bytes};
}
export async function schedulerStatus(env,now=Date.now()){
 if(!env.SCHEDULE_DB)return {configured:false,ready:false,lastTick:null,jobs:[]};
 const db=env.SCHEDULE_DB,health=await get(db,'SELECT last_tick FROM scheduler_health WHERE id=1'),lastTick=health?.last_tick??null,configured=schedulerConfigured(env);
 const open=await all(db,'SELECT '+fields+' FROM scheduler_jobs WHERE state IN ('+active+') ORDER BY due_at,created_at,id');
 const history=await all(db,'SELECT '+fields+' FROM scheduler_jobs WHERE state IN (\'submitted\',\'cancelled\') ORDER BY created_at DESC LIMIT 50');
 // Ready means cron has checked in; GitHub credentials are verified before sending.
 return {configured,ready:schedulerReady(configured,lastTick,now),lastTick,jobs:[...open,...history]};
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
 const head=await schedulerHead(db,now),disposition=headDisposition(head);
 if(disposition==='idle'||disposition==='blocked')return disposition;
 if(disposition==='awaiting_issue'){
  try{
   const number=await transport.findIssue(head.id,head.receipt_sha);
   if(isConfirmedIssue(number)){
    await acceptScheduledIssue(db,head,number);
    return 'accepted';
   }
   if(now<head.next_at)return 'awaiting_issue';
  }catch(e){if(e.code==='RECEIPT_MISMATCH'){await run(db,"UPDATE scheduler_jobs SET state='blocked',error_code='RECEIPT_MISMATCH' WHERE id=? AND state='awaiting_issue'",head.id);return 'blocked'}if(now<head.next_at)return 'awaiting_issue'}
  await run(db,"UPDATE scheduler_jobs SET state='blocked',error_code='ISSUE_NOT_CONFIRMED' WHERE id=? AND state='awaiting_issue'",head.id);return 'blocked';
 }
 const lease=crypto.randomUUID();
 const claimed=await claimScheduledHead(db,lease,leaseDeadline(now),now);
 if(!claimed)return 'waiting';
 try{
  const draft=await loadPayload(db,claimed.id),result=await transport.publish(draft);
  if(!receiptMatches(claimed,result))throw err('RECEIPT_MISMATCH');
  await markAwaitingIssue(db,result,awaitingDeadline(now),claimed,lease);
  return 'dispatched';
 }catch(e){
  const plan=planScheduleFailure(e,claimed.attempts,now);
  await markScheduleFailure(db,plan,claimed,lease);
  return plan.state;
 }
}
