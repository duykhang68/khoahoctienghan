import {shaPattern} from './issue-state.mjs';
export const branchOf=s=>'content/editor-fifo-'+s.number+'-'+s.base.slice(0,12);

export function isQueuePR(p,s,repo){return p.head?.repo?.full_name===repo&&p.head.ref===branchOf(s)&&p.head.sha===s.head&&p.base.ref==='main'&&p.body==='<!-- editor-fifo-issue:'+s.number+' -->';}
export function planQueueRebuild(s,pr,main){
 if(!s.head||s.base===main)return 'KEEP';
 if(pr?.state==='closed'&&!s.rebuild)return 'MANUALLY_CLOSED';
 return 'REBUILD';
}
export function nativeRunDecision(run){if(!run||run.status!=='completed')return 'WAIT';return run.conclusion==='success'?'PASS':'BLOCK';}
export function isConfirmedMerge(merged){return merged.merged&&shaPattern.test(merged.sha);}
