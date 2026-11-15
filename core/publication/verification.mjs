import {shaPattern} from './issue-state.mjs';
export function exactReleaseRuns(runs,tip,repo){return runs.filter(x=>x.head_sha===tip&&x.conclusion==='success'&&x.head_repository?.full_name===repo);}
export function releaseJobsVerified(jobs){return ['prepare','deploy','verify'].every(name=>jobs.some(j=>j.name===name&&j.conclusion==='success'));}
export function verifiedProductionTip(tip,againOK,againSHA){return againOK&&againSHA===tip?tip:null;}
export function validReleaseTip(tip){return shaPattern.test(tip);}
