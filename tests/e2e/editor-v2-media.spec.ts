import {expect} from '@playwright/test';
import {test} from './private-office-fixture';
import {buildDocument} from '../../src/lib/editor-v2/model.mjs';
import {scaledDimensions,validateMedia} from '../../src/lib/editor-v2/media.mjs';
test('P1.5 media dimensions are bounded without upscaling',()=>{
 expect(scaledDimensions(3200,1600)).toEqual({width:1600,height:800});
 expect(scaledDimensions(120,60)).toEqual({width:120,height:60});
 expect(()=>scaledDimensions(10000,10000)).toThrow();
 expect(()=>validateMedia({src:'data:image/webp;base64,aaaa',width:20,height:20,alt:'x'})).toThrow();
});
test('P1.5 both workspaces batch upload actual local images and keep isolated media',async({page,office})=>{
 await page.goto(office+'/admin/editor/');
 const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=2000;canvas.height=1000;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#4588ae';ctx.fillRect(0,0,2000,1000);return canvas.toDataURL('image/png').split(',')[1];});
 const file={name:'test.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
 for(const kind of ['tech','knowledge']){
  await page.locator('[data-workspace="'+kind+'"]').click();const tray=page.locator('.ev2-media-tray');await tray.locator('summary').click();await expect(page.locator('[data-media-summary]')).toContainText('0 ảnh');
  await page.locator('[data-media-upload]').setInputFiles([file,file]);await expect(page.locator('[data-media-summary]')).toContainText('2 ảnh/sơ đồ');
  await expect(page.locator('[data-media-list]')).toContainText('1600 × 800 px');
  const blocks=page.locator('[data-kind="image"]');await expect(blocks).toHaveCount(2);
  await blocks.nth(0).getByLabel('Mô tả ảnh (bắt buộc)').fill('Ảnh một');await blocks.nth(1).getByLabel('Mô tả ảnh (bắt buộc)').fill('Ảnh hai');
  await expect(page.locator('[data-media-summary]')).toContainText('0 mục cần hoàn thiện');
  const draft=await page.evaluate(k=>JSON.parse(localStorage.getItem('khoahoctienghan.editor-v2.draft.v2.'+k)||'null'),kind);const result=await buildDocument(draft.blocks);
  expect(result.assets.size).toBe(1);expect(result.body.content.filter(x=>x.type==='image')).toHaveLength(2);
  await page.reload();await expect(page.locator('[data-kind="image"]')).toHaveCount(2);
 }
 await expect(page.locator('[data-publish]')).toBeDisabled();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});