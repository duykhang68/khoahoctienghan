import {latestRun} from '../engineering-policy.mjs';
import {ciJobsPassed,releaseRecoveryDecision} from '../release-recovery.mjs';
import {hasReleaseArtifact} from '../../core/engineering/release-policy.mjs';
export function reconcileMainRelease({api,main,repo,dispatch,mainSHA}){
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
   if(ciJobsPassed(jobs,mainCI.event)&&hasReleaseArtifact(artifacts)&&mainSHA()===main&&releaseRecoveryDecision({main,repo,ci:mainCI,releases:fresh,now:Date.now()})==='MISSING'){
    api('actions/workflows/release.yml/dispatches','POST',{ref:'main',inputs:{expected_sha:main,ci_run_id:String(mainCI.id)}});
    console.log('RELEASE_RECOVERY_REQUESTED '+main);
   }else console.log('RELEASE_RECOVERY_DEFERRED '+main);
  }else console.log('RELEASE_RECOVERY_'+decision+' '+main);
 }catch{console.log('RELEASE_RECOVERY_DEFERRED '+main);}
}
 return mainCI;
}
