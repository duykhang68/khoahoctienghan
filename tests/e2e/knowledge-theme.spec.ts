import {test,expect} from '@playwright/test';

test('knowledge routes share Tech Blog visual tokens without replacing docs navigation',async({page})=>{
 const snapshot=()=>page.evaluate(()=>{
  const css=getComputedStyle(document.documentElement);
  return Object.fromEntries(['--ink','--navy-deep','--muted','--line','--surface','--sans','--display','--type-h1','--type-body','--focus'].map(key=>[key,css.getPropertyValue(key).trim()]));
 });
 await page.goto('./techblog/');
 const reference=await snapshot();
 const headerColor=await page.locator('.engineering-header').evaluate(el=>getComputedStyle(el).backgroundColor);
 const routes=['ngon-ngu','lich-su','van-hoa','am-thuc','dia-ly-du-lich','kinh-te-cong-nghe','giao-duc-du-hoc','hallyu','doi-song','the-che','ngon-ngu/hangul','lich-su/joseon','van-hoa/chao-hoi'];
 for(const route of routes){
  const response=await page.goto('./'+route+'/');
  expect(response?.ok(),route).toBe(true);
  await expect(page.locator('h1')).toBeVisible();
  expect(await snapshot(),route).toEqual(reference);
  await expect(page.locator('header.header')).toHaveCSS('background-color',headerColor);
  await expect(page.locator('.sl-markdown-content')).toBeVisible();
  await expect(page.locator('.sl-markdown-content p').first()).toHaveCSS('text-align','justify');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),{message:route}).toBe(true);
 }
 await page.goto('./ngon-ngu/');
 await expect(page.locator('.sl-markdown-content a[href$="/ngon-ngu/hangul/"]')).toBeVisible();
 await page.locator('.sl-markdown-content a[href$="/ngon-ngu/hangul/"]').click();
 await expect(page.locator('h1')).toContainText('Hangul');
 await expect(page.locator('.sl-markdown-content table')).toBeVisible();
 await expect(page.locator('site-search')).toBeAttached();
 await expect(page.locator('#starlight__sidebar')).toBeAttached();
});
