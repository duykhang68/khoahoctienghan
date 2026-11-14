// Release recovery is intentionally one dispatch for an absent CD, never a generic retry loop.
import {checkName} from './engineering-policy.mjs';
export function ciJobsPassed(jobs,event){
 return Array.isArray(jobs)&&jobs.some(j=>j.name===checkName&&j.conclusion==='success')&&jobs.every(j=>j.conclusion==='success'||(event!=='workflow_dispatch'&&j.name==='Release handoff'&&j.conclusion==='skipped'));
}
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
