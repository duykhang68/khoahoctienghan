import {test,expect} from '@playwright/test';
import {checkHeaders,listRows,rowDraft,recommendDestination,sheetId} from '../../src/lib/sheet-blog/model.mjs';
import {buildDocument} from '../../src/lib/editor-v2/model.mjs';
import {sharedGoogleClientId} from '../../src/lib/sheet-blog/oauth-config.mjs';
test('VN mapping preserves title and body, stable retry payload, and fails closed on changed row',async()=>{
 checkHeaders(['content id_vn','blog title','blog main content','group','topic']);
 expect(()=>checkHeaders(['blog title','blog main content'])).toThrow();
 const topics=[{id:'ngon-ngu',title:'Ngôn ngữ Hàn Quốc'}];
 const selected=listRows([['','Bài thử']],[['Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc']])[0];
 expect(recommendDestination(selected,topics)).toEqual({kind:'knowledge',category:'ngon-ngu'});
 const row=['','Bài thử','Dòng một\nDòng hai','Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc'];
 const draft=rowDraft(selected,row,topics,'knowledge','ngon-ngu');
 expect(draft.title).toBe('Bài thử');expect(draft.blocks.map(b=>b.text)).toEqual(['Dòng một','Dòng hai']);
 expect(rowDraft(selected,row,topics,'knowledge','ngon-ngu')).toEqual(draft);
 expect(()=>rowDraft(selected,['','Đã đổi',...row.slice(2)],topics,'knowledge','ngon-ngu')).toThrow();
 expect((await buildDocument(draft.blocks)).body.content).toHaveLength(2);
});
test('Google OAuth fixture lists only VN titles, previews exact chosen content and gates GitHub writes',async({page})=>{
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:'window.google={accounts:{oauth2:{hasGrantedAllScopes:()=>true,initTokenClient:c=>({requestAccessToken:()=>c.callback({access_token:"fixture-google"})})}}};'}));
 let bodyRead=0;
 await page.route('https://sheets.googleapis.com/**',route=>{
  const url=new URL(route.request().url());expect(url.pathname).toContain(sheetId);
  expect(route.request().headers()['authorization']).toBe('Bearer fixture-google');
  let response:any;
  if(url.pathname.endsWith('/values:batchGet'))response={valueRanges:[{values:[['','Bài thử tiếng Việt']]},{values:[['Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc']]}]};
  else if(decodeURIComponent(url.pathname).endsWith('VN!A1:E1'))response={values:[['content id_vn','blog title','blog main content','group','topic']]};
  else if(decodeURIComponent(url.pathname).endsWith('VN!A2:E2')){bodyRead++;response={values:[['','Bài thử tiếng Việt','Nội dung thật <b>không thực thi</b>','Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc']]}}
  else response={sheets:[{properties:{title:'VN',gridProperties:{rowCount:1000}}}]};
  return route.fulfill({json:response});
 });
 await page.goto('./viet-blog-by-google-sheet/');
 await expect(page.locator('[data-client]')).toHaveValue(sharedGoogleClientId);
 await expect(page.locator('[data-client-label]')).toBeHidden();
 await page.getByRole('button',{name:'Đăng nhập Google'}).click();
 await expect(page.getByRole('heading',{name:'Bài thử tiếng Việt'})).toBeVisible();
 expect(bodyRead).toBe(0);
 await page.getByRole('button',{name:'Viết bài',exact:true}).click();
 await expect(page.locator('[data-preview]')).toHaveText('Nội dung thật <b>không thực thi</b>');
 expect(bodyRead).toBe(1);
 await expect(page.locator('[data-preview] b')).toHaveCount(0);
 await expect(page.locator('[data-kind]')).toHaveValue('knowledge');
 await expect(page.locator('[data-category]')).toHaveValue('ngon-ngu');
 await page.locator('[data-consent]').check();
 await expect(page.locator('[data-submit]')).toBeDisabled();
 await page.locator('[data-close]').click();
 await page.getByRole('button',{name:'Ngắt Google'}).click();
 await expect(page.getByRole('heading',{name:'Bài thử tiếng Việt'})).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});
