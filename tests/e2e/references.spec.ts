import {test,expect} from '@playwright/test';
test('long reference URLs render as readable clickable titles without justified spacing',async({page})=>{
 await page.goto('./techblog/engineering-researcher-bo-nao-cua-self-healing-ci-cd/');
 const prose=page.locator('.article-body .article-lead');
 await expect(prose).toHaveCSS('text-align','justify');
 const refs=page.locator('.article-references .reference-list');
 await expect(refs).toBeVisible();
 await expect(refs.locator('li').first()).toHaveCSS('text-align','start');
 const first=refs.locator('.reference-link').first();
 await expect(first).toHaveAttribute('href',/^https:\/\/docs\.github\.com\//);
 await expect(first.locator('span')).toHaveText('GitHub Actions — workflow_run và lưu ý bảo mật');
 await expect(first.locator('small')).toHaveText('docs.github.com');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
});
