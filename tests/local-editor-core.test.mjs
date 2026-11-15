import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,updateDraft,draftRoute,putDraft,imageFigure,checkedLink,githubDraft,originalDraftKey,restorableOriginalDraft} from '../editor-github/core/local-draft.mjs';
import {readOriginalDraft,writeOriginalDraft} from '../editor-github/draft-storage.mjs';
import {readDrafts,saveDraft} from '../editor/apps/web/src/adapters/draft-storage.mjs';
import {allowedLocalRequest,validNonce,sessionId,activeSession,createSession,expiredSessionIds} from '../editor-github/core/session-policy.mjs';
import {prepareArticle} from '../editor/apps/web/studio-adapter.mjs';
import {articleInputs,localArticleDate,planLocalArticle} from '../core/editorial/local-publication.mjs';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const stamp='2026-11-15T00:00:00.000Z',now=new Date(stamp);
test('R8 immutable draft, route, 30 draft limit and image projection',()=>{
 const d=freeze(createDraft('id','ngon-ngu',stamp)),next=updateDraft(d,'title','Tiếng Hàn',stamp);
 assert.equal(d.title,'');assert.equal(draftRoute(next),'ngon-ngu/tieng-han/');
 assert.equal(putDraft(Array.from({length:30},(_,i)=>({id:String(i)})),next).length,30);
 assert.deepEqual(imageFigure({src:'image',width:10,height:20},' alt ',' cap ').content[1].content,[{type:'text',text:'cap'}]);
 assert.throws(()=>checkedLink('javascript:alert(1)'));assert.throws(()=>checkedLink('https://user@example.com/'));
 assert.equal(checkedLink('https://example.com'),'https://example.com/');
});
test('R8 local storage adapters preserve both key formats and draft shape',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const original={post:null,title:'Tiếng Hàn',labels:'',html:'<p>Hi</p>',series:{enabled:false},driveSchedule:null,dirty:true};
 writeOriginalDraft(storage,'new',original,stamp);assert.deepEqual(readOriginalDraft(storage,'new'),{...original,savedAt:stamp});
 assert.equal(originalDraftKey('new'),'dn-korean-editor-local-v1-new');assert.equal(restorableOriginalDraft('{"dirty":false}'),null);
 const d=createDraft('id','ngon-ngu',stamp);saveDraft(storage,d);
 assert.deepEqual(readDrafts(storage),[d]);assert.ok(values.has('korean-reddit-editor-drafts-v1'));
});
test('R8 local request/session policy preserves loopback, nonce and expiry guards',()=>{
 const headers={host:'localhost:5173',origin:'http://localhost:5173','x-editor-nonce':'fixture'};
 assert.equal(allowedLocalRequest('127.0.0.1',headers),true);
 assert.equal(allowedLocalRequest('192.0.2.1',headers),false);assert.equal(allowedLocalRequest('::1',{...headers,host:'evil.example'}),false);
 assert.equal(validNonce(headers,'fixture'),true);assert.equal(validNonce(headers,'other'),false);
 assert.equal(sessionId('x=1; kb_editor_session=abc'),'abc');
 const s=freeze(createSession({login:'owner'},0));assert.equal(activeSession(s,43200000),false);assert.equal(activeSession(s,43199999),true);
 assert.deepEqual(expiredSessionIds(new Map([['old',s]]),43200000),['old']);
});
test('R8 pure publication plan with explicit GMT+7 time matches native adapter and preserves series',()=>{
 const body=freeze({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Nội dung'}]}]});
 const draft=freeze(githubDraft({kind:'tech',category:'ngon-ngu',title:'Tiếng Hàn',summary:'',labels:['TOPIK'],series:{enabled:true,name:'Series',part:'1',total_parts:'2'},body}));
 const snapshot=freeze({paths:[],posts:[],documents:{},metadata:{}});
 const metadata={labels:['TOPIK'],series:{name:'Series',part:1,total_parts:2,target_date:'',status:'in_progress'}};
 const date=localArticleDate(now),plan=planLocalArticle(draft,snapshot,{...articleInputs(draft),body,bodyText:'Nội dung',assets:new Map(),metadata,date});
 assert.equal(date,'2026-11-15T07:00:00+07:00');assert.deepEqual(prepareArticle(draft,snapshot,now),plan);
 assert.throws(()=>prepareArticle(draft,{...snapshot,posts:[{slug:'tieng-han'}]},now),/URL đã tồn tại/);
});
