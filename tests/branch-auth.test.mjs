import {test} from 'node:test';
import assert from 'node:assert/strict';
import {branchToken,selectPullRequestCI} from '../scripts/branch-auth.mjs';
test('missing App token fails closed',()=>{assert.equal(branchToken(undefined),null);assert.equal(branchToken(' '),null);assert.equal(branchToken('test-token'),'test-token');});
test('dispatch CI cannot replace required native PR CI',()=>{const repo='duykhang68/khoahoctienghan';const base={head_repository:{full_name:repo},head_branch:'fix/a',head_sha:'abc'};const blocked={...base,event:'pull_request',id:1,conclusion:'action_required'},dispatch={...base,event:'workflow_dispatch',id:2,conclusion:'success'},green={...base,event:'pull_request',id:3,conclusion:'success'};assert.equal(selectPullRequestCI([blocked,dispatch],'abc',repo,'fix/a'),blocked);assert.equal(selectPullRequestCI([dispatch],'abc',repo,'fix/a'),undefined);assert.equal(selectPullRequestCI([blocked,dispatch,green,{...green,id:4,head_sha:'other'}],'abc',repo,'fix/a'),green);});

test('installation tokens are opaque and never truncated',()=>{
 const prefix=['ghs',''].join('_');
 const classic=prefix+'a'.repeat(36);
 assert.equal(classic.length,40);
 assert.equal(branchToken(classic),classic);
 for(const length of [520,1024,2048]){
  const start=prefix+'12345_abc.def-_.';
  const token=start+'z'.repeat(length-start.length);
  assert.equal(token.length,length);
  assert.equal(branchToken(token),token);
 }
 for(const missing of [null,undefined,'',' \t\n',false,40,{}]){
  assert.equal(branchToken(missing),null);
 }
});
