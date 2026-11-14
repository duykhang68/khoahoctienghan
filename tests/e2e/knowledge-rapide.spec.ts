import {test,expect} from '@playwright/test';

test('Advanced Docs navigation remains native and usable',async({page})=>{
 await page.goto('./ngon-ngu/hangul/');
 await expect(page.locator('h1')).toContainText('Hangul');
 const wide=page.viewportSize()!.width>=1152;
 if(wide){
  const current=page.locator('.sidebar-pane a[aria-current="page"]').first();
  await expect(current).toBeVisible();
  await expect(current).toHaveCSS('background-color','rgb(219, 234, 254)');
  const toc=page.locator('.right-sidebar starlight-toc a').filter({hasText:'Ghép âm tiết'}).first();
  await expect(toc).toBeVisible();
  await toc.click();
  await expect(page).toHaveURL(/#.+/);
 }else{
  const toc=page.locator('.knowledge-inline-toc');
  await expect(toc).toBeVisible();
  await expect(toc.getByRole('link',{name:'Ghép âm tiết'})).toBeVisible();
  await toc.getByRole('link',{name:'Ghép âm tiết'}).click();
  await expect(page).toHaveURL(/#.+/);
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
});
