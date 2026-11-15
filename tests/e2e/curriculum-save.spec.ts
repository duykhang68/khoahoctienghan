import {test,expect} from '@playwright/test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import worker from '../../back-office/worker.mjs';

test('P2.3 owner can save, reload, edit and recover from a failed save',async({page})=>{
 const origin='https://curriculum.test',id='11111111-1111-4111-8111-111111111111',path='/admin/courses/'+id+'/curriculum/';
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('PRAGMA foreign_keys=ON');
  for(const file of ['course-schema.sql','course-management-migration.sql','course-curriculum-migration.sql'])db.exec(readFileSync('back-office/'+file,'utf8'));
  db.prepare("INSERT INTO courses(id,slug,title,created_at,updated_at) VALUES(?,?,?,?,?)").run(id,'fixture-course','Tiếng Hàn',1,1);
  const COURSE_DB={prepare(sql:string){return {bind(...args:any[]){return {first:async()=>db.prepare(sql).get(...args)??null,run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})}}}}};
  const env={BACKOFFICE_ORIGIN:origin,GOOGLE_CLIENT_ID:'example.apps.googleusercontent.com',ADMIN_EMAILS:'admin@gmail.com',SESSION_SECRET:'test-only-'.repeat(6),COURSE_DB};
  const payload=Buffer.from(JSON.stringify({kind:'session',origin,sub:'fixture',email:'admin@gmail.com',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),signature=createHmac('sha256',env.SESSION_SECRET).update(payload).digest('base64url');
  let fail=false;
  await page.route(origin+'/**',async route=>{
   const request=route.request(),method=request.method(),headers=await request.allHeaders();
   if(method==='POST'&&fail){await route.fulfill({status:503,body:'Thử lại'});return;}
   const response=await worker.fetch(new Request(request.url(),{method,headers:{...headers,Cookie:'__Host-bo_session='+payload+'.'+signature},...(method==='POST'?{body:request.postData()??''}:{})}),env);
   await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
  });
  await page.goto(origin+path);
  const save=page.getByRole('button',{name:'Lưu giáo trình'}),status=page.locator('#curriculum-status');
  await expect(save).toBeDisabled();await expect(status).toContainText('Thêm chương');
  await page.getByRole('button',{name:'+ Thêm chương',exact:true}).click();
  await page.getByRole('textbox',{name:'Tên chương 1'}).fill('Chương 한글');
  await page.getByRole('button',{name:'+ Thêm bài học',exact:true}).click();
  await page.getByRole('textbox',{name:'Tên bài 1.1'}).fill('Bài 1');
  await expect(save).toBeEnabled();
  fail=true;await save.click();await expect(status).toContainText('503');await expect(save).toBeEnabled();await expect(page.getByRole('textbox',{name:'Tên bài 1.1'})).toHaveValue('Bài 1');
  fail=false;await save.click();await expect(status).toContainText('Phiên bản 1');await expect(save).toBeDisabled();
  const row=db.prepare('SELECT version,structure FROM course_curricula WHERE course_id=?').get(id);expect(row?.version).toBe(1);
  const saved=JSON.parse(String(row?.structure));expect(saved[0].lessons[0].title).toBe('Bài 1');
  await page.reload();await expect(page.getByRole('textbox',{name:'Tên bài 1.1'})).toHaveValue('Bài 1');
  await page.getByRole('textbox',{name:'Tên bài 1.1'}).fill('Bài 2');await save.click();await expect(status).toContainText('Phiên bản 2');
  const edited=db.prepare('SELECT version,structure FROM course_curricula WHERE course_id=?').get(id);expect(edited?.version).toBe(2);expect(JSON.parse(String(edited?.structure))[0].lessons[0].id).toBe(saved[0].lessons[0].id);
 }finally{db.close();}
});
