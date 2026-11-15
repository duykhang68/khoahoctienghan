import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createServer,request} from 'node:http';
import {createLocalApi} from '../editor-github/local-api.mjs';
import {overlayApp} from '../editor-github/overlay.mjs';
test('pinned original editor preserves the compose tools with an independent GitHub header',()=>{
 const path=new URL('../editor-original/apps/web/src/App.jsx',import.meta.url);
 assert(existsSync(path),'Initialize the pinned editor-original submodule first');
 const source=readFileSync(path,'utf8'),patched=overlayApp(source,'/test/GithubPanel.jsx');
 assert.match(patched,/<GithubHeader\/>/);assert.match(patched,/<GithubPublish /);assert.ok(patched.includes('readOriginalDraft(localStorage,blogId)'));assert.ok(patched.includes('writeOriginalDraft(localStorage,blogId'));
 for(const text of ['DiagramStudio','Auto Visualize','DrivePanel','SeriesEditorPanel','SchedulePost','PostLibrary','EditorContent','BLOCKS.map'])assert(patched.includes(text));
 assert(!patched.includes('href="/auth/google/start"'));assert.throws(()=>overlayApp(source.replace('dn-reddit-editor-local-v1-','changed-'),'/x'));
});
test('loopback API reports disconnected Blogger, independent GitHub session, CSRF and explicit draft confirmation',async()=>{
 let verified=0,published=0;
 const handler=createLocalApi({verify:async()=>{verified++;return {login:'duykhang68',repository:'duykhang68/khoahoctienghan'}},publish:async()=>{published++;return {number:123}},driveClient:''});
 // Real loopback requests use the expected host; dynamic test port avoids collisions.
 const server=createServer((req,res)=>handler(req,res,()=>{res.statusCode=404;res.end()}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const q=(path,opts={})=>new Promise((resolve,reject)=>{
   const req=request(base+path,{method:opts.method||'GET',headers:{Host:'localhost:5173',...opts.headers}},res=>{
    let text='';res.setEncoding('utf8');res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:{get:name=>Array.isArray(res.headers[name])?res.headers[name][0]:res.headers[name]},json:async()=>JSON.parse(text)}));res.on('error',reject);
   });req.on('error',reject);req.end(opts.body);
  });
  const status=await q('/api/status');assert.equal(status.status,200);assert.equal((await status.json()).connected,false);
  assert.equal((await q('/api/drive-client-config')).status,200);
  const path='/api/github-editor/session',s=await q(path).then(r=>r.json());assert.equal(s.connected,false);
  const headers={Origin:'http://localhost:5173','X-Editor-Nonce':s.nonce,'Content-Type':'application/json'};
  assert.equal((await q(path,{method:'POST',headers:{...headers,Origin:'https://evil.example'}})).status,403);
  assert.equal((await q('/api/github-editor/draft',{method:'POST',headers,body:JSON.stringify({confirm:true})})).status,401);
  const connected=await q(path,{method:'POST',headers});assert.equal(connected.status,200);const c=connected.headers.get('set-cookie').split(';')[0];assert.equal(verified,1);
  assert.equal((await q('/api/github-editor/draft',{method:'POST',headers:{...headers,Cookie:c},body:'{}'})).status,400);
  assert.equal((await q('/api/github-editor/draft',{method:'POST',headers:{...headers,Cookie:c},body:JSON.stringify({confirm:true,draft:{}})})).status,201);assert.equal(published,1);
  assert.equal((await q(path,{method:'DELETE',headers:{...headers,Cookie:c}})).status,200);
  assert.equal((await q('/api/github-editor/draft',{method:'POST',headers:{...headers,Cookie:c},body:JSON.stringify({confirm:true})})).status,401);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
