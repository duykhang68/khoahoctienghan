// Read-only production checks; no real credentials, publication or secret output.
import assert from 'node:assert/strict';
const office='https://korean-backoffice.tamsudev-com.workers.dev',site='https://duykhang68.github.io/khoahoctienghan';
const pages=['/admin/','/admin/engineering/','/admin/sheets/','/admin/editor/','/admin/library/','/admin/categories/','/admin/drafts/','/admin/pipeline/'];
const assets=['/admin/api/categories/','/admin/assets/editor-v2/media.mjs','/admin/assets/editor-v2/draft-schedule.mjs','/admin/assets/editor-v2/drafts-browser.mjs','/admin/assets/sheet-blog/pipeline-entry.mjs','/admin/api/library/','/admin/api/dashboard/','/admin/assets/sheet-blog/entry.mjs','/admin/assets/sheet-blog.css','/admin/assets/editor-v2/entry.mjs','/admin/assets/editor-v2.css','/admin/article-check/techblog/bai-thu/'];
const forbidden=/data-editor-v2|data-sheet-blog|id="trend"|Phiên quản trị đã xác thực/;
export async function verifyProduction(fetcher=fetch,report=console.log){
 let n=0;const failures=[];
 const check=async(name,fn)=>{try{await fn();report('PASS '+name);n++;}catch{report('FAIL '+name);failures.push(name);}};
 const request=(url,init={})=>fetcher(url,{...init,redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'Cache-Control':'no-cache',...init.headers}});
 const secure=res=>{assert.equal(res.headers.get('cache-control'),'no-store');assert.equal(res.headers.get('x-content-type-options'),'nosniff');assert.ok(res.headers.get('x-robots-tag')?.includes('noindex'));assert.equal(res.headers.get('access-control-allow-origin'),null);};
 for(const path of pages){
  for(const forged of [false,true])await check((forged?'forged ':'anonymous ')+path,async()=>{const res=await request(office+path,forged?{headers:{Cookie:'__Host-bo_session=invalid.signature'}}:{});assert.equal(res.status,303);assert.equal(new URL(res.headers.get('location'),office).href,office+'/auth/login');secure(res);assert.doesNotMatch(await res.text(),forbidden);});
 }
 for(const path of assets)await check('protected '+path,async()=>{const res=await request(office+path);assert.equal(res.status,403);secure(res);assert.doesNotMatch(await res.text(),forbidden);});
 await check('anonymous HEAD',async()=>{const res=await request(office+'/admin/editor/',{method:'HEAD'});assert.equal(res.status,403);secure(res);});
 await check('login security headers and challenge cookie',async()=>{const res=await request(office+'/auth/login');assert.equal(res.status,200);secure(res);assert.match(res.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(res.headers.get('referrer-policy'),'strict-origin-when-cross-origin');assert.equal(res.headers.get('cross-origin-opener-policy'),'same-origin-allow-popups');assert.match(res.headers.getSetCookie().join(';'),/__Host-bo_challenge=[^;]+; Path=\/; Secure; HttpOnly; SameSite=Lax; Max-Age=300/);assert.doesNotMatch(await res.text(),forbidden);});
 await check('cross-origin session rejected',async()=>{const res=await request(office+'/auth/session',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(res.status,403);secure(res);});
 await check('cross-origin logout rejected',async()=>{const res=await request(office+'/auth/logout',{method:'POST',headers:{Origin:'https://example.invalid'}});assert.equal(res.status,403);assert.equal(res.headers.get('set-cookie'),null);secure(res);});
 await check('logout expires both browser cookies',async()=>{const res=await request(office+'/auth/logout',{method:'POST',headers:{Origin:office}});assert.equal(res.status,303);assert.equal(res.headers.get('location'),'/auth/login');const cookies=res.headers.getSetCookie();for(const name of ['__Host-bo_session','__Host-bo_challenge'])assert.ok(cookies.some(c=>c.startsWith(name+'=;')&&c.includes('Max-Age=0')));secure(res);});
 for(const [path,dest] of [['/engineering-foundation/','engineering'],['/viet-blog-by-google-sheet/','sheets'],['/techblog/editorv2/','editor']])await check('public legacy '+path,async()=>{const res=await request(site+path);assert.equal(res.status,200);const html=await res.text();assert.ok(html.includes(office+'/admin/'+dest+'/'));assert.doesNotMatch(html,forbidden);});
 for(const path of ['/','/techblog/'])await check('public content '+path,async()=>{const res=await request(site+path);assert.equal(res.status,200);const html=await res.text();assert.ok(/Tri thức Hàn Quốc|Engineering Blog/.test(html));});
 report('Production anonymous smoke: '+n+' passed, '+failures.length+' failed. Real administrator Google sign-in and Sheets consent still require user verification.');
 if(failures.length)throw new Error('Production smoke failed: '+failures.join(', '));
 return n;
}
if(import.meta.main)await verifyProduction();
