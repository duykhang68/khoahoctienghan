import {expect} from '@playwright/test';
import {test} from './private-office-fixture';
test('existing article opens isolated Visual Editor with fixed URL and stale-main rejection',async({page,office})=>{
 const sha='a'.repeat(40),posts=[{slug:'bai-tech',title:'Bài kỹ thuật',summary:'Mô tả',date:'2026-11-15T06:00:00+07:00',sections:[{heading:'Mục',paragraphs:['Nội dung gốc'],visuals:['keep']}]}];
 await page.route(office+'/admin/api/library/',r=>r.fulfill({json:{sha,rows:[{kind:'tech',category:'techblog',slug:'bai-tech',title:'Bài kỹ thuật',path:'src/data/techblog/posts.json'}]}}));
 await page.route('https://raw.githubusercontent.com/**',r=>r.fulfill({body:JSON.stringify(posts),contentType:'text/plain'}));
 let writes=0;await page.route('https://api.github.com/**',r=>{if(r.request().method()!=='GET')writes++;const u=r.request().url();return r.fulfill({json:u.endsWith('/user')?{login:'duykhang68'}:u.endsWith('/git/ref/heads/main')?{object:{sha:'b'.repeat(40)}}:{full_name:'duykhang68/khoahoctienghan',permissions:{push:true}}})});
 await page.goto(office+'/admin/library/');await page.getByRole('link',{name:'Mở trong Visual Editor'}).click();
 await expect(page.locator('[data-field="title"]')).toHaveValue('Bài kỹ thuật');await expect(page.locator('[data-blocks]')).toContainText('Tiêu đề H2');await expect(page.locator('[data-publish]')).toHaveText('Tạo PR nháp chỉnh sửa');
 await page.locator('[data-field="title"]').fill('Tiêu đề mới');await expect(page.locator('[data-route]')).toHaveText('/khoahoctienghan/techblog/bai-tech/');
 await page.getByRole('button',{name:'Xem trước',exact:true}).click();await expect(page.locator('[data-preview-body]')).toContainText('Nội dung gốc');
 await page.locator('[data-connect]').click();await page.locator('[data-token]').fill('github'+'_pat_'+'fixture');await page.locator('[data-auth-submit]').click();await page.locator('[data-confirm]').check();await page.locator('[data-publish]').click();await expect(page.locator('[data-result]')).toContainText('Phiên bản main đã đổi');expect(writes).toBe(0);
});