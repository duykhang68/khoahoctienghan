import {test} from 'node:test';
import assert from 'node:assert/strict';
import {branchToken,selectPullRequestCI} from '../scripts/branch-auth.mjs';
test('missing App token fails closed',()=>{assert.equal(branchToken(undefined),null);assert.equal(branchToken(' '),null);assert.equal(branchToken('test-token'),'test-token');});
test('dispatch CI cannot replace required native PR CI',()=>{const repo='duykhang68/khoahoctienghan';const base={head_repository:{full_name:repo},head_branch:'fix/a',head_sha:'abc'};const blocked={...base,event:'pull_request',id:1,conclusion:'action_required'},dispatch={...base,event:'workflow_dispatch',id:2,conclusion:'success'},green={...base,event:'pull_request',id:3,conclusion:'success'};assert.equal(selectPullRequestCI([blocked,dispatch],'abc',repo,'fix/a'),blocked);assert.equal(selectPullRequestCI([dispatch],'abc',repo,'fix/a'),undefined);assert.equal(selectPullRequestCI([blocked,dispatch,green,{...green,id:4,head_sha:'other'}],'abc',repo,'fix/a'),green);});
