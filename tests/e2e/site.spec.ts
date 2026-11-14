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
 await expect(page.locator('.engineering-header .engineering-brand')).toBeVisible();
 await expect(page.locator('.edition-menu summary')).toBeVisible();
 await expect(page.locator('.blog-breadcrumb')).toHaveText('Engineering Blog');
 await expect(page.locator('.index-toolbar, .index-filters, [data-view], #tech-query')).toHaveCount(0);
 await expect(page.locator('#tech-post-list')).toHaveAttribute('data-layout','grid');
 await expect(page.locator('h1')).toHaveText('BÀI MỚI NHẤT');
 const card=page.locator('[data-tech-post]').first();
 await expect(card).toBeVisible();
 const title=(await card.locator('h3').innerText()).trim();
 const query=title.split(':')[0];
 await page.goto('./techblog/?q='+encodeURIComponent(query));
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
 await page.locator('.edition-menu summary').click();
 const category=page.locator('.edition-panel a[href$="?category=engineering"]');
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

test('knowledge homepage reuses tech blog editorial shell and compact grid',async({page})=>{
 const metrics=()=>page.evaluate(()=>{const h=document.querySelector('.engineering-header')!;const grid=document.querySelector('#tech-post-list')!;const cover=grid.querySelector('.editorial-cover')!;return {header:getComputedStyle(h).backgroundColor,font:getComputedStyle(h).fontFamily,headerHeight:h.getBoundingClientRect().height,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,coverHeight:cover.getBoundingClientRect().height,footer:getComputedStyle(document.querySelector('.engineering-footer')!).backgroundColor};});
 await page.goto('./techblog/');const blog=await metrics();
 await page.goto('./');await expect(page.locator('.engineering-brand')).toHaveText('Tri thức Hàn Quốc');
 await expect(page.locator('.blog-breadcrumb')).toHaveText('Tri thức Hàn Quốc');
 await expect(page.locator('[data-knowledge-topic]:visible')).toHaveCount(6);
 expect(await metrics()).toEqual(blog);
 await expect(page.locator('.compact-fallback').first()).toBeVisible();
 await page.locator('.edition-menu summary').click();
 await expect(page.locator('.edition-panel a[href$="/the-che/"]')).toBeVisible();
 await page.locator('.edition-menu summary').press('Escape');
 await page.locator('#index-pagination a[aria-label="Trang 2"]').click();
 await expect(page.locator('[data-knowledge-topic]:visible')).toHaveCount(4);
 await expect(page.locator('.knowledge-card[href$="/the-che/"]')).toBeVisible();
 await expect(page.locator('.footer-cta')).toHaveAttribute('href',/\/techblog\/$/);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
});
