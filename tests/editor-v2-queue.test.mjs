import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {marker,queueHead,submissionId,validateSubmission,prepareQueued} from '../scripts/editor-v2-queue-policy.mjs';
import {newBlock} from '../src/lib/editor-v2/model.mjs';
import {normalizeDocument} from '../src/lib/studio-document.mjs';
const sha='a'.repeat(40),id='b'.repeat(64);
const issue=(number,phase,state='open',login='github-actions[bot]')=>({number,state,user:{login},body:marker+JSON.stringify({id,source:sha,phase})+' -->'});
test('FIFO uses accepted issue number and never skips failed or prematurely closed head',()=>{
 assert.equal(queueHead([issue(9,'QUEUED'),issue(8,'MERGED'),issue(7,'VERIFIED','closed')]).number,8);
 assert.equal(queueHead([issue(9,'QUEUED'),issue(8,'WAITING_CI','closed')]).number,8);
 assert.equal(queueHead([issue(2,'QUEUED','open','stranger'),issue(9,'QUEUED')]).number,9);
 assert.equal(submissionId('refs/heads/content/editor-v2-'+id),id);
 assert.equal(submissionId('refs/heads/main'),null);
});
test('immutable draft validation and projections respect native Astro schema',async()=>{
 const draft={title:'Học tiếng Hàn',summary:'Bài học',kind:'knowledge',category:'ngon-ngu',labels:'TOPIK, Hangul',series:{enabled:true,name:'Tiếng Hàn',part:1,total_parts:2,target_date:''},blocks:[{...newBlock('paragraph'),text:'Nội dung',marks:['bold']}]};
 const raw=JSON.stringify({version:1,draft}),digest=createHash('sha256').update(raw).digest('hex');
 assert.deepEqual(await validateSubmission(digest,raw),draft);
 await assert.rejects(validateSubmission(id,raw),/digest/);
 const snapshot={paths:['src/content/docs/ngon-ngu/index.md'],posts:[],documents:{},metadata:{},categorySource:'---\ntitle: Ngôn ngữ\ndescription: Bài học\n---\n'};
 const date='2026-11-14T14:00:00Z';
 const kb=await prepareQueued(draft,snapshot,date);
 assert.equal(kb.route,'ngon-ngu/hoc-tieng-han/');
 const doc=JSON.parse(kb.changes.get('src/data/studio-documents.json').text)['ngon-ngu--hoc-tieng-han'];assert.deepEqual(normalizeDocument(doc),doc);
 const m=JSON.parse(kb.changes.get('src/data/studio-metadata.json').text)['ngon-ngu--hoc-tieng-han'];
 assert.deepEqual(m.labels,['TOPIK','Hangul']);assert.equal(m.series.part,1);assert.equal(m.date,'2026-11-14T21:00:00+07:00');
 const tech=await prepareQueued({...draft,kind:'tech'},snapshot,date);const post=JSON.parse(tech.changes.get('src/data/techblog/posts.json').text)[0];assert.deepEqual(normalizeDocument(post.studioBody),post.studioBody);
 assert.equal(post.date,m.date);
 await assert.rejects(prepareQueued({...draft,title:'Editor V2',kind:'tech'},snapshot,date),/URL/);
});

import {githubClient} from '../src/lib/editor-v2/github.mjs';
test('browser staging never writes main, retries dispatch without duplicate ref',async()=>{
 const requests=[],source='c'.repeat(40);let ref=null,file=null;
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
 const fetcher=async(url,opts)=>{
  const path=new URL(url).pathname,body=opts.body?JSON.parse(opts.body):null;requests.push({path,method:opts.method,body});
  if(path==='/user')return json({login:'duykhang68'});
  if(path==='/repos/duykhang68/khoahoctienghan')return json({full_name:'duykhang68/khoahoctienghan',permissions:{push:true}});
  if(path.endsWith('/git/ref/heads/main'))return json({object:{sha}});
  if(path.includes('/git/ref/heads/content/editor-v2-'))return ref?json({object:{sha:source}}):json({},404);
  if(path.endsWith('/git/commits/'+sha))return json({tree:{sha}});
  if(path.endsWith('/git/blobs'))return json({sha});
  if(path.endsWith('/git/trees')){assert.equal(body.tree.length,1);file=body.tree[0].path;assert.match(file,/^editor-submissions\/[a-f0-9]{64}\.json$/);return json({sha})}
  if(path.endsWith('/git/commits')&&opts.method==='POST')return json({sha:source});
  if(path.endsWith('/git/refs')){assert.match(body.ref,/^refs\/heads\/content\/editor-v2-/);ref=body.ref;return json({ref})}
  if(path.endsWith('/commits/'+source))return json({files:[{filename:file}]});
  if(path.endsWith('/dispatches')){assert.equal(body.client_payload.ref,ref);assert.equal(body.client_payload.sha,source);return new Response(null,{status:204})}
  throw Error('Unexpected '+path);
 };
 const draft={title:'Bài mới',summary:'',kind:'tech',category:'ngon-ngu',labels:'',series:{enabled:false},blocks:[{...newBlock('paragraph'),text:'Nội dung'}]};
 const client=githubClient('test-memory-token',fetcher);const first=await client.publish(draft,[]),second=await client.publish(draft,[]);
 assert.equal(first.sha,second.sha);assert.equal(first.id,second.id);
 assert.equal(requests.filter(x=>x.path.endsWith('/git/refs')&&x.method==='POST').length,1);
 assert.equal(requests.filter(x=>x.path.endsWith('/dispatches')).length,2);
 assert(!requests.some(x=>x.method!=='GET'&&(/\/main$/.test(x.path)||x.path.endsWith('/pulls'))));
});
