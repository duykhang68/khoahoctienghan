import {test,expect} from '@playwright/test';
import {checkHeaders,listRows,rowDraft,recommendDestination,sheetId,sheetsClient} from '../../src/lib/sheet-blog/model.mjs';
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
 expect(()=>rowDraft({...selected,id:'a'.repeat(40)},['a'.repeat(40),...row.slice(1)],topics,'knowledge','ngon-ngu')).toThrow(/Content ID/);
});
test('Google OAuth fixture lists only VN titles, previews exact chosen content and gates GitHub writes',async({page})=>{
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:'window.google={accounts:{oauth2:{hasGrantedAllScopes:()=>true,initTokenClient:c=>({requestAccessToken:()=>c.callback({access_token:"fixture-google"})})}}};'}));
 let bodyRead=0;
 await page.route('https://sheets.googleapis.com/**',route=>{
  const url=new URL(route.request().url());expect(url.pathname).toContain(sheetId);
  expect(route.request().headers()['authorization']).toBe('Bearer fixture-google');
  let response:any;
  const range=decodeURIComponent(url.pathname).split('/values/')[1];
  expect(url.search).toBe('');
  if(range==="'VN'!A1:E1")response={values:[['content id_vn','blog title','blog main content','group','topic']]};
  else if(range==="'VN'!A2:B")response={values:[['','Bài thử tiếng Việt'],['a'.repeat(40),'Bài đã đăng']]};
  else if(range==="'VN'!D2:E")response={values:[['Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc'],['Tech Blog','']]};
  else if(range==="'VN'!A2:E2"){bodyRead++;response={values:[['','Bài thử tiếng Việt','Nội dung thật <b>không thực thi</b>','Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc']]}}
  else throw Error('Unexpected Sheets range: '+range);
  return route.fulfill({json:response});
 });
 await page.goto('./viet-blog-by-google-sheet/');
 await expect(page.locator('[data-client]')).toHaveValue(sharedGoogleClientId);
 await expect(page.locator('[data-client-label]')).toBeHidden();
 await page.getByRole('button',{name:'Đăng nhập Google'}).click();
 await expect(page.getByRole('heading',{name:'Bài thử tiếng Việt'})).toBeVisible();
 expect(bodyRead).toBe(0);
 await expect(page.getByRole('button',{name:'Đã có Content ID',exact:true})).toBeDisabled();
 await page.getByRole('searchbox',{name:'Tìm tiêu đề'}).fill('Bài thử');
 await expect(page.getByRole('heading',{name:'Bài đã đăng'})).toHaveCount(0);
 await page.getByRole('button',{name:'Đăng bài',exact:true}).click();
 await expect(page.locator('[data-preview]')).toHaveText('Nội dung thật <b>không thực thi</b>');
 expect(bodyRead).toBe(1);
 await expect(page.locator('[data-preview] b')).toHaveCount(0);
 await expect(page.locator('[data-kind]')).toHaveValue('knowledge');
 await expect(page.locator('[data-category]')).toHaveValue('ngon-ngu');
 await page.locator('[data-consent]').check();
 await expect(page.locator('[data-submit]')).toBeDisabled();
 await expect(page.getByRole('button',{name:'Kết nối GitHub để đăng bài'})).toBeVisible();
 await page.getByRole('button',{name:'Kết nối GitHub để đăng bài'}).click();
 await expect(page.locator('[data-gh-token]')).toBeFocused();
 await page.getByRole('button',{name:'Ngắt Google'}).click();
 await expect(page.getByRole('heading',{name:'Bài thử tiếng Việt'})).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});

test('Sheets HTTP 400 diagnostics identify the failing read without exposing API messages or tokens',async()=>{
 const seen:string[]=[];
 const client=sheetsClient('fixture-secret',async(url,options)=>{
  const path=decodeURIComponent(new URL(String(url)).pathname);seen.push(path.split('/values/')[1]);
  expect(options.headers.Authorization).toBe('Bearer fixture-secret');
  if(path.endsWith("'VN'!A1:E1"))return new Response(JSON.stringify({values:[['content id_vn','blog title','blog main content','group','topic']]}),{status:200});
  return new Response(JSON.stringify({error:{status:'INVALID_ARGUMENT',message:'sensitive raw API detail'}}),{status:400});
 });
 let message='';try{await client.list()}catch(e){message=String((e as Error).message)}
 expect(message).toContain('Google Sheets HTTP 400 · INVALID_ARGUMENT · đọc danh sách tiêu đề');
 expect(message).not.toContain('sensitive raw API detail');expect(message).not.toContain('fixture-secret');
 expect(seen).toEqual(["'VN'!A1:E1","'VN'!A2:B"]);
});
