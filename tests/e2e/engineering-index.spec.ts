import {test,expect} from '@playwright/test';
test('editorial landing has no hero, date-ordered grid and working list toggle',async({page})=>{
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
 await page.getByRole('button',{name:'Dạng danh sách'}).click();
 await expect(grid).toHaveAttribute('data-layout','list');
 await expect(page.getByRole('button',{name:'Dạng danh sách'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Dạng lưới'}).click();
 await expect(grid).toHaveAttribute('data-layout','grid');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
 await cards.first().locator('h3 a').click();
 await expect(page.locator('.engineering-index')).toHaveCount(0);
 await expect(page.locator('.research-reading-grid .research-meta')).toBeVisible();
 await expect(page.locator('.tech-sidebar')).toHaveCount(0);
 await expect(page.locator('.research-share [data-copy-permalink]')).toBeVisible();
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('text-align','justify');
});
test('filtered index shows correct result count without a hero',async({page})=>{
 await page.goto('./techblog/?q=zz-no-such-post-xyz');
 await expect(page.locator('#latest-feature')).toHaveCount(0);
 await expect(page.locator('#article-count')).toHaveText('0');
 await expect(page.locator('#no-results')).toBeVisible();
 await expect(page.locator('#clear-filters')).toBeVisible();
 await page.locator('#clear-filters').click();
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
 expect(home.background).toBe('rgb(250, 249, 245)');
 await expect(page.locator('.breadcrumb-band + #content')).toBeVisible();
 await expect(page.locator('.blog-masthead,.index-intro,.index-feature')).toHaveCount(0);
 const gap=await page.evaluate(()=>document.querySelector('#feed-heading')!.getBoundingClientRect().top-document.querySelector('.breadcrumb-band')!.getBoundingClientRect().bottom);
 expect(gap).toBeLessThan(90);
 await page.locator('[data-tech-post]:visible').first().locator('h3 a').click();
 expect(await styles()).toEqual(home);
 await expect(page.locator('.blog-breadcrumb a')).toHaveText('Engineering Blog');
});
