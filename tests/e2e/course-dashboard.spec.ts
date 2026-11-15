import {test,expect} from '@playwright/test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import worker from '../../back-office/worker.mjs';

test('P2.1 dashboard uses actual course data, search, private navigation and honest unavailable state',async({page})=>{
 const origin='https://course-dashboard.test',path='/admin/courses/',id='11111111-1111-4111-8111-111111111111',chapter='22222222-2222-4222-8222-222222222222',lesson='33333333-3333-4333-8333-333333333333';
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('PRAGMA foreign_keys=ON');
  for(const f of ['course-schema.sql','course-management-migration.sql','course-curriculum-migration.sql','course-lesson-migration.sql','course-media-migration.sql','course-quiz-migration.sql','course-release-migration.sql'])db.exec(readFileSync('back-office/'+f,'utf8'));
  db.prepare("INSERT INTO courses(id,slug,title,level,created_at,updated_at) VALUES(?,?,?,?,?,?)").run(id,'tieng-han','Tiếng Hàn & 한글','beginner',1,2);
  db.prepare("INSERT INTO courses(id,slug,title,status,created_at,updated_at) VALUES(?,?,?,?,?,?)").run('44444444-4444-4444-8444-444444444444','archived','Lưu trữ','archived',1,1);
  db.prepare('INSERT INTO course_curricula VALUES(?,?,?,?,?)').run(id,1,JSON.stringify([{id:chapter,title:'Chương 1',lessons:[{id:lesson,title:'Bài 1'}]}]),2,'fixture');
  db.prepare('INSERT INTO course_lesson_documents VALUES(?,?,?,?,?,?)').run(id,lesson,1,JSON.stringify([{id:'55555555-5555-4555-8555-555555555555',kind:'paragraph',text:'Private content fixture'}]),2,'fixture');
  let unavailable=false;
  const COURSE_DB={prepare(s:string){if(unavailable)throw Error('offline');return{first:async()=>db.prepare(s).get(),all:async()=>({results:db.prepare(s).all()})};}};
  const env={COURSE_DB,BACKOFFICE_ORIGIN:origin,GOOGLE_CLIENT_ID:'example.apps.googleusercontent.com',ADMIN_EMAILS:'admin@gmail.com',SESSION_SECRET:'test-only-'.repeat(6)};
  const payload=Buffer.from(JSON.stringify({kind:'session',origin,sub:'fixture',email:'admin@gmail.com',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),sig=createHmac('sha256',env.SESSION_SECRET).update(payload).digest('base64url');
  expect((await worker.fetch(new Request(origin+path),env)).status).toBe(303);
  await page.route(origin+'/**',async route=>{const res=await worker.fetch(new Request(route.request().url(),{headers:{Cookie:'__Host-bo_session='+payload+'.'+sig}}),env);await route.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:await res.text()});});
  await page.goto(origin+path);
  await expect(page.locator('#course-total')).toHaveText('2');await expect(page.locator('#course-drafts')).toHaveText('1');
  const card=page.locator('[data-course-row]').filter({hasText:'Tiếng Hàn & 한글'});await expect(card).toBeVisible();
  await expect(card.locator('progress')).toHaveAttribute('value','1');await expect(card).toContainText('1 / 1 bài');await expect(page.locator('body')).not.toContainText('Private content fixture');
  await expect(card.getByRole('link',{name:'Xây dựng giáo trình'})).toHaveAttribute('href',path+id+'/curriculum/');
  await expect(card.getByRole('link',{name:'Xem trước'})).toHaveAttribute('href',path+id+'/preview/');
  await card.getByText('Công cụ bài học').click();await expect(card.getByRole('link',{name:'Video & Audio'})).toHaveAttribute('href',path+id+'/lessons/'+lesson+'/media/');await expect(card.getByRole('link',{name:'Quiz'})).toBeVisible();
  await page.getByLabel('Tìm khóa học').fill('tieng han');await expect(page.locator('[data-course-row]:visible')).toHaveCount(1);
  await page.getByLabel('Trạng thái').selectOption('archived');await expect(page.locator('#cw-no-results')).toBeVisible();
  await page.getByRole('button',{name:'Đặt lại'}).click();await expect(page.locator('[data-course-row]:visible')).toHaveCount(2);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  unavailable=true;await page.reload();await expect(page.locator('#course-total')).toHaveText('—');await expect(page.getByText('Không tải được dữ liệu khóa học.')).toBeVisible();await expect(page.locator('[data-course-row]')).toHaveCount(0);
 }finally{db.close();}
});
