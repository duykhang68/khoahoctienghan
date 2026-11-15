import {expect} from '@playwright/test';
import {test} from './private-office-fixture';
import {vietnamTime,dueRows} from '../../src/lib/editor-v2/draft-schedule.mjs';
test('P1.6 schedule parser uses seconds and fixed GMT+7, orders due snapshots',()=>{
 expect(vietnamTime('2026-11-16T08:01:02')).toBe(Date.parse('2026-11-16T01:01:02Z'));
 expect(()=>vietnamTime('2026-02-30T08:00:00')).toThrow();
 expect(()=>vietnamTime('2026-11-16T08:00')).toThrow();
 expect(dueRows([{id:'b',dueAt:2,createdAt:1,state:'scheduled'},{id:'a',dueAt:1,createdAt:1,state:'retry'},{id:'c',dueAt:1,createdAt:1,state:'cancelled'}],2).map(x=>x.id)).toEqual(['a','b']);
});
test('P1.6 private snapshots persist, schedule only with consent and cancel without network writes',async({page,office})=>{
 await page.clock.setFixedTime(new Date('2026-11-15T01:00:00Z'));
 const draft={kind:'tech',title:'Bản nháp riêng tư',summary:'',category:'ngon-ngu',labels:'',series:{enabled:false},blocks:[{id:'p',kind:'paragraph',text:'Nội dung riêng tư',marks:[]}]};
 await page.addInitScript(d=>localStorage.setItem('khoahoctienghan.editor-v2.draft.v2.tech',JSON.stringify(d)),draft);
 let writes=0;await page.route('https://api.github.com/**',r=>{if(r.request().method()!=='GET')writes++;return r.fulfill({status:500})});
 await page.goto(office+'/admin/drafts/');await page.locator('#draft-capture').click();await expect(page.locator('.draft-card')).toHaveCount(1);await page.getByRole('button',{name:'Đặt lịch',exact:true}).click();await page.locator('#draft-due').fill('2026-11-16T08:01:02');await page.locator('#draft-arm').click();await expect(page.locator('#draft-status')).toContainText('Cần đồng ý');await page.locator('#draft-consent').check();await page.locator('#draft-arm').click();await expect(page.locator('.draft-card')).toHaveAttribute('data-state','scheduled');expect(writes).toBe(0);
 await page.reload();await expect(page.locator('.draft-card')).toHaveAttribute('data-state','scheduled');
 page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Hủy lịch',exact:true}).click();await expect(page.locator('.draft-card')).toHaveAttribute('data-state','cancelled');expect(writes).toBe(0);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});