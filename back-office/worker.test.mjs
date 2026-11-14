import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const req=new Request('https://example.test/admin/');
const env={ACCESS_AUD:'test-audience',ADMIN_EMAILS:'admin@example.test'};
const ctx=(email,aud='test-audience')=>({access:{aud,getIdentity:async()=>({email})}});
test('denies missing identity, missing configuration, wrong audience and unlisted account',async()=>{
 for(const [e,c] of [[env,{}],[{},ctx('admin@example.test')],[env,ctx('admin@example.test','wrong')],[env,ctx('other@example.test')]])assert.equal((await worker.fetch(req,e,c)).status,403);
});
test('forged headers do not authorize',async()=>{
 const forged=new Request(req.url,{headers:{'Cf-Access-Authenticated-User-Email':'admin@example.test','Cf-Access-Jwt-Assertion':'fake'}});
 assert.equal((await worker.fetch(forged,env,{})).status,403);
});
test('authorized admin receives non-cacheable private shell only',async()=>{
 const res=await worker.fetch(req,env,ctx('admin@example.test'));assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');
 assert.match(await res.text(),/Trung tâm quản trị/);
 assert.equal((await worker.fetch(new Request('https://example.test/api/private'),env,ctx('admin@example.test'))).status,404);
});
