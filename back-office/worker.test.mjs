import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{verifyGoogle} from './worker.mjs';
const origin='https://example.test';
const env={BACKOFFICE_ORIGIN:origin,GOOGLE_CLIENT_ID:'example.apps.googleusercontent.com',ADMIN_EMAILS:'admin@gmail.com',SESSION_SECRET:'x'.repeat(48)};
const req=(path,opts)=>new Request(origin+path,opts);
test('missing config and anonymous requests fail closed',async()=>{
 assert.equal((await worker.fetch(req('/admin/'),{})).status,503);
 assert.equal((await worker.fetch(req('/admin/'),env)).status,303);
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
 globalThis.fetch=async url=>{assert.equal(url,'https://www.googleapis.com/oauth2/v3/certs');return Response.json({keys:[{kty:'RSA',kid:'integration-key',alg:'RS256',use:'sig',n,e}]});};
 try {
  const data=encode({alg:'RS256',kid:'integration-key'})+'.'+encode({iss:'https://accounts.google.com',aud:env.GOOGLE_CLIENT_ID,sub:'123',email:'admin@gmail.com',email_verified:true,iat:now,exp:now+300,nonce});
  const credential=data+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',kp.privateKey,new TextEncoder().encode(data))).toString('base64url');
  const result=await worker.fetch(req('/auth/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:challenge},body:JSON.stringify({credential})}),env);
  const body=await result.text();assert.equal(result.status,200,body);
  const session=result.headers.getSetCookie().find(x=>x.startsWith('__Host-bo_session=')).split(';')[0];
  assert.equal((await worker.fetch(req('/admin/',{headers:{Cookie:session}}),env)).status,200);
  const denied=await worker.fetch(req('/admin/',{headers:{Cookie:session}}),{...env,ADMIN_EMAILS:'other@gmail.com'});assert.equal(denied.status,303);
  const logout=await worker.fetch(req('/auth/logout',{method:'POST',headers:{Origin:origin,Cookie:session}}),env);assert.equal(logout.status,303);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
 }finally{globalThis.fetch=originalFetch;}
});
