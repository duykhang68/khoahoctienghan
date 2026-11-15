import test from 'node:test';
import {Script} from 'node:vm';
import assert from 'node:assert/strict';
import worker,{verifyGoogle,dashboardSnapshot,librarySnapshot} from './worker.mjs';
const origin='https://example.test';
const env={BACKOFFICE_ORIGIN:origin,GOOGLE_CLIENT_ID:'example.apps.googleusercontent.com',ADMIN_EMAILS:'admin@gmail.com',SESSION_SECRET:'x'.repeat(48)};
const req=(path,opts)=>new Request(origin+path,opts);
test('missing config and anonymous requests fail closed',async()=>{
 assert.equal((await worker.fetch(req('/admin/'),{})).status,503);
 assert.equal((await worker.fetch(req('/admin/'),env)).status,303);
 assert.equal((await worker.fetch(req('/admin/engineering/'),env)).status,303);
 assert.equal((await worker.fetch(req('/admin/sheets/'),env)).status,303);
 assert.equal((await worker.fetch(req('/admin/editor/'),env)).status,303);
 assert.equal((await worker.fetch(req('/admin/assets/editor-v2/browser.mjs'),env)).status,403);
 for(const path of ['/admin/assets/sheet-blog/browser.mjs','/admin/assets/sheet-blog.css','/admin/article-check/techblog/bai-thu/'])assert.equal((await worker.fetch(req(path),env)).status,403);
 assert.equal((await worker.fetch(req('/admin/engineering/',{headers:{Cookie:'__Host-bo_session=fake.signature'}}),env)).status,303);
 assert.equal((await worker.fetch(new Request('https://preview.example.test/admin/engineering/'),env)).status,403);
 assert.equal((await worker.fetch(req('/api/private'),env)).status,403);
 assert.equal((await worker.fetch(req('/api/private',{headers:{'Cf-Access-Authenticated-User-Email':'admin@gmail.com',Cookie:'__Host-bo_session=fake.signature'}}),env)).status,403);
});
test('login challenge is private and POST is origin-bound',async()=>{
 const res=await worker.fetch(req('/auth/login'),env);
 assert.equal(res.status,200);assert.match(res.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Lax/);assert.equal(res.headers.get('cache-control'),'no-store');
 assert.equal((await worker.fetch(req('/auth/session',{method:'POST',headers:{Origin:'https://attacker.test','Content-Type':'application/json'},body:'{}'}),env)).status,403);
 assert.equal((await worker.fetch(req('/auth/logout',{method:'POST',headers:{Origin:origin}}),env)).status,303);
});
test('Google claims and signature are verified',async()=>{
 const kp=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',kp.publicKey),kid:'test'};
 const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const now=Math.floor(Date.now()/1000);
 const claims={iss:'https://accounts.google.com',aud:env.GOOGLE_CLIENT_ID,sub:'123',email:'admin@gmail.com',email_verified:true,iat:now,exp:now+300,nonce:'nonce'};
 async function token(overrides={}){const p=encode({alg:'RS256',kid:'test'})+'.'+encode({...claims,...overrides});return p+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',kp.privateKey,new TextEncoder().encode(p))).toString('base64url');}
 const keys=async()=>[jwk];assert.equal((await verifyGoogle(await token(),'nonce',env,keys)).sub,'123');
 for(const c of [{aud:'wrong'},{nonce:'wrong'},{email:'other@gmail.com'},{email_verified:false},{exp:now-1},{iss:'fake'}])await assert.rejects(verifyGoogle(await token(c),'nonce',env,keys));
 const signed=await token();const parts=signed.split('.');parts[1]=encode({...claims,sub:'forged'});await assert.rejects(verifyGoogle(parts.join('.'),'nonce',env,keys));
});

 test('Google sign-in and logout documents preserve HTTPS origin',async()=>{const res=await worker.fetch(req('/auth/login'),env);assert.equal(res.headers.get('referrer-policy'),'strict-origin-when-cross-origin');assert.equal(res.headers.get('cross-origin-opener-policy'),'same-origin-allow-popups');});

test('end-to-end session exchange with Google-shaped JWKS and signed credential',async()=>{
 const kp=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['sign','verify']);
 const {n,e}=await crypto.subtle.exportKey('jwk',kp.publicKey);
 const login=await worker.fetch(req('/auth/login'),env);
 const challenge=login.headers.get('set-cookie').split(';')[0];
 const page=await login.text();
 const nonce=page.match(/nonce:"([^"]+)"/)[1];
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const now=Math.floor(Date.now()/1000);
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async (url,init)=>{assert.equal(url,'https://www.googleapis.com/oauth2/v3/certs');assert.equal(init?.redirect,'manual','Workers supports manual redirect rejection, not redirect: error');return Response.json({keys:[{kty:'RSA',kid:'integration-key',alg:'RS256',use:'sig',n,e}]});};
 try {
  const data=encode({alg:'RS256',kid:'integration-key'})+'.'+encode({iss:'https://accounts.google.com',aud:env.GOOGLE_CLIENT_ID,sub:'123',email:'admin@gmail.com',email_verified:true,iat:now,exp:now+300,nonce});
  const credential=data+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',kp.privateKey,new TextEncoder().encode(data))).toString('base64url');
  const result=await worker.fetch(req('/auth/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:challenge},body:JSON.stringify({credential})}),env);
  const body=await result.text();assert.equal(result.status,200,body);
  const session=result.headers.getSetCookie().find(x=>x.startsWith('__Host-bo_session=')).split(';')[0];
  assert.equal((await worker.fetch(req('/admin/',{headers:{Cookie:session}}),env)).status,200);
  const dashboard=await worker.fetch(req('/admin/engineering/',{headers:{Cookie:session}}),env);assert.equal(dashboard.status,200);assert.match(await dashboard.text(),/id="trend"/);assert.match(dashboard.headers.get('content-security-policy'),/connect-src https:\/\/api.github.com/);
  assert.equal((await worker.fetch(req('/admin/engineering/',{headers:{Cookie:session}}),{...env,ADMIN_EMAILS:'other@gmail.com'})).status,303);
  const editor=await worker.fetch(req('/admin/editor/',{headers:{Cookie:session}}),env);assert.equal(editor.status,200);assert.match(await editor.text(),/data-editor-v2/);assert.match(editor.headers.get('content-security-policy'),/frame-src https:\/\/embed\.diagrams\.net/);
  const editorAsset=await worker.fetch(req('/admin/assets/editor-v2/entry.mjs',{headers:{Cookie:session}}),env);assert.equal(editorAsset.status,200);assert.equal(editorAsset.headers.get('cache-control'),'no-store');
  assert.equal((await worker.fetch(req('/admin/assets/editor-v2/entry.mjs',{headers:{Cookie:session}}),{...env,ADMIN_EMAILS:'other@gmail.com'})).status,403);
  const sheets=await worker.fetch(req('/admin/sheets/',{headers:{Cookie:session}}),env);assert.equal(sheets.status,200);assert.match(await sheets.text(),/data-sheet-blog/);
  for(const [path,type] of [['/admin/assets/sheet-blog/browser.mjs','text/javascript'],['/admin/assets/sheet-blog.css','text/css']]){const asset=await worker.fetch(req(path,{headers:{Cookie:session}}),env);assert.equal(asset.status,200);assert.ok(asset.headers.get('content-type').startsWith(type));assert.equal(asset.headers.get('cache-control'),'no-store');}
  assert.equal((await worker.fetch(req('/admin/assets/sheet-blog/browser.mjs',{headers:{Cookie:session}}),{...env,ADMIN_EMAILS:'other@gmail.com'})).status,403);
  assert.equal((await worker.fetch(req('/admin/article-check/attacker/bai-thu/',{headers:{Cookie:session}}),env)).status,400);
  globalThis.fetch=async(url,init)=>{assert.equal(url,'https://duykhang68.github.io/khoahoctienghan/techblog/bai-thu/');assert.equal(init.method,'HEAD');assert.equal(init.redirect,'manual');return new Response(null,{status:404});};
  assert.equal((await worker.fetch(req('/admin/article-check/techblog/bai-thu/',{headers:{Cookie:session}}),env)).status,404);
  const denied=await worker.fetch(req('/admin/',{headers:{Cookie:session}}),{...env,ADMIN_EMAILS:'other@gmail.com'});assert.equal(denied.status,303);
  const logout=await worker.fetch(req('/auth/logout',{method:'POST',headers:{Origin:origin,Cookie:session}}),env);assert.equal(logout.status,303);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
 }finally{globalThis.fetch=originalFetch;}
});

test('JWKS redirects, HTTP errors, invalid JSON and unknown keys never create a session',async()=>{
 const originalFetch=globalThis.fetch;
 const responses=[
  ()=>new Response(null,{status:302,headers:{Location:'https://attacker.test/keys'}}),
  ()=>new Response('upstream details must stay private',{status:503}),
  ()=>new Response('not JSON'),
  ()=>Response.json({keys:null}),
  ()=>Response.json({keys:[]}),
 ];
 try{
  for(const [index,response] of responses.entries()){
   // Each isolated module starts with an empty JWKS cache.
   const {default:isolated}=await import('./worker.mjs?jwks-failure='+index);
   let requests=0;
   globalThis.fetch=async (url,init)=>{requests++;assert.equal(url,'https://www.googleapis.com/oauth2/v3/certs');assert.equal(init?.redirect,'manual');return response();};
   const login=await isolated.fetch(req('/auth/login'),env);
   const challenge=login.headers.get('set-cookie').split(';')[0];
   const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
   const credential=encode({alg:'RS256',kid:'missing-key'})+'.'+encode({})+'.AA';
   const result=await isolated.fetch(req('/auth/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:challenge},body:JSON.stringify({credential})}),env);
   assert.equal(result.status,403);
   assert.equal(await result.text(),'AUTH_KEYS');
   assert.equal(requests,index===4?2:1,'only the fixed Google endpoint may be requested');
   assert.equal(result.headers.getSetCookie().some(c=>c.startsWith('__Host-bo_session=')),false);
   assert.match(result.headers.get('set-cookie'),/__Host-bo_challenge=;.*Max-Age=0/);
   assert.equal((await isolated.fetch(req('/admin/'),env)).status,303);
  }
 }finally{globalThis.fetch=originalFetch;}
});

// All routes use the same signed-session gate, including direct assets and HEAD.
test('private routes reject expired, wrong-origin, malformed and revoked-admin sessions',async()=>{
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 async function signed(overrides={}){const payload=Buffer.from(JSON.stringify({kind:'session',origin,sub:'123',email:'admin@gmail.com',exp:Math.floor(Date.now()/1000)+600,...overrides})).toString('base64url');const sig=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload))).toString('base64url');return '__Host-bo_session='+payload+'.'+sig;}
 const pages=['/admin/','/admin/engineering/','/admin/sheets/','/admin/editor/','/admin/library/','/admin/categories/','/admin/drafts/','/admin/pipeline/'];
 const assets=['/admin/api/dashboard/','/admin/api/library/','/admin/api/categories/','/admin/assets/editor-v2/draft-schedule.mjs','/admin/assets/editor-v2/drafts-browser.mjs','/admin/assets/editor-v2/media.mjs','/admin/assets/sheet-blog/pipeline-entry.mjs','/admin/assets/editor-v2/entry.mjs','/admin/assets/editor-v2.css','/admin/assets/sheet-blog/entry.mjs','/admin/assets/sheet-blog.css','/admin/article-check/techblog/bai-thu/'];
 const good=await signed();
 for(const [cookie,config] of [[await signed({exp:1}),env],[await signed({origin:'https://other.test'}),env],[await signed({kind:'challenge'}),env],[await signed({sub:''}),env],['__Host-bo_session=invalid.signature',env],[good,{...env,ADMIN_EMAILS:'other@gmail.com'}]]){
  for(const path of [...pages,...assets]){const res=await worker.fetch(req(path,{headers:{Cookie:cookie}}),config);assert.equal(res.status,pages.includes(path)?303:403,path);assert.equal(res.headers.get('cache-control'),'no-store');assert.doesNotMatch(await res.text(),/data-editor-v2|data-sheet-blog|id="trend"/);const head=await worker.fetch(req(path,{method:'HEAD',headers:{Cookie:cookie}}),config);assert.equal(head.status,403,path);}
 }
 for(const path of pages){const res=await worker.fetch(req(path,{method:'HEAD',headers:{Cookie:good}}),env);assert.equal(res.status,200,path);assert.equal(await res.text(),'');assert.equal(res.headers.get('cache-control'),'no-store');}
 for(const path of [...pages,...assets]){const res=await worker.fetch(new Request('https://preview.example.test'+path,{headers:{Cookie:good}}),env);assert.equal(res.status,403,path);}
 const cross=await worker.fetch(req('/auth/logout',{method:'POST',headers:{Origin:'https://other.test',Cookie:good}}),env);assert.equal(cross.status,403);assert.equal(cross.headers.get('set-cookie'),null);
 const logout=await worker.fetch(req('/auth/logout',{method:'POST',headers:{Origin:origin,Cookie:good}}),env);assert.equal(logout.status,303);assert.equal(logout.headers.get('location'),'/auth/login');assert.ok(logout.headers.getSetCookie().every(v=>v.includes('Max-Age=0')&&v.includes('HttpOnly')&&v.includes('Secure')));
 // Browser cookie jar has now removed the session. Do not claim replay revocation: this is a stateless session.
 for(const path of pages)assert.equal((await worker.fetch(req(path),env)).status,303,path);
});

test('P1.1 dashboard snapshot counts only exact released content and rejects incomplete upstream evidence',async()=>{
 const sha='a'.repeat(40),seen=[];
 const responses=[{sha},{truncated:false,tree:[{type:'blob',path:'src/content/docs/index.mdx'},{type:'blob',path:'src/content/docs/ngon-ngu/index.md'},{type:'blob',path:'src/content/docs/ngon-ngu/hangul.mdx'},{type:'blob',path:'src/content/docs/lich-su/joseon.md'},{type:'blob',path:'src/content/docs/lich-su/image.webp'}]},[{slug:'a'},{slug:'b'}]];
 const fixture=async(url,init)=>{seen.push(url);assert.equal(init.redirect,'manual');return Response.json(responses[seen.length-1]);};
 assert.deepEqual(await dashboardSnapshot(fixture),{sha,tech:2,knowledge:2});
 assert.equal(seen[0],'https://duykhang68.github.io/khoahoctienghan/release-sha.json');assert.ok(seen.slice(1).every(url=>url.includes(sha)));
 await assert.rejects(dashboardSnapshot(async()=>Response.json({sha:'not-a-sha'})));
 let count=0;await assert.rejects(dashboardSnapshot(async()=>Response.json([responses[0],{truncated:true,tree:[]},responses[2]][count++])));
 assert.equal((await worker.fetch(req('/admin/api/dashboard/'),env)).status,403);
 assert.equal((await worker.fetch(req('/admin/api/dashboard/',{headers:{Cookie:'__Host-bo_session=invalid.signature'}}),env)).status,403);
});
test('P1.1 authorized dashboard API is no-store, read-only and fails closed',async()=>{
 const secret=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const p=Buffer.from(JSON.stringify({kind:'session',origin,sub:'123',email:'admin@gmail.com',exp:Math.floor(Date.now()/1000)+300})).toString('base64url');const s=Buffer.from(await crypto.subtle.sign('HMAC',secret,new TextEncoder().encode(p))).toString('base64url');const headers={Cookie:'__Host-bo_session='+p+'.'+s};
 const original=globalThis.fetch;
 try{const sha='b'.repeat(40);globalThis.fetch=async url=>Response.json(url.endsWith('release-sha.json')?{sha}:url.includes('/git/trees/')?{truncated:false,tree:[{type:'blob',path:'src/content/docs/ngon-ngu/hangul.mdx'}]}:[{slug:'first'}]);
 const res=await worker.fetch(req('/admin/api/dashboard/',{headers}),env);assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');assert.deepEqual(await res.json(),{sha,tech:1,knowledge:1});
 assert.equal((await worker.fetch(req('/admin/api/dashboard/?url=https://other.test',{headers}),env)).status,400);
 assert.equal((await worker.fetch(req('/admin/api/dashboard/',{method:'POST',headers}),env)).status,405);
 assert.equal((await worker.fetch(req('/admin/api/dashboard/',{headers}),{...env,ADMIN_EMAILS:'other@gmail.com'})).status,403);
 globalThis.fetch=async()=>new Response('private upstream error',{status:429});const failed=await worker.fetch(req('/admin/api/dashboard/',{headers}),env);assert.equal(failed.status,502);assert.deepEqual(await failed.json(),{error:'SNAPSHOT_UNAVAILABLE'});
 }finally{globalThis.fetch=original;}
});

test('P1.3 library reads a single exact published catalog and preserves authorization',async()=>{
 const sha='c'.repeat(40),seen=[];
 const rows=[{kind:'tech',category:'techblog',slug:'bai-tech',title:'Bài kỹ thuật',summary:'Tóm tắt',date:'',path:'src/data/techblog/posts.json'},{kind:'knowledge',category:'ngon-ngu',slug:'hangul',title:'Hangul',summary:'',date:'',path:'src/content/docs/ngon-ngu/hangul.mdx'}];
 const response=async(url,init)=>{seen.push(url);assert.equal(init.redirect,'manual');return Response.json({sha,libraryVersion:1,library:rows});};
 const data=await librarySnapshot(response);assert.deepEqual(data,{sha,rows});assert.deepEqual(seen,['https://duykhang68.github.io/khoahoctienghan/release-sha.json']);
 await assert.rejects(()=>librarySnapshot(async()=>Response.json({sha})),/RELEASE_CATALOG_INVALID/);
 await assert.rejects(()=>librarySnapshot(async()=>new Response('',{status:429})),/RELEASE_HTTP_429/);
 await assert.rejects(()=>librarySnapshot(async()=>Response.json({sha,libraryVersion:1,library:[rows[0],rows[0]]})),/RELEASE_ROW_DUPLICATE/);
 await assert.rejects(()=>librarySnapshot(async()=>Response.json({sha,libraryVersion:1,library:[{...rows[1],path:'private.env'}]})),/RELEASE_ROW_INVALID/);
 assert.equal((await worker.fetch(req('/admin/library/'),env)).status,303);
 assert.equal((await worker.fetch(req('/admin/api/library/'),env)).status,403);
 assert.equal((await worker.fetch(req('/admin/api/library/',{headers:{Cookie:'__Host-bo_session=invalid.signature'}}),env)).status,403);
});

// Compile the actual emitted browser script, not a duplicate fixture.
test('P1.3 private library emits a syntactically valid browser script',async()=>{
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const p=Buffer.from(JSON.stringify({kind:'session',origin,sub:'123',email:'admin@gmail.com',exp:Math.floor(Date.now()/1000)+300})).toString('base64url');
 const s=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(p))).toString('base64url');
 const response=await worker.fetch(req('/admin/library/',{headers:{Cookie:'__Host-bo_session='+p+'.'+s}}),env);
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const html=await response.text();const match=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
 assert.ok(match);assert.doesNotThrow(()=>new Script(match[1],{filename:'library-browser.js'}));assert.match(html,/id="lib-list"/);assert.doesNotMatch(match[1],/export default \{async fetch/);
});


test('P1.9 all new authenticated documents and module assets share the session boundary',async()=>{
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const p=Buffer.from(JSON.stringify({kind:'session',origin,sub:'123',email:'admin@gmail.com',exp:Math.floor(Date.now()/1000)+300})).toString('base64url');const s=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(p))).toString('base64url');const headers={Cookie:'__Host-bo_session='+p+'.'+s};
 for(const [path,marker] of [['/admin/library/','id="lib-list"'],['/admin/categories/','id="cat-list"'],['/admin/drafts/','id="draft-list"'],['/admin/pipeline/','data-queue-progress']]){const res=await worker.fetch(req(path,{headers}),env);assert.equal(res.status,200,path);assert.equal(res.headers.get('cache-control'),'no-store');assert.ok((await res.text()).includes(marker),path);assert.equal((await worker.fetch(req(path,{method:'POST',headers}),env)).status,405,path);}
 for(const path of ['/admin/assets/editor-v2/media.mjs','/admin/assets/editor-v2/draft-schedule.mjs','/admin/assets/editor-v2/drafts-browser.mjs','/admin/assets/sheet-blog/pipeline-entry.mjs']){const result=await worker.fetch(req(path,{headers}),env);assert.equal(result.status,200);assert.ok(result.headers.get('content-type').startsWith('text/javascript'));assert.equal(result.headers.get('cache-control'),'no-store');}
});

import './server-scheduler.test.mjs';
test('scheduler route, module and API never expose unauthenticated data',async()=>{
 assert.equal((await worker.fetch(req('/admin/schedules/'),env)).status,303);
 assert.equal((await worker.fetch(req('/admin/api/schedules/'),env)).status,403);
 assert.equal((await worker.fetch(req('/admin/api/schedules/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'}),env)).status,403);
 assert.equal((await worker.fetch(req('/admin/assets/editor-v2/server-schedule-browser.mjs'),env)).status,403);
});
