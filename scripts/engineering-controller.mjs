import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {incidentPublication,hasVerifiedRun,alreadyPublished} from './incident-publication.mjs';
import {ciName,releaseName,checkName,classify,trustedPR,sensitiveFile,nativePolicyReady,latestRun,canRetry,migrateSidebar,branchSyncDecision,dependabotSyncEligible} from './engineering-policy.mjs';
const repo=process.env.GITHUB_REPOSITORY;
if(repo!=='duykhang68/khoahoctienghan')throw Error('Wrong repository');
const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
const cli=(args,input)=>execFileSync('gh',args,{encoding:'utf8',input,stdio:['pipe','pipe','pipe'],maxBuffer:16*1024*1024});
const api=(path,method='GET',data)=>{const out=cli(['api','-X',method,'repos/'+repo+(path?'/'+path:''),...(data?['--input','-']:[])],data?JSON.stringify(data):undefined);return out?JSON.parse(out):null};
const all=(path)=>JSON.parse(cli(['api','--paginate','--slurp','repos/'+repo+'/'+path])).flat();
const issues=all('issues?state=all&per_page=100').filter(i=>!i.pull_request);
const mainSHA=()=>api('git/ref/heads/main').object.sha;
const main=mainSHA();
const hasMarker=(i,m)=>String(i.body||'').includes(m);
function incident(key,title,body){
 const marker='<!-- engine-id:'+key+' -->';
 if(issues.some(i=>hasMarker(i,marker)))return;
 const i=api('issues','POST',{title,body:'<!-- engineering-incident:v1 -->\n'+marker+'\nStatus: investigating\n\n'+body});
 issues.push(i);
 console.log('Incident #'+i.number);
}
const trusted=p=>trustedPR(p,repo);
const prs=all('pulls?state=open&base=main&per_page=100').sort((a,b)=>a.number-b.number);
const changed=p=>all('pulls/'+p.number+'/files?per_page=100');
const sensitive=files=>files.some(f=>sensitiveFile(f.filename)||sensitiveFile(f.previous_filename));
const dispatch=(ref,workflow='ci.yml')=>api('actions/workflows/'+workflow+'/dispatches','POST',{ref});
const run=event.workflow_run;
// Only repository-local CI/CD runs. Do not print untrusted logs or use their text as commands.
if(run?.head_repository?.full_name===repo&&[ciName,releaseName].includes(run.name)&&run.conclusion==='failure'){
 let logs='';try{logs=cli(['run','view',String(run.id),'--repo',repo,'--log-failed'])}catch{}
 let jobs=[];try{jobs=api('actions/runs/'+run.id+'/jobs?per_page=100').jobs}catch{}
 const kind=classify({run,jobs,logs,main});
 if(kind==='SUPERSEDED')console.log('SUPERSEDED: no bug incident for stale deployment');
 else {
  incident('run-'+run.id,'[Engineering] '+kind+' · '+run.head_sha.slice(0,12),'Evidence: '+run.html_url+'\n\nSHA: '+run.head_sha+'\n\nClassification: '+kind+'\n\nRequired: research, minimal patch, regression and verified SHA. Do not disclose logs or credentials.');
  const p=prs.find(p=>trusted(p)&&p.head.sha===run.head_sha);
  if(kind==='STARLIGHT_SIDEBAR'&&p&&run.name===ciName){
   const files=changed(p);
   // Allow only the precise config migration on an owner PR without sensitive infrastructure changes.
   if(!sensitive(files.filter(f=>f.filename==='astro.config.mjs'&&!f.previous_filename?false:true))){
    const current=api('contents/astro.config.mjs?ref='+p.head.sha);
    const old=Buffer.from(current.content,'base64').toString('utf8'),next=migrateSidebar(old);
    if(next!==old&&api('git/ref/heads/'+encodeURIComponent(p.head.ref)).object.sha===p.head.sha){
     const commit=api('git/commits/'+p.head.sha);
     const tree=api('git/trees','POST',{base_tree:commit.tree.sha,tree:[{path:'astro.config.mjs',mode:'100644',type:'blob',content:next}]});
     const fixed=api('git/commits','POST',{message:'fix(ci): apply known Starlight sidebar migration',tree:tree.sha,parents:[p.head.sha]});
     // Non-forced update rejects a concurrent incompatible branch advance.
     api('git/refs/heads/'+encodeURIComponent(p.head.ref),'PATCH',{sha:fixed.sha,force:false});
     dispatch(p.head.ref);
     process.exit(0);
    }
   }
  }
  if(canRetry(kind,run,Boolean(p||run.head_sha===main))){
   api('actions/runs/'+run.id+'/rerun-failed-jobs','POST');process.exit(0);
  }
 }
}
// One incident, one retrospective. The scheduled Researcher authors the content PR.
try{
 const posts=JSON.parse(readFileSync('src/data/techblog/posts.json','utf8'));
 for(const issue of issues){
  const record=incidentPublication(issue,repo);
  if(!record||alreadyPublished(record,posts,prs))continue;
  const marker='<!-- techblog-incident:'+record.number+' -->';
  if(issues.some(x=>hasMarker(x,marker)))continue;
  let evidence=[];
  for(const id of record.runIds.slice(0,20)){try{evidence.push(api('actions/runs/'+id))}catch{}}
  if(!hasVerifiedRun(record,evidence,repo)){console.log('BLOG_BLOCKED #'+record.number+' · no exact successful run');continue}
  // Only trusted source facts, no issue body or raw logs copied into a public candidate.
  issues.push(api('issues','POST',{title:'[Tech Blog] Bugfix retrospective #'+record.number,body:marker+'\n\nSource: https://github.com/'+repo+'/issues/'+record.number+'\nVerified SHA: '+record.sha+'\n\nResearcher: verify root cause, fix, regression, official sources and deployment if applicable; write one Vietnamese article at slug '+record.slug+' via content PR. Confirm lesson record, do not publish sensitive material or invent evidence.'}));
  console.log('BLOG_QUEUED #'+record.number);
 }
}catch{console.log('BLOG_RECONCILIATION_DEFERRED');}
// Recover missing main CI when a token-originated merge did not emit a push-triggered run.
const mainRuns=api('actions/workflows/ci.yml/runs?branch=main&head_sha='+main+'&per_page=30').workflow_runs;
const mainCI=latestRun(mainRuns,main,repo,['push','workflow_dispatch'],'main');
if(!mainCI){dispatch('main');console.log('Dispatched missing current main CI');}
// Synchronize independently of merge authorization. Only owner-created, same-repo PRs.
const synchronized=[];
for(const p of prs){
 if(!trusted(p))continue;
 const current=api('pulls/'+p.number);
 if(current.state!=='open'||current.base.ref!=='main'||current.head.sha!==p.head.sha||!trusted(current)||mainSHA()!==main)continue;
 const compare=api('compare/'+main+'...'+current.head.sha);
 const decision=branchSyncDecision(current,compare);
 if(decision==='CONFLICT'){
  incident('conflict-'+p.number+'-'+current.head.sha,'[Conflict] PR #'+p.number,'PR: '+p.html_url+'\n\nSHA: '+current.head.sha+'\n\nSemantic conflict requires research; no ours/theirs.');
  continue;
 }
 if(decision==='UPDATE'){
  if(mainSHA()!==main)break;
  try{
   api('pulls/'+p.number+'/update-branch','PUT',{expected_head_sha:current.head.sha});
   console.log('UPDATE_REQUESTED PR #'+p.number+' · '+current.head.sha.slice(0,12));
   // update-branch returns 202; wait briefly for the actual new HEAD, never reuse an old SHA.
   for(let attempt=0;attempt<6;attempt++){
    await new Promise(resolve=>setTimeout(resolve,2000));
    const fresh=api('pulls/'+p.number);
    if(fresh.state!=='open'||!trusted(fresh))break;
    if(fresh.head.sha===current.head.sha)continue;
    const runs=api('actions/workflows/ci.yml/runs?head_sha='+fresh.head.sha+'&per_page=30').workflow_runs;
    if(!latestRun(runs,fresh.head.sha,repo,['pull_request','workflow_dispatch'],fresh.head.ref))dispatch(fresh.head.ref);
    console.log('UPDATED PR #'+p.number+' · '+fresh.head.sha.slice(0,12));
    break;
   }
  }catch{console.log('UPDATE_DEFERRED PR #'+p.number+'; GitHub rejected request or a race occurred')}
  continue;
 }
 if(decision!=='CURRENT'){console.log('WAITING PR #'+p.number+' · '+decision);continue}
 const runs=api('actions/workflows/ci.yml/runs?head_sha='+current.head.sha+'&per_page=30').workflow_runs;
 const exact=latestRun(runs,current.head.sha,repo,['pull_request','workflow_dispatch'],current.head.ref);
 // Recover CI suppressed when a GitHub token updates an owner branch.
 if(!exact){dispatch(current.head.ref);console.log('CI_DISPATCHED PR #'+p.number);continue}
 if(exact.status!=='completed'||exact.conclusion!=='success')continue;
 synchronized.push({p:current,exact});
}
// Dependabot owns its own branches; do not push commits onto them.
// Only automatic synchronization, never new merge approval, for already owner-armed Dependabot PRs.
for(const p of prs){
 if(!dependabotSyncEligible(p,repo))continue;
 const current=api('pulls/'+p.number);
 if(!dependabotSyncEligible(current,repo)||current.state!=='open'||current.head.sha!==p.head.sha||current.base.ref!=='main')continue;
 const compare=api('compare/'+main+'...'+current.head.sha);
 if(compare.behind_by<=0||mainSHA()!==main)continue;
 const marker='<!-- branch-sync:'+main+':'+current.head.sha+' -->';
 const comments=all('issues/'+p.number+'/comments?per_page=100');
 if(comments.some(c=>['github-actions[bot]','duykhang68'].includes(c.user?.login)&&String(c.body||'').includes(marker)))continue;
 api('issues/'+p.number+'/comments','POST',{body:'@dependabot rebase\n\n'+marker});
 console.log('DEPENDABOT_REBASE_REQUESTED PR #'+p.number);
}
// Merge authorization stays separate; require native policy and exact fresh green HEAD.
let rules;try{rules=api('rules/branches/main')}catch{console.log('BLOCKED: cannot verify active repository rules');process.exit(0)}
if(!nativePolicyReady(api(''),rules)){console.log('BLOCKED: native merge policy not ready');process.exit(0)}
for(const {p,exact} of synchronized){
 if(sensitive(changed(p))){console.log('REVIEW_REQUIRED PR #'+p.number);continue}
 const current=api('pulls/'+p.number);
 if(current.state!=='open'||!trusted(current)||current.base.ref!=='main'||current.head.sha!==p.head.sha||mainSHA()!==main)continue;
 if(branchSyncDecision(current,api('compare/'+main+'...'+current.head.sha))!=='CURRENT')continue;
 const jobs=api('actions/runs/'+exact.id+'/jobs?per_page=100').jobs;
 if(!jobs.some(j=>j.name===checkName&&j.conclusion==='success')||jobs.some(j=>j.conclusion!=='success'))continue;
 if(mainSHA()!==main)break;
 try{cli(['pr','merge',String(p.number),'--repo',repo,'--squash','--match-head-commit',p.head.sha]);}catch{console.log('Native merge requirements are not satisfied');continue}
 const merged=api('pulls/'+p.number);
 if(merged.merged){dispatch('main');console.log('Merged via GitHub rules; CI will verify new main '+merged.merge_commit_sha);break}
}
