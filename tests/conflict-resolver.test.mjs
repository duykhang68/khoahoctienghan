import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeConflict,mergeAdditivePosts,conflictEligible,postsPath,repairMarker,verifiedRepair} from '../scripts/conflict-resolver.mjs';
const id=n=>String(n).repeat(40);
const blob=(path,n,mode='100644')=>({path,sha:id(n),mode,type:'blob'});
const snap=(...tree)=>({truncated:false,tree});
const file=(filename,status='modified')=>({filename,status});
const plan=(base,head,main,files)=>analyzeConflict({base,head,main,files});
test('exact duplicates use blob AND mode, no protected automatic closures',()=>{
 const p='docs/example.md',b=snap(blob(p,1)),h=snap(blob(p,2));
 assert.equal(plan(b,h,h,[file(p)]).kind,'EXACT_DUPLICATE');
 assert.equal(plan(b,h,snap(blob(p,2,'100755')),[file(p)]).kind,'RESEARCH_REQUIRED');
 const q='back-office/worker.mjs',x=snap(blob(q,1)),y=snap(blob(q,2));
 assert.equal(plan(x,y,y,[file(q)]).kind,'REVIEW_DUPLICATE');
 assert.equal(plan(b,h,{...h,truncated:true},[file(p)]).kind,'BLOCKED_INCOMPLETE');
 assert.equal(plan(b,snap(blob(p,2),blob('secret.md',3)),h,[file(p)]).kind,'BLOCKED_INCOMPLETE');
 assert.equal(plan(b,h,h,[{...file(p),previous_filename:'other.md'}]).kind,'RESEARCH_REQUIRED');
 assert.equal(plan(b,snap(),snap(),[file(p,'removed')]).kind,'RESEARCH_REQUIRED');
});
test('only the single allowlisted JSON collision reaches automatic transform',()=>{
 const b=snap(blob(postsPath,1)),h=snap(blob(postsPath,2)),m=snap(blob(postsPath,3));
 assert.equal(plan(b,h,m,[file(postsPath)]).kind,'TRY_ADDITIVE_POSTS');
 assert.equal(plan(b,snap(blob(postsPath,2),blob('docs/new.md',4)),m,[file(postsPath),file('docs/new.md','added')]).kind,'RESEARCH_REQUIRED');
});
test('additive merge preserves main and existing records, refuses edits and ambiguous slugs',()=>{
 const a={slug:'old',title:'Original'},b={slug:'main-new',title:'Main'},c={slug:'pr-new',title:'PR'};
 const j=JSON.stringify;
 assert.deepEqual(JSON.parse(mergeAdditivePosts(j([a]),j([c,a]),j([b,a])).content),[b,a,c]);
 assert.equal(mergeAdditivePosts(j([a]),j([a,b]),j([b,a])).kind,'REVIEW_DUPLICATE');
 assert.equal(mergeAdditivePosts(j([a]),j([{...a,title:'changed'},c]),j([a,b])),null);
 assert.equal(mergeAdditivePosts(j([a]),j([a,{...b,title:'different'}]),j([a,b])),null);
 assert.equal(mergeAdditivePosts(j([a]),j([c]),j([a,b])),null);
 assert.equal(mergeAdditivePosts(j([a,b]),j([b,a,c]),j([a,b])),null);
 assert.equal(mergeAdditivePosts(j([a]),j([a,c,c]),j([a,b])),null);
 assert.equal(mergeAdditivePosts('invalid',j([a,c]),j([a,b])),null);
});
test('queue and explicit no-merge are excluded; repair verification is exact and bot-authored',()=>{
 assert.equal(conflictEligible({head:{ref:'content/editor-fifo-93-a'}}),false);
 assert.equal(conflictEligible({head:{ref:'feat/test'},title:'DO NOT MERGE'}),false);
 assert.equal(conflictEligible({head:{ref:'feat/test'},draft:true}),false);
 assert.equal(conflictEligible({head:{ref:'feat/test'},body:'This documents DO NOT MERGE exclusions.'}),true);
 assert.equal(conflictEligible({head:{ref:'feat/test'},body:'<!-- DO NOT MERGE -->'}),false);
 assert.equal(conflictEligible({head:{ref:'feat/test'}}),true);
 const i={state:'open',user:{login:'github-actions[bot]'},body:repairMarker(id(1),id(2))};
 assert.equal(verifiedRepair(i,id(1),id(2)),true);
 assert.equal(verifiedRepair(i,id(1),id(3)),false);
 assert.equal(verifiedRepair({...i,user:{login:'other'}},id(1),id(2)),false);
});
