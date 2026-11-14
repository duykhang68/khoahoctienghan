import {test,expect} from '@playwright/test';
test('issue article shows the conversation-reference figures without waiting for a shared renderer upgrade',async({page})=>{
 await page.goto('./techblog/nhung-loi-dau-tien-cua-tri-thuc-han-quoc/');
 const summary=page.locator('[data-issue-visual="summary"],[data-visual="bars"][data-variant="summary"]');
 await expect(summary.locator('strong')).toHaveText(['10','9','1']);
 const process=page.locator('[data-issue-visual="process"] .process-node,.tv-flow').filter({hasText:'Viết bản thảo'}).first();
 await expect(process).toBeVisible();
 await expect(page.locator('[data-issue-visual="cycle"] svg,[data-variant="cycle"] svg')).toBeVisible();
 for(const width of [375,1280]){await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);}
});

test('cycle diagram fills its available figure content width',async({page})=>{
 await page.goto('./techblog/nhung-loi-dau-tien-cua-tri-thuc-han-quoc/');
 const svg=page.locator('[data-issue-visual="cycle"] svg,[data-variant="cycle"] svg');
 for(const width of [375,1280]){
  await page.setViewportSize({width,height:900});
  await expect(svg).toBeVisible();
  await expect.poll(()=>svg.evaluate(el=>{const parent=el.parentElement!;const style=getComputedStyle(parent);const available=parent.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);return Math.abs(el.getBoundingClientRect().width-available);})).toBeLessThanOrEqual(2);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 }
});
