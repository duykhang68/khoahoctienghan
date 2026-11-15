import {test,expect} from '@playwright/test';
import worker from '../../back-office/worker.mjs';
import {fixtureDb,ownerCookie,origin,config} from '../../back-office/course-integration-fixture.mjs';

test('P2.3 visual builder reorders chapters, moves lessons into empty chapters and saves stable IDs',async({page})=>{
 const {sql,db}=fixtureDb();
 const id='11111111-1111-4111-8111-111111111111',a='22222222-2222-4222-8222-222222222222',b='33333333-3333-4333-8333-333333333333',l='44444444-4444-4444-8444-444444444444',m='55555555-5555-4555-8555-555555555555',base=origin+'/admin/courses/'+id+'/',cookie=await ownerCookie();
 try{
  sql.prepare("INSERT INTO courses(id,slug,title,description,level,status,version,created_at,updated_at,updated_by) VALUES(?,?,?,?,?,'draft',1,1,1,'fixture')").run(id,'hangul','한글 — Tiếng Hàn','Fixture','beginner');
  sql.prepare('INSERT INTO course_curricula VALUES(?,?,?,?,?)').run(id,1,JSON.stringify([{id:a,title:'Chương A',lessons:[{id:l,title:'Bài A'},{id:m,title:'Bài B'}]},{id:b,title:'Chương B',lessons:[]}]),1,'fixture');
  await page.route(origin+'/**',async route=>{const req=route.request();const res=await worker.fetch(new Request(req.url(),{method:req.method(),headers:{...await req.allHeaders(),Cookie:cookie},...(req.postData()!==null?{body:req.postData()!}:{})}),{...config,COURSE_DB:db});await route.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:Buffer.from(await res.arrayBuffer())});});
  await page.goto(base+'curriculum/');
  const first=page.locator('[data-chapter-id="'+a+'"]'),second=page.locator('[data-chapter-id="'+b+'"]'),lesson=page.locator('[data-lesson-id="'+l+'"]');
  await expect(page.locator('#cb-chapter-count')).toHaveText('2');await expect(page.locator('#cb-lesson-count')).toHaveText('2');await expect(page.locator('#cb-version')).toHaveText('v1');
  await page.getByRole('button',{name:'Thu gọn tất cả'}).click();await expect(lesson).toBeHidden();await page.getByRole('button',{name:'Mở tất cả'}).click();await expect(lesson).toBeVisible();
  if(!/mobile/i.test(test.info().project.name)){
   // Start dragging before target.hover() scrolls the off-screen destination into view.
   // Chromium also needs two pointer moves over the target for native dragover.
   // https://playwright.dev/docs/input#dragging-manually
   const handle=lesson.locator('.cb-handle'),target=second.locator('.cb-dropzone');
   await handle.hover();
   await expect(target).not.toBeInViewport();
   const start=await handle.boundingBox();expect(start).not.toBeNull();
   await page.mouse.down();
   try{
    await page.mouse.move(start!.x+start!.width/2+10,start!.y+start!.height/2-10,{steps:5});
    await expect(lesson).toHaveClass(/cb-dragging/);
    await target.hover();
    await target.hover();
    await expect(target).toHaveClass(/cb-drop-active/);
   }finally{await page.mouse.up();}
  }else{await lesson.getByRole('combobox').selectOption(b);}
  await expect(second.locator('[data-lesson-id="'+l+'"]')).toBeVisible();
  await first.locator('.cb-chapter-head').getByRole('button',{name:'Xuống',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-chapter-id]').first()).toHaveAttribute('data-chapter-id',b);
  await expect(second.getByRole('link',{name:'Soạn bài'})).toHaveAttribute('href','/admin/courses/'+id+'/lessons/'+l+'/');
  await second.getByRole('link',{name:'Quiz'}).click();await expect(page.locator('#curriculum-status')).toContainText('Lưu giáo trình trước');await expect(page).toHaveURL(base+'curriculum/');
  await page.getByRole('button',{name:'Lưu giáo trình'}).click();await expect(page.locator('#curriculum-status')).toContainText('Phiên bản 2');await expect(page.locator('#cb-version')).toHaveText('v2');
  const row=sql.prepare('SELECT structure,version FROM course_curricula WHERE course_id=?').get(id);expect(row?.version).toBe(2);const chapters=JSON.parse(String(row?.structure));expect(chapters.map((c:any)=>c.id)).toEqual([b,a]);expect(chapters[0].lessons.map((x:any)=>x.id)).toEqual([l]);expect(chapters[1].lessons.map((x:any)=>x.id)).toEqual([m]);
  await page.reload();await expect(page.locator('[data-chapter-id]').first()).toHaveAttribute('data-chapter-id',b);await expect(second.locator('[data-lesson-id="'+l+'"]')).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 }finally{await page.unrouteAll({behavior:'wait'});sql.close();}
});
