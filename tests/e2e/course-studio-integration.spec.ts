import {test,expect} from '@playwright/test';
import worker from '../../back-office/worker.mjs';
import {fixtureDb,ownerCookie,origin,config} from '../../back-office/course-integration-fixture.mjs';

test('private course preview and visual quiz keyboard/mobile round-trip',async({page})=>{
 const {sql,db}=fixtureDb();
 const id='11111111-1111-4111-8111-111111111111',ch='22222222-2222-4222-8222-222222222222',first='33333333-3333-4333-8333-333333333333',second='44444444-4444-4444-8444-444444444444';
 const base=origin+'/admin/courses/'+id+'/',cookie=await ownerCookie();
 try{
 sql.prepare("INSERT INTO courses(id,slug,title,description,level,status,version,created_at,updated_at,updated_by) VALUES(?,?,?,?,?,'draft',1,1,1,'fixture')").run(id,'fixture','한글 — Tiếng Hàn','Mô tả','beginner');
 sql.prepare('INSERT INTO course_curricula VALUES(?,?,?,?,?)').run(id,1,JSON.stringify([{id:ch,title:'Chương 1',lessons:[{id:first,title:'Bài một'},{id:second,title:'Bài hai'}]}]),1,'fixture');
 sql.prepare('INSERT INTO course_lesson_documents VALUES(?,?,?,?,?,?)').run(id,first,1,JSON.stringify([{id:ch,kind:'paragraph',text:'한글 tiếng Việt'}]),1,'fixture');
 await page.route(origin+'/**',async route=>{
  const request=route.request(),headers={...await request.allHeaders(),Cookie:cookie};
  const response=await worker.fetch(new Request(request.url(),{method:request.method(),headers,...(request.postData()!==null?{body:request.postData()!}:{})}),{...config,COURSE_DB:db});
  await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
 });
 await page.goto(base+'lessons/'+first+'/quiz/');
 await page.getByRole('button',{name:'+ Đúng / Sai'}).focus();
 await page.keyboard.press('Enter');
 await page.getByLabel('Câu hỏi',{exact:true}).fill('한글 là chữ Hàn?');
 await page.getByLabel('Giải thích',{exact:true}).fill('Đúng, đây là Hangul.');
 await page.getByRole('button',{name:'Lưu bản nháp'}).click();
 await expect(page.getByRole('status').filter({hasText:'Đã lưu bản nháp'})).toBeVisible();
 await page.reload();
 await expect(page.getByLabel('Câu hỏi',{exact:true})).toHaveValue('한글 là chữ Hàn?');
 await page.goto(base+'preview/'+first+'/');
 await expect(page.getByText('한글 tiếng Việt',{exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Bài một'})).toHaveAttribute('aria-current','page');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
 await page.getByRole('link',{name:'Bài tiếp theo'}).focus();
 await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'Bài hai',exact:true})).toBeVisible();
 }finally{await page.unrouteAll({behavior:'wait'});sql.close();}
});
