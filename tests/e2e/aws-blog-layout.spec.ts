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

test('self-hosted typography loads Vietnamese and share controls are available in feed and article',async({page})=>{
 await page.goto('./techblog/');
 const fontState=await page.evaluate(async()=>{
  const sample='Tiếng Việt: Tri thức Hàn Quốc, kỹ thuật, dữ liệu';
  const faces=await Promise.all([300,400,700].map(w=>document.fonts.load(w+' 18px "Open Sans Web"',sample)));
  return {loaded:faces.every(set=>set.length>0&&set.every(face=>face.status==='loaded')),family:getComputedStyle(document.body).fontFamily,weight:getComputedStyle(document.querySelector('.blog-name')!).fontWeight,local:performance.getEntriesByType('resource').filter(e=>/OpenSans[^/]*\\.ttf(?:\\?|$)/i.test(e.name)).every(e=>new URL(e.name).origin===location.origin)};
 });
 expect(fontState.loaded).toBe(true);expect(fontState.family).toContain('Open Sans Web');expect(fontState.weight).toBe('300');expect(fontState.local).toBe(true);
 const first=page.locator('[data-tech-post]').first();
 await expect(first.locator('[data-copy-permalink]')).toBeVisible();
 await first.locator('h3 a').click();
 await expect(page.locator('.article-heading h1')).toHaveCSS('font-weight','300');
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('font-weight','400');
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('text-align','justify');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
});
