import {test,expect} from '@playwright/test';
test('AWS-inspired editorial shell keeps navigation, heading and metadata in reading order',async({page})=>{
 await page.goto('./techblog/');
 await expect(page.locator('.blog-masthead h1')).toHaveText('Engineering Blog');
 await expect(page.locator('.engineering-header')).toHaveCSS('background-color','rgb(22, 30, 45)');
 const first=page.locator('[data-tech-post]').first();
 await expect(first.locator('h3 a')).toBeVisible();
 await expect(first.locator('.post-meta time')).toBeVisible();
 await first.locator('h3 a').click();
 await expect(page.locator('h1')).toHaveCount(1);
 await expect(page.locator('.article-heading h1 + .post-meta')).toBeVisible();
 await expect(page.locator('.article-heading .topic-link')).toBeVisible();
 await expect(page.locator('.article-heading [data-copy-permalink]')).toBeVisible();
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('text-align','justify');
 await expect(page.locator('.blog-breadcrumb a').last()).toHaveText('Engineering Blog');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
 await page.locator('.blog-breadcrumb a').last().click();
 await expect(page.locator('.blog-masthead h1')).toHaveText('Engineering Blog');
});
