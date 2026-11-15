import {ciName,releaseName,classify,canRetry,migrateSidebar,sensitiveFile} from '../engineering-policy.mjs';
export function reconcileFailure({event,repo,main,prs,cli,api,branchApi,appToken,changed,trusted,incident}){
const sensitive=files=>files.some(f=>sensitiveFile(f.filename)||sensitiveFile(f.previous_filename));
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
     return true;
    }
   }
  }
  if(canRetry(kind,run,Boolean(p||run.head_sha===main))){
   api('actions/runs/'+run.id+'/rerun-failed-jobs','POST');return true;
  }
 }
}
 return false;
}
