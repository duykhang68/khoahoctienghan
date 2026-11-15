import {shaPattern} from '../../core/publication/issue-state.mjs';
import {exactReleaseRuns,releaseJobsVerified,verifiedProductionTip,validReleaseTip} from '../../core/publication/verification.mjs';
export function createProductionVerifier({api,repo,site,fetcher=fetch,clock=Date.now}){
async function firstParentContains(ancestor,tip){
 for(let i=0;i<150&&shaPattern.test(tip);i++){if(tip===ancestor)return true;tip=api('git/commits/'+tip).parents?.[0]?.sha}
 return false;
}
async function productionVerified(s){
 const resp=await fetcher(site+'release-sha.json?v='+clock(),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!resp.ok)return null;const tip=(await resp.json()).sha;
 if(!validReleaseTip(tip)||!await firstParentContains(s.merge,tip))return null;
 const runs=api('actions/workflows/release.yml/runs?branch=main&head_sha='+tip+'&per_page=30').workflow_runs;
 const releases=exactReleaseRuns(runs,tip,repo);
 let released=false;
 for(const release of releases){const jobs=api('actions/runs/'+release.id+'/jobs?per_page=100').jobs;if(releaseJobsVerified(jobs)){released=true;break}}
 if(!released)return null;
 const url=await fetcher(site+s.route+'?v='+tip,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!url.ok)return null;
 // The marker must still identify the same deployed artifact after the route request.
 const again=await fetcher(site+'release-sha.json?v='+clock(),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 return verifiedProductionTip(tip,again.ok,again.ok?(await again.json()).sha:null);
}
 return productionVerified;
}
