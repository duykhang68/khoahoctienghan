import {test,expect} from '@playwright/test';
test('research article places the title, editorial cover, metadata and readable body in order',async({page})=>{
 await page.goto('./techblog/engineering-researcher-bo-nao-cua-self-healing-ci-cd/');
 await expect(page.locator('body')).toHaveClass(/research-article-page/);
 await expect(page.locator('.article-heading h1')).toContainText('Engineering Researcher');
 await expect(page.locator('.research-hero')).toBeVisible();
 await expect(page.locator('.research-heading + .research-hero + .research-reading-grid')).toBeVisible();
 await expect(page.locator('.research-meta dt')).toContainText(['Xuất bản','Nhóm','Chủ đề','Thời gian đọc']);
 await expect(page.locator('.research-meta time')).toHaveAttribute('datetime',/\+07:00$/);
 await expect(page.locator('.tech-sidebar')).toHaveCount(0);
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('text-align','justify');
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('font-size',page.viewportSize()!.width<=640?'16px':'17px');
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('line-height','28px');
 await expect(page.locator('.research-share [data-copy-permalink]')).toBeVisible();
 await page.setViewportSize({width:1280,height:900});
 const desktop=await page.evaluate(()=>{const a=document.querySelector('.research-meta')!.getBoundingClientRect(),b=document.querySelector('.article-body')!.getBoundingClientRect();return {left:a.right<b.left,measure:b.width};});
 expect(desktop.left).toBe(true);expect(desktop.measure).toBeLessThanOrEqual(761);
 await page.setViewportSize({width:375,height:812});
 const mobile=await page.evaluate(()=>{const a=document.querySelector('.research-meta')!.getBoundingClientRect(),b=document.querySelector('.article-body')!.getBoundingClientRect();return {stacked:a.bottom<=b.top,width:document.documentElement.scrollWidth};});
 expect(mobile.stacked).toBe(true);expect(mobile.width).toBeLessThanOrEqual(377);
 await page.locator('.research-meta .topic-link').click();
 await expect(page.locator('.engineering-index')).toBeVisible();
 await expect(page.locator('.research-article-shell')).toHaveCount(0);
});

test('article fallback is a compact color strip rather than a full hero',async({page})=>{
 await page.goto('./techblog/');
 const card=page.locator('[data-tech-post]:visible').filter({has:page.locator('[data-cover-kind="decorative"]')}).first();
 await expect(card).toBeVisible();
 await card.locator('h3 a').click();
 const fallback=page.locator('.research-hero .compact-fallback');
 await expect(fallback).toBeVisible();
 expect((await fallback.boundingBox())!.height).toBeLessThanOrEqual(120);
 await expect(page.locator('.article-heading h1')).toBeVisible();
 await expect(page.locator('.article-body .article-lead')).toBeVisible();
 await expect(page.locator('.art-shape')).toHaveCount(0);
});
