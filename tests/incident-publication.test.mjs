import {test} from 'node:test';
import assert from 'node:assert/strict';
import {incidentPublication,hasVerifiedRun,alreadyPublished,editorPublicationPending,incidentRetrospectivePR} from '../scripts/incident-publication.mjs';
const repo='duykhang68/khoahoctienghan',sha='a'.repeat(40);
const issue={number:42,state:'closed',state_reason:'completed',user:{login:'duykhang68'},body:'<!-- engineering-incident:v1 -->\n<!-- verified-sha: '+sha+' -->\nhttps://github.com/'+repo+'/actions/runs/123\n'};
test('one verified completed incident yields stable article slug',()=>{const rec=incidentPublication(issue,repo);assert.equal(rec.slug,'bugfix-issue-42');assert.equal(rec.sha,sha);assert.ok(hasVerifiedRun(rec,[{id:123,head_sha:sha,head_repository:{full_name:repo},status:'completed',conclusion:'success',name:'P0 · Knowledge Base CI'}],repo));assert.ok(!hasVerifiedRun(rec,[{id:123,head_sha:'b'.repeat(40),head_repository:{full_name:repo},status:'completed',conclusion:'success',name:'P0 · Knowledge Base CI'}],repo));assert.ok(alreadyPublished(rec,[{slug:rec.slug}],[]));assert.ok(alreadyPublished(rec,[],[{head:{ref:'techblog/'+rec.slug}}]));assert.ok(!alreadyPublished(rec,[{slug:'intro',issues:[42]}],[]));});
test('unverified, ordinary closed, duplicate or untrusted incident does not publish',()=>{for(const p of [{state:'open'},{state_reason:'not_planned'},{user:{login:'outsider'}},{body:'ordinary issue'},{body:issue.body+'<!-- duplicate -->'}])assert.equal(incidentPublication({...issue,...p},repo),null);});

test('Editor V2 submission queue has priority over incident retrospectives until verified and closed',()=>{
 const marker='<!-- editor-v2-fifo:';
 const entry=(phase,closed=false)=>({number:93,title:'[Editor V2] Bài viết',state:closed?'closed':'open',user:{login:'github-actions[bot]'},body:marker+JSON.stringify({id:'b'.repeat(64),source:sha,phase,...(phase==='VERIFIED'?{verified:sha,merge:sha,route:'ngon-ngu/bai-viet/',pr:95}:{})})+' -->'});
 assert.equal(editorPublicationPending([entry('QUEUED'),issue]),true);
 assert.equal(editorPublicationPending([entry('MERGED'),issue]),true);
 assert.equal(editorPublicationPending([entry('WAITING_CI',true)]),true);
 assert.equal(editorPublicationPending([entry('VERIFIED')]),true);
 assert.equal(editorPublicationPending([entry('VERIFIED',true),issue]),false);
 assert.equal(editorPublicationPending([{...entry('QUEUED'),user:{login:'outsider'}}]),false);
 assert.equal(editorPublicationPending([{...entry('QUEUED'),body:marker+'invalid -->'}]),true);
 assert.equal(incidentPublication({...entry('VERIFIED',true),state_reason:'completed',body:entry('VERIFIED',true).body+'\n'+issue.body},repo),null);
 assert.equal(incidentRetrospectivePR({head:{ref:'techblog/bugfix-issue-42'}}),true);
 assert.equal(incidentRetrospectivePR({head:{ref:'docs/bugfix-issue-42'}}),true);
 assert.equal(incidentRetrospectivePR({head:{ref:'fix/security'}}),false);
 assert.equal(incidentRetrospectivePR({head:{ref:'content/editor-fifo-93-123456789abc'}}),false);
});
