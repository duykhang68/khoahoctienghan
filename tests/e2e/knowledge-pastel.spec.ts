import {test,expect} from '@playwright/test';
test('knowledge covers use the same compact pastel component and black header as Tech Blog',async({page})=>{
 await page.goto('./techblog/');
 const cover=page.locator('.index-card .editorial-cover').first();
 const height=(await cover.boundingBox())!.height;
 await page.goto('./');
 const cards=page.locator('[data-knowledge-topic]');
 await expect(cards).toHaveCount(10);
 await expect(page.locator('[data-knowledge-topic]:visible')).toHaveCount(6);
 expect((await cards.first().locator('.editorial-cover').boundingBox())!.height).toBe(height);
 await expect(cards.first().locator('.compact-fallback')).toBeVisible();
 const palettes=await cards.locator('.editorial-cover').evaluateAll(els=>els.map(el=>el.getAttribute('data-palette')));
 expect(palettes.every(p=>['sage','lavender','sand','blue','rose'].includes(p!))).toBe(true);
 await expect(page.locator('.engineering-header')).toHaveCSS('background-color','rgb(0, 0, 0)');
 await expect(page.locator('.knowledge-nav-groups,.pastel-topic-grid')).toHaveCount(0);
});
