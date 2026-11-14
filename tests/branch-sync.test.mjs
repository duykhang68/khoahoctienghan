import {test} from 'node:test';
import assert from 'node:assert/strict';
import {branchSyncDecision,dependabotSyncEligible,trustedPR,sensitiveFile,mergeReviewRequired} from '../scripts/engineering-policy.mjs';
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

test('owner content branch receives sync without bypassing trust or review',()=>{
 const repo='duykhang68/khoahoctienghan';
 const p={user:{login:'duykhang68'},head:{repo:{full_name:repo},ref:'content/engineering-editorial-design-system-1'},draft:false,mergeable:true};
 assert.ok(trustedPR(p,repo));
 assert.equal(branchSyncDecision(p,{status:'diverged',ahead_by:1,behind_by:1}),'UPDATE');
 assert.equal(branchSyncDecision(p,{status:'ahead',ahead_by:1,behind_by:0}),'CURRENT');
 assert.ok(!trustedPR({...p,draft:true},repo));
 assert.ok(!trustedPR({...p,user:{login:'other'}},repo));
 assert.ok(!trustedPR({...p,head:{...p.head,repo:{full_name:'fork/other'}}},repo));
 assert.ok(!trustedPR({...p,head:{...p.head,ref:'content-other/test'}},repo));
 assert.ok(sensitiveFile('scripts/engineering-policy.mjs'));
});

test('ordinary UI browser regressions do not block auto-merge; sensitive paths still do',()=>{
 const ui={head:{ref:'ui/uber-engineering-editorial'}};
 const src={filename:'src/styles/techblog.css',status:'modified'};
 const spec={filename:'tests/e2e/engineering-index.spec.ts',status:'modified'};
 assert.equal(mergeReviewRequired(ui,[src,spec]),false);
 assert.equal(mergeReviewRequired(ui,[src,{...spec,status:'added'}]),false);
 assert.equal(mergeReviewRequired(ui,[src]),false);
 assert.equal(mergeReviewRequired(ui,[spec]),true);
 assert.equal(mergeReviewRequired({head:{ref:'fix/test-only'}},[src,spec]),true);
 for(const f of ['.github/workflows/ci.yml','scripts/engineering-controller.mjs','tests/branch-sync.test.mjs','tests/e2e/helper.ts','playwright.config.ts','AGENTS.md','package-lock.json','engineering/lessons/x.md']){
  assert.equal(mergeReviewRequired(ui,[src,spec,{filename:f,status:'modified'}]),true,f);
 }
 assert.equal(mergeReviewRequired(ui,[src,{...spec,status:'removed'}]),true);
 assert.equal(mergeReviewRequired(ui,[src,{...spec,status:'renamed',previous_filename:'tests/security-check.test.mjs'}]),true);
 assert.equal(mergeReviewRequired(ui,[src,{filename:'public/moved.ts',status:'renamed',previous_filename:spec.filename}]),true);
 assert.equal(mergeReviewRequired(ui,[]),true);
 assert.ok(sensitiveFile(spec.filename)); // known-fixer scope unchanged
});
