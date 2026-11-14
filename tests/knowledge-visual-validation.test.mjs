import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateKnowledgeVisuals} from '../src/lib/knowledge-visual-validation.mjs';
const visual={kind:'flow',caption:'Example',items:[{label:'Read'}]};
const record={'example-flow':visual};
const page=content=>[{path:'lesson.mdx',content}];
test('knowledge visuals validate literal references and shared schemas',()=>{
 assert.equal(validateKnowledgeVisuals(record,page('<KnowledgeVisual id="example-flow" />')),1);
 assert.throws(()=>validateKnowledgeVisuals(record,page('<KnowledgeVisual id="missing" />')),/unknown KnowledgeVisual/);
 assert.throws(()=>validateKnowledgeVisuals(record,page('<KnowledgeVisual id={dynamic} />')),/literal/);
 assert.throws(()=>validateKnowledgeVisuals(record,page('No reference')),/Unused/);
 assert.throws(()=>validateKnowledgeVisuals({'bad-ID':visual},[]),/Invalid knowledge visual ID/);
 assert.throws(()=>validateKnowledgeVisuals({'example-flow':{...visual,caption:''}},page('<KnowledgeVisual id="example-flow" />')),/Invalid visual/);
 assert.throws(()=>validateKnowledgeVisuals(record,[{path:'lesson.md',content:'<KnowledgeVisual id="example-flow" />'}]),/must be MDX/);
 const cycle={kind:'flow',variant:'cycle',caption:'Practice',items:Array.from({length:5},()=>({label:'Step'}))};
 assert.throws(()=>validateKnowledgeVisuals({'example-flow':cycle},page('<KnowledgeVisual id="example-flow" />')),/center labels/);
 assert.equal(validateKnowledgeVisuals({'example-flow':{...cycle,centerLabel:['Luyện tập','Hangul']}},page('<KnowledgeVisual id="example-flow" />')),1);
});
