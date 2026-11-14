import {test,expect} from '@playwright/test';
test('Knowledge Base uses shared Visual Editorial 2.0 inside lessons',async({page})=>{
 await page.goto('./ngon-ngu/hangul/');
 await expect(page.locator('h1')).toContainText('Hangul');
 await expect(page.locator('.sl-markdown-content .knowledge-visual figure.tv')).toHaveCount(3);
 const summary=page.locator('[data-knowledge-visual="hangul-basic-letters"]');
 await expect(summary.locator('.tv-metrics strong')).toHaveText(['24','14','10']);
 await expect(summary.locator('.tv-segments span').first()).toHaveAttribute('style',/width:58\.333/);
 await expect(summary.locator('.tv-summary>small')).toContainText('Nguồn:');
 await expect(summary.locator('figure')).toHaveCSS('border-top-left-radius','14px');
 const flow=page.locator('[data-knowledge-visual="hangul-syllable-composition"]');
 await expect(flow.locator('.tv-flow-node')).toHaveCount(4);
 await expect(flow.locator('.tv-flow-arrow')).toHaveCount(3);
 await expect(flow.locator('.tv-flow-node').last()).toContainText('한');
 const cycle=page.locator('[data-knowledge-visual="hangul-practice-cycle"]');
 await expect(cycle.locator('svg')).toBeVisible();
 await expect(cycle.locator('svg text').filter({hasText:'Luyện tập'})).toHaveCount(1);
 await expect(cycle.locator('.tv-cycle-key li')).toHaveCount(5);
 await expect(page.locator('.sl-markdown-content table')).toBeVisible();
 await expect(page.locator('#starlight__sidebar')).toBeAttached();
 for(const width of [375,1280]){
  await page.setViewportSize({width,height:900});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  await expect.poll(()=>page.locator('.knowledge-visual figure').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+2))).toBe(true);
 }
 await page.goto('./techblog/');
 await expect(page.locator('.engineering-header')).toBeVisible();
 await expect(page.locator('.knowledge-visual')).toHaveCount(0);
});
