import {test,expect} from '@playwright/test';
import worker from '../../back-office/worker.mjs';
import {fixtureDb,ownerCookie,origin,config} from '../../back-office/course-integration-fixture.mjs';

test('P2.4 visual lesson workspace edits, previews, reorders, optimizes a local image and persists',async({page})=>{
 const {sql,db}=fixtureDb(),id='11111111-1111-4111-8111-111111111111',ch='22222222-2222-4222-8222-222222222222',l='33333333-3333-4333-8333-333333333333',url=origin+'/admin/courses/'+id+'/lessons/'+l+'/',cookie=await ownerCookie();
 try{
  sql.prepare("INSERT INTO courses(id,slug,title,description,level,status,version,created_at,updated_at,updated_by) VALUES(?,?,?,?,?,'draft',1,1,1,'fixture')").run(id,'hangul','Tiếng Hàn','Fixture','beginner');
  sql.prepare('INSERT INTO course_curricula VALUES(?,?,?,?,?)').run(id,1,JSON.stringify([{id:ch,title:'Chương',lessons:[{id:l,title:'한글'}]}]),1,'fixture');
  let fail=false;
  await page.route(origin+'/**',async route=>{const req=route.request();if(fail&&req.method()==='POST'){await route.fulfill({status:503,body:'Thử lại'});return;}const res=await worker.fetch(new Request(req.url(),{method:req.method(),headers:{...await req.allHeaders(),Cookie:cookie},...(req.postData()!==null?{body:req.postData()!}:{})}),{...config,COURSE_DB:db});await route.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:Buffer.from(await res.arrayBuffer())});});
  await page.goto(url);const status=page.locator('#lesson-status'),save=page.getByRole('button',{name:'Lưu bản nháp'});
  await expect(status).toContainText('Sẵn sàng');await expect(save).toBeDisabled();
  await page.getByRole('button',{name:'+ Tiêu đề',exact:true}).click();await page.getByRole('textbox',{name:'Tiêu đề',exact:true}).fill('한글 — Bảng chữ cái');
  await page.getByRole('button',{name:'+ Đoạn văn',exact:true}).click();await page.getByRole('textbox',{name:'Đoạn văn',exact:true}).fill('Tiếng Hàn cơ bản');
  await expect(page.locator('#lesson-preview')).toContainText('한글 — Bảng chữ cái');
  await page.getByRole('button',{name:'Xem trước',exact:true}).click();await expect(page.locator('#lesson-blocks')).toBeHidden();await expect(page.locator('#lesson-preview')).toBeVisible();
  await page.getByRole('button',{name:'Soạn bài',exact:true}).click();await expect(page.locator('#lesson-preview')).toBeHidden();
  await page.getByRole('button',{name:'Chia đôi',exact:true}).click();
  await page.locator('[data-block-id]').last().getByRole('button',{name:'Lên',exact:true}).click();await expect(page.locator('[data-block-id]').first()).toContainText('Đoạn văn');
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=32;c.height=24;const ctx=c.getContext('2d')!;ctx.fillStyle='#4338ca';ctx.fillRect(0,0,32,24);return c.toDataURL('image/png').split(',')[1];});
  await page.locator('#lesson-file').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.getByRole('textbox',{name:'Mô tả ảnh'}).fill('Ảnh minh họa Hangul');await expect(page.locator('#le-image-count')).toHaveText('1');await expect(page.locator('#lesson-preview img')).toHaveAttribute('src',/^data:image\/webp;base64,/);
  await page.getByRole('link',{name:'Quiz Builder'}).click();await expect(page).toHaveURL(url);await expect(status).toContainText('Lưu bản nháp trước');
  fail=true;await save.click();await expect(status).toContainText('503');await expect(save).toBeEnabled();fail=false;await save.click();await expect(status).toContainText('Phiên bản 1');
  const row=sql.prepare('SELECT version,document FROM course_lesson_documents WHERE course_id=? AND lesson_id=?').get(id,l);expect(row?.version).toBe(1);const stored=JSON.parse(String(row?.document));expect(stored.map((x:any)=>x.kind)).toEqual(['paragraph','image','heading']);
  await page.reload();await expect(page.locator('#le-block-count')).toHaveText('3');await expect(page.locator('#lesson-preview')).toContainText('Tiếng Hàn cơ bản');await expect(page.getByRole('textbox',{name:'Mô tả ảnh'})).toHaveValue('Ảnh minh họa Hangul');await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 }finally{await page.unrouteAll({behavior:'wait'});sql.close();}
});
