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
 assert.deepEqual(JSON.parse(kb.changes.get('src/data/studio-metadata.json').text),{...prior,'ngon-ngu--tieng-han-co-ban':expected});
 assert.throws(()=>prepareArticle({...input,kind:'tech',series:{...input.series,part:11}},snapshot),/Series/);
 assert.throws(()=>prepareArticle({...input,kind:'tech',series:{...input.series,target_date:'2027-02-30'}},snapshot),/Ngày/);
 assert.throws(()=>prepareArticle({...input,kind:'tech',labels:[{}]},snapshot),/Nhãn/);
 const none=JSON.parse(prepareArticle({...input,kind:'tech',series:{enabled:false}},snapshot).changes.get('src/data/techblog/posts.json').text)[0];
 assert.equal(none.series,undefined);
});
