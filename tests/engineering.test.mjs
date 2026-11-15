import {test} from 'node:test';
import './branch-sync.test.mjs';
import './pr-labels.test.mjs';
import './engineering-core.test.mjs';
import './architecture.test.mjs';
import assert from 'node:assert/strict';
import {classify,canRetry,migrateSidebar,nativePolicyReady,latestRun,sensitiveFile,trustedPR,releaseName,ciName,checkName} from '../scripts/engineering-policy.mjs';
const run={name:releaseName,head_sha:'old',conclusion:'failure',run_attempt:1};
test('legacy stale release is not an incident',()=>{assert.equal(classify({run,main:'new',jobs:[{steps:[{name:'Reject stale release',conclusion:'failure'}]}]}),'SUPERSEDED');assert.equal(classify({run,main:'old',jobs:[{steps:[{name:'Reject stale release',conclusion:'failure'}]}]}),'UNKNOWN')});
test('environment is blocked, not retryable',()=>{const kind=classify({run,main:'old',logs:'Branch main is not allowed to deploy to github-pages due to environment protection rules.'});assert.equal(kind,'ENVIRONMENT_BLOCKED');assert.equal(canRetry(kind,run,true),false)});
test('retry only transient current work, three total attempts',()=>{assert.equal(classify({run,logs:'EAI_AGAIN'}),'TRANSIENT');assert.equal(canRetry('TRANSIENT',run,true),true);assert.equal(canRetry('TRANSIENT',{...run,run_attempt:3},true),false);assert.equal(canRetry('TRANSIENT',run,false),false);assert.equal(classify({run,logs:'EAI_AGAIN TypeError'}),'UNKNOWN')});
test('sidebar migration is narrow and idempotent',()=>{const s="{ label: 'x', autogenerate: { directory: 'test' }, collapsed: true }";const fixed=migrateSidebar(s);assert.match(fixed,/items:/);assert.equal(migrateSidebar(fixed),fixed);assert.equal(migrateSidebar('unrelated'),'unrelated')});
test('native guard requires strict checks from an app',()=>{const r={allow_auto_merge:true,allow_squash_merge:true};const rules=[{type:'pull_request',parameters:{allowed_merge_methods:['squash']}},{type:'non_fast_forward'},{type:'required_status_checks',parameters:{strict_required_status_checks_policy:true,required_status_checks:[{context:checkName,integration_id:1}]}}];assert.ok(nativePolicyReady(r,rules));assert.ok(!nativePolicyReady(r,[]));assert.ok(!nativePolicyReady({...r,allow_auto_merge:false},rules));assert.ok(!nativePolicyReady(r,[...rules.slice(0,2),{type:'required_status_checks',parameters:{strict_required_status_checks_policy:false}}]))});
test('exact SHA latest CI, trusted owner and protected files',()=>{const repo='duykhang68/khoahoctienghan';const base={head_sha:'sha',head_repository:{full_name:repo},head_branch:'main',event:'push'};assert.equal(latestRun([{...base,id:1},{...base,id:3,head_sha:'old'},{...base,id:2}], 'sha',repo,['push'],'main').id,2);assert.equal(trustedPR({user:{login:'other'},head:{repo:{full_name:repo},ref:'fix/a'}},repo),false);assert.ok(sensitiveFile('.github/workflows/ci.yml'));assert.ok(sensitiveFile('package-lock.json'));assert.ok(!sensitiveFile('src/data/techblog/posts.json'))});

import {inferCategory,categoryIndex} from '../src/lib/tech-categories.mjs';
import {readFileSync} from 'node:fs';
test('categories derive from article context and do not require metadata',()=>{
 const p=JSON.parse(readFileSync('src/data/techblog/posts.json','utf8'));
 const first=p.find(x=>x.slug==='engineering-culture-2-0-tu-commit-den-production');
 const researcher=p.find(x=>x.slug==='engineering-researcher-bo-nao-cua-self-healing-ci-cd');
 assert.equal(inferCategory(first).id,'engineering');assert.equal(inferCategory(researcher).id,'engineering');
 assert.equal(inferCategory({title:'Bảo mật OAuth và xác thực Zero Trust',summary:'XSS CSRF encryption',sections:[]}).id,'security');
 assert.equal(inferCategory({title:'Core Web Vitals và tối ưu tốc độ',summary:'LCP CLS INP',sections:[]}).id,'performance');
 assert.equal(inferCategory({title:'Frontend UI UX và giao diện',summary:'CSS grid responsive design typography',sections:[]}).id,'frontend');
 assert.equal(inferCategory({title:'Kiến trúc hệ thống microservices',summary:'distributed systems',sections:[]}).id,'architecture');
 assert.equal(inferCategory({title:'Vector database và LLM',summary:'embedding RAG machine learning',sections:[]}).id,'ai-data');
 assert.equal(categoryIndex(p).reduce((n,c)=>n+c.count,0),p.length);
});

import './incident-publication.test.mjs';

import './branch-auth.test.mjs';

import './security-check.test.mjs';

// Keep runner admission, native CI recovery and serial merge guards intact.
test('engineering resource budget preserves essential triggers and avoids redundant runner work',()=>{
 const workflow=readFileSync('.github/workflows/engineering.yml','utf8');
 const controller=readFileSync('scripts/engineering-controller.mjs','utf8');
 assert.match(workflow,/types: \[opened, reopened, ready_for_review\]/);
 assert.match(workflow,/cron: '32 \*\/6 \* \* \*'/);
 assert.match(workflow,/push:\s+branches: \[main\]/);
 assert.match(workflow,/issues:\s+types: \[closed\]/);
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/github\.event\.workflow_run\.conclusion == 'failure'/);
 assert.match(workflow,/github\.event\.workflow_run\.name == 'P0 · Knowledge Base CI' &&\s+github\.event\.workflow_run\.conclusion == 'success'/);
 assert.match(workflow,/github\.event\.workflow_run\.head_repository\.full_name == github\.repository/);
 assert.match(workflow,/    concurrency:\s+group: engineering-reconciliation\s+cancel-in-progress: false/);
 assert.match(controller,/expected_head_sha:current\.head\.sha/);
 assert.doesNotMatch(controller,/setTimeout\(resolve,2000\)/);
 assert.match(controller,/selectPullRequestCI\(runs,current\.head\.sha,repo,current\.head\.ref\)/);
 assert.match(controller,/if\(merged\.merged\)\{dispatch\('main'\)/);
});

import './release-recovery.test.mjs';

import './knowledge-visual-validation.test.mjs';

import './studio-document.test.mjs';
import './public-content-core.test.mjs';
import './local-editor-core.test.mjs';

import './editor-v2-queue.test.mjs';
import './publication-scheduler-core.test.mjs';
import './sheet-writeback.test.mjs';
import './sheet-publisher-core.test.mjs';

import './conflict-resolver.test.mjs';
import './release-catalog.test.mjs';
