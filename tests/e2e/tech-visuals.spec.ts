import {test,expect} from '@playwright/test';
test('design research renders structured visuals with accessible controls',async({page})=>{
 await page.goto('./techblog/duy-nguyen-engineering-editorial-design-system-1-0/');
 await expect(page.locator('[data-visual="wireframe"]')).toHaveCount(4);
 await expect(page.locator('[data-visual="swatches"] .tv-swatch')).toHaveCount(13);
 await expect(page.locator('.tv-swatch .tv-color').first()).toHaveCSS('background-color','rgb(0, 0, 0)');
 await expect(page.locator('[data-visual="buttons"] button:disabled')).toHaveCount(1);
 await page.locator('[data-demo]').first().click();
 await expect(page.locator('[data-visual="buttons"] .tv-status')).toContainText('không có hành động thực tế');
 await expect(page.locator('[data-visual="type"] .tv-specimen')).toHaveCount(10);
 await expect(page.locator('[data-visual="table"]')).toHaveCount(2);
 await expect(page.locator('[data-visual="code"] pre code')).toContainText('--color-primary');
 await expect(page.locator('[data-visual="flow"] li')).toHaveCount(6);
 for(const width of [375,1280]){await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);}
});
