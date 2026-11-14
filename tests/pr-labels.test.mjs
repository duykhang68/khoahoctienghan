import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inferPRLabels,labelEligible,labelDefinitions} from '../scripts/pr-labels.mjs';
test('labels reflect change scope and never affect merge authorization',()=>{
 const p={title:'Tech Blog #02 · Engineering Researcher + automatic categories',head:{ref:'feat/techblog-auto-categories-researcher'}};
 assert.deepEqual(inferPRLabels(p,[{filename:'src/data/techblog/posts.json'}]).sort(),['engineering','enhancement','techblog']);
 const fix={title:'fix(engineering): event-driven Auto Update Branch',head:{ref:'fix/auto-update-pr-branches'}};
 assert.deepEqual(inferPRLabels(fix,[{filename:'.github/workflows/engineering.yml'}]).sort(),['automation','bug','engineering']);
 assert.ok(inferPRLabels({title:'ui: layout',head:{ref:'ui/layout'}},[]).includes('ui/ux'));
 assert.ok(inferPRLabels({title:'build(deps): bump astro',user:{login:'dependabot[bot]'}},[]).includes('dependencies'));
 assert.ok(inferPRLabels(fix,[]).every(x=>Object.hasOwn(labelDefinitions,x)));
});
test('only trusted same-repository PR metadata is labelled',()=>{
 const repo='duykhang68/khoahoctienghan';
 const p={user:{login:'duykhang68'},head:{repo:{full_name:repo}},base:{ref:'main'}};
 assert.ok(labelEligible(p,repo));assert.ok(!labelEligible({...p,user:{login:'other'}},repo));assert.ok(!labelEligible({...p,head:{repo:{full_name:'fork/repo'}}},repo));
});
