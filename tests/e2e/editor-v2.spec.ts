import {expect} from '@playwright/test';
import {test} from './private-office-fixture';
test('dual online workspaces preserve distinct drafts, preview and fixed publication destinations',async({page,office})=>{
 await page.goto(office+'/admin/editor/');
 const tech=page.getByRole('button',{name:/01 · Tech Blog Editor/}),knowledge=page.getByRole('button',{name:/02 · Knowledge Base Editor/});
 const title=page.getByRole('textbox',{name:'Tiêu đề',exact:true});
 await expect(tech).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-destination]')).toHaveText('Tech Blog');
 await expect(page.getByLabel('Chuyên mục',{exact:true})).toBeHidden();
 await title.fill('Bản thử kỹ thuật');
 await page.getByRole('textbox',{name:'Đoạn văn 1'}).fill('Nội dung kỹ thuật');
 await page.getByRole('button',{name:'Tiêu đề',exact:true}).click();
 await page.getByRole('textbox',{name:'Tiêu đề H2 2'}).fill('Phần tiếp theo');
 await expect(page.locator('[data-route]')).toContainText('/techblog/ban-thu-ky-thuat/');
 await page.getByRole('button',{name:'Xem trước',exact:true}).click();
 await expect(page.locator('[data-preview-body] h2')).toHaveText('Phần tiếp theo');
 await expect(page.locator('[data-preview-group]')).toHaveText('Engineering');
 await expect(page.locator('[data-preview-reading]')).toBeVisible();
 await knowledge.click();
 await expect(knowledge).toHaveAttribute('aria-pressed','true');
 await expect(title).toHaveValue('');
 await expect(page.locator('[data-destination]')).toHaveText('Tri thức Hàn Quốc');
 await title.fill('Bản thử bài học');
 await page.getByRole('textbox',{name:'Đoạn văn 1'}).fill('Nội dung trực quan tiếng Việt');
 await page.getByLabel('Chuyên mục',{exact:true}).selectOption('ngon-ngu');
 await page.getByLabel('Nhãn',{exact:true}).fill('TOPIK, Hangul');
 await page.getByLabel('Bài thuộc Series').check();
 await page.getByLabel('Tên Series').fill('Học tiếng Hàn');
 await expect(page.locator('[data-route]')).toContainText('/ngon-ngu/ban-thu-bai-hoc/');
 await page.getByRole('button',{name:'Xem trước',exact:true}).click();
 await expect(page.locator('[data-preview-body]')).toContainText('Nội dung trực quan tiếng Việt');
 await expect(page.locator('[data-preview-topic]')).toHaveText('Ngôn ngữ Hàn Quốc');
 await expect(page.locator('[data-preview-reading]')).toBeHidden();
 await expect(page.getByRole('button',{name:'Gửi bài → Hàng đợi FIFO'})).toBeDisabled();
 await tech.click();await expect(title).toHaveValue('Bản thử kỹ thuật');
 await expect(page.getByRole('textbox',{name:'Đoạn văn 1'})).toHaveValue('Nội dung kỹ thuật');
 await knowledge.click();await expect(title).toHaveValue('Bản thử bài học');
 await expect(page.getByLabel('Tên Series')).toHaveValue('Học tiếng Hàn');
 await expect(page.locator('[data-save-status]')).toContainText('Đã lưu');
 await page.reload();
 await expect(knowledge).toHaveAttribute('aria-pressed','true');await expect(title).toHaveValue('Bản thử bài học');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});
test('legacy V2 draft migrates only to its intended workspace',async({page,office})=>{
 await page.addInitScript(()=>{const key='khoahoctienghan.editor-v2.draft.v1';if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({title:'Bài cũ',kind:'knowledge',category:'lich-su',blocks:[{id:'old',kind:'paragraph',text:'Bản nháp cũ',marks:[]}]}))});
 await page.goto(office+'/admin/editor/');
 await expect(page.getByRole('textbox',{name:'Tiêu đề',exact:true})).toHaveValue('Bài cũ');
 await expect(page.getByLabel('Chuyên mục',{exact:true})).toHaveValue('lich-su');
 await page.getByRole('button',{name:/01 · Tech Blog Editor/}).click();
 await expect(page.getByRole('textbox',{name:'Tiêu đề',exact:true})).toHaveValue('');
 await page.getByRole('button',{name:/02 · Knowledge Base Editor/}).click();
 await expect(page.getByRole('textbox',{name:'Tiêu đề',exact:true})).toHaveValue('Bài cũ');
});

test('Series planner updates live in both workspaces and counts days in GMT+7',async({page,office})=>{
 // 23:30 UTC on November 14 is already November 15 in Vietnam.
 await page.clock.setFixedTime(new Date('2026-11-14T23:30:00Z'));
 await page.goto(office+'/admin/editor/');
 for(const kind of ['tech','knowledge']){
  await page.locator('[data-workspace="'+kind+'"]').click();
  await expect(page.locator('[data-series-progress]')).toBeHidden();
  await page.getByLabel('Bài thuộc Series').check();
  await page.getByLabel('Tên Series').fill('Series '+kind);
  await page.getByLabel('Tổng số tập',{exact:true}).fill('10');
  await page.getByLabel('Tập',{exact:true}).fill('4');
  await page.getByLabel('Ngày dự kiến kết thúc').fill('2026-11-25');
  const planner=page.locator('[data-series-progress]');
  await expect(planner).toBeVisible();
  await expect(planner.locator('[data-series-bar]')).toHaveJSProperty('value',40);
  await expect(planner.locator('[data-series-percent]')).toHaveText('40%');
  await expect(planner.locator('[data-series-remaining]')).toHaveText('6 tập · 60%');
  await expect(planner.locator('[data-series-days]')).toHaveText('10 ngày');
  await page.getByLabel('Tập',{exact:true}).fill('10');
  await expect(planner.locator('[data-series-percent]')).toHaveText('100%');
  await expect(planner.locator('[data-series-remaining]')).toHaveText('0 tập · 0%');
  await page.getByLabel('Ngày dự kiến kết thúc').fill('2026-11-15');
  await expect(planner.locator('[data-series-days]')).toHaveText('Hôm nay');
  await page.getByLabel('Ngày dự kiến kết thúc').fill('2026-11-12');
  await expect(planner.locator('[data-series-days]')).toHaveText('3 ngày trễ');
  await page.getByLabel('Tập',{exact:true}).fill('11');
  await expect(planner.locator('[data-series-bar]')).toBeHidden();
  await expect(planner.locator('[data-series-percent]')).toHaveText('—');
  await page.getByLabel('Tập',{exact:true}).fill('4');
  await page.getByLabel('Ngày dự kiến kết thúc').fill('');
  await expect(planner.locator('[data-series-days]')).toHaveText('—');
  await page.getByLabel('Bài thuộc Series').uncheck();
  await expect(planner).toBeHidden();
 }
});

test('public legacy route exports local draft without exposing editor or deleting storage',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('khoahoctienghan.editor-v2.draft.v2.tech',JSON.stringify({kind:'tech',title:'Bản cũ',blocks:[]})));
 await page.goto('./techblog/editorv2/');
 await expect(page.getByRole('link',{name:'Mở Back Office'})).toHaveAttribute('href','https://korean-backoffice.tamsudev-com.workers.dev/admin/editor/');
 await expect(page.locator('[data-editor-v2]')).toHaveCount(0);
 const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'Tải bản nháp Tech Blog'}).click();const download=await waiting;expect(download.suggestedFilename()).toBe('tech.editor-v2.json');
 expect(await page.evaluate(()=>localStorage.getItem('khoahoctienghan.editor-v2.draft.v2.tech'))).toContain('Bản cũ');
});
test('private office imports a local draft into its correct workspace without publishing',async({page,office})=>{
 await page.goto(office+'/admin/editor/');
 await page.getByRole('textbox',{name:'Tiêu đề',exact:true}).fill('Bài kỹ thuật giữ lại');
 page.on('dialog',d=>d.accept());
 await page.locator('[data-restore]').setInputFiles({name:'draft.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({kind:'knowledge',title:'Bài phục hồi',summary:'',category:'ngon-ngu',labels:'',blocks:[{kind:'paragraph',text:'Nội dung phục hồi',marks:[]}]}))});
 await expect(page.locator('[data-restore-status]')).toHaveText('Đã nhập bản nháp.');
 await expect(page.getByRole('textbox',{name:'Tiêu đề',exact:true})).toHaveValue('Bài phục hồi');
 await expect(page.locator('[data-publish]')).toBeDisabled();
 await page.getByRole('button',{name:/01 · Tech Blog Editor/}).click();
 await expect(page.getByRole('textbox',{name:'Tiêu đề',exact:true})).toHaveValue('Bài kỹ thuật giữ lại');
});
