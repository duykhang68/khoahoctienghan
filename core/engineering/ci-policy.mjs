import {checkName} from './constants.mjs';
export function nativePolicyReady(repo,rules){
 return repo.allow_auto_merge&&repo.allow_squash_merge&&rules.some(r=>r.type==='pull_request'&&r.parameters?.allowed_merge_methods?.includes('squash'))&&rules.some(r=>r.type==='non_fast_forward')&&rules.some(r=>r.type==='required_status_checks'&&r.parameters?.strict_required_status_checks_policy&&r.parameters.required_status_checks?.some(c=>c.context===checkName&&c.integration_id>0));
}
export function latestRun(runs,sha,repo,events,branch){return runs.filter(r=>r.head_sha===sha&&r.head_repository?.full_name===repo&&events.includes(r.event)&&(!branch||r.head_branch===branch)).sort((a,b)=>b.id-a.id)[0];}
export function ciJobsPassed(jobs,event){
 return Array.isArray(jobs)&&jobs.some(j=>j.name===checkName&&j.conclusion==='success')&&jobs.every(j=>j.conclusion==='success'||(event!=='workflow_dispatch'&&j.name==='Release handoff'&&j.conclusion==='skipped'));
}
