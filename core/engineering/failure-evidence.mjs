// Stage-only evidence for new incidents. Never copy raw log text, job/step names,
// credentials, PR code, or arbitrary error messages into public GitHub Issues.
const stageOf=name=>{
 const s=String(name??'');
 if(/^Run npm run test:engineering(?:\s|$)/.test(s))return 'ENGINEERING_TEST';
 if(/^Run npm run test:e2e(?:\s|$)/.test(s))return 'BROWSER_E2E';
 if(/^Run npm run check(?:\s|$)/.test(s))return 'CONTENT_VALIDATION';
 if(/^Run npm run build(?:\s|$)/.test(s))return 'ASTRO_BUILD';
 if(/^Run node scripts\/verify-build\.mjs(?:\s|$)/.test(s))return 'STATIC_BUILD_VERIFICATION';
 return 'UNCLASSIFIED_STEP';
};
// Linked by exact run/job ID, not by interpolated untrusted names or logs.
export function structuredFailureEvidence({jobs,runId}){
 if(!Number.isSafeInteger(runId)||runId<=0||!Array.isArray(jobs))return 'Failure stage: NOT_AVAILABLE';
 const failures=[];
 for(const j of jobs){
  if(!Number.isSafeInteger(j?.id)||j.id<=0||!Array.isArray(j.steps))continue;
  for(const s of j.steps){
   if(s?.conclusion!=='failure')continue;
   const stage=stageOf(s.name),key=j.id+':'+stage;
   if(failures.some(x=>x.key===key))continue;
   failures.push({key,stage,id:j.id});
   if(failures.length===3)break;
  }
  if(failures.length===3)break;
 }
 if(!failures.length)return 'Failure stage: NOT_AVAILABLE';
 return 'Failure stage (structured metadata; not a root-cause conclusion):\n'+failures.map(f=>'- '+f.stage+' — https://github.com/duykhang68/khoahoctienghan/actions/runs/'+runId+'/job/'+f.id).join('\n');
}
