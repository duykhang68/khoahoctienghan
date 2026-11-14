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
