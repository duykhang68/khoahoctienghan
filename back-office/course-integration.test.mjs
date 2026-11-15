import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

import {fixtureDb,ownerCookie,origin,config} from './course-integration-fixture.mjs';
const chapter='11111111-1111-4111-8111-111111111111',lesson='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333',block='44444444-4444-4444-8444-444444444444',question='55555555-5555-4555-8555-555555555555';
test('P2.9 actual SQLite migrations + private Course Studio request round-trip',async t=>{
 const {sql,db}=fixtureDb();t.after(()=>sql.close());
 const env={...config,COURSE_DB:db},cookie=await ownerCookie(),outsider=await ownerCookie('other@example.com');
 const call=(path,{method='GET',data,form=false,session=cookie,from=origin}={})=>worker.fetch(new Request(origin+path,{method,headers:{Cookie:session,Origin:from,...(data===undefined?{}:{'Content-Type':form?'application/x-www-form-urlencoded':'application/json'})},...(data===undefined?{}:{body:form?new URLSearchParams(data).toString():JSON.stringify(data)})}),env);
 const post=(path,data,form=false)=>call(path,{method:'POST',data,form});
 const expect=async(p,status)=>{const res=await p;assert.equal(res.status,status,await res.clone().text());return res;};
 await expect(post('/admin/courses/manage/',{action:'create',title:'한글 — Khóa học',slug:'hangul-fixture',description:'Mô tả',level:'beginner'},true),303);
 const c=sql.prepare('SELECT id,version FROM courses').get(),base='/admin/courses/'+c.id+'/',lp=base+'lessons/'+lesson+'/',pub=base+'publishing/';
 const chapters=[{id:chapter,title:'Chương 1',lessons:[{id:lesson,title:'Bài một'},{id:other,title:'Bài hai'}]}];
 await expect(post(base+'curriculum/',{version:0,chapters}),200);
 await expect(post(base+'curriculum/',{version:0,chapters}),409);
 const blocks=[{id:block,kind:'paragraph',text:'한글 tiếng Việt <script>alert(1)</script>'}];
 await expect(post(lp,{version:0,blocks}),200);
 await expect(post(lp,{version:0,blocks}),409);
 await expect(post(base+'lessons/'+other+'/',{version:0,blocks}),200);
 const questions=[{id:question,kind:'single',prompt:'한글?',options:['A','B'],correct:1,explanation:'PRIVATE-ANSWER-FIXTURE'}];
 await expect(post(lp+'quiz/',{version:0,questions}),200);
 await expect(post(lp+'quiz/',{version:1,questions:[{...questions[0],correct:9}]}),400);
 assert.deepEqual(JSON.parse(sql.prepare('SELECT document FROM course_lesson_quizzes').get().document),questions);
 const preview=await expect(call(base+'preview/'+lesson+'/'),200),html=await preview.text();
 assert.match(html,/한글 tiếng Việt/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>alert|PRIVATE-ANSWER-FIXTURE/);assert.match(html,/Bài tiếp theo/);assert.equal(preview.headers.get('cache-control'),'no-store');
 for(const path of [lp+'quiz/',base+'preview/',pub,lp+'media/stream/notlinked123/']){
  await expect(call(path,{session:''}),403);await expect(call(path,{session:outsider}),403);
 }
 await expect(call(lp+'media/stream/notlinked123/'),404);
 await expect(call(lp+'media/'),503);
 const revision=()=>sql.prepare('SELECT revision FROM course_review_revision WHERE course_id=?').get(c.id).revision;
 let reviewed=revision();
 await expect(post(lp,{version:1,blocks}),200);assert.ok(revision()>reviewed);
 const approve=rev=>post(pub,{version:String(c.version),revision:String(rev),confirm:'yes'},true);
 await expect(approve(reviewed),409);
 sql.prepare('INSERT INTO course_lesson_media VALUES(?,?,?,?,?)').run(c.id,lesson,'fixture-media-123',1,'fixture-owner');
 await expect(approve(revision()),409);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM course_releases').get().n,0);
 // Detach is a real authenticated endpoint; binary bytes are never touched.
 await expect(post(lp+'media/',{action:'detach',file:'fixture-media-123'},true),303);
 reviewed=revision();
 await expect(call(pub,{method:'POST',form:true,data:{version:String(c.version),revision:String(reviewed),confirm:'yes'},from:'https://evil.test'}),403);
 await expect(approve(reviewed),303);
 assert.equal(sql.prepare('SELECT status FROM courses').get().status,'ready');
 const release=sql.prepare('SELECT * FROM course_releases').get();
 assert.equal(release.revision,reviewed);
 assert.deepEqual(JSON.parse(sql.prepare('SELECT quiz FROM course_release_lessons WHERE lesson_id=?').get(lesson).quiz),questions);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM course_release_lessons').get().n,2);
 assert.throws(()=>sql.exec('UPDATE course_release_lessons SET quiz=\'[]\''),/IMMUTABLE_RELEASE/);
 assert.throws(()=>sql.exec('DELETE FROM course_releases'),/IMMUTABLE_RELEASE/);
 await expect(post(lp,{version:2,blocks}),409);await expect(approve(reviewed),409);
});
