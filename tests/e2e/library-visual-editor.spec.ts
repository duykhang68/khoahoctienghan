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

test('canonical article revision creates only draft review PR and preserves slug/date/other articles',async({page,office})=>{
 const sha='a'.repeat(40),other={slug:'other',title:'Keep',sections:[]},post={slug:'bai-tech',title:'Bài kỹ thuật',summary:'Mô tả',date:'2026-11-15T06:00:00+07:00',issues:[154],labels:['Keep'],sections:[{heading:'Nội dung',paragraphs:['Nội dung gốc']}],studioBody:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Nội dung gốc',marks:[{type:'bold'}]}]}]}};
 await page.route(office+'/admin/api/library/',r=>r.fulfill({json:{sha,rows:[{kind:'tech',category:'techblog',slug:post.slug,title:post.title,path:'src/data/techblog/posts.json'}]}}));
 await page.route('https://raw.githubusercontent.com/**',r=>r.fulfill({body:JSON.stringify([post,other]),contentType:'text/plain'}));
 const writes:string[]=[];let saved:any,prBody:any;
 await page.route('https://api.github.com/**',r=>{const u=new URL(r.request().url()),p=u.pathname,m=r.request().method();if(m==='POST'){writes.push(p);const b=r.request().postDataJSON();if(p.endsWith('/git/trees')){saved=JSON.parse(b.tree[0].content);return r.fulfill({json:{sha:'c'.repeat(40)}})}if(p.endsWith('/git/commits'))return r.fulfill({json:{sha:'d'.repeat(40)}});if(p.endsWith('/git/refs'))return r.fulfill({json:{ref:b.ref}});if(p.endsWith('/pulls')){prBody=b;return r.fulfill({json:{number:42,html_url:'https://github.com/duykhang68/khoahoctienghan/pull/42'}})}return r.fulfill({status:400,json:{}})}
 return r.fulfill({json:p.endsWith('/user')?{login:'duykhang68'}:p.endsWith('/git/ref/heads/main')?{object:{sha}}:p.endsWith('/git/commits/'+sha)?{tree:{sha:'b'.repeat(40)}}:{full_name:'duykhang68/khoahoctienghan',permissions:{push:true}}})});
 await page.goto(office+'/admin/editor/?edit=techblog%2Fbai-tech');
 await expect(page.locator('[data-field="title"]')).toHaveValue(post.title);await expect(page.locator('[data-blocks] strong')).toHaveText('Nội dung gốc');
 await page.locator('[data-field="title"]').fill('Tiêu đề mới');await page.locator('[data-connect]').click();await page.locator('[data-token]').fill('github'+'_pat_'+'fixture');await page.locator('[data-auth-submit]').click();
 await expect(page.locator('[data-publish]')).toBeDisabled();expect(writes).toEqual([]);await page.locator('[data-confirm]').check();await page.locator('[data-publish]').click();
 await expect(page.locator('[data-result]')).toContainText('Đã tạo PR nháp chỉnh sửa');
 expect(writes.map(p=>p.split('/repos/duykhang68/khoahoctienghan')[1])).toEqual(['/git/trees','/git/commits','/git/refs','/pulls']);
 expect(prBody.draft).toBe(true);expect(prBody.head).toMatch(/^review\/library-edit-/);expect(saved).toEqual([{...post,title:'Tiêu đề mới'},other]);
});
test('unsupported existing MDX never falls through to new article composer',async({page,office})=>{
 const sha='a'.repeat(40);
 await page.route(office+'/admin/api/library/',r=>r.fulfill({json:{sha,rows:[{kind:'knowledge',category:'ngon-ngu',slug:'hangul',title:'Hangul',path:'src/content/docs/ngon-ngu/hangul.mdx'}]}}));
 await page.route('https://raw.githubusercontent.com/**',r=>r.fulfill({body:'---\ntitle: Hangul\n---\n<KnowledgeVisual id="old" />',contentType:'text/plain'}));
 await page.goto(office+'/admin/editor/?edit=ngon-ngu%2Fhangul');
 await expect(page.getByRole('alert')).toContainText('chưa hỗ trợ sửa thân bài');await expect(page.getByRole('link',{name:'Quay lại Thư viện · Quản lý bài'})).toBeVisible();await expect(page.locator('[data-publish]')).toBeHidden();
});
