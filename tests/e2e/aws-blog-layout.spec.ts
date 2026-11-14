import {test,expect} from '@playwright/test';
test('Uber-inspired editorial shell keeps navigation, heading and metadata in reading order',async({page})=>{
 await page.goto('./techblog/');
 await expect(page.locator('#feed-heading')).toHaveText('BÀI MỚI NHẤT');
 await expect(page.locator('.engineering-header')).toHaveCSS('background-color','rgb(0, 0, 0)');
 const first=page.locator('[data-tech-post]').first();
 await expect(first.locator('h3 a')).toBeVisible();
 await expect(first.locator('.post-meta time')).toBeVisible();
 await first.locator('h3 a').click();
 await expect(page.locator('h1')).toHaveCount(1);
 await expect(page.locator('.research-meta .post-meta')).toBeVisible();
 await expect(page.locator('.research-meta .topic-link')).toBeVisible();
 await expect(page.locator('.research-share [data-copy-permalink]')).toBeVisible();
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('text-align','justify');
 await expect(page.locator('.blog-breadcrumb a').last()).toHaveText('Engineering Blog');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
 await page.locator('.blog-breadcrumb a').last().click();
 await expect(page.locator('#feed-heading')).toHaveText('BÀI MỚI NHẤT');
});

test('Plus Jakarta Sans, Source Sans 3 fallback and IBM Plex Mono are served as self-hosted WOFF2, with Vietnamese glyphs',async({page})=>{
 await page.goto('./techblog/');
 const result=await page.evaluate(async()=>{
  const sample='Tiếng Việt: Trường đại học, kỹ thuật, dữ liệu, Nguyễn, Ắ ằ ặ ẵ ễ ệ ố ồ ộ ỡ ợ ứ ừ ự ỵ ỹ Đ đ';
  const specs=['400 17px "Plus Jakarta Sans Web"','700 17px "Plus Jakarta Sans Web"',...([300,400,500,600].map(w=>w+' 19px "Source Sans 3 Web"')),'italic 400 19px "Source Sans 3 Web"','400 15px "IBM Plex Mono Web"'];
  const faces=await Promise.all(specs.map(spec=>document.fonts.load(spec,sample)));
  const probe=document.createElement('span');probe.id='viet-font-probe';probe.style.cssText='font:400 17px "Plus Jakarta Sans Web";display:block';probe.textContent=sample;document.body.append(probe);
  await document.fonts.ready;
  const resources=performance.getEntriesByType('resource').filter(e=>/SourceSans3-|IBMPlexMono-|PlusJakartaSans-/.test(e.name)).map(e=>({local:new URL(e.name).origin===location.origin,woff2:new URL(e.name).pathname.endsWith('.woff2')}));
  return {loaded:faces.every(set=>set.length>0&&set.every(face=>face.status==='loaded')),family:getComputedStyle(document.body).fontFamily,resources};
 });
 expect(result.loaded).toBe(true);
 expect(result.family).toContain('Plus Jakarta Sans Web');
 expect(result.resources.length).toBeGreaterThanOrEqual(4);
 expect(result.resources.every(r=>r.local&&r.woff2)).toBe(true);
 // Chromium reports the actual glyph-rendering font, not just the CSS family.
 const session=await page.context().newCDPSession(page);
 await session.send('DOM.enable');await session.send('CSS.enable');
 const {root}=await session.send('DOM.getDocument');
 const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#viet-font-probe'});
 const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});
 expect(fonts.length).toBeGreaterThan(0);
 // Verify the actual custom glyph-rendering face rather than a CSS fallback.
 const isJakarta=(name:string)=>/^plusjakartasans(?:variable|regular)?$/i.test(name.replace(/[\s-]/g,''));
 expect(fonts.every(f=>f.isCustomFont&&isJakarta(f.familyName)),JSON.stringify(fonts)).toBe(true);
 await page.locator('#viet-font-probe').evaluate(el=>el.remove());
 await expect(page.locator('#feed-heading')).toHaveCSS('font-weight','700');
 await page.locator('[data-tech-post]').first().locator('h3 a').click();
 await expect(page.locator('.article-heading h1')).toHaveCSS('font-weight','700');
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('font-weight','400');
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('font-size',page.viewportSize()!.width<=640?'16px':'17px');
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('line-height','28px');
 await expect(page.locator('.article-body .article-lead')).toHaveCSS('text-align','justify');
 await expect(page.locator('.blog-breadcrumb')).toHaveCSS('font-size','14px');
 await expect(page.locator('.research-share [data-copy-permalink]')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
});
