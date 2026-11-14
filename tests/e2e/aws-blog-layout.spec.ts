import {test,expect} from '@playwright/test';
test('AWS-inspired editorial shell keeps navigation, heading and metadata in reading order',async({page})=>{
 await page.goto('./techblog/');
 await expect(page.locator('.blog-masthead h1')).toHaveText('Engineering Blog');
 await expect(page.locator('.engineering-header')).toHaveCSS('background-color','rgb(22, 29, 38)');
 const first=page.locator('[data-tech-post]').first();
 await expect(first.locator('h3 a')).toBeVisible();
 await expect(first.locator('.post-meta time')).toBeVisible();
 await first.locator('h3 a').click();
 await expect(page.locator('h1')).toHaveCount(1);
 await expect(page.locator('.article-heading h1 + .post-meta')).toBeVisible();
 await expect(page.locator('.article-heading .topic-link')).toBeVisible();
 await expect(page.locator('.article-heading [data-copy-permalink]')).toBeVisible();
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('text-align','justify');
 await expect(page.locator('.blog-breadcrumb a').last()).toHaveText('Engineering Blog');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
 await page.locator('.blog-breadcrumb a').last().click();
 await expect(page.locator('.blog-masthead h1')).toHaveText('Engineering Blog');
});

test('Source Sans 3 and IBM Plex Mono are served as self-hosted WOFF2, with Vietnamese glyphs',async({page})=>{
 await page.goto('./techblog/');
 const result=await page.evaluate(async()=>{
  const sample='Tiếng Việt: Trường đại học, kỹ thuật, dữ liệu, Nguyễn, Ắ ằ ặ ẵ ễ ệ ố ồ ộ ỡ ợ ứ ừ ự ỵ ỹ Đ đ';
  const specs=[...([300,400,500,600].map(w=>w+' 19px "Source Sans 3 Web"')),'italic 400 19px "Source Sans 3 Web"','400 15px "IBM Plex Mono Web"'];
  const faces=await Promise.all(specs.map(spec=>document.fonts.load(spec,sample)));
  const probe=document.createElement('span');probe.id='viet-font-probe';probe.style.cssText='font:400 19px "Source Sans 3 Web";display:block';probe.textContent=sample;document.body.append(probe);
  await document.fonts.ready;
  const resources=performance.getEntriesByType('resource').filter(e=>/SourceSans3-|IBMPlexMono-/.test(e.name)).map(e=>({local:new URL(e.name).origin===location.origin,woff2:new URL(e.name).pathname.endsWith('.woff2')}));
  return {loaded:faces.every(set=>set.length>0&&set.every(face=>face.status==='loaded')),family:getComputedStyle(document.body).fontFamily,resources};
 });
 expect(result.loaded).toBe(true);
 expect(result.family).toContain('Source Sans 3 Web');
 expect(result.resources.length).toBeGreaterThanOrEqual(3);
 expect(result.resources.every(r=>r.local&&r.woff2)).toBe(true);
 // Chromium reports the actual glyph-rendering font, not just the CSS family.
 const session=await page.context().newCDPSession(page);
 await session.send('DOM.enable');await session.send('CSS.enable');
 const {root}=await session.send('DOM.getDocument');
 const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#viet-font-probe'});
 const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});
 expect(fonts.length).toBeGreaterThan(0);
 expect(fonts.every(f=>f.isCustomFont&&/Source Sans 3/i.test(f.familyName))).toBe(true);
 await page.locator('#viet-font-probe').evaluate(el=>el.remove());
 await expect(page.locator('.blog-name')).toHaveCSS('font-weight','300');
 await page.locator('[data-tech-post]').first().locator('h3 a').click();
 await expect(page.locator('.article-heading h1')).toHaveCSS('font-weight','600');
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('font-weight','400');
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('font-size','19px');
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('line-height','33.25px');
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('text-align','justify');
 await expect(page.locator('.blog-breadcrumb')).toHaveCSS('font-size','14px');
 await expect(page.locator('.article-heading [data-copy-permalink]')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
});
