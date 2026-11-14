import {test,expect} from '@playwright/test';
test('homepage topic navigation and Hangul article',async({page})=>{
 await page.goto('./');
 await expect(page.locator('h1')).toBeVisible();
 const topic=page.locator('.knowledge-card[href$="/ngon-ngu/"]');
 await expect(topic).toBeVisible();
 await topic.click();
 await expect(page).toHaveURL(/\/ngon-ngu\/$/);
 await page.goto('./ngon-ngu/hangul/');
 await expect(page.locator('h1')).toContainText('Hangul');
});
test('tech blog renders, search filters and article text is justified',async({page})=>{
 await page.goto('./techblog/');
 await expect(page.locator('h1')).toHaveText('Engineering Blog');
 const card=page.locator('[data-tech-post]').first();
 await expect(card).toBeVisible();
 const title=(await card.locator('h3').innerText()).trim();
 const query=title.split(':')[0];
 await page.locator('#tech-query').fill(query);
 await page.locator('#tech-query').press('Enter');
 await expect(page.locator('#feed-heading')).toHaveText('Kết quả tìm kiếm');
 await expect(card).toBeVisible();
 await card.locator('h3 a').click();
 await expect(page.locator('h1')).toHaveText(title);
 await expect(page.locator('.article-body p').first()).toHaveCSS('text-align','justify');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
 await page.goto('./techblog/?q=zz-no-such-post-xyz');
 await expect(page.locator('#no-results')).toBeVisible();
});

test('inferred categories on both feed and detail, filter works',async({page})=>{
 await page.goto('./techblog/');
 const category=page.locator('[data-category-filter="engineering"]');
 await expect(category).toBeVisible();
 await category.click();
 await expect(page.locator('#feed-heading')).toHaveText('Chuyên mục: Engineering');
 const card=page.locator('[data-tech-post][data-category="engineering"]').first();
 await expect(card).toBeVisible();
 await expect(card.locator('.topic-link')).toHaveText('Engineering');
 await card.locator('h3 a').click();
 await expect(page.locator('.research-meta .topic-link')).toHaveText('Engineering');
 await page.locator('.research-meta .topic-link').click();
 await expect(page.locator('#feed-heading')).toHaveText('Chuyên mục: Engineering');
 await page.goto('./techblog/?category=unknown-topic');
 await expect(page.locator('#no-results')).toBeVisible();
});
