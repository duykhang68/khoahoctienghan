import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export const origin='https://example.test';
export const config={BACKOFFICE_ORIGIN:origin,GOOGLE_CLIENT_ID:'example.apps.googleusercontent.com',ADMIN_EMAILS:'admin@example.com',SESSION_SECRET:'fixture-only-'.repeat(5)};
export function fixtureDb(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const name of ['course-schema','course-management-migration','course-curriculum-migration','course-lesson-migration','course-media-migration','course-quiz-migration','course-release-migration'])sql.exec(readFileSync(new URL(name+'.sql',import.meta.url),'utf8'));
 const db={prepare(query){const statement=sql.prepare(query);return {bind(...args){return {first:async()=>statement.get(...args)??null,all:async()=>({results:statement.all(...args)}),run:async()=>({meta:{changes:Number(statement.run(...args).changes)}})};}};}};
 return {sql,db};
}
export async function ownerCookie(email=config.ADMIN_EMAILS){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(config.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const p=Buffer.from(JSON.stringify({kind:'session',origin,sub:'fixture-owner',email,exp:Math.floor(Date.now()/1000)+300})).toString('base64url');
 const sig=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(p))).toString('base64url');
 return '__Host-bo_session='+p+'.'+sig;
}
