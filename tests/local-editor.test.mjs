import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowed,applyChanges,digest,MENU,POSTS} from '../local-editor/core.mjs';
import {validateMenu,routesFromPaths} from '../src/lib/knowledge-menu.mjs';
const doc='src/content/docs/index.mdx',content='---\ntitle: Home\ndescription: Test\n---\nBody';
const nav=[{label:'Tech Blog',link:'/techblog/'},{label:'Home',link:'/'}];
const files=new Map([[MENU,JSON.stringify(nav)],[POSTS,'[]'],[doc,content]]);
test('editor allows only content and menu files, not workflow or path traversal',()=>{
 for(const path of [MENU,POSTS,doc,'src/content/docs/ngon-ngu/new.md'])assert.ok(allowed(path));
 for(const path of ['.github/workflows/ci.yml','AGENTS.md','../secret','src/content/docs/../secret.md','src/content/docs/x.js','src/content/docs/x/../../a.md'])assert.equal(allowed(path),false);
});
test('menu routes preserve base and canonical blog link',()=>{
 assert.doesNotThrow(()=>validateMenu(nav,routesFromPaths([doc])));
 assert.throws(()=>validateMenu([{label:'Wrong',link:'/khoahoctienghan/techblog/'}]),/URL/);
 assert.throws(()=>validateMenu([...nav,{label:'Missing',link:'/missing/'}],routesFromPaths([doc])),/Không tìm thấy/);
 assert.throws(()=>validateMenu([{label:'Home',link:'/'}]),/Phải giữ/);
});
test('sync rejects stale revisions and invalid paths; accepts changed menu labels and order',()=>{
 const change={path:MENU,before:digest(files.get(MENU)),content:JSON.stringify([{label:'Khám phá',link:'/'},{label:'Engineering',link:'/techblog/'}])};
 assert.equal(applyChanges(files,[change]).get(MENU),change.content);
 assert.throws(()=>applyChanges(files,[{...change,before:'old'}]),/Xung đột/);
 assert.throws(()=>applyChanges(files,[{...change,path:'astro.config.mjs'}]),/không được phép/);
 assert.throws(()=>applyChanges(files,[{...change,content:'[]'}]),/Menu/);
});

import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
test('local editor browser script parses without executing',()=>{assert.doesNotThrow(()=>new Script(readFileSync(new URL('../local-editor/web/app.js',import.meta.url),'utf8')))});

import {MEDIA_INDEX,mediaPath,validateMedia} from '../src/lib/editor-media.mjs';
test('real WebP bytes are validated and staged with image references only',()=>{
 const encoded='UklGRjwAAABXRUJQVlA4IDAAAAAQAgCdASoQAAwAAQAcJaACdLoB+AH4AAPIAP7svY/9g6m3r35MX/00UYUx9aAAAAA=';
 const path='public/media/editor/0adc064c3fdb59f8495ef65898e7ac5f7e9939b53a1b52205aceb73eae2c96f0.webp';
 assert.deepEqual(validateMedia(path,encoded),{width:16,height:12});assert.ok(allowed(path));assert.ok(!mediaPath('public/media/editor/../x.webp'));
 assert.throws(()=>validateMedia(path,'aGVsbG8='),/hash|WebP/);
 const image={src:path.slice(6),alt:'Minh họa',caption:'Ảnh thử',width:16,height:12};
 const asset={path,before:null,content:encoded};
 const index={path:MEDIA_INDEX,before:null,content:JSON.stringify({'':{images:[image]}})};
 assert.equal(applyChanges(files,[asset,index]).get(path),encoded);
 assert.throws(()=>applyChanges(files,[asset]),/chưa được chèn/);
 assert.throws(()=>applyChanges(files,[asset,{...index,content:JSON.stringify({'':{images:[{...image,width:17}]}})}]),/dimensions/);
});

import {checkPositions} from '../src/lib/editor-block-position.mjs';
test('visual insertion positions support start and middle and reject out of range',()=>{const s={paragraphs:['a','b'],visuals:[{afterParagraph:0}],images:[{afterParagraph:1}]};assert.doesNotThrow(()=>checkPositions(s));assert.throws(()=>checkPositions({...s,images:[{afterParagraph:3}]}),/position/)});

test('only non-core unreferenced Knowledge leaves can be deleted',()=>{
 const path='src/content/docs/ngon-ngu/extra.md',base=new Map(files);base.set(path,content);
 const change={path,before:digest(content),content:null};
 assert.equal(applyChanges(base,[change]).has(path),false);
 assert.throws(()=>applyChanges(base,[{path:doc,before:digest(content),content:null}]),/Protected/);
 const linked=new Map(base);linked.set(doc,content+'\n[Extra](/ngon-ngu/extra/)');
 assert.throws(()=>applyChanges(linked,[change]),/still linked/);
});
