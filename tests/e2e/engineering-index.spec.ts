import {test,expect} from '@playwright/test';
test('editorial landing has no hero, date-ordered grid without redundant controls',async({page})=>{
 await page.goto('./techblog/');
 await expect(page.locator('.index-intro,.blog-masthead')).toHaveCount(0);
 await expect(page.locator('#feed-heading')).toHaveText('BÀI MỚI NHẤT');
 await expect(page.locator('#feed-heading')).toHaveCSS('font-weight','700');
 await expect(page.locator('.blog-breadcrumb')).toHaveText('Engineering Blog');
 await expect(page.locator('.tech-sidebar')).toHaveCount(0);
 const cards=page.locator('[data-tech-post]');
 const dates=await cards.locator('time').evaluateAll(nodes=>nodes.map(n=>Date.parse(n.getAttribute('datetime')||'')));
 expect(dates.length).toBeGreaterThan(0);
 expect(dates).toEqual([...dates].sort((a,b)=>b-a));
 await expect(page.locator('#latest-feature,.index-feature')).toHaveCount(0);
 await expect(cards.first().locator('.editorial-cover')).toBeVisible();
 const grid=page.locator('#tech-post-list');
 await expect(grid).toHaveAttribute('data-layout','grid');
 await expect(page.locator('[data-view], .index-toolbar, .index-filters')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
 await cards.first().locator('h3 a').click();
 await expect(page.locator('.engineering-index')).toHaveCount(0);
 await expect(page.locator('.research-reading-grid .research-meta')).toBeVisible();
 await expect(page.locator('.tech-sidebar')).toHaveCount(0);
 await expect(page.locator('.research-share [data-copy-permalink]')).toBeVisible();
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('text-align','justify');
});
test('filtered index shows empty state and breadcrumb reset without a hero',async({page})=>{
 await page.goto('./techblog/?q=zz-no-such-post-xyz');
 await expect(page.locator('#latest-feature')).toHaveCount(0);
 await expect(page.locator('[data-tech-post]:visible')).toHaveCount(0);
 await expect(page.locator('#no-results')).toBeVisible();
 await expect(page.locator('.blog-breadcrumb a')).toBeVisible();
 await page.locator('.blog-breadcrumb a').click();
 await expect(page.locator('#latest-feature')).toHaveCount(0);
 await expect(page.locator('[data-tech-post]:visible').first()).toBeVisible();
});

test('listing and article share the same compact top navigation and breadcrumb styling',async({page})=>{
 await page.goto('./techblog/');
 const styles=()=>page.evaluate(()=>{
  const header=document.querySelector('.engineering-header')!.getBoundingClientRect();
  const menu=document.querySelector('.blog-navigation')!.getBoundingClientRect();
  const breadcrumb=document.querySelector('.blog-breadcrumb')!.getBoundingClientRect();
  const band=document.querySelector('.breadcrumb-band')!;
  return {headerHeight:header.height,menuHeight:menu.height,breadcrumbTop:breadcrumb.top,background:getComputedStyle(band).backgroundColor,padding:getComputedStyle(band.querySelector('nav')!).padding,font:getComputedStyle(band.querySelector('nav')!).fontSize};
 });
 const home=await styles();
 expect(home.background).toBe('rgb(255, 255, 255)');
 await expect(page.locator('.breadcrumb-band + #content')).toBeVisible();
 await expect(page.locator('.blog-masthead,.index-intro,.index-feature')).toHaveCount(0);
 const gap=await page.evaluate(()=>document.querySelector('#tech-post-list')!.getBoundingClientRect().top-document.querySelector('.breadcrumb-band')!.getBoundingClientRect().bottom);
 expect(gap).toBeLessThan(90);
 await page.locator('[data-tech-post]:visible').first().locator('h3 a').click();
 expect(await styles()).toEqual(home);
 await expect(page.locator('.blog-breadcrumb a')).toHaveText('Engineering Blog');
});

test('compact grid keeps title and summary below bounded covers',async({page})=>{
 await page.goto('./techblog/');
 const card=page.locator('[data-tech-post]:visible').first();
 await expect(card.locator('.post-summary')).toBeVisible();
 await expect(page.locator('.art-shape')).toHaveCount(0);
 const cover=await card.locator('.editorial-cover').boundingBox();
 const title=await card.locator('h3').boundingBox();
 expect(cover!.width).toBeLessThanOrEqual((await card.boundingBox())!.width);
 expect(await page.locator('#tech-post-list').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe((page.viewportSize()!.width>900)?3:(page.viewportSize()!.width>640)?2:1);
 expect(cover!.height).toBeLessThanOrEqual(156);
 expect(title!.y).toBeGreaterThanOrEqual(cover!.y+cover!.height-1);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
});
