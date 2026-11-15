import {analyzeConflict,mergeAdditivePosts,postsPath,repairMarker} from '../conflict-resolver.mjs';
import {ciJobsPassed} from '../release-recovery.mjs';
import {exactMainCI} from '../../core/engineering/merge-policy.mjs';
export function createConflictResolver({api,branchApi,appToken,main,mainCI,mainSHA,incident,hasMarker,changed,trusted}){
// Exact Git snapshots are data only. Never checkout or execute the conflicting branch in this privileged job.
const gitTree=sha=>api('git/trees/'+api('git/commits/'+sha).tree.sha+'?recursive=1');
const blobText=sha=>{const b=api('git/blobs/'+sha);if(b.encoding!=='base64'||b.size>5000000)throw Error('unsafe blob');return Buffer.from(b.content,'base64').toString('utf8')};
const stillCurrent=p=>mainSHA()===main&&api('git/ref/heads/'+encodeURIComponent(p.head.ref)).object.sha===p.head.sha;
const exactMainGreen=()=>Boolean(exactMainCI(mainCI,main)&&ciJobsPassed(api('actions/runs/'+mainCI.id+'/jobs?per_page=100').jobs,mainCI.event));
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
 if(!['EXACT_DUPLICATE','MERGED'].includes(decision)){save('\nStatus: RESEARCH_REQUIRED');return;}
 if(!appToken){console.log('APP_SETUP_REQUIRED PR #'+p.number+'; conflict write deferred');return;}
 if(!stillCurrent(p))return;
 if(decision==='EXACT_DUPLICATE'&&exactMainGreen()){
  const fresh=api('pulls/'+p.number);
  if(!trusted(fresh)||fresh.state!=='open'||fresh.head.sha!==p.head.sha||!stillCurrent(p))return;
  // REST PR close is not a compare-and-swap; recheck immutable HEAD/current main immediately before write.
  const closed=branchApi('pulls/'+p.number,'PATCH',{state:'closed'});
  if(closed.state!=='closed'||closed.head?.sha!==p.head.sha||!stillCurrent(p)){
   // Non-atomic close: restore the open PR if the observed proof became stale.
   if(closed.state==='closed'&&!closed.merged)branchApi('pulls/'+p.number,'PATCH',{state:'open'});
   console.log('CLOSE_REVIEW_REQUIRED PR #'+p.number);return;
  }
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
  try{branchApi('git/refs/heads/'+encodeURIComponent(p.head.ref),'PATCH',{sha:fixed.sha,force:false});}
  catch{
   if(api('git/ref/heads/'+encodeURIComponent(p.head.ref)).object.sha!==fixed.sha){
    save('\nStatus: RESEARCH_REQUIRED — ref update rejected; no confirmed repair');
    return;
   }
  }
  console.log('CONFLICT_FIX_COMMITTED PR #'+p.number+'; await native PR CI');return;
 }
 save('\nStatus: RESEARCH_REQUIRED');
}
 return {resolveConflict,stillCurrent};
}
