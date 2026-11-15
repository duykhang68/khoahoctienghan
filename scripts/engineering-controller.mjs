import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {ciJobsPassed,releaseRecoveryDecision} from './release-recovery.mjs';
import {selectPullRequestCI,branchToken} from './branch-auth.mjs';
import {incidentPublication,hasVerifiedRun,alreadyPublished,editorPublicationPending,incidentRetrospectivePR} from './incident-publication.mjs';
import {analyzeConflict,conflictEligible,mergeAdditivePosts,postsPath,repairMarker,verifiedRepair} from './conflict-resolver.mjs';
import {labelDefinitions,labelEligible,inferPRLabels} from './pr-labels.mjs';
import {ciName,releaseName,checkName,classify,trustedPR,sensitiveFile,nativePolicyReady,latestRun,canRetry,migrateSidebar,branchSyncDecision,dependabotSyncEligible,mergeReviewRequired} from './engineering-policy.mjs';
const repo=process.env.GITHUB_REPOSITORY;
if(repo!=='duykhang68/khoahoctienghan')throw Error('Wrong repository');
const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
const {BRANCH_APP_TOKEN,...childEnv}=process.env;
const cli=(args,input,token=process.env.GH_TOKEN)=>execFileSync('gh',args,{encoding:'utf8',input,env:{...childEnv,GH_TOKEN:token},stdio:['pipe','pipe','pipe'],maxBuffer:16*1024*1024});
const callApi=(path,method,data,token)=>{const out=cli(['api','-X',method,'repos/'+repo+(path?'/'+path:''),...(data?['--input','-']:[])],data?JSON.stringify(data):undefined,token);return out?JSON.parse(out):null};
const api=(path,method='GET',data)=>callApi(path,method,data,process.env.GH_TOKEN);
const appToken=branchToken(BRANCH_APP_TOKEN);
const branchApi=(path,method,data)=>{if(!appToken)throw Error('APP_SETUP_REQUIRED');return callApi(path,method,data,appToken);};
const all=(path)=>JSON.parse(cli(['api','--paginate','--slurp','repos/'+repo+'/'+path])).flat();
const issues=all('issues?state=all&per_page=100').filter(i=>!i.pull_request);
const mainSHA=()=>api('git/ref/heads/main').object.sha;
const main=mainSHA();
const hasMarker=(i,m)=>String(i.body||'').includes(m);
function incident(key,title,body){
 const marker='<!-- engine-id:'+key+' -->';
 const existing=issues.find(i=>hasMarker(i,marker));if(existing)return existing;
 const i=api('issues','POST',{title,body:'<!-- engineering-incident:v1 -->\n'+marker+'\nStatus: investigating\n\n'+body});
 issues.push(i);
 console.log('Incident #'+i.number);return i;
}
const trusted=p=>trustedPR(p,repo)&&conflictEligible(p);
const prs=all('pulls?state=open&base=main&per_page=100').sort((a,b)=>a.number-b.number);
const changed=p=>all('pulls/'+p.number+'/files?per_page=100');
// Labels are metadata only. Recover missed close events without scanning old history.
try{
 const candidates=new Map(prs.filter(p=>labelEligible(p,repo)).map(p=>[p.number,p]));
 const e=event.pull_request;
 if(e&&labelEligible(e,repo))candidates.set(e.number,e);
 const recent=api('pulls?state=closed&base=main&sort=updated&direction=desc&per_page=20');
 for(const p of recent){
  if(p.merged_at&&Date.now()-Date.parse(p.merged_at)<86400000&&labelEligible(p,repo)&&!p.labels?.length)candidates.set(p.number,p);
 }
 const definitions=new Map(all('labels?per_page=100').map(l=>[l.name,l]));
 for(const p of candidates.values()){
  try{
   const current=api('pulls/'+p.number);
   if(!labelEligible(current,repo)||current.state==='closed'&&!current.merged_at)continue;
   const wanted=inferPRLabels(current,changed(current));
   const existing=new Set((current.labels||[]).map(l=>l.name));
   const missing=wanted.filter(name=>!existing.has(name));
   for(const name of wanted){
    const def=labelDefinitions[name];
    const old=definitions.get(name);
    if(!old){
     const created=api('labels','POST',{name,...def});definitions.set(name,created);
    }else if(['techblog','engineering','automation'].includes(name)&&old.color==='ededed'&&!old.description){
     // Upgrade only the default gray labels just bootstrapped by the metadata API.
     const updated=api('labels/'+encodeURIComponent(name),'PATCH',def);definitions.set(name,updated);
    }
   }
   if(missing.length){api('issues/'+p.number+'/labels','POST',{labels:missing});console.log('LABELLED PR #'+p.number+' · '+missing.join(', '));}
  }catch{console.log('LABEL_DEFERRED PR #'+p.number);}
 }
}catch{console.log('LABEL_RECONCILIATION_DEFERRED');}
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
  if(kind==='STARLIGHT_SIDEBAR'&&p&&run.name===ciName&&!appToken)console.log('APP_SETUP_REQUIRED: known fixer deferred');
  if(kind==='STARLIGHT_SIDEBAR'&&p&&run.name===ciName&&appToken){
   const files=changed(p);
   // Allow only the precise config migration on an owner PR without sensitive infrastructure changes.
   if(!sensitive(files.filter(f=>f.filename==='astro.config.mjs'&&!f.previous_filename?false:true))){
    const current=api('contents/astro.config.mjs?ref='+p.head.sha);
    const old=Buffer.from(current.content,'base64').toString('utf8'),next=migrateSidebar(old);
    if(next!==old&&api('git/ref/heads/'+encodeURIComponent(p.head.ref)).object.sha===p.head.sha){
     const commit=api('git/commits/'+p.head.sha);
     const tree=branchApi('git/trees','POST',{base_tree:commit.tree.sha,tree:[{path:'astro.config.mjs',mode:'100644',type:'blob',content:next}]});
     const fixed=branchApi('git/commits','POST',{message:'fix(ci): apply known Starlight sidebar migration',tree:tree.sha,parents:[p.head.sha]});
     // Non-forced update rejects a concurrent incompatible branch advance.
     branchApi('git/refs/heads/'+encodeURIComponent(p.head.ref),'PATCH',{sha:fixed.sha,force:false});
     console.log('APP_FIX_COMMITTED PR #'+p.number+'; await native PR CI');
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
 const pending=editorPublicationPending(issues);
 if(pending)console.log('RETROSPECTIVES_DEFERRED: Editor V2 publication FIFO has an unverified request');
 for(const issue of pending?[]:issues){
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
else if(mainCI.status==='completed'&&mainCI.conclusion==='success'){
 try{
  const releases=api('actions/workflows/release.yml/runs?branch=main&head_sha='+main+'&per_page=100').workflow_runs;
  const decision=releaseRecoveryDecision({main,repo,ci:mainCI,releases,now:Date.now()});
  if(decision==='MISSING'){
   const jobs=api('actions/runs/'+mainCI.id+'/jobs?per_page=100').jobs;
   const artifacts=api('actions/runs/'+mainCI.id+'/artifacts?per_page=100').artifacts;
   const fresh=api('actions/workflows/release.yml/runs?branch=main&head_sha='+main+'&per_page=100').workflow_runs;
   if(ciJobsPassed(jobs,mainCI.event)&&artifacts.some(a=>a.name==='knowledge-base-release'&&!a.expired&&a.size_in_bytes>0)&&mainSHA()===main&&releaseRecoveryDecision({main,repo,ci:mainCI,releases:fresh,now:Date.now()})==='MISSING'){
    api('actions/workflows/release.yml/dispatches','POST',{ref:'main',inputs:{expected_sha:main,ci_run_id:String(mainCI.id)}});
    console.log('RELEASE_RECOVERY_REQUESTED '+main);
   }else console.log('RELEASE_RECOVERY_DEFERRED '+main);
  }else console.log('RELEASE_RECOVERY_'+decision+' '+main);
 }catch{console.log('RELEASE_RECOVERY_DEFERRED '+main);}
}

// Exact Git snapshots are data only. Never checkout or execute the conflicting branch in this privileged job.
const gitTree=sha=>api('git/trees/'+api('git/commits/'+sha).tree.sha+'?recursive=1');
const blobText=sha=>{const b=api('git/blobs/'+sha);if(b.encoding!=='base64'||b.size>5000000)throw Error('unsafe blob');return Buffer.from(b.content,'base64').toString('utf8')};
const stillCurrent=p=>mainSHA()===main&&api('git/ref/heads/'+encodeURIComponent(p.head.ref)).object.sha===p.head.sha;
const exactMainGreen=()=>Boolean(mainCI&&mainCI.head_sha===main&&mainCI.status==='completed'&&mainCI.conclusion==='success'&&ciJobsPassed(api('actions/runs/'+mainCI.id+'/jobs?per_page=100').jobs,mainCI.event));
function resolveConflict(p,comparison){
 const prefix='conflict-'+p.number+'-'+p.head.sha;
 const record=incident(prefix,'[Conflict] PR #'+p.number,'PR: '+p.html_url+'\n\nSHA: '+p.head.sha+'\n\nSemantic conflict requires research; no ours/theirs.');
 if(record.state!=='open'||record.user?.login!=='github-actions[bot]')return;
 const base=comparison.merge_base_commit?.sha;
 if(!/^[a-f0-9]{40}$/.test(base||'')||!stillCurrent(p))return;
 const mark='<!-- resolver-analysis:'+main+' -->';
 // At most one analysis/automatic write attempt per exact main/head pair.
 if(hasMarker(record,mark))return;
 const files=changed(p);
 const plan=files.length===p.changed_files?analyzeConflict({base:gitTree(base),head:gitTree(p.head.sha),main:gitTree(main),files}):{kind:'BLOCKED_INCOMPLETE'};
 let decision=plan.kind,merged=null;
 if(decision==='TRY_ADDITIVE_POSTS'){
  merged=mergeAdditivePosts(...plan.blobs.map(blobText));decision=merged?.kind||'RESEARCH_REQUIRED';
 }
 const note='\n\n'+mark+'\nResolver 2.0: '+decision+'; base '+base+'; main '+main+'; HEAD '+p.head.sha+'; paths '+(plan.count??'unknown')+'; identical '+(plan.exact??'unknown')+'. Researcher: compare exact source and regression intent; for non-identical/protected code prepare a minimal reviewed repair or documented supersession, never blanket ours/theirs.';
 const save=extra=>api('issues/'+record.number,'PATCH',{body:record.body+note+extra});
 if(!appToken){console.log('APP_SETUP_REQUIRED PR #'+p.number+'; conflict write deferred');return;}
 if(!stillCurrent(p))return;
 if(decision==='EXACT_DUPLICATE'&&exactMainGreen()){
  const fresh=api('pulls/'+p.number);
  if(!trusted(fresh)||fresh.state!=='open'||fresh.head.sha!==p.head.sha||!stillCurrent(p))return;
  // REST PR close is not a compare-and-swap; recheck immutable HEAD/current main immediately before write.
  const closed=branchApi('pulls/'+p.number,'PATCH',{state:'closed'});
  if(closed.state!=='closed'||closed.head?.sha!==p.head.sha){console.log('CLOSE_REVIEW_REQUIRED PR #'+p.number);return;}
  api('issues/'+record.number,'PATCH',{state:'closed',state_reason:'not_planned',body:record.body+note+'\n\n<!-- superseded -->\nStatus: SUPERSEDED — identical regular blobs on exact green main; CI '+mainCI.html_url+'; no production claim.'});
  return;
 }
 if(decision==='EXACT_DUPLICATE'){console.log('WAITING_MAIN_CI PR #'+p.number);return;}
 if(decision==='MERGED'){
  // This one known transform is solely for additive Tech Blog records; no protected file changes.
  const mainTree=api('git/commits/'+main).tree.sha;
  const tree=branchApi('git/trees','POST',{base_tree:mainTree,tree:[{path:postsPath,mode:'100644',type:'blob',content:merged.content}]});
  const fixed=branchApi('git/commits','POST',{message:'fix(conflict): merge independent additive Tech Blog records',tree:tree.sha,parents:[p.head.sha,main]});
  if(!stillCurrent(p))return;
  save('\n'+repairMarker(fixed.sha,main)+'\nStatus: WAITING_NATIVE_PR_CI');
  // Non-forced ref update; never bypass required checks or write main.
  branchApi('git/refs/heads/'+encodeURIComponent(p.head.ref),'PATCH',{sha:fixed.sha,force:false});
  console.log('CONFLICT_FIX_COMMITTED PR #'+p.number+'; await native PR CI');return;
 }
 save('\nStatus: RESEARCH_REQUIRED');
}
// Synchronize independently of merge authorization. Only owner-created, same-repo PRs.
const synchronized=[];
for(const p of prs){
 if(!trusted(p))continue;
 if(incidentRetrospectivePR(p)&&editorPublicationPending(issues)){console.log('EDITOR_FIFO_PRIORITY: retrospective PR #'+p.number+' deferred');continue;}
 const current=api('pulls/'+p.number);
 if(current.state!=='open'||current.base.ref!=='main'||current.head.sha!==p.head.sha||!trusted(current)||mainSHA()!==main)continue;
 const compare=api('compare/'+main+'...'+current.head.sha);
 const decision=branchSyncDecision(current,compare);
 if(decision==='CONFLICT'){
  try{resolveConflict(current,compare)}catch{console.log('CONFLICT_RESOLUTION_DEFERRED PR #'+p.number)}
  continue;
 }
 if(decision==='UPDATE'){
  if(mainSHA()!==main)break;
  if(!appToken){console.log('APP_SETUP_REQUIRED PR #'+p.number+'; branch update deferred');continue;}
  try{
   branchApi('pulls/'+p.number+'/update-branch','PUT',{expected_head_sha:current.head.sha});
   console.log('UPDATE_REQUESTED PR #'+p.number+' · '+current.head.sha.slice(0,12));
   // HTTP 202 is only acceptance. The App-triggered native CI completion reconciles the new exact HEAD; never poll the old HEAD here.
   console.log('WAITING_NATIVE_PR_CI PR #'+p.number);
  }catch{console.log('UPDATE_DEFERRED PR #'+p.number+'; GitHub rejected request or a race occurred')}
  continue;
 }
 if(decision!=='CURRENT'){console.log('WAITING PR #'+p.number+' · '+decision);continue}
 const runs=api('actions/workflows/ci.yml/runs?head_sha='+current.head.sha+'&per_page=30').workflow_runs;
 const exact=selectPullRequestCI(runs,current.head.sha,repo,current.head.ref);
 // Dispatch-only CI cannot replace the native integrated PR check.
 if(!exact){console.log('WAITING_NATIVE_PR_CI PR #'+p.number);continue}
 if(exact.conclusion==='action_required'){console.log('LEGACY_APPROVAL_REQUIRED PR #'+p.number);continue}
 if(exact.status!=='completed'||exact.conclusion!=='success')continue;
 // Close only a tracked repair with the exact native CI and unchanged base/head.
 try{
  const records=issues.filter(i=>hasMarker(i,'<!-- engineering-incident:v1 -->')&&String(i.body||'').includes('<!-- engine-id:conflict-'+current.number+'-')&&verifiedRepair(i,current.head.sha,main));
  if(records.length&&stillCurrent(current)&&ciJobsPassed(api('actions/runs/'+exact.id+'/jobs?per_page=100').jobs,exact.event)){
   for(const i of records)if(stillCurrent(current))api('issues/'+i.number,'PATCH',{state:'closed',state_reason:'completed',body:i.body+'\n\nStatus: VERIFIED (native PR CI only)\n<!-- verified-sha: '+current.head.sha+' -->\n'+exact.html_url});
  }
 }catch{console.log('CONFLICT_VERIFICATION_DEFERRED PR #'+p.number)}
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
 const current=api('pulls/'+p.number);
 if(current.state!=='open'||!trusted(current)||current.base.ref!=='main'||current.head.sha!==p.head.sha||mainSHA()!==main)continue;
 if(branchSyncDecision(current,api('compare/'+main+'...'+current.head.sha))!=='CURRENT')continue;
 if(incidentRetrospectivePR(current)&&editorPublicationPending(all('issues?state=all&per_page=100'))){console.log('EDITOR_FIFO_PRIORITY: retrospective merge deferred');continue;}
 if(mergeReviewRequired(current,changed(current))){console.log('REVIEW_REQUIRED PR #'+p.number+' · protected paths or test-only change');continue;}
 const jobs=api('actions/runs/'+exact.id+'/jobs?per_page=100').jobs;
 if(!ciJobsPassed(jobs,exact.event))continue;
 if(mainSHA()!==main)break;
 try{cli(['pr','merge',String(p.number),'--repo',repo,'--squash','--match-head-commit',p.head.sha]);}catch{console.log('Native merge requirements are not satisfied');continue}
 const merged=api('pulls/'+p.number);
 if(merged.merged){dispatch('main');console.log('Merged via GitHub rules; CI will verify new main '+merged.merge_commit_sha);break}
}
