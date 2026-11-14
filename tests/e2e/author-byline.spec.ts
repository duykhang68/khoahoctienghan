import {test,expect} from '@playwright/test';
test('verified author is shared by knowledge and tech listing and article pages',async({page})=>{
 for(const route of ['./','./techblog/']){
  await page.goto(route);
  const card=page.locator(route==='./'?'[data-knowledge-article]:visible':'[data-tech-post]:visible').first();
  const byline=card.locator('.author-byline');
  await expect(byline).toHaveText('Duy Nguyen');
  await expect(byline.getByRole('img',{name:'Chủ blog đã được website xác nhận'})).toBeVisible();
  await expect(byline.locator('svg path').first()).toHaveAttribute('fill','#1877F2');
  await card.locator('h3 a').click();
  const articleAuthor=page.locator('.research-meta .author-byline');
  await expect(articleAuthor).toHaveCount(1);
  await expect(articleAuthor).toHaveText('Duy Nguyen');
  await expect(articleAuthor.getByRole('img',{name:'Chủ blog đã được website xác nhận'})).toBeVisible();
  await page.setViewportSize({width:375,height:812});
  await expect(articleAuthor).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  await page.setViewportSize({width:1280,height:900});
 }
});
