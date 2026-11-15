import {execFileSync} from 'node:child_process';
import {branchToken} from '../../core/engineering/branch-policy.mjs';

// Only the explicitly selected token is passed to gh; App credentials never leak into childEnv.
export function createGithubCli({repo,env,exec=execFileSync}){
 const {BRANCH_APP_TOKEN,...childEnv}=env;
const cli=(args,input,token=env.GH_TOKEN)=>exec('gh',args,{encoding:'utf8',input,env:{...childEnv,GH_TOKEN:token},stdio:['pipe','pipe','pipe'],maxBuffer:16*1024*1024});
const callApi=(path,method,data,token)=>{const out=cli(['api','-X',method,'repos/'+repo+(path?'/'+path:''),...(data?['--input','-']:[])],data?JSON.stringify(data):undefined,token);return out?JSON.parse(out):null};
const api=(path,method='GET',data)=>callApi(path,method,data,env.GH_TOKEN);
const appToken=branchToken(BRANCH_APP_TOKEN);
const branchApi=(path,method,data)=>{if(!appToken)throw Error('APP_SETUP_REQUIRED');return callApi(path,method,data,appToken);};
const all=(path)=>JSON.parse(cli(['api','--paginate','--slurp','repos/'+repo+'/'+path])).flat();
 return {cli,api,branchApi,all,appToken};
}
