import {test,expect} from '@playwright/test';
import {pageWindow,pageNumbers} from '../../src/lib/tech-pagination.mjs';
test('pagination calculates exact six-post windows and safely clamps invalid pages',()=>{
 expect(pageWindow(13,1)).toEqual({page:1,pages:3,start:0,end:6});
 expect(pageWindow(13,2)).toEqual({page:2,pages:3,start:6,end:12});
 expect(pageWindow(13,3)).toEqual({page:3,pages:3,start:12,end:13});
 expect(pageWindow(13,999).page).toBe(3);
 expect(pageWindow(13,'-1').page).toBe(1);
 expect(pageWindow(0,'2')).toEqual({page:1,pages:1,start:0,end:0});
 expect(pageNumbers(5,10)).toEqual([1,4,5,6,10]);
});
test('six visible cards per page, correct breadcrumbs and working page links with search',async({page})=>{
 // Use synthetic index-only HTML for pagination tests; never publish dummy posts.
 await page.route('**/techblog/**',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const response=await route.fetch();
  const html=await response.text();
  const first=html.match(/<article class="index-card feed-post"[\s\S]*?<\/article>/);
  if(!first)return route.fulfill({response});
  const fixture=Array.from({length:13},(_,i)=>'<article class="index-card feed-post" data-tech-post data-category="engineering" data-year="2026" data-fixture="'+i+'" data-search=\'[{"kind":"title","text":"Pagination fixture '+i+'"}]\'><div class="index-card-copy"><h3><a href="#fixture-'+i+'">Pagination fixture '+i+'</a></h3><div class="search-evidence" hidden><div class="search-evidence-label"></div><p class="search-snippet"></p></div></div></article>').join('');
  await route.fulfill({response,body:html.replace(first[0],first[0]+fixture)});
 });
 await page.goto('./techblog/?q=Pagination%20fixture');
 const cards=page.locator('[data-tech-post]:visible');
 const pager=page.locator('#index-pagination');
 await expect(cards).toHaveCount(6);
 await expect(page.locator('#article-count')).toHaveText('13');
 await expect(pager.locator('[aria-current="page"]')).toHaveText('1');
 await expect(page.locator('.blog-breadcrumb')).toContainText('Tìm kiếm: Pagination fixture');
 const firstPage=await cards.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-fixture')));
 await pager.getByRole('link',{name:'Trang sau',exact:true}).click();
 await expect(page).toHaveURL(/page=2/);
 await expect(cards).toHaveCount(6);
 await expect(page.locator('.blog-breadcrumb')).toContainText('Trang 2');
 const secondPage=await cards.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-fixture')));
 expect(secondPage.every(id=>!firstPage.includes(id))).toBe(true);
 await pager.getByRole('link',{name:'Trang 3',exact:true}).click();
 await expect(cards).toHaveCount(1);
 await expect(pager.getByRole('link',{name:'Trang sau',exact:true})).toHaveCount(0);
 await pager.getByRole('link',{name:'Trang trước',exact:true}).click();
 await expect(cards).toHaveCount(6);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
});
