import {expect} from '@playwright/test';
import {test} from './private-office-fixture';
test('unified dashboard uses real-shaped snapshot and trusted FIFO markers, preserves last values on errors',async({page,office})=>{
 const sha='a'.repeat(40);let fail=false;
 const item=(n,phase,closed=false)=>({number:n,title:'[Editor V2] Bài '+n,state:closed?'closed':'open',user:{login:'github-actions[bot]'},body:'<!-- editor-v2-fifo:'+JSON.stringify({id:String(n).padStart(64,'0'),source:sha,phase,...(closed?{merge:sha,verified:sha,route:'ngon-ngu/bai-thu/',pr:42}:{})})+' -->'});
 await page.route(office+'/admin/api/dashboard/',route=>route.fulfill(fail?{status:502,json:{error:'SNAPSHOT_UNAVAILABLE'}}:{json:{sha,tech:12,knowledge:9}}));
 await page.route('https://api.github.com/repos/duykhang68/khoahoctienghan/issues?**',route=>route.fulfill(fail?{status:429,json:{}}:{json:[item(1,'QUEUED'),item(2,'VERIFIED',true),{...item(3,'QUEUED'),user:{login:'other'}}]}));
 await page.goto(office+'/admin/');
 await expect(page.getByRole('heading',{name:'Trung tâm quản trị'})).toBeVisible();
 const shortcuts=page.getByRole('navigation',{name:'Truy cập nhanh website'});
 for(const [name,url] of [['Tech Blog ↗','https://duykhang68.github.io/khoahoctienghan/techblog/'],['Knowledge Base ↗','https://duykhang68.github.io/khoahoctienghan/']]){
  const link=shortcuts.getByRole('link',{name,exact:true});await expect(link).toBeVisible();await expect(link).toHaveAttribute('href',url);await expect(link).toHaveAttribute('target','_blank');await expect(link).toHaveAttribute('rel','noopener noreferrer');await link.focus();await expect(link).toBeFocused();expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
 }
 await expect(page.locator('#studio-tech')).toHaveText('12');await expect(page.locator('#studio-knowledge')).toHaveText('9');await expect(page.locator('#studio-queue')).toHaveText('1');await expect(page.locator('#studio-verified')).toHaveText('1');await expect(page.locator('#studio-snapshot')).toContainText(sha);
 await expect(page.getByRole('link',{name:'Mở Knowledge Base Editor'})).toHaveAttribute('href','/admin/editor/#workspace=knowledge');
 await expect(page.getByRole('link',{name:'Mở Google Sheets Publisher'})).toHaveAttribute('href','/admin/sheets/');
 fail=true;await page.getByRole('button',{name:'Cập nhật dữ liệu'}).click();await expect(page.locator('#studio-content-status')).toContainText('giữ dữ liệu lần trước');await expect(page.locator('#studio-queue-status')).toContainText('giữ dữ liệu lần trước');await expect(page.locator('#studio-tech')).toHaveText('12');await expect(page.locator('#studio-queue')).toHaveText('1');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});
test('P2.1 dashboard opens private Course Studio without fabricated counts',async({page,office})=>{
 await page.goto(office+'/admin/');
 await page.getByRole('link',{name:'Mở Course Studio'}).click();
 await expect(page).toHaveURL(office+'/admin/courses/');
 await expect(page.getByRole('heading',{name:'Quản trị khóa học'})).toBeVisible();
 await expect(page.getByRole('status')).toContainText('Chưa cấu hình cơ sở dữ liệu khóa học');
 for(const id of ['total','drafts','ready','archived'])await expect(page.locator('#course-'+id)).toHaveText('—');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});
