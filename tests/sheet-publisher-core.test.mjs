import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listRows,rowDraft,checkHeaders,assertPreviewRow,assertUnchangedRow,rowKey,publisherPage} from '../src/lib/sheet-blog/core/sheet-rows.mjs';
import {recommendDestination,publisherRoute} from '../src/lib/sheet-blog/core/sheet-routing.mjs';
import {parseQueueIssue,progressFor,progressGroups,currentEvidencePR,exactEvidenceRun} from '../src/lib/sheet-blog/core/progress.mjs';
import {fingerprintInput,validateReviewedSource} from '../src/lib/sheet-blog/core/source-policy.mjs';
import {makeReceipt,putReceipt,readReceiptRows} from '../src/lib/sheet-blog/core/local-receipts.mjs';
import {sheetsClient} from '../src/lib/sheet-blog/sheets-client.mjs';
import {queueClient} from '../src/lib/sheet-blog/queue-client.mjs';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const title='Tiếng Hàn',a='a'.repeat(40),b='b'.repeat(40),id='c'.repeat(64),repo='duykhang68/khoahoctienghan';
const topics=freeze([{id:'ngon-ngu',title:'Ngôn ngữ Hàn Quốc'}]);
const row=freeze(['',title,'Dòng 1\r\n\r\nDòng 2','Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc']);
const selected=freeze(listRows([row.slice(0,2)],[row.slice(3)])[0]);
test('R7 row policy preserves column alignment, text and reviewed source',()=>{
 checkHeaders(['content id_vn','blog title','blog main content','group','topic']);
 assert.throws(()=>checkHeaders(['wrong']),/cấu trúc/);assertPreviewRow(selected,row);assertUnchangedRow(row,row);
 assert.throws(()=>assertPreviewRow(selected,['changed',...row.slice(1)]),/Dòng nguồn đã thay đổi/);
 assert.throws(()=>assertUnchangedRow(['',title,'changed',...row.slice(3)],row),/Nội dung nguồn đã đổi/);
 const draft=rowDraft(selected,row,topics,'knowledge','ngon-ngu');
 assert.deepEqual(draft.blocks.map(x=>x.text),['Dòng 1','Dòng 2']);
 assert.throws(()=>rowDraft(selected,[a,...row.slice(1)],topics,'knowledge','ngon-ngu'),/Content ID/);
 assert.deepEqual(recommendDestination(selected,topics),{kind:'knowledge',category:'ngon-ngu'});
 assert.equal(publisherRoute('/khoahoctienghan','knowledge','ngon-ngu',title),'/khoahoctienghan/ngon-ngu/tieng-han/');
 assert.deepEqual(publisherPage([selected],new Map([[rowKey(selected),{}]]),'','sent',2),{matches:[selected],totals:{pending:0,sent:1,marked:0},pages:1,page:1});
});
test('R7 read-only Sheets transport preserves requested ranges and rejects invalid rows',async()=>{
 const calls=[],client=sheetsClient('fixture',async(url,options)=>{calls.push({url,options});const r=decodeURIComponent(url.split('/values/')[1]);return {ok:true,status:200,json:async()=>({values:r.endsWith('A1:E1')?[['content id_vn','blog title','blog main content','group','topic']]:r.endsWith('A2:B')?[row.slice(0,2)]:r.endsWith('D2:E')?[row.slice(3)]:[row]})}});
 assert.deepEqual(await client.list(),[selected]);assert.deepEqual(await client.read(2),row);await assert.rejects(()=>client.read(20001),/Dòng nguồn/);
 assert.equal(calls.length,4);assert.ok(calls.every(x=>x.options.credentials==='omit'&&x.options.cache==='no-store'&&x.options.redirect==='error'&&!x.options.method));
});
test('R7 progress uses evidence and strict HEAD rejects stale PR',async()=>{
 const item=parseQueueIssue(freeze({number:5,state:'open',user:{login:'github-actions[bot]'},body:'<!-- editor-v2-fifo:'+JSON.stringify({id,source:a,phase:'WAITING_CI',head:b,base:a,pr:4})+' -->'}));
 assert.equal(progressFor(item,{ci:{status:'completed',conclusion:'success'}}).done,3);
 assert.equal(progressFor({...item,phase:'MERGED',merge:b}).done,4);
 assert.equal(progressFor({...item,phase:'VERIFIED',closed:true,merge:b,verified:b,route:'techblog/test/'}).done,6);
 assert.equal(currentEvidencePR({state:'open',head:{sha:a}},item,repo),false);
 assert.equal(exactEvidenceRun([{head_sha:b,head_repository:{full_name:repo},head_branch:'main',event:'push',id:9}],b,['pull_request'],'main',repo),undefined);
 const client=queueClient(async()=>({ok:true,json:async()=>({state:'open',head:{sha:a}})}),{strictHead:true});
 assert.deepEqual(await client.evidence(item),{staleHead:true});assert.equal(progressGroups([item],new Map([[id,{id}]])).pending.length,0);
});
test('R7 source identity and pending receipts deterministic',()=>{
 assert.deepEqual(fingerprintInput(row),[title,'Dòng 1\n\nDòng 2','Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc']);
 assert.deepEqual(fingerprintInput([a,...row.slice(1)]),fingerprintInput(row));
 assert.throws(()=>validateReviewedSource({row:2,fingerprint:id},{row:2,fingerprint:id},[a]),/Content ID/);
 const receipt=makeReceipt({id,sha:a},title);
 assert.deepEqual(putReceipt(freeze([receipt]),receipt),[receipt]);assert.deepEqual(readReceiptRows([receipt,{id:'invalid'}]),[receipt]);
});
