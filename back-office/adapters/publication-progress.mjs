// Owner-session-gated, read-only FIFO snapshot; credentials never leave the Worker.
import {queueRows,progressFor,exactEvidenceRun,currentEvidencePR} from '../../src/lib/sheet-blog/core/progress.mjs';
const repo='duykhang68/khoahoctienghan',root='https://api.github.com/repos/'+repo;
const freshMs=300000,staleMs=3600000;
let saved=null,pending=null;
async function build(env,fetcher,now){
 const token=typeof env?.PUBLICATION_GITHUB_TOKEN==='string'?env.PUBLICATION_GITHUB_TOKEN.trim():'';
 const get=async path=>{
  const headers={Accept:'application/vnd.github+json','User-Agent':'korean-publication-progress'};
  if(token)headers.Authorization='Bearer '+token;
  let response;try{response=await fetcher(root+path,{method:'GET',headers,redirect:'manual',signal:AbortSignal.timeout(12000)})}catch{throw Error('GITHUB_UNAVAILABLE')}
  if(response.status===403||response.status===429)throw Error('GITHUB_RATE_LIMITED');
  if(response.status!==200)throw Error('GITHUB_UNAVAILABLE');
  try{return await response.json()}catch{throw Error('GITHUB_UNAVAILABLE')}
 };
 const issues=[];
 for(let page=1;page<=20;page++){
  const batch=await get('/issues?state=all&per_page=100&sort=created&direction=asc&page='+page);
  if(!Array.isArray(batch)||batch.length>100)throw Error('GITHUB_INVALID');
  issues.push(...batch);
  if(batch.length<100)break;
  if(page===20)throw Error('GITHUB_BOUNDS');
 }
 const rows=queueRows(issues),head=rows.find(item=>progressFor(item).done!==6),evidence={};
 if(head?.phase==='WAITING_CI'&&head.head&&head.base&&head.pr){
  const pr=await get('/pulls/'+head.pr);
  if(!currentEvidencePR(pr,head,repo))evidence[head.number]={staleHead:true};
  else{
   const result=await get('/actions/workflows/ci.yml/runs?head_sha='+head.head+'&per_page=30');
   evidence[head.number]={ci:exactEvidenceRun(result.workflow_runs||[],head.head,['pull_request'],'content/editor-fifo-'+head.number+'-'+head.base.slice(0,12),repo)};
  }
 }else if(head?.phase==='MERGED'&&head.merge){
  const result=await get('/actions/workflows/release.yml/runs?head_sha='+head.merge+'&per_page=30');
  const cd=exactEvidenceRun(result.workflow_runs||[],head.merge,['workflow_run','workflow_dispatch'],'main',repo);
  evidence[head.number]={cd};
  if(Number.isSafeInteger(cd?.id)&&cd.id>0){
   const jobs=await get('/actions/runs/'+cd.id+'/jobs?per_page=100');
   evidence[head.number].deploy=(jobs.jobs||[]).find(job=>job.name==='deploy');
  }
 }
 return {rows,evidence,updatedAt:new Date(now).toISOString(),stale:false};
}
export async function publicationSnapshot(env={},fetcher=fetch,now=Date.now()){
 if(saved&&now<saved.expires)return {...saved.value,fromCache:true};
 if(pending)return pending;
 pending=(async()=>{
  try{
   const value=await build(env,fetcher,now);
   saved={value,created:now,expires:now+freshMs};
   return {...value,fromCache:false};
  }catch(error){
   if(saved&&now-saved.created<staleMs)return {...saved.value,stale:true,fromCache:true,warning:error?.message==='GITHUB_RATE_LIMITED'?'GITHUB_RATE_LIMITED':'GITHUB_UNAVAILABLE'};
   throw error;
  }
 })();
 try{return await pending}finally{pending=null}
}
