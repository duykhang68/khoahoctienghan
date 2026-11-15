import {readFileSync} from 'node:fs';
import {ciJobsPassed} from './release-recovery.mjs';
import {selectPullRequestCI} from './branch-auth.mjs';
import {editorPublicationPending,incidentRetrospectivePR} from './incident-publication.mjs';
import {conflictEligible,verifiedRepair} from './conflict-resolver.mjs';
import {trustedPR,nativePolicyReady,branchSyncDecision,dependabotSyncEligible,mergeReviewRequired} from './engineering-policy.mjs';
import {createGithubCli} from './adapters/github-cli.mjs';
import {reconcileLabels} from './engineering/labels.mjs';
import {reconcileFailure} from './engineering/failure.mjs';
import {reconcileRetrospectives} from './engineering/retrospectives.mjs';
import {reconcileMainRelease} from './engineering/release.mjs';
import {createConflictResolver} from './engineering/conflicts.mjs';
const repo=process.env.GITHUB_REPOSITORY;
if(repo!=='duykhang68/khoahoctienghan')throw Error('Wrong repository');
const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
const {cli,api,branchApi,all,appToken}=createGithubCli({repo,env:process.env});
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
reconcileLabels({prs,event,repo,api,all,changed});
const dispatch=(ref,workflow='ci.yml')=>api('actions/workflows/'+workflow+'/dispatches','POST',{ref});
if(reconcileFailure({event,repo,main,prs,cli,api,branchApi,appToken,changed,trusted,incident}))process.exit(0);
reconcileRetrospectives({repo,issues,prs,api,hasMarker});
const mainCI=reconcileMainRelease({api,main,repo,dispatch,mainSHA});
const {resolveConflict,stillCurrent}=createConflictResolver({api,branchApi,appToken,main,mainCI,mainSHA,incident,hasMarker,changed,trusted});
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
