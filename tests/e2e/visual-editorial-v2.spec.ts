import {test,expect} from '@playwright/test';
test('issue overview has proportional summary, connected process and circular learning diagram',async({page})=>{
 await page.goto('./techblog/nhung-loi-dau-tien-cua-tri-thuc-han-quoc/');
 const summary=page.locator('[data-visual="bars"][data-variant="summary"]');
 await expect(summary.locator('.tv-metrics strong')).toHaveText(['10','9','1']);
 await expect(summary.locator('.tv-segments span').first()).toHaveAttribute('style',/width:90%/);
 await expect(page.locator('.tv-flow').first().locator('.tv-flow-node')).toHaveCount(6);
 await expect(page.locator('.tv-flow').first().locator('.tv-flow-arrow')).toHaveCount(5);
 await expect(page.locator('[data-variant="cycle"] svg')).toBeVisible();
 await expect(page.locator('.tv-cycle-key li')).toHaveCount(5);
 for(const width of [375,1280]){await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);}
});
