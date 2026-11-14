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
