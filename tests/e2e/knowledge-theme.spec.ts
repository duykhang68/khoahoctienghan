import {test,expect} from '@playwright/test';
test('every knowledge route shares the Tech Blog chrome and visual tokens',async({page})=>{
 const snapshot=()=>page.evaluate(()=>{const css=getComputedStyle(document.documentElement);return Object.fromEntries(['--ink','--navy-deep','--muted','--line','--surface','--sans','--display','--type-h1','--type-body','--focus'].map(k=>[k,css.getPropertyValue(k).trim()]));});
 await page.goto('./techblog/');const reference=await snapshot();
 const routes=['','ngon-ngu','lich-su','van-hoa','am-thuc','dia-ly-du-lich','kinh-te-cong-nghe','giao-duc-du-hoc','hallyu','doi-song','the-che','ngon-ngu/hangul','lich-su/joseon','van-hoa/chao-hoi'];
 for(const route of routes){
  const response=await page.goto(route?'./'+route+'/':'./');
  expect(response?.ok(),route).toBe(true);
  await expect(page.locator('h1')).toBeVisible();
  expect(await snapshot(),route).toEqual(reference);
  await expect(page.locator('.engineering-header')).toHaveCSS('background-color','rgb(0, 0, 0)');
  await expect(page.locator('.engineering-footer')).toHaveCSS('background-color','rgb(0, 0, 0)');
  await expect(page.locator('.sidebar-pane,.right-sidebar')).toHaveCount(0);
  await expect(page.locator('.edition-menu summary')).toBeVisible();
  await expect(page.locator('.sl-markdown-content')).toBeVisible();
  if(route)await expect(page.locator('.article-body .sl-markdown-content p').first()).toHaveCSS('text-align','justify');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),{message:route}).toBe(true);
 }
 await page.goto('./ngon-ngu/');
 await page.locator('.sl-markdown-content a[href$="/ngon-ngu/hangul/"]').click();
 await expect(page.locator('h1')).toContainText('Hangul');
 await expect(page.locator('.sl-markdown-content table')).toBeVisible();
});
