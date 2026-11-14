import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDocument} from '../src/lib/studio-document.mjs';
import {prepareArticle} from '../editor/apps/web/studio-adapter.mjs';
const body={type:'doc',content:[{type:'heading',attrs:{level:2},content:[{type:'text',text:'Tiêu đề'}]},{type:'paragraph',content:[{type:'text',text:'Nội dung',marks:[{type:'bold'}]}]}]};
const snapshot={paths:['src/content/docs/ngon-ngu/index.md'],posts:[],documents:{},categorySource:'---\ntitle: Tiếng Hàn\ndescription: Bài học\n---\n\nNội dung'};
test('React editor projects validated content to both destinations without raw HTML',()=>{
 const draft={title:'Tiếng Hàn cơ bản',summary:'Bài học',body};
 const tech=prepareArticle({...draft,kind:'tech'},snapshot);assert.equal(tech.route,'techblog/tieng-han-co-ban/');assert.deepEqual(JSON.parse(tech.changes.get('src/data/techblog/posts.json').text)[0].studioBody,normalizeDocument(body));
 const kb=prepareArticle({...draft,kind:'knowledge',category:'ngon-ngu'},snapshot);assert.equal(kb.route,'ngon-ngu/tieng-han-co-ban/');assert.match(kb.changes.get('src/content/docs/ngon-ngu/tieng-han-co-ban.mdx').text,/<KnowledgeStudioDocument id="ngon-ngu--tieng-han-co-ban" \/>/);assert.match(kb.changes.get('src/content/docs/ngon-ngu/index.md').text,/\/khoahoctienghan\/ngon-ngu\/tieng-han-co-ban\//);
 assert.throws(()=>prepareArticle({...draft,kind:'knowledge',category:'../../evil'},snapshot));
 assert.throws(()=>normalizeDocument({type:'doc',content:[{type:'script'}]}));
 assert.throws(()=>normalizeDocument({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'x',marks:[{type:'link',attrs:{href:'javascript:alert(1)'}}]}]}]}));
});

test('preserves labels and every series field in both Astro destinations',()=>{
 const input={title:'Tiếng Hàn cơ bản',summary:'Bài học',body,labels:[' TOPIK ','Hangul','TOPIK'],series:{enabled:true,name:'Học tiếng Hàn',part:2,total_parts:10,target_date:'2027-01-15'}};
 const expected={labels:['TOPIK','Hangul'],series:{name:'Học tiếng Hàn',part:2,total_parts:10,target_date:'2027-01-15',status:'in_progress'}};
 const tech=JSON.parse(prepareArticle({...input,kind:'tech'},snapshot).changes.get('src/data/techblog/posts.json').text)[0];
 assert.deepEqual({labels:tech.labels,series:tech.series},expected);
 const prior={'another--post':{labels:['Cũ']}};
 const kb=prepareArticle({...input,kind:'knowledge',category:'ngon-ngu'},{...snapshot,metadata:prior});
 const saved=JSON.parse(kb.changes.get('src/data/studio-metadata.json').text);const record=saved['ngon-ngu--tieng-han-co-ban'];assert.match(record.date,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/);assert.deepEqual(saved,{...prior,'ngon-ngu--tieng-han-co-ban':{...expected,date:record.date}});
 assert.throws(()=>prepareArticle({...input,kind:'tech',series:{...input.series,part:11}},snapshot),/Series/);
 assert.throws(()=>prepareArticle({...input,kind:'tech',series:{...input.series,target_date:'2027-02-30'}},snapshot),/Ngày/);
 assert.throws(()=>prepareArticle({...input,kind:'tech',labels:[{}]},snapshot),/Nhãn/);
 const none=JSON.parse(prepareArticle({...input,kind:'tech',series:{enabled:false}},snapshot).changes.get('src/data/techblog/posts.json').text)[0];
 assert.equal(none.series,undefined);
});

import {buildKnowledgeFeed,matchesKnowledgeArticle} from '../src/lib/knowledge-feed.mjs';
test('knowledge list derives from real docs and editor metadata, not manually appended links',()=>{
 const draft={title:'Học tiếng Hàn',summary:'Từ vựng',body,kind:'knowledge',category:'ngon-ngu',labels:['TOPIK'],series:{enabled:true,name:'Học tiếng Hàn',part:1,total_parts:3,target_date:''}};
 const result=prepareArticle(draft,snapshot);
 const meta=JSON.parse(result.changes.get('src/data/studio-metadata.json').text);
 const entries=[{id:'ngon-ngu',data:{title:'Chuyên mục'}},{id:'ngon-ngu/index',data:{title:'Tổng quan'}},{id:'ngon-ngu/hangul',data:{title:'Hangul',description:'Nền tảng'}},{id:'ngon-ngu/hoc-tieng-han',data:{title:draft.title,description:draft.summary}},{id:'ngon-ngu/private',data:{title:'Draft',draft:true}}];
 const feed=buildKnowledgeFeed(entries,meta,[{id:'ngon-ngu',title:'Ngôn ngữ Hàn Quốc'}]);
 assert.equal(feed.length,2);assert.equal(feed[0].slug,'ngon-ngu/hoc-tieng-han');assert.deepEqual(feed[0].labels,['TOPIK']);assert.equal(feed[0].series.part,1);
 assert.equal(feed[1].date,undefined);
 assert(matchesKnowledgeArticle(feed[0],{query:'hoc tieng han',topic:'ngon-ngu',label:'TOPIK',series:'Học tiếng Hàn'}));
 assert(!matchesKnowledgeArticle(feed[1],{label:'TOPIK'}));
});
