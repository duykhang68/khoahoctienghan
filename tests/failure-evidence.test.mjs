import {test} from 'node:test';
import assert from 'node:assert/strict';
import {structuredFailureEvidence} from '../core/engineering/failure-evidence.mjs';
test('UNKNOWN captures safe failed stage and exact job link without raw text',()=>{
 const out=structuredFailureEvidence({runId:44639168760,jobs:[{id:135965451613,steps:[
  {name:'Run npm run test:engineering',conclusion:'failure'},
  {name:'Run echo SECRET_PLACEHOLDER',conclusion:'failure'},
  {name:'setup',conclusion:'success'}]}]});
 assert.match(out,/ENGINEERING_TEST/);
 assert.match(out,/UNCLASSIFIED_STEP/);
 assert.match(out,/runs\/44639168760\/job\/135965451613/);
 assert.doesNotMatch(out,/SECRET_PLACEHOLDER/);
 assert.doesNotMatch(out,/Run npm run/);
});
test('E2E evidence is stage-only and bounded',()=>{
 const out=structuredFailureEvidence({runId:43682894239,jobs:[{id:132717137453,steps:[{name:'Run npm run test:e2e -- --workers=2',conclusion:'failure'}]}]});
 assert.match(out,/BROWSER_E2E/);
 const noisy=structuredFailureEvidence({runId:10,jobs:[{id:11,steps:Array.from({length:40},(_,i)=>({name:'arbitrary '+i,conclusion:'failure'}))},{id:12,steps:[{name:'Run npm run build',conclusion:'failure'}]}]});
 assert.ok(noisy.split('\n').length<=4);
 assert.match(noisy,/UNCLASSIFIED_STEP/);
});
test('fail closed on missing or malformed GitHub job metadata',()=>{
 assert.equal(structuredFailureEvidence({runId:1,jobs:[]}), 'Failure stage: NOT_AVAILABLE');
 assert.equal(structuredFailureEvidence({runId:1,jobs:[{id:'wrong',steps:[{conclusion:'failure',name:'Run npm run build'}]}]}), 'Failure stage: NOT_AVAILABLE');
 assert.equal(structuredFailureEvidence({runId:0,jobs:[]}), 'Failure stage: NOT_AVAILABLE');
});
