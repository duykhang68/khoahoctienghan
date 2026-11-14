import {test as baseTest} from '@playwright/test';
import worker from '../../back-office/worker.mjs';
import {createHmac} from 'node:crypto';
import {sharedGoogleClientId} from '../../src/lib/sheet-blog/oauth-config.mjs';
export const officeOrigin='https://korean-backoffice.tamsudev-com.workers.dev';
export const test=baseTest.extend<{office:string}>({office:async({page},use)=>{
 const env={BACKOFFICE_ORIGIN:officeOrigin,GOOGLE_CLIENT_ID:sharedGoogleClientId,ADMIN_EMAILS:'admin@gmail.com',SESSION_SECRET:'test-only-'.repeat(6)};
 const payload=Buffer.from(JSON.stringify({kind:'session',origin:officeOrigin,sub:'test',email:'admin@gmail.com',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
 const signature=createHmac('sha256',env.SESSION_SECRET).update(payload).digest('base64url');
 await page.route(officeOrigin+'/admin/**',async route=>{
  const response=await worker.fetch(new Request(route.request().url(),{headers:{Cookie:'__Host-bo_session='+payload+'.'+signature}}),env);
  await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
 });
 await use(officeOrigin);
}});
