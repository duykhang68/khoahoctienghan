import {test,expect} from '@playwright/test';

const overlay='[data-topic-count-overlay]';

test('homepage always renders exact topic totals, including zero, with pastel artwork intact',async({page})=>{
 await page.goto('./');
 const cards=page.locator('[data-knowledge-topic]');
 await expect(cards).toHaveCount(10);
 await expect(page.locator(overlay)).toHaveCount(10);
 const expected=await page.locator('[data-knowledge-article]').evaluateAll(nodes=>{
  const counts:Record<string,number>={};
  for(const node of nodes){const {topic}=JSON.parse((node as HTMLElement).dataset.article!);counts[topic]=(counts[topic]||0)+1;}
  return counts;
 });
 const ink:Record<string,string>={sage:'rgb(57, 88, 60)',lavender:'rgb(97, 71, 126)',sand:'rgb(121, 83, 46)',blue:'rgb(53, 91, 117)',rose:'rgb(131, 77, 87)'};
 for(const card of await cards.all()){
  const id=(await card.getAttribute('data-knowledge-topic'))!;
  const total=expected[id]||0;
  const badge=card.locator(overlay);
  await expect(badge).toHaveText(String(total));
  await expect(card.locator('.knowledge-card')).toHaveAttribute('aria-description','Tổng '+total+' bài viết');
  if(!await card.isVisible())continue;
  const cover=card.locator('.topic-count-visual');
  const bounds=await cover.boundingBox(),numberBounds=await badge.boundingBox();
  expect(bounds).not.toBeNull();expect(numberBounds).not.toBeNull();
  expect(Math.abs(bounds!.width-numberBounds!.width)).toBeLessThan(2);
  expect(Math.abs(bounds!.height-numberBounds!.height)).toBeLessThan(2);
  expect(await badge.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
  expect(await badge.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  const palette=await cover.locator('.editorial-cover').getAttribute('data-palette');
  expect(await badge.evaluate(el=>getComputedStyle(el).color)).toBe(ink[palette!]);
  if(total<10)expect(await badge.locator('span').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(bounds!.height*.65);
 }
 const visible=page.locator('[data-knowledge-topic]:visible '+overlay);
 await expect(visible).toHaveCount(6);
 await page.getByRole('link',{name:'Trang 2',exact:true}).click();
 await expect(page).toHaveURL(/page=2/);
 await expect(visible).toHaveCount(4);
 await page.getByRole('link',{name:'Trang 1',exact:true}).click();
 await expect(visible).toHaveCount(6);
 await page.reload();
 await expect(visible).toHaveCount(6);
});

test('totals and pagination work even when browser storage is blocked',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=function(){throw new DOMException('Blocked','SecurityError')};});
 await page.goto('./');
 await expect(page.locator('[data-knowledge-topic]:visible '+overlay)).toHaveCount(6);
 await page.getByRole('link',{name:'Trang 2',exact:true}).click();
 await expect(page.locator('[data-knowledge-topic]:visible '+overlay)).toHaveCount(4);
});

test('totals are already present in HTML without JavaScript',async({browser,baseURL})=>{
 const context=await browser.newContext({javaScriptEnabled:false,baseURL});
 try{
  const page=await context.newPage();
  await page.goto('./');
  await expect(page.locator(overlay)).toHaveCount(10);
  for(const badge of await page.locator(overlay).all())await expect(badge).toHaveText(/^\d+$/);
 }finally{await context.close();}
});
