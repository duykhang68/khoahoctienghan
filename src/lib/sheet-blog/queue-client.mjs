import {queueRows,exactEvidenceRun,currentEvidencePR,isPositiveNumber} from './core/progress.mjs';
const repo='duykhang68/khoahoctienghan',api='https://api.github.com/repos/'+repo;
export function queueClient(fetcher=fetch,{strictHead=false}={}){
 const get=async path=>{
  const response=await fetcher(api+path,{headers:{Accept:'application/vnd.github+json'},credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('GitHub HTTP '+response.status);
  return response.json();
 };
 async function list(){
  const all=[];
  for(let p=1;p<=20;p++){
   const items=await get('/issues?state=all&per_page=100&sort=created&direction=asc&page='+p);
   if(!Array.isArray(items))throw Error('Dữ liệu Issue không hợp lệ');
   all.push(...items);
   if(items.length<100)return queueRows(all);
  }
  throw Error('Danh sách Issue vượt giới hạn tải an toàn');
 }
 async function evidence(item){
  const latest=(runs,hash,events,branch)=>exactEvidenceRun(runs,hash,events,branch,repo);
  if(item.phase==='WAITING_CI'&&item.head&&item.base&&item.pr){
   if(strictHead){
    const pr=await get('/pulls/'+item.pr);
    if(!currentEvidencePR(pr,item,repo))return {staleHead:true};
   }
   const x=await get('/actions/workflows/ci.yml/runs?head_sha='+item.head+'&per_page=30');
   return {ci:latest(x.workflow_runs||[],item.head,['pull_request'],'content/editor-fifo-'+item.number+'-'+item.base.slice(0,12))};
  }
  if(item.phase==='MERGED'&&item.merge){
   const x=await get('/actions/workflows/release.yml/runs?head_sha='+item.merge+'&per_page=30');
   const cd=latest(x.workflow_runs||[],item.merge,['workflow_run','workflow_dispatch'],'main');
   if(isPositiveNumber(cd?.id)){const jobs=await get('/actions/runs/'+cd.id+'/jobs?per_page=100');return {cd,deploy:(jobs.jobs||[]).find(j=>j.name==='deploy')}}
   return {cd};
  }
  return {};
 }
 return {list,evidence};
}
