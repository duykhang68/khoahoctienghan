import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classify,canRetry} from '../core/engineering/failure-policy.mjs';
import {nativePolicyReady,latestRun,ciJobsPassed} from '../core/engineering/ci-policy.mjs';
import {branchToken,trustedPR,branchSyncDecision} from '../core/engineering/branch-policy.mjs';
import {mergeReviewRequired,sensitiveFile,exactMainCI} from '../core/engineering/merge-policy.mjs';
import {releaseRecoveryDecision,hasReleaseArtifact} from '../core/engineering/release-policy.mjs';
import {analyzeConflict,conflictEligible} from '../core/engineering/conflict.mjs';
import {editorPublicationPending} from '../core/engineering/incident-policy.mjs';
import {createGithubCli} from '../scripts/adapters/github-cli.mjs';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const repo='duykhang68/khoahoctienghan',sha='a'.repeat(40),other='b'.repeat(40);
test('R5 deterministic failure, native CI and branch policy with frozen inputs',()=>{
 const run=freeze({name:'P0 · Knowledge Base CI',conclusion:'failure',run_attempt:2,head_sha:sha});
 assert.equal(classify(freeze({run,logs:'EAI_AGAIN',jobs:[],main:sha})),'TRANSIENT');
 assert.equal(canRetry('TRANSIENT',run,true),true);
 assert.equal(canRetry('TRANSIENT',run,false),false);
 const ci=freeze({id:1,head_sha:sha,head_repository:{full_name:repo},head_branch:'main',event:'push',status:'completed',conclusion:'success'});
 assert.equal(latestRun(freeze([ci]),sha,repo,['push'],'main'),ci);
 assert.equal(exactMainCI(ci,other),false);
 assert.equal(exactMainCI(ci,sha),true);
 assert.equal(ciJobsPassed(freeze([{name:'Content and Astro build',conclusion:'success'},{name:'Security',conclusion:'skipped'}]),'push'),false);
 assert.equal(nativePolicyReady(freeze({allow_auto_merge:true,allow_squash_merge:true}),freeze([])),false);
 assert.equal(branchSyncDecision(freeze({mergeable:true}),freeze({behind_by:1})),'UPDATE');
 assert.equal(trustedPR(freeze({user:{login:'duykhang68'},head:{repo:{full_name:repo},ref:'refactor/fcis-r5'},draft:false}),repo),false);
});
test('R5 moved policy files retain explicit review and conflict protection',()=>{
 const pr=freeze({head:{ref:'ui/example'}}),ui={filename:'src/styles/site.css',status:'modified'};
 for(const path of ['core/engineering/merge-policy.mjs','core/publication/issue-state.mjs','scripts/adapters/github-cli.mjs','scripts/engineering/conflicts.mjs']){
  assert.equal(sensitiveFile(path),true,path);
  assert.equal(mergeReviewRequired(pr,freeze([ui,{filename:path,status:'modified'}])),true,path);
  const snapshot=n=>freeze({truncated:false,tree:[{path,sha:n.repeat(40),mode:'100644',type:'blob'}]});
  assert.equal(analyzeConflict({base:snapshot('a'),head:snapshot('b'),main:snapshot('b'),files:[{filename:path,status:'modified'}]}).kind,'REVIEW_DUPLICATE',path);
 }
 assert.equal(conflictEligible({head:{ref:'content/editor-fifo-93-x'}}),false);
});
test('R5 release and FIFO guards use explicit evidence',()=>{
 const now=Date.parse('2026-11-15T00:02:00Z'),ci=freeze({head_sha:sha,head_repository:{full_name:repo},head_branch:'main',event:'push',status:'completed',conclusion:'success',updated_at:'2026-11-15T00:00:00Z'});
 assert.equal(releaseRecoveryDecision(freeze({main:sha,repo,ci,releases:[],now})),'MISSING');
 assert.equal(releaseRecoveryDecision(freeze({main:other,repo,ci,releases:[],now})),'WAITING_CI');
 assert.equal(hasReleaseArtifact(freeze([{name:'knowledge-base-release',expired:false,size_in_bytes:1}])),true);
 assert.equal(hasReleaseArtifact(freeze([{name:'knowledge-base-release',expired:true,size_in_bytes:1}])),false);
 assert.equal(editorPublicationPending(freeze([{user:{login:'github-actions[bot]'},body:'<!-- editor-v2-fifo:invalid -->'}])),true);
});
test('R5 CLI adapter isolates token selection and never falls back for App writes',()=>{
 const calls=[],exec=(name,args,options)=>{calls.push({name,args,options});return '{}'};
 const env=freeze({GH_TOKEN:'regular-test',BRANCH_APP_TOKEN:'app-test',PATH:'/test'});
 const client=createGithubCli({repo,env,exec});client.api('pulls/1');client.branchApi('git/trees','POST',{tree:[]});
 assert.equal(calls[0].options.env.GH_TOKEN,'regular-test');
 assert.equal(calls[1].options.env.GH_TOKEN,'app-test');
 assert.ok(calls.every(c=>!Object.hasOwn(c.options.env,'BRANCH_APP_TOKEN')));
 assert.equal(branchToken(' '),null);
 assert.throws(()=>createGithubCli({repo,env:{GH_TOKEN:'regular-test'},exec}).branchApi('git/trees','POST',{}),/APP_SETUP_REQUIRED/);
 assert.equal(calls.length,2);
});
