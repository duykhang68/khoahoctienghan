import {test} from 'node:test';
import assert from 'node:assert/strict';
import {branchSyncDecision,dependabotSyncEligible,trustedPR,sensitiveFile} from '../scripts/engineering-policy.mjs';
test('sync status uses exact compare behind count, not stale PR base SHA',()=>{
 const p={mergeable:true,base:{sha:'old'}};
 assert.equal(branchSyncDecision(p,{status:'diverged',ahead_by:1,behind_by:1}),'UPDATE');
 assert.equal(branchSyncDecision(p,{status:'ahead',ahead_by:1,behind_by:0}),'CURRENT');
 assert.equal(branchSyncDecision({...p,mergeable:false},{status:'diverged',ahead_by:1,behind_by:1}),'CONFLICT');
 assert.equal(branchSyncDecision({...p,mergeable:null},{status:'diverged',ahead_by:1,behind_by:1}),'UNKNOWN');
 assert.equal(branchSyncDecision(p,{status:'identical',ahead_by:0,behind_by:0}),'NO_CHANGES');
});
test('only same-repo owner-armed Dependabot PRs receive rebase requests',()=>{
 const repo='duykhang68/khoahoctienghan';
 const p={user:{login:'dependabot[bot]'},head:{repo:{full_name:repo},ref:'dependabot/npm/test'},draft:false,auto_merge:{}};
 assert.ok(dependabotSyncEligible(p,repo));
 assert.ok(!dependabotSyncEligible({...p,auto_merge:null},repo));
 assert.ok(!dependabotSyncEligible({...p,head:{...p.head,repo:{full_name:'fork/other'}}},repo));
});

test('owner perf branch receives sync without bypassing sensitive review',()=>{
 const repo='duykhang68/khoahoctienghan';
 const p={user:{login:'duykhang68'},head:{repo:{full_name:repo},ref:'perf/ci-playwright-headless-shell'},draft:false,mergeable:true};
 assert.ok(trustedPR(p,repo));
 assert.equal(branchSyncDecision(p,{status:'diverged',ahead_by:1,behind_by:1}),'UPDATE');
 assert.ok(sensitiveFile('.github/workflows/ci.yml'));
 assert.ok(!trustedPR({...p,draft:true},repo));
 assert.ok(!trustedPR({...p,user:{login:'other'}},repo));
 assert.ok(!trustedPR({...p,head:{...p.head,repo:{full_name:'fork/other'}}},repo));
});
