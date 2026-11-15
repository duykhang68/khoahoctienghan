export function releaseRecoveryDecision({main,repo,ci,releases,now}){
 if(!ci||ci.head_sha!==main||ci.head_repository?.full_name!==repo||ci.head_branch!=='main'||!['push','workflow_dispatch'].includes(ci.event)||ci.status!=='completed'||ci.conclusion!=='success'||!Array.isArray(releases))return 'WAITING_CI';
 const exact=releases.filter(r=>r.head_sha===main&&r.head_repository?.full_name===repo&&r.head_branch==='main');
 if(exact.some(r=>r.status!=='completed'))return 'ACTIVE';
 if(exact.some(r=>r.conclusion==='success'))return 'EXISTS';
 // Failed/cancelled releases belong to incident classification, not missing-trigger retries.
 if(exact.some(r=>r.conclusion!=='skipped'))return 'BLOCKED';
 const finished=Date.parse(ci.updated_at);
 if(!Number.isFinite(finished)||now-finished<60000)return 'GRACE';
 return 'MISSING';
}

export function hasReleaseArtifact(artifacts){
 return artifacts.some(a=>a.name==='knowledge-base-release'&&!a.expired&&a.size_in_bytes>0);
}
