import {test,expect} from '@playwright/test';

const key='khoahoctienghan.topic-articles.v1';
const overlay='[data-topic-count-overlay]';
type Snapshot=Record<string,string[]>;

async function baseline(page:import('@playwright/test').Page):Promise<Snapshot>{
 await page.goto('./');
 await expect.poll(()=>page.evaluate(key=>localStorage.getItem(key),key)).not.toBeNull();
 const data=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
 return data;
}

test('homepage shows full count only for topics with previously unseen articles',async({page})=>{
 const current=await baseline(page);
 await expect(page.locator(overlay+':not([hidden])')).toHaveCount(0);
 const topic=Object.keys(current).find(id=>current[id].length>0)!;
 expect(topic).toBeTruthy();
 const total=current[topic].length;
 // Same number of articles, different identity: a deletion plus publication.
 const previous={...current,[topic]:[...current[topic].slice(0,-1),topic+'/old-removed-article']};
 await page.evaluate(({key,previous})=>localStorage.setItem(key,JSON.stringify(previous)),{key,previous});
 await page.reload();
 const card=page.locator('[data-knowledge-topic="'+topic+'"]');
 const badge=card.locator(overlay);
 await expect(badge).not.toHaveAttribute('hidden','');
 await expect(badge).toHaveText(String(total));
 await expect(page.locator(overlay+':not([hidden])')).toHaveCount(1);
 await expect(card.locator('.knowledge-card')).toHaveAttribute('aria-label',new RegExp('tổng '+total+' bài viết'));
 // Overlay stays within the thumbnail and does not intercept clicks.
 const cover=card.locator('.topic-count-visual');
 const bounds=await cover.boundingBox(),numberBounds=await badge.boundingBox();
 expect(bounds).not.toBeNull();expect(numberBounds).not.toBeNull();
 expect(Math.abs(bounds!.width-numberBounds!.width)).toBeLessThan(2);
 expect(Math.abs(bounds!.height-numberBounds!.height)).toBeLessThan(2);
 expect(await badge.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
 // Pastel artwork must be unchanged: the number overlay has no background or scrim.
 expect(await badge.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 const palette=await cover.locator('.editorial-cover').getAttribute('data-palette');
 const ink:Record<string,string>={sage:'rgb(57, 88, 60)',lavender:'rgb(97, 71, 126)',sand:'rgb(121, 83, 46)',blue:'rgb(53, 91, 117)',rose:'rgb(131, 77, 87)'};
 expect(await badge.evaluate(el=>getComputedStyle(el).color)).toBe(ink[palette!]);
 expect(await badge.locator('span').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(bounds!.height*.65);
 // Changing pagination during the same visit must not consume the indicator.
 const next=page.getByRole('link',{name:'Trang 2',exact:true});
 await next.click();
 await expect(page).toHaveURL(/page=2/);
 await page.getByRole('link',{name:'Trang 1',exact:true}).click();
 await expect(card.locator(overlay)).toBeVisible();
 await page.reload();
 await expect(page.locator(overlay+':not([hidden])')).toHaveCount(0);
});

test('removing an article alone does not mark a topic as new',async({page})=>{
 const current=await baseline(page);
 const topic=Object.keys(current)[0];
 const previous={...current,[topic]:[...current[topic],topic+'/old-removed-article']};
 await page.evaluate(({key,previous})=>localStorage.setItem(key,JSON.stringify(previous)),{key,previous});
 await page.reload();
 await expect(page.locator(overlay+':not([hidden])')).toHaveCount(0);
});

test('unavailable browser storage does not break homepage pagination',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=function(){throw new DOMException('Blocked','SecurityError')};});
 await page.goto('./');
 await expect(page.getByRole('link',{name:'Trang 2',exact:true})).toBeVisible();
 await expect(page.locator(overlay+':not([hidden])')).toHaveCount(0);
 await page.getByRole('link',{name:'Trang 2',exact:true}).click();
 await expect(page).toHaveURL(/page=2/);
});
