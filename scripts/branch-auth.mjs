import {latestRun} from './engineering-policy.mjs';
export function branchToken(value){return typeof value==='string'&&value.trim()?value:null;}
export function selectPullRequestCI(runs,sha,repo,branch){return latestRun(runs,sha,repo,['pull_request'],branch);}
