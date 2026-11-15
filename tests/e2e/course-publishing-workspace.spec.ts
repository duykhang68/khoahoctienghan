import {test,expect} from '@playwright/test';
import worker from '../../back-office/worker.mjs';
import {fixtureDb,ownerCookie,origin,config} from '../../back-office/course-integration-fixture.mjs';

test('P2.8 publishing workspace reports actual gates, prevents stale approval and records immutable release',async({page})=>{
 const {sql,db}=fixtureDb(),id='11111111-1111-4111-8111-111111111111',ch='22222222-2222-4222-8222-222222222222',lesson='33333333-3333-4333-8333-333333333333',block='44444444-4444-4444-8444-444444444444',path='/admin/courses/'+id+'/publishing/',url=origin+path,cookie=await ownerCookie();
 const env={...config,COURSE_DB:db};
 const revision=()=>sql.prepare('SELECT revision FROM course_review_revision WHERE course_id=?').get(id)?.revision;
 try{
  sql.prepare("INSERT INTO courses(id,slug,title,description,level,status,version,created_at,updated_at,updated_by) VALUES(?,?,?,?,?,'draft',1,1,1,'fixture')").run(id,'hangul','Tiếng Hàn <script>fixture</script>','Mô tả','beginner');
  sql.prepare('INSERT INTO course_curricula VALUES(?,?,?,?,?)').run(id,1,JSON.stringify([{id:ch,title:'Chương',lessons:[{id:lesson,title:'한글'}]}]),1,'fixture');
  expect((await worker.fetch(new Request(url),env)).status).toBe(403);
  await page.route(origin+'/**',async route=>{const req=route.request();const res=await worker.fetch(new Request(req.url(),{method:req.method(),headers:{...await req.allHeaders(),Cookie:cookie},...(req.postData()!==null?{body:req.postData()!}:{})}),env);await route.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:Buffer.from(await res.arrayBuffer())});});
  await page.goto(url);
  const approve=page.getByRole('button',{name:'Phê duyệt nội bộ',exact:true}),progress=page.locator('#rp-progress');
  await expect(progress).toHaveAttribute('value','4');await expect(approve).toBeDisabled();await expect(page.getByRole('link',{name:'Mở trình soạn bài từ giáo trình'})).toHaveAttribute('href','/admin/courses/'+id+'/curriculum/');
  await expect(page.getByRole('heading',{name:'Tiếng Hàn <script>fixture</script>'})).toBeVisible();await expect(page.locator('script')).toHaveCount(0);
  const content=JSON.stringify([{id:block,kind:'paragraph',text:'한글 — nội dung đã lưu'}]);
  sql.prepare('INSERT INTO course_lesson_documents VALUES(?,?,?,?,?,?)').run(id,lesson,1,content,2,'fixture');
  sql.prepare('INSERT INTO course_lesson_media VALUES(?,?,?,?,?)').run(id,lesson,'fixture-media-123',2,'fixture');
  await page.reload();await expect(progress).toHaveAttribute('value','4');await expect(page.getByText('Video/audio Drive chưa được đóng băng',{exact:false})).toBeVisible();await expect(approve).toBeDisabled();expect(sql.prepare('SELECT count(*) AS n FROM course_releases').get()?.n).toBe(0);
  sql.prepare('DELETE FROM course_lesson_media WHERE course_id=?').run(id);
  await page.reload();await expect(progress).toHaveAttribute('value','5');await expect(approve).toBeEnabled();
  const confirm=page.getByRole('checkbox');await expect(confirm).not.toBeChecked();await approve.click();await expect(page).toHaveURL(url);expect(sql.prepare('SELECT count(*) AS n FROM course_releases').get()?.n).toBe(0);
  const reviewed=revision();sql.prepare('UPDATE course_lesson_documents SET version=2 WHERE course_id=? AND lesson_id=?').run(id,lesson);expect(revision()).not.toBe(reviewed);
  await confirm.check();const stale=page.waitForResponse(res=>res.url()===url&&res.request().method()==='POST');await approve.click();expect((await stale).status()).toBe(409);expect(sql.prepare('SELECT count(*) AS n FROM course_releases').get()?.n).toBe(0);
  await page.goto(url);await confirm.check();
  // The intercepted form POST can complete before Chromium commits its navigation.
  // Observe that navigation (including the mock redirect error document) before reading persisted state.
  const navigation=page.waitForEvent('framenavigated',frame=>frame===page.mainFrame());
  const approveResp=page.waitForResponse(res=>res.url()===url&&res.request().method()==='POST');await approve.click();
  const response=await approveResp;expect(response.status()).toBe(303);expect(response.headers()['location']).toBe(path);
  await navigation;await page.waitForLoadState('domcontentloaded');
  await page.goto(url);
  await expect(page.getByRole('heading',{name:'Phiên bản v2'})).toBeVisible();await expect(approve).toBeDisabled();await expect(page.getByRole('checkbox')).toHaveCount(0);
  const release=sql.prepare('SELECT version,revision FROM course_releases').get();expect(release?.version).toBe(2);expect(release?.revision).toBe(revision());expect(sql.prepare('SELECT count(*) AS n FROM course_release_lessons').get()?.n).toBe(1);
  expect(()=>sql.exec('DELETE FROM course_releases')).toThrow(/IMMUTABLE_RELEASE/);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 }finally{await page.unrouteAll({behavior:'wait'});sql.close();}
});
