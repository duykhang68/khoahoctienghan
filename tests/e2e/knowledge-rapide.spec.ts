import {test,expect} from '@playwright/test';

test('Getastrothemes docs shell keeps native navigation usable',async({page})=>{
 await page.goto('./ngon-ngu/hangul/');
 await expect(page.locator('h1')).toContainText('Hangul');
 await expect(page.locator('.knowledge-header-tabs')).toBeVisible();
 await expect(page.locator('header.header')).toHaveCSS('position','fixed');
 await expect(page.locator('.knowledge-header-tabs a[href$="/techblog/"]')).toBeVisible();
 await expect(page.locator('.knowledge-feedback a')).toHaveAttribute('href',/github\.com\/duykhang68\/khoahoctienghan\/issues\/new\?/);
 const wide=page.viewportSize()!.width>=1152;
 if(wide){
  const current=page.locator('.sidebar-pane a[aria-current="page"]').first();
  await expect(current).toBeVisible();
  await expect(current).toHaveCSS('background-color','rgb(246, 246, 246)');
  const toc=page.locator('.right-sidebar starlight-toc a').filter({hasText:'Ghép âm tiết'}).first();
  await expect(toc).toBeVisible();
  await toc.click();
  await expect(page).toHaveURL(/#.+/);
 }else{
  const toc=page.locator('mobile-starlight-toc summary');
  await expect(toc).toBeVisible();
  await toc.click();
  await expect(page.locator('mobile-starlight-toc details')).toHaveAttribute('open','');
  await page.locator('mobile-starlight-toc a').filter({hasText:'Ghép âm tiết'}).first().click();
  await expect(page).toHaveURL(/#.+/);
  await expect(page.locator('mobile-starlight-toc details')).not.toHaveAttribute('open','');
 }

 const search=page.locator('site-search button[data-open-modal]').first();
 await expect(search).toBeVisible();
 await search.click();
 await expect(page.locator('site-search dialog')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('site-search dialog')).not.toBeVisible();
 await expect(page.locator('.sl-markdown-content table')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
 await page.goto('./techblog/');
 await expect(page.locator('.engineering-header')).toBeVisible();
 await expect(page.locator('.sidebar-pane')).toHaveCount(0);
 await expect(page.locator('.knowledge-header-tabs,.knowledge-feedback')).toHaveCount(0);
});
