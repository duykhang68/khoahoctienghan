export function trustedPR(p,repo){return p.user?.login==='duykhang68'&&p.head?.repo?.full_name===repo&&!p.draft&&/^(p\d+[/-]|fix\/|feat\/|ui\/|ux\/|docs\/|techblog\/|perf\/|content\/)/.test(p.head.ref);}
export function branchSyncDecision(pr,comparison){
 if(!Number.isInteger(comparison?.behind_by)||comparison.behind_by<0)return 'UNKNOWN';
 if(pr.mergeable===false)return 'CONFLICT';
 if(pr.mergeable!==true)return 'UNKNOWN';
 if(comparison.behind_by>0)return 'UPDATE';
 if(comparison.status==='ahead'&&comparison.ahead_by>0)return 'CURRENT';
 return 'NO_CHANGES';
}
export function dependabotSyncEligible(p,repo){
 return p.user?.login==='dependabot[bot]'&&p.head?.repo?.full_name===repo&&p.head.ref.startsWith('dependabot/')&&!p.draft&&Boolean(p.auto_merge);
}
export function branchToken(value){return typeof value==='string'&&value.trim()?value:null;}
