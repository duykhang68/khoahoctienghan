import {test,expect} from '@playwright/test';

const now=new Date('2026-11-15T05:00:00Z');
function run(id:number,name:string,conclusion:string|null,status='completed',age=1){
 const start=now.getTime()-age*86400000;
 return {id,name,status,conclusion,created_at:new Date(start).toISOString(),run_started_at:new Date(start).toISOString(),updated_at:new Date(start+60000).toISOString(),head_sha:'a'.repeat(40)};
}
const runs=[run(1,'CI','success'),run(2,'CI','failure'),run(3,'CI','cancelled'),run(4,'Release','success'),run(5,'Release',null,'in_progress'),run(6,'CI','success','completed',40)];

test('footer opens dashboard with sampled metrics, accessible chart and local filters',async({page})=>{
 await page.clock.setFixedTime(now);
 let requests=0;
 await page.route('https://api.github.com/**',route=>{
  requests++;
  expect(route.request().url()).toBe('https://api.github.com/repos/duykhang68/khoahoctienghan/actions/runs?per_page=100');
  expect(route.request().method()).toBe('GET');
  expect(route.request().headers()['authorization']).toBeUndefined();
  return route.fulfill({json:{workflow_runs:runs}});
 });
 await page.goto('./techblog/');
 const link=page.locator('.engineering-footer').getByRole('link',{name:'Engineering Foundation',exact:true});
 await expect(link).toHaveAttribute('href','/khoahoctienghan/engineering-foundation/');
 await link.click();
 await expect(page).toHaveURL(/\/khoahoctienghan\/engineering-foundation\/$/);
 await expect(page.getByRole('heading',{name:'Engineering Foundation',exact:true})).toBeVisible();
 await expect(page.getByRole('status')).toContainText('Đã tải 6 lượt gần nhất');
 await expect(page.locator('#runs')).toHaveText('5');
 await expect(page.locator('#success')).toHaveText('66,7%');
 await expect(page.locator('#failed')).toHaveText('1');
 await expect(page.locator('#duration')).toHaveText('1m 0s');
 await expect(page.locator('#performance tr')).toHaveCount(2);
 await expect(page.locator('#recent tr')).toHaveCount(5);
 await expect(page.locator('#recent a').first()).toHaveAttribute('href','https://github.com/duykhang68/khoahoctienghan/actions/runs/1');
 await expect(page.getByRole('img',{name:'Biểu đồ tỷ lệ thành công theo ngày'})).toBeVisible();
 await page.getByText('Dữ liệu biểu đồ',{exact:true}).click();
 await expect(page.locator('#trend-data')).toHaveText('2026-11-14: 66,7%');
 await expect(page.getByRole('progressbar',{name:'cancelled',exact:true})).toHaveJSProperty('value',1);
 await page.getByRole('combobox',{name:/^Workflow/}).selectOption('CI');
 await expect(page.locator('#runs')).toHaveText('3');
 await expect(page.locator('#success')).toHaveText('50%');
 await page.getByLabel('Khoảng thời gian').selectOption('90');
 await expect(page.locator('#runs')).toHaveText('4');
 await expect(page.locator('#success')).toHaveText('66,7%');
 expect(requests).toBe(1);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 await page.getByRole('button',{name:'Cập nhật dữ liệu'}).click();
 await expect(page.getByRole('button',{name:'Cập nhật dữ liệu'})).toBeEnabled();
 await expect(page.getByRole('combobox',{name:/^Workflow/})).toHaveValue('CI');
 await expect(page.locator('#runs')).toHaveText('4');
 expect(requests).toBe(2);
});

test('dashboard handles initial API failure, empty sample and failed refresh without losing data',async({page})=>{
 let response:'error'|'empty'|'data'|'invalid'='error';
 await page.clock.setFixedTime(now);
 await page.route('https://api.github.com/**',route=>response==='error'
  ?route.fulfill({status:403,json:{}})
  :route.fulfill({json:response==='invalid'?{}:{workflow_runs:response==='empty'?[]:runs}}));
 await page.goto('./engineering-foundation/');
 const status=page.getByRole('status'),refresh=page.getByRole('button',{name:'Cập nhật dữ liệu'});
 await expect(status).toContainText('Chưa có dữ liệu.');
 await expect(refresh).toBeEnabled();
 await expect(page.locator('#runs')).toHaveText('—');
 response='empty';await refresh.click();
 await expect(status).toContainText('Đã tải 0 lượt gần nhất');
 await expect(page.locator('#runs')).toHaveText('0');
 await expect(page.locator('#success')).toHaveText('—');
 await expect(page.locator('#distribution')).toHaveText('Không có lượt chạy trong mẫu đã chọn.');
 await expect(page.locator('#performance')).toHaveText('Không có dữ liệu');
 await expect(page.locator('#recent')).toHaveText('Không có dữ liệu');
 response='data';await refresh.click();
 await expect(status).toContainText('Đã tải 6 lượt gần nhất');
 await expect(page.locator('#runs')).toHaveText('5');
 for(const failure of ['error','invalid'] as const){
  response=failure;await refresh.click();
  await expect(status).toContainText('Đang giữ dữ liệu lần tải trước.');
  await expect(refresh).toBeEnabled();
  await expect(page.locator('#runs')).toHaveText('5');
  await expect(page.locator('#recent tr')).toHaveCount(5);
 }
});
