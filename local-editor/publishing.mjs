export const validSha=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
export function selectNativeCI(runs,sha,branch){return runs.filter(w=>w.head_sha===sha&&w.head_branch===branch&&w.event==='pull_request'&&w.head_repository?.full_name==='duykhang68/khoahoctienghan').sort((a,b)=>b.id-a.id)[0]??null}
export function publishPhase(pr,ci,marker,relation){
 if(pr.merged)return marker?.routesOK&&['exact','ancestor'].includes(relation)?'PUBLIC_MARKER_CONFIRMED':'MERGED_WAITING_PUBLIC';
 if(pr.state==='closed')return 'CLOSED_NOT_MERGED';
 if(pr.draft)return 'DRAFT';
 if(ci?.status==='completed'&&ci.conclusion==='success')return 'CI_PASSED_WAITING_MERGE';
 if(ci?.status==='completed')return 'CI_'+String(ci.conclusion||'UNKNOWN').toUpperCase();
 return 'CI_PENDING';
}
