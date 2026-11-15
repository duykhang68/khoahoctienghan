import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {schedulerApi,runScheduler,prepareSchedule,mintSchedulerToken} from './server-scheduler.mjs';
import {authorizedSubmissionEvent} from '../scripts/editor-v2-queue-policy.mjs';
const origin='https://example.test',topics=['ngon-ngu'],start=Date.parse('2030-01-01T00:00:00Z'),due=start+60000;
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('./scheduler-schema.sql',import.meta.url),'utf8'));
 const wrapper={prepare(sql){return {bind(...args){const values=args.map(v=>v instanceof ArrayBuffer?new Uint8Array(v):v);return {first:async()=>db.prepare(sql).get(...values)??null,all:async()=>({results:db.prepare(sql).all(...values)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...values).changes)}})}}}},async batch(stmts){db.exec('BEGIN IMMEDIATE');try{const out=[];for(const s of stmts)out.push(await s.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
 const env={SCHEDULE_DB:wrapper,SCHEDULER_ENABLED:'true',SCHEDULER_APP_ID:'1',SCHEDULER_INSTALLATION_ID:'2',SCHEDULER_APP_BOT_ID:'3',SCHEDULER_APP_BOT_LOGIN:'test-scheduler[bot]',SCHEDULER_APP_PKCS8_B64:Buffer.alloc(384).toString('base64'),BACKOFFICE_ORIGIN:origin};
 const request=(body,at=start,from=origin)=>schedulerApi(new Request(origin+'/admin/api/schedules/',{method:body?'POST':'GET',headers:{Origin:from,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env,topics,at);
 return {db,env,request};
}
const draft=title=>({title,summary:'Bài thử trong cơ sở dữ liệu giả lập',kind:'knowledge',category:'ngon-ngu',labels:'',series:{enabled:false},blocks:[{id:'b1',kind:'paragraph',text:'Nội dung kiểm thử riêng tư',marks:[]}]});
const spec=(title,dueLocal='2030-01-01T07:01:00')=>({action:'create',draft:draft(title),dueLocal,consent:true});
test('server scheduler requires consent, recent cron heartbeat and same origin',async()=>{
 const {env,request,db}=fixture();let calls=0;const transport={publish:async()=>{calls++;throw Error('unexpected')},findIssue:async()=>null};
 assert.equal((await request(spec('Bài thử'))).status,503);
 assert.equal(await runScheduler(env,topics,{now:start,transport}),'idle');
 assert.equal((await request({...spec('Bài thử'),consent:false})).status,400);
 assert.equal((await request(spec('Bài thử'),start,'https://evil.test')).status,403);
 const x=await request(spec('Bài thử'));assert.equal(x.status,200);assert.equal(x.body.due_at,due);
 assert.equal((await request(spec('Bài thử'))).body.id,x.body.id);
 assert.equal((await request(spec('Bài thử','2030-01-01T07:02:00'))).status,409);
 assert.equal(calls,0);assert.equal(db.prepare('select count(*) as n from scheduler_jobs').get().n,1);
 assert.equal(await runScheduler(env,topics,{now:due-1,transport}),'idle');
 const list=await request();assert.equal(list.body.ready,true);assert.equal(JSON.stringify(list.body).includes('Nội dung kiểm thử riêng tư'),false);
});
test('server cron submits immutable snapshot without browser and waits for trusted Issue before advancing',async()=>{
 const {env,request,db}=fixture(),sent=[];let issue=null;
 const transport={publish:async d=>{sent.push(d.title);const prepared=await prepareSchedule({draft:d,dueLocal:'2030-01-01T07:10:00',consent:true},topics,start);return {id:prepared.id,sha:'a'.repeat(40),route:prepared.route}},findIssue:async()=>issue};
 await runScheduler(env,topics,{now:start,transport});
 const first=(await request(spec('Bài một'))).body,second=(await request(spec('Bài hai','2030-01-01T07:01:01'))).body;
 assert.equal(await runScheduler(env,topics,{now:due+1000,transport}),'dispatched');assert.deepEqual(sent,['Bài một']);
 assert.equal((await request({action:'cancel',id:first.id},due+1000)).status,409);
 assert.equal(await runScheduler(env,topics,{now:due+2000,transport}),'awaiting_issue');assert.deepEqual(sent,['Bài một']);
 issue=123;assert.equal(await runScheduler(env,topics,{now:due+3000,transport}),'accepted');
 assert.equal(db.prepare('select count(*) as n from scheduler_chunks where job_id=?').get(first.id).n,0);
 assert.equal(await runScheduler(env,topics,{now:due+4000,transport}),'dispatched');assert.deepEqual(sent,['Bài một','Bài hai']);
 assert.equal(db.prepare('select state from scheduler_jobs where id=?').get(second.id).state,'awaiting_issue');
});
test('three transient attempts stop FIFO, cancellation removes unpublished payload, disabled config sends nothing',async()=>{
 const {env,request,db}=fixture();let calls=0;
 const transport={publish:async()=>{calls++;throw Object.assign(Error('transient'),{status:503})},findIssue:async()=>null};
 await runScheduler(env,topics,{now:start,transport});
 const job=(await request(spec('Bài lỗi'))).body,other=(await request(spec('Bài hủy','2030-01-01T07:02:00'))).body;
 assert.equal((await request({action:'cancel',id:other.id})).status,200);
 assert.equal(db.prepare('select count(*) as n from scheduler_chunks where job_id=?').get(other.id).n,0);
 assert.equal(await runScheduler(env,topics,{now:due,transport}),'retry');
 assert.equal(await runScheduler(env,topics,{now:due+1000,transport}),'waiting');
 assert.equal(await runScheduler(env,topics,{now:due+120000,transport}),'retry');
 assert.equal(await runScheduler(env,topics,{now:due+360000,transport}),'blocked');
 assert.equal(await runScheduler(env,topics,{now:due+900000,transport}),'blocked');assert.equal(calls,3);
 assert.equal(db.prepare('select attempts from scheduler_jobs where id=?').get(job.id).attempts,3);
 assert.equal(await runScheduler({...env,SCHEDULER_ENABLED:'false'},topics,{now:due+900001,transport}),'disabled');
 assert.equal((await request({action:'retry',id:job.id,consent:true},due+900000)).status,200);
});
test('scheduled dispatch authorization rejects unconfigured and spoofed senders, accepts exact owner configured bot only',()=>{
 const bot='dedicated-scheduler[bot]',id='345',event={sender:{login:bot,id:345,type:'Bot'}};
 assert.equal(authorizedSubmissionEvent('duykhang68','1','push',{created:true,deleted:false}),true);
 assert.equal(authorizedSubmissionEvent(bot,id,'repository_dispatch',event,bot,id),true);
 for(const [actor,actorId,name,data,login,uid] of [[bot,id,'push',event,bot,id],[bot,'444','repository_dispatch',event,bot,id],[bot,id,'repository_dispatch',{sender:{...event.sender,id:999}},bot,id],[bot,id,'repository_dispatch',event,'',''],['other[bot]',id,'repository_dispatch',event,bot,id]])assert.equal(authorizedSubmissionEvent(actor,actorId,name,data,login,uid),false);
});
test('GitHub App token is short scoped and never uses owner PAT',async()=>{
 const {env}=fixture();const kp=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['sign','verify']);
 env.SCHEDULER_APP_PKCS8_B64=Buffer.from(await crypto.subtle.exportKey('pkcs8',kp.privateKey)).toString('base64');
 const seen=[],fetcher=async(url,opts)=>{const path=new URL(url).pathname;seen.push(path);assert.equal(opts.redirect,'manual');if(path==='/app')return Response.json({id:1,slug:'test-scheduler'});if(path==='/app/installations/2')return Response.json({app_id:1,account:{login:'duykhang68'},suspended_at:null});if(path.endsWith('/access_tokens')){assert.deepEqual(JSON.parse(opts.body),{repositories:['khoahoctienghan'],permissions:{contents:'write',issues:'read'}});return Response.json({token:'fixture-installation-token',permissions:{contents:'write',issues:'read'}})}if(path==='/users/test-scheduler%5Bbot%5D')return Response.json({id:3,login:'test-scheduler[bot]',type:'Bot'});throw Error('unexpected endpoint')};
 for(const bad of ['', 'not-base64!', 'A'.repeat(513), 'A'.repeat(16004)])await assert.rejects(mintSchedulerToken({...env,SCHEDULER_APP_PKCS8_B64:bad},()=>{throw Error('Unexpected upstream request')},start),/CONFIG_REQUIRED/);
 await assert.rejects(mintSchedulerToken({...env,SCHEDULER_APP_PKCS8_B64:Buffer.alloc(384).toString('base64')},()=>{throw Error('Unexpected upstream request')},start),e=>e.name==='DataError');
 assert.equal(await mintSchedulerToken(env,fetcher,start),'fixture-installation-token');assert.equal(seen.length,4);
 await assert.rejects(mintSchedulerToken({...env,SCHEDULER_APP_BOT_ID:'4'},fetcher,start),/APP_BOT_MISMATCH/);
});
