import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import {sheetSource,rowFingerprint,validateSheetSource} from '../src/lib/sheet-blog/source.mjs';
import {sheetWriter,syncSheetReceipt,serviceAccountToken,legacyDraftText} from '../scripts/sheet-writeback.mjs';
import {validateSubmission} from '../scripts/editor-v2-queue-policy.mjs';
import {createHash} from 'node:crypto';
const merge='a'.repeat(40),verified='b'.repeat(40);
const state={phase:'VERIFIED',closed:true,merge,verified,pr:1,route:'ngon-ngu/bai-thu/'};
const sourceRow=['','Bài thử','Dòng một\n\nDòng hai','Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc'];
const json=(v,status=200)=>new Response(JSON.stringify(v),{status});
async function fixture({duplicate=false,changed=false,id='',moved=true}={}){
 const draft={title:'Bài thử',sheetSource:await sheetSource(2,sourceRow)},calls=[];
 const row=moved?5:2,stored=[id,...sourceRow.slice(1)];if(changed)stored[2]='Đã thay đổi';
 const fetcher=async(url,options)=>{
  const u=new URL(url),range=decodeURIComponent(u.pathname).split('/values/')[1];calls.push({url:u,range,method:options.method,body:options.body});
  assert.equal(options.headers.Authorization,'Bearer fixture-token');
  if(!range)return json({sheets:[{properties:{sheetId:0,title:'VN'}}]});
  if(range==="'VN'!A1:E1")return json({values:[['content id_vn','blog title','blog main content','group','topic']]});
  if(range==="'VN'!B2:B20000"){const titles=Array.from({length:row-1},()=>[]);titles[row-2]=['Bài thử'];if(duplicate)titles.push(['Bài thử']);return json({values:titles})}
  if(range===`'VN'!A${row}:E${row}`||duplicate&&range===`'VN'!A${row+1}:E${row+1}`)return json({values:[stored.slice()]});
  if(range===`'VN'!A${row}`&&options.method==='PUT'){
   assert.equal(u.searchParams.get('valueInputOption'),'RAW');
   assert.deepEqual(JSON.parse(options.body).values,[[merge]]);stored[0]=merge;return json({updatedCells:1});
  }
  throw Error('Unexpected fixture request');
 };
 return {draft,calls,fetcher,stored,row};
}
test('fingerprint binds exact source content, ignoring only ID and CRLF normalization',async()=>{
 assert.equal(await rowFingerprint(sourceRow),await rowFingerprint(['existing',...sourceRow.slice(1)]));
 assert.notEqual(await rowFingerprint(sourceRow),await rowFingerprint(['',sourceRow[1],'Dòng một\nDòng hai',...sourceRow.slice(3)]));
 const source=await sheetSource(2,sourceRow);
 assert.throws(()=>validateSheetSource({...source,spreadsheet:'other'}));
});
test('writer locates a moved exact row, writes only A with merge SHA and rereads; retry is idempotent',async()=>{
 const f=await fixture();const writer=sheetWriter('fixture-token',f.fetcher);
 assert.deepEqual(await writer.write({state,draft:f.draft}),{row:5,commit:merge});
 await writer.write({state,draft:f.draft});
 assert.equal(f.calls.filter(x=>x.method==='PUT').length,1);assert.equal(f.stored[0],merge);
});
test('no Google call or write before verified and closed production receipt',async()=>{
 for(const s of [{...state,phase:'MERGED'},{...state,closed:false},{...state,verified:null},{...state,merge:'bad'}]){
  const f=await fixture();await assert.rejects(sheetWriter('fixture-token',f.fetcher).write({state:s,draft:f.draft}),/PRODUCTION_NOT_VERIFIED/);assert.equal(f.calls.length,0);
 }
});
test('changed source, duplicates, foreign IDs and formulas fail closed without overwrites',async()=>{
 for(const options of [{changed:true},{duplicate:true},{id:'old-value'},{id:'=IF(TRUE,"","")'}]){
  const f=await fixture(options);await assert.rejects(sheetWriter('fixture-token',f.fetcher).write({state,draft:f.draft}),/SHEET_(SOURCE_CHANGED|ROW_AMBIGUOUS|ID_CONFLICT)/);assert.equal(f.calls.filter(x=>x.method==='PUT').length,0);
 }
});

const legacyBody='Dòng một có đầy đủ nội dung để xác minh nguồn\n\nDòng hai cũng được bảo toàn nguyên bản';
const legacyDraft={kind:'knowledge',title:'Bài thử',blocks:[
 {kind:'paragraph',text:'Dòng một có đầy đủ nội dung để xác minh nguồn',marks:[]},
 {kind:'paragraph',text:'Dòng hai cũng được bảo toàn nguyên bản',marks:[]}
]};
async function legacyFixture(options={}){
 const f=await fixture(options);
 f.stored[2]=options.changed?'Nội dung nguồn đã bị thay đổi so với bản gửi':legacyBody;
 return f;
}
test('legacy VERIFIED publication reconciles by unique title and entire body, idempotently',async()=>{
 const f=await legacyFixture(),writer=sheetWriter('fixture-token',f.fetcher);
 assert.equal(legacyDraftText(legacyDraft),legacyBody.replace(/\s+/gu,' '));
 assert.deepEqual(await writer.write({state,draft:legacyDraft}),{row:5,commit:merge});
 assert.deepEqual(await writer.write({state,draft:legacyDraft}),{row:5,commit:merge});
 assert.equal(f.calls.filter(x=>x.method==='PUT').length,1);
});
test('legacy reconciliation skips mismatched and duplicate sources without writes',async()=>{
 for(const options of [{changed:true},{duplicate:true}]){
  const f=await legacyFixture(options);
  assert.equal(await sheetWriter('fixture-token',f.fetcher).write({state,draft:legacyDraft}),null);
  assert.equal(f.calls.filter(x=>x.method==='PUT').length,0);
 }
 const wrong={...legacyDraft,blocks:[{kind:'paragraph',text:'Nội dung hoàn toàn khác và không được phép dùng để ghi ID',marks:[]}]};
 const f=await legacyFixture();
 assert.equal(await sheetWriter('fixture-token',f.fetcher).write({state,draft:wrong}),null);
 assert.equal(f.calls.filter(x=>x.method==='PUT').length,0);
 const conflict=await legacyFixture({id:'foreign-id'});
 await assert.rejects(sheetWriter('fixture-token',conflict.fetcher).write({state,draft:legacyDraft}),/SHEET_ID_CONFLICT/);
 assert.equal(conflict.calls.filter(x=>x.method==='PUT').length,0);
 assert.equal(legacyDraftText({...legacyDraft,blocks:[{kind:'heading',text:'Bài',marks:[]}]}),null);
 assert.equal(await syncSheetReceipt(state,legacyDraft,''),null);
});
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const credential=JSON.stringify({type:'service_account',client_email:'fixture@example.iam.gserviceaccount.com',private_key:privateKey.export({type:'pkcs8',format:'pem'})});
test('service-account JWT has fixed Google audience and scope, correct signature, never follows key URLs',async()=>{
 const token=await serviceAccountToken(credential,async(url,options)=>{
  assert.equal(url,'https://oauth2.googleapis.com/token');assert.equal(options.redirect,'error');
  const assertion=new URLSearchParams(options.body).get('assertion'),[head,body,sig]=assertion.split('.');
  assert(verify('RSA-SHA256',Buffer.from(head+'.'+body),publicKey,Buffer.from(sig,'base64url')));
  const claims=JSON.parse(Buffer.from(body,'base64url'));assert.equal(claims.scope,'https://www.googleapis.com/auth/spreadsheets');assert.equal(claims.aud,url);assert.equal(claims.exp-claims.iat,3600);assert.equal(claims.sub,undefined);
  return json({access_token:'fixture-token'});
 },1700000000);assert.equal(token,'fixture-token');
});
test('missing configuration, safe diagnostics, bounded transient retries and blocking unknown failures',async()=>{
 const f=await fixture();const fail=async()=>json({error:{message:'sensitive key detail'}},503);
 assert.equal((await syncSheetReceipt({...state,phase:'MERGED'},f.draft,credential,()=>assert.fail('Must not authenticate before production verification'))).code,'PRODUCTION_NOT_VERIFIED');
 assert.equal((await syncSheetReceipt(state,f.draft,'')).status,'WAITING_CONFIG');
 const first=await syncSheetReceipt(state,f.draft,credential,fail);assert.equal(first.status,'PENDING');assert.equal(first.attempts,1);assert(!JSON.stringify(first).includes('sensitive'));
 const last=await syncSheetReceipt({...state,sheetSync:{status:'PENDING',attempts:2}},f.draft,credential,fail);assert.equal(last.status,'BLOCKED');assert.equal(last.attempts,3);
 assert.equal((await syncSheetReceipt({...state,sheetSync:{status:'PENDING',attempts:3}},f.draft,credential,()=>assert.fail('Retry budget exhausted'))).code,'SHEET_RETRY_LIMIT');
 assert.equal((await syncSheetReceipt(state,f.draft,'invalid')).status,'BLOCKED');
 assert.equal(await syncSheetReceipt(state,{},credential),null);
});
test('immutable submissions accept valid Sheet binding, reject arbitrary destination, preserve old editor drafts',async()=>{
 const draft={title:'Bài thử',summary:'Bài thử',kind:'tech',blocks:[{kind:'paragraph',text:'Bài thử',marks:[]}],sheetSource:await sheetSource(2,sourceRow)};
 const validate=d=>{const raw=JSON.stringify({version:1,draft:d});return validateSubmission(createHash('sha256').update(raw).digest('hex'),raw)};
 assert.deepEqual(await validate(draft),draft);
 await assert.rejects(validate({...draft,sheetSource:{...draft.sheetSource,tab:'en'}}),/Invalid Google/);
 const {sheetSource:_,...old}=draft;assert.deepEqual(await validate(old),old);
});
