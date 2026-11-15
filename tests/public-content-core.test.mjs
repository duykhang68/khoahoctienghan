import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sortedPosts,techIndex,readingMinutes,coverURL,dateLabel,yearLabel,orderedTopics,buildKnowledgeFeed,matchesKnowledgeArticle} from '../core/editorial/content-index.mjs';
import {inferCategory} from '../src/lib/tech-categories.mjs';
import {normalizeDocument,documentText,assertImageFiles,webpDimensions} from '../src/lib/studio-document.mjs';
import {documentProjection,imageReferences} from '../core/editorial/document-schema.mjs';
import {validateContentPages,validateSidebar,validateTechPosts,validateStudioReferences,assertUsedStudioDocument,validateArticleMetadata} from '../core/editorial/content-validation.mjs';
import {sensitiveFile} from '../core/engineering/merge-policy.mjs';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
test('R9 public index preserves newest first, stable ties, taxonomy and explicit GMT+7',()=>{
 const base={title:'GitHub Actions CI CD',summary:'Deployment',sections:[{heading:'Nội dung',paragraphs:['Build']}],issues:[]};
 const input=freeze([{...base,slug:'old',date:'2026-11-14T23:59:59+07:00'},{...base,slug:'new',date:'2026-11-15T00:00:00+07:00'},{...base,slug:'tie',date:'2026-11-15T00:00:00+07:00'}]);
 assert.deepEqual(sortedPosts(input).map(x=>x.slug),['new','tie','old']);assert.equal(input[0].slug,'old');
 assert.equal(techIndex(input).categories[0].count,3);assert.equal(inferCategory(input[0]).id,'engineering');
 assert.equal(yearLabel('2025-12-31T18:00:00Z'),'2026');
 assert.match(dateLabel('2026-11-15T00:00:01Z'),/07:00:01/);
 assert.equal(readingMinutes({...base,readingMinutes:0}),0);assert.equal(coverURL('//bad.example','/kb'),undefined);assert.equal(coverURL('/media/a.webp','/kb'),'/kb/media/a.webp');
});
test('R9 knowledge feed and navigation keep draft exclusion and canonical order',()=>{
 const topics=freeze([{id:'ngon-ngu',title:'Ngôn ngữ'},{id:'lich-su',title:'Lịch sử'}]);
 assert.deepEqual(orderedTopics(topics,['lich-su','ngon-ngu']).map(x=>x.id),['lich-su','ngon-ngu']);assert.throws(()=>orderedTopics(topics,['lich-su','lich-su']));
 const entries=freeze([{id:'ngon-ngu/index',data:{title:'Index'}},{id:'ngon-ngu/hangul',data:{title:'Chữ Hàn'}},{id:'ngon-ngu/draft',data:{title:'Draft',draft:true}}]);
 const list=buildKnowledgeFeed(entries,{},topics);assert.equal(list.length,1);assert.ok(matchesKnowledgeArticle(list[0],{query:'chu han'}));
});
test('R9 document projection emits ordered embedded-image requests without I/O',()=>{
 const src='data:image/webp;base64,AA==',canonical='/media/studio/'+'a'.repeat(64)+'.webp';
 const body=freeze({type:'doc',content:[{type:'articleFigure',content:[{type:'image',attrs:{src,alt:'Ảnh'}}]},{type:'paragraph',content:[{type:'text',text:'Nội dung'}]}]});
 const g=documentProjection(body,{allowEmbedded:true}),first=g.next();assert.deepEqual(first,{done:false,value:{kind:'embedded-webp',source:src}});
 const final=g.next({src:canonical,width:10,height:20});assert.equal(final.done,true);assert.equal([...imageReferences(final.value)][0].src,canonical);
 assert.deepEqual(normalizeDocument(final.value),final.value);assert.match(documentText(final.value),/Nội dung/);
 assert.throws(()=>normalizeDocument(body),/Invalid repository image/);assert.throws(()=>webpDimensions(Buffer.from('bad')),/Invalid WebP/);
 assert.throws(()=>normalizeDocument({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'x',marks:[{type:'link',attrs:{href:'javascript:alert(1)'}}]}]}]}),/Unsafe link/);
});
test('R9 source validators reject broken links, invalid refs and orphan metadata',()=>{
 const pages=freeze(Array.from({length:14},(_,i)=>({path:'p'+i+'.md',content:'---\ntitle: Test\ndescription: Example\n---\n'})));
 assert.equal(validateContentPages(pages),14);
 assert.throws(()=>validateContentPages([{...pages[0],content:pages[0].content+'[bad](/missing/)'},...pages.slice(1)]),/broken link/);
 assert.throws(()=>validateSidebar("label: 'x', autogenerate: {}"),/Legacy/);
 assert.throws(()=>validateTechPosts([{slug:'editorv2',sections:[]}]),/Reserved route/);
 const refs=validateStudioReferences([{path:'x.mdx',content:'<KnowledgeStudioDocument id="test" />'}],{test:{}});
 assert.ok(refs.has('test'));assert.throws(()=>assertUsedStudioDocument(refs,'unused'),/Unused/);
 assert.throws(()=>validateArticleMetadata({orphan:{}},[],refs),/Orphan/);
 assert.throws(()=>validateStudioReferences([{path:'x.md',content:'<KnowledgeStudioDocument id="test" />'}],{test:{}}),/Invalid/);
 for(const path of ['core/editorial/content-validation.mjs','core/editorial/document-schema.mjs','core/editorial/webp.mjs'])assert.ok(sensitiveFile(path));
});
