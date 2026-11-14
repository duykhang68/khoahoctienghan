import {test,expect} from '@playwright/test';

test('all knowledge pages navigate to the canonical Tech Blog URL',async({page})=>{
 const routes=['ngon-ngu','lich-su','van-hoa','am-thuc','dia-ly-du-lich','kinh-te-cong-nghe','giao-duc-du-hoc','hallyu','doi-song','the-che','ngon-ngu/hangul','lich-su/joseon','van-hoa/chao-hoi'];
 const expected='/khoahoctienghan/techblog/';
 for(const route of routes){
  const response=await page.goto('./'+route+'/');
  expect(response?.ok(),route).toBe(true);
  const links=page.locator('a').filter({hasText:/^\s*Tech Blog\s*$/});
  expect(await links.count(),route).toBeGreaterThan(0);
  for(const link of await links.all())expect(await link.evaluate(a=>new URL((a as HTMLAnchorElement).href).pathname),route).toBe(expected);
 }
 await page.goto('./ngon-ngu/');
 const link=page.locator('.sidebar-pane a').filter({hasText:/^\s*Tech Blog\s*$/}).first();
 // Starlight 0.42 uses a native popover trigger, not the old custom element.
 const menu=page.locator('button[popovertarget="starlight__sidebar"]');
 if(await menu.isVisible()){
  await expect(menu).toHaveCount(1);
  await menu.click();
  await expect(page.locator('#starlight__sidebar:popover-open')).toBeVisible();
 }
 await expect(link).toBeVisible();
 await link.click();
 await expect(page).toHaveURL(/\/khoahoctienghan\/techblog\/$/);
 await expect(page.locator('.engineering-brand')).toHaveText('Engineering Blog');
 await page.goto('./');
 await page.locator('.edition-menu summary').click();
 await expect(page.locator('.edition-panel a').filter({hasText:/^Engineering Blog$/})).toHaveAttribute('href',expected);
 await expect(page.locator('.footer-cta')).toHaveAttribute('href',expected);
});
