import {test,expect} from '@playwright/test';
test('all knowledge pages navigate to the canonical Tech Blog URL',async({page})=>{
 const routes=['','ngon-ngu','lich-su','van-hoa','am-thuc','dia-ly-du-lich','kinh-te-cong-nghe','giao-duc-du-hoc','hallyu','doi-song','the-che','ngon-ngu/hangul','lich-su/joseon','van-hoa/chao-hoi'];
 const expected='/khoahoctienghan/techblog/';
 for(const route of routes){
  const response=await page.goto(route?'./'+route+'/':'./');
  expect(response?.ok(),route).toBe(true);
  const links=page.locator('.edition-panel a[href$="/techblog/"],.footer-cta');
  await expect(links).toHaveCount(2);
  for(const link of await links.all())expect(await link.evaluate(a=>new URL((a as HTMLAnchorElement).href).pathname),route).toBe(expected);
 }
 await page.goto('./ngon-ngu/');
 await page.locator('.edition-menu summary').click();
 const link=page.locator('.edition-panel a[href$="/techblog/"]');
 await expect(link).toBeVisible();await link.click();
 await expect(page).toHaveURL(/\/khoahoctienghan\/techblog\/$/);
 await expect(page.locator('.engineering-brand')).toHaveText('Engineering Blog');
});
