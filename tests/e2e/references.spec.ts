import {test,expect} from '@playwright/test';
test('long reference URLs render as readable clickable titles without justified spacing',async({page})=>{
 await page.goto('./techblog/engineering-researcher-bo-nao-cua-self-healing-ci-cd/');
 const prose=page.locator('.article-body .article-lead');
 await expect(prose).toHaveCSS('text-align','justify');
 const refs=page.locator('.article-references .reference-list');
 const disclosure=page.locator('details.article-references');
 await expect(disclosure).not.toHaveAttribute('open','');
 await expect(refs).toBeHidden();
 await disclosure.locator('summary').click();
 await expect(refs).toBeVisible();
 await expect(refs.locator('li').first()).toHaveCSS('text-align','start');
 const first=refs.locator('.reference-link').first();
 await expect(first).toHaveAttribute('href',/^https:\/\/docs\.github\.com\//);
 await expect(first.locator('span')).toHaveText('GitHub Actions — workflow_run và lưu ý bảo mật');
 await expect(first.locator('small')).toHaveText('docs.github.com');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
 await disclosure.locator('summary').click();
 await expect(refs).toBeHidden();
});

test('references and issues default closed and toggle independently',async({page})=>{
 await page.goto('./techblog/bugfix-issue-2/');
 const references=page.locator('details.article-references');
 const issues=page.locator('details.article-issues');
 for(const item of [references,issues]){
  await expect(item.locator('summary')).toBeVisible();
  await expect(item.locator('.disclosure-content')).toBeHidden();
 }
 await references.locator('summary').click();
 await expect(references.locator('.reference-list')).toBeVisible();
 await expect(issues.locator('.disclosure-content')).toBeHidden();
 await issues.locator('summary').focus();
 await page.keyboard.press('Enter');
 await expect(issues.locator('a').first()).toHaveAttribute('href',/\/issues\/2$/);
 await expect(issues.locator('a').first()).toBeVisible();
 await expect(references.locator('.reference-list')).toBeVisible();
 await references.locator('summary').click();
 await expect(references.locator('.disclosure-content')).toBeHidden();
 await expect(issues.locator('.disclosure-content')).toBeVisible();
 await page.reload();
 for(const item of [references,issues])await expect(item.locator('.disclosure-content')).toBeHidden();
});
