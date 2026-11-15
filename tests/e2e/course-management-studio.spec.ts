import {test,expect} from '@playwright/test';
import worker from '../../back-office/worker.mjs';
import {fixtureDb,ownerCookie,origin,config} from '../../back-office/course-integration-fixture.mjs';

test('Course Management Studio: create edit archive, filter views, dirty drawer and conflict',async({page})=>{
 const {sql,db}=fixtureDb(),path='/admin/courses/manage/',url=origin+path,cookie=await ownerCookie(),env={...config,COURSE_DB:db};
 const get=(h={})=>worker.fetch(new Request(url,{headers:h}),env);
 try{
  expect((await get()).status).toBe(303);expect((await get({Cookie:cookie,Accept:'application/json'})).status).toBe(200);
  let offline=false;
  await page.route(origin+'/**',async route=>{const rq=route.request();const res=await worker.fetch(new Request(rq.url(),{method:rq.method(),headers:{...await rq.allHeaders(),Cookie:cookie},...(rq.postData()!==null?{body:rq.postData()!}:{})}),offline?config:env);await route.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:Buffer.from(await res.arrayBuffer())});});
  await page.goto(url);await expect(page.locator('#cm-total')).toHaveText('0');await expect(page.getByText('Chưa có khóa học',{exact:true})).toBeVisible();
  const create=page.locator('#cm-create'),drawer=page.getByRole('dialog'),save=page.locator('#cm-save');
  await create.click();await expect(drawer).toBeVisible();await save.click();await expect(drawer.getByText('Nhập tên khóa học từ 1 đến 200 ký tự.')).toBeVisible();
  await drawer.getByLabel('Tên khóa học').fill('Tiếng Hàn sơ cấp');await expect(drawer.getByLabel('Đường dẫn (slug)')).toHaveValue('tieng-han-so-cap');
  await drawer.getByLabel('Mô tả').fill('한글');await save.click();await expect(drawer).not.toBeVisible();await expect(page.locator('#cm-total')).toHaveText('1');
  const c=sql.prepare('SELECT id,version FROM courses').get();expect(c?.version).toBe(1);
  await page.getByLabel('Tìm khóa học').fill('tieng han');await expect(page.locator('#cm-results [data-course-id]')).toHaveCount(1);
  await page.getByRole('button',{name:'Sẵn sàng',exact:true}).click();await expect(page.getByText('Không có kết quả phù hợp')).toBeVisible();await page.locator('#cm-clear').click();
  await page.getByRole('button',{name:'Lưới',exact:true}).click();await expect(page.locator('.cm-card')).toHaveCount(1);await page.getByRole('button',{name:'Bảng',exact:true}).click();await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button',{name:'Xem chi tiết Tiếng Hàn sơ cấp'}).click();await expect(page.locator('#cm-inspector')).toContainText('tieng-han-so-cap');
  await page.locator('#cm-inspector').getByRole('button',{name:'Chỉnh sửa khóa học'}).click();await expect(drawer.getByLabel('Đường dẫn (slug)')).toHaveAttribute('readonly','');
  await drawer.getByLabel('Tên khóa học').fill('Nội dung chưa lưu');page.once('dialog',d=>d.dismiss());await page.keyboard.press('Escape');await expect(drawer).toBeVisible();
  sql.prepare("UPDATE courses SET title='Bản mới',version=version+1 WHERE id=?").run(c!.id);
  await save.click();await expect(drawer.getByText('Dữ liệu đã thay đổi (409).',{exact:false})).toBeVisible();await expect(drawer.getByLabel('Tên khóa học')).toHaveValue('Nội dung chưa lưu');
  await drawer.getByRole('button',{name:'Tải bản mới để đối chiếu'}).click();await expect(drawer.locator('#cm-latest')).toContainText('Bản mới');await expect(drawer.getByLabel('Tên khóa học')).toHaveValue('Nội dung chưa lưu');
  page.once('dialog',d=>d.accept());await drawer.getByRole('button',{name:'Nạp bản mới vào form'}).click();await expect(drawer.getByLabel('Tên khóa học')).toHaveValue('Bản mới');await drawer.getByLabel('Tên khóa học').fill('Khóa đã sửa');await save.click();await expect(drawer).not.toBeVisible();await expect(page.getByRole('button',{name:'Xem chi tiết Khóa đã sửa'}).first()).toBeVisible();
  await page.locator('#cm-inspector').getByRole('button',{name:'Lưu trữ khóa học'}).click();await drawer.getByLabel('Xác nhận lưu trữ bản nháp').check();await save.click();await expect(page.locator('#cm-archived')).toHaveText('1');expect(sql.prepare('SELECT status FROM courses').get()?.status).toBe('archived');await expect(page.locator('#cm-inspector').getByRole('button',{name:'Chỉnh sửa khóa học'})).toHaveCount(0);
  for(const width of [360,390,768,1024,1440,1920]){await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);}
  offline=true;await page.reload();await expect(page.locator('#cm-total')).toHaveText('—');await expect(page.locator('#cm-error')).toBeVisible();await expect(create).toBeDisabled();
 }finally{await page.unrouteAll({behavior:'wait'});sql.close();}
});
