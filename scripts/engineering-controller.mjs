import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {ciName,releaseName,checkName,classify,trustedPR,sensitiveFile,nativePolicyReady,latestRun,canRetry,migrateSidebar} from './engineering-policy.mjs';
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
// Preserve stable, deduplicated editorial batches. Keep previously consumed issue IDs.
const verified=issues.filter(i=>i.state==='closed'&&['duykhang68','github-actions[bot]'].includes(i.user.login)&&hasMarker(i,'<!-- engineering-incident:v1 -->')&&/<!-- verified-sha: [a-f0-9]{40} -->/.test(i.body||'')).sort((a,b)=>a.number-b.number);
const consumed=new Set(issues.filter(i=>['duykhang68','github-actions[bot]'].includes(i.user.login)).flatMap(i=>[...String(i.body||'').matchAll(/<!-- techblog-batch-([\d-]+) -->/g)].flatMap(m=>m[1].split('-').map(Number))));
const remaining=verified.filter(i=>!consumed.has(i.number));
for(let i=0;i+5<=remaining.length;i+=5){
 const batch=remaining.slice(i,i+5),marker='<!-- techblog-batch-'+batch.map(x=>x.number).join('-')+' -->';
 if(!issues.some(x=>hasMarker(x,marker)))issues.push(api('issues','POST',{title:'[Tech Blog] Engineering retrospective '+batch.map(x=>'#'+x.number).join(', '),body:marker+'\n\nSynthesize these verified incidents with sources and regression tests. Publish only via reviewed PR.\n\n'+batch.map(x=>'- '+x.html_url).join('\n')}));
}
// Recover missing main CI when a token-originated merge did not emit a push-triggered run.
const mainRuns=api('actions/workflows/ci.yml/runs?branch=main&head_sha='+main+'&per_page=30').workflow_runs;
const mainCI=latestRun(mainRuns,main,repo,['push','workflow_dispatch'],'main');
if(!mainCI){dispatch('main');console.log('Dispatched missing current main CI');}
// Merge authorization is delegated to GitHub rules, not the previous production version.
let rules;try{rules=api('rules/branches/main')}catch{console.log('BLOCKED: cannot verify active repository rules');process.exit(0)}
if(!nativePolicyReady(api(''),rules)){console.log('BLOCKED: configure native auto merge and strict main ruleset first');process.exit(0)}
for(const p of prs){
 if(!trusted(p)||sensitive(changed(p)))continue;
 const current=api('pulls/'+p.number);
 if(current.head.sha!==p.head.sha||current.base.sha!==main||current.draft||mainSHA()!==main)continue;
 if(current.mergeable===false){incident('conflict-'+p.number+'-'+p.head.sha,'[Conflict] PR #'+p.number,'PR: '+p.html_url+'\n\nSHA: '+p.head.sha+'\n\nSemantic conflict must be reviewed; no ours/theirs.');continue}
 if(current.mergeable!==true)continue;
 const comparison=api('compare/'+main+'...'+p.head.sha);
 if(comparison.status!=='ahead'){
  try{api('pulls/'+p.number+'/update-branch','PUT',{expected_head_sha:p.head.sha});console.log('Requested clean branch update')}catch{console.log('Branch update deferred')}
  continue;
 }
 const runs=api('actions/workflows/ci.yml/runs?head_sha='+p.head.sha+'&per_page=30').workflow_runs;
 const exact=latestRun(runs,p.head.sha,repo,['pull_request','workflow_dispatch'],p.head.ref);
 if(!exact){dispatch(p.head.ref);continue}
 if(exact.status!=='completed'||exact.conclusion!=='success')continue;
 const jobs=api('actions/runs/'+exact.id+'/jobs?per_page=100').jobs;
 if(!jobs.some(j=>j.name===checkName&&j.conclusion==='success')||jobs.some(j=>j.conclusion!=='success'))continue;
 if(mainSHA()!==main)break;
 // GitHub enforces the required checks and up-to-date base atomically; no --admin override.
 // Immediate merge only: do not leave an auto-merge armed for an unreviewed future head.
 try{cli(['pr','merge',String(p.number),'--repo',repo,'--squash','--match-head-commit',p.head.sha]);}catch{console.log('Native merge requirements are not satisfied');continue}
 const merged=api('pulls/'+p.number);
 if(merged.merged){dispatch('main');console.log('Merged via GitHub rules; CI will verify new main '+merged.merge_commit_sha);break}
}
