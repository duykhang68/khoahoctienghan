import {latestRun} from '../core/engineering/ci-policy.mjs';
export {branchToken} from '../core/engineering/branch-policy.mjs';
export function selectPullRequestCI(runs,sha,repo,branch){return latestRun(runs,sha,repo,['pull_request'],branch);}
