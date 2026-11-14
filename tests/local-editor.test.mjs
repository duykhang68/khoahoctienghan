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

import {selectNativeCI,publishPhase} from '../local-editor/publishing.mjs';
test('publishing tracker does not confuse CI, merge and public marker',()=>{
 const sha='a'.repeat(40),head={head_sha:sha,head_branch:'content/editor-test',head_repository:{full_name:'duykhang68/khoahoctienghan'},status:'completed',conclusion:'success',event:'pull_request',id:1};
 const ci=selectNativeCI([head,{...head,id:2,event:'workflow_dispatch'},{...head,id:3,head_sha:'b'.repeat(40)}],sha,head.head_branch);
 assert.equal(ci.id,1);
 assert.equal(publishPhase({state:'open'},ci,null,null),'CI_PASSED_WAITING_MERGE');
 assert.equal(publishPhase({merged:true},ci,{routesOK:true},null),'MERGED_WAITING_PUBLIC');
 assert.equal(publishPhase({merged:true},ci,{routesOK:false},'exact'),'MERGED_WAITING_PUBLIC');
 assert.equal(publishPhase({merged:true},ci,{routesOK:true},'ancestor'),'PUBLIC_MARKER_CONFIRMED');
});
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
test('real loopback editor rejects foreign host origin and missing nonce',async()=>{
 const probe=createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve)});const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 const child=spawn(process.execPath,['local-editor/server.mjs'],{env:{...process.env,EDITOR_PORT:String(port)},stdio:['ignore','pipe','pipe']});
 const base='http://127.0.0.1:'+port;
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Editor listen timeout')),8000);child.once('error',e=>{clearTimeout(timer);reject(e)});child.once('exit',code=>{clearTimeout(timer);reject(Error('Editor exited '+code))});child.stdout.once('data',()=>{clearTimeout(timer);resolve()})});
  const session=await fetch(base+'/api/session');assert.equal(session.status,200);const {nonce}=await session.json();
  const html=await fetch(base+'/');assert.match(html.headers.get('content-security-policy'),/default-src 'none'/);assert.equal(html.headers.get('x-frame-options'),'DENY');
  assert.equal((await fetch(base+'/api/session',{headers:{Origin:'https://example.invalid'}})).status,403);
  const init={method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'};
  assert.equal((await fetch(base+'/api/publishing',init)).status,403);
  assert.equal((await fetch(base+'/api/publishing',{...init,headers:{...init.headers,'X-Editor-Nonce':nonce}})).status,401);
 }finally{child.kill();await new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)resolve();else child.once('exit',resolve)})}
});

test('Markdown to MDX keeps route and protected links when migrated atomically',()=>{
 const from='src/content/docs/ngon-ngu/hangul.md',to=from+'x',base=new Map(files);base.set(from,content);base.set(doc,content+'\n[Link](/ngon-ngu/hangul/)');
 const result=applyChanges(base,[{path:from,before:digest(content),content:null},{path:to,before:null,content}]);assert.ok(!result.has(from)&&result.has(to));assert.ok(routesFromPaths(result.keys()).has('/ngon-ngu/hangul/'));
 assert.throws(()=>applyChanges(base,[{path:from,before:digest(content),content:null}]),/Protected/);
});

import {assertPreviewSource,validPreviewRoute} from '../local-editor/preview.mjs';
test('production preview compiles only approved local MDX syntax and safe routes',()=>{
 const doc='src/content/docs/ngon-ngu/test.mdx',front='---\ntitle: Test\ndescription: Test article\n---\n';
 assert.ok(validPreviewRoute('ngon-ngu/test/'));assert.ok(!validPreviewRoute('../etc/'));assert.ok(!validPreviewRoute('https://example.com/'));
 assert.doesNotThrow(()=>assertPreviewSource(doc,front+"import KnowledgeImage from '../../../components/KnowledgeImage.astro';\n\n<KnowledgeImage id=\"image-test\" />\n\nBody",null));
 assert.throws(()=>assertPreviewSource(doc,front+"import Evil from 'node:fs';\n\n<Evil />",null),/arbitrary/);
 assert.throws(()=>assertPreviewSource(doc,front+'{process.env.SECRET}',null),/arbitrary/);
 assert.throws(()=>assertPreviewSource(doc,front+"import KnowledgeImage from 'https://example.com/KnowledgeImage.astro';",null),/arbitrary/);
 assert.throws(()=>assertPreviewSource(doc,front.replace('description: Test article','description: Test article\ncustom: true')+'Body',null),/metadata/);
});

import {cloneDependencies} from '../local-editor/preview.mjs';
import {mkdtemp as makeTemp,mkdir as makeDirectory,writeFile as putFile,readFile as getFile,rm as removeTemp,symlink as makeLink,lstat as inspectPath} from 'node:fs/promises';
import {tmpdir as tempRoot} from 'node:os';
import {join as joinPath} from 'node:path';
test('preview dependencies are isolated from main checkout and generated caches',async()=>{
 const dir=await makeTemp(joinPath(tempRoot(),'editor-deps-test-'));
 try{
  const src=joinPath(dir,'source'),dest=joinPath(dir,'preview');
  await makeDirectory(joinPath(src,'node_modules','pkg'),{recursive:true});
  await makeDirectory(joinPath(src,'node_modules','.astro'),{recursive:true});
  await makeDirectory(joinPath(src,'node_modules','.bin'),{recursive:true});
  await makeDirectory(dest);
  await putFile(joinPath(src,'node_modules','pkg','value.js'),'original');
  await putFile(joinPath(src,'node_modules','.astro','cache'),'old');
  await makeLink('../pkg/value.js',joinPath(src,'node_modules','.bin','tool'));
  await cloneDependencies(src,dest);
  assert.equal((await inspectPath(joinPath(dest,'node_modules'))).isSymbolicLink(),false);
  await assert.rejects(inspectPath(joinPath(dest,'node_modules','.astro')),{code:'ENOENT'});
  await putFile(joinPath(dest,'node_modules','pkg','value.js'),'draft');
  assert.equal(await getFile(joinPath(src,'node_modules','pkg','value.js'),'utf8'),'original');
  assert.equal(await getFile(joinPath(dest,'node_modules','.bin','tool'),'utf8'),'draft');
 }finally{await removeTemp(dir,{recursive:true,force:true})}
});
