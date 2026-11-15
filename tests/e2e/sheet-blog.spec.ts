import {expect} from '@playwright/test';
import {test} from './private-office-fixture';
import {checkHeaders,listRows,rowDraft,recommendDestination,sheetId,sheetsClient} from '../../src/lib/sheet-blog/model.mjs';
import {buildDocument} from '../../src/lib/editor-v2/model.mjs';
import {sharedGoogleClientId} from '../../src/lib/sheet-blog/oauth-config.mjs';
import {sheetSource,verifyReviewedSource} from '../../src/lib/sheet-blog/source.mjs';
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
test('Google OAuth fixture lists only VN titles, previews exact chosen content and gates GitHub writes',async({page,office})=>{
 await page.route('https://api.github.com/repos/duykhang68/khoahoctienghan/issues?**',route=>route.fulfill({json:[]}));
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:'window.google={accounts:{oauth2:{hasGrantedAllScopes:()=>true,initTokenClient:c=>({requestAccessToken:()=>c.callback({access_token:"fixture-google"})})}}};'}));
 let bodyRead=0,changed=false;
 await page.route('https://sheets.googleapis.com/**',route=>{
  const url=new URL(route.request().url());expect(url.pathname).toContain(sheetId);
  expect(route.request().headers()['authorization']).toBe('Bearer fixture-google');
  let response:any;
  const range=decodeURIComponent(url.pathname).split('/values/')[1];
  expect(url.search).toBe('');
  if(range==="'VN'!A1:E1")response={values:[['content id_vn','blog title','blog main content','group','topic']]};
  else if(range==="'VN'!A2:B")response={values:[['','Bài thử tiếng Việt'],['a'.repeat(40),'Bài đã đăng']]};
  else if(range==="'VN'!D2:E")response={values:[['Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc'],['Tech Blog','']]};
  else if(range==="'VN'!A2:E2"){bodyRead++;response={values:[['','Bài thử tiếng Việt',changed?'Nội dung đã đổi':'Nội dung thật <b>không thực thi</b>','Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc']]}}
  else throw Error('Unexpected Sheets range: '+range);
  return route.fulfill({json:response});
 });
 await page.goto(office+'/admin/sheets/');
 await expect(page.locator('[data-client]')).toHaveValue(sharedGoogleClientId);
 await expect(page.locator('[data-client-label]')).toBeHidden();
 await page.getByRole('button',{name:'Đăng nhập Google'}).click();
 await expect(page.getByRole('heading',{name:'Bài thử tiếng Việt'})).toBeVisible();
 expect(bodyRead).toBe(0);
 await expect(page.locator('[data-sheet-pending]')).toHaveText('1');await expect(page.locator('[data-sheet-marked]')).toHaveText('1');await page.locator('[data-sheet-filter]').selectOption('marked');await expect(page.getByRole('heading',{name:'Bài thử tiếng Việt'})).toHaveCount(0);await page.locator('[data-sheet-filter]').selectOption('');
 await expect(page.getByRole('button',{name:'Đã có Content ID',exact:true})).toBeDisabled();
 await page.getByRole('searchbox',{name:'Tìm tiêu đề'}).fill('Bài thử');
 await expect(page.getByRole('heading',{name:'Bài đã đăng'})).toHaveCount(0);
 await page.getByRole('button',{name:'Đăng bài',exact:true}).click();
 await expect(page.locator('[data-preview]')).toHaveText('Nội dung thật <b>không thực thi</b>');
 expect(bodyRead).toBe(1);
 await page.getByText('Kiểm tra nguồn nhập · SHA-256',{exact:true}).click();await expect(page.locator('[data-source-fingerprint]')).toHaveText((await sheetSource(2,['','Bài thử tiếng Việt','Nội dung thật <b>không thực thi</b>','Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc'])).fingerprint);
 await expect(page.locator('[data-preview] b')).toHaveCount(0);
 await expect(page.locator('[data-kind]')).toHaveValue('knowledge');
 await expect(page.locator('[data-category]')).toHaveValue('ngon-ngu');
 await page.locator('[data-consent]').check();
 await expect(page.locator('[data-submit]')).toBeDisabled();
 await expect(page.getByRole('button',{name:'Kết nối GitHub để đăng bài'})).toBeVisible();
 await page.getByRole('button',{name:'Kết nối GitHub để đăng bài'}).click();
 await expect(page.locator('[data-gh-token]')).toBeFocused();
 let payload:any;
 await page.route('https://api.github.com/**',route=>{
  const path=new URL(route.request().url()).pathname,hash='a'.repeat(40);
  if(path.endsWith('/issues'))return route.fulfill({json:[]});
  if(path==='/user')return route.fulfill({json:{login:'duykhang68'}});
  if(path==='/repos/duykhang68/khoahoctienghan')return route.fulfill({json:{full_name:'duykhang68/khoahoctienghan',permissions:{push:true}}});
  if(path.includes('/git/ref/heads/content/editor-v2-'))return route.fulfill({status:404,json:{}});
  if(path.endsWith('/git/ref/heads/main'))return route.fulfill({json:{object:{sha:hash}}});
  if(path.endsWith('/git/commits/'+hash))return route.fulfill({json:{tree:{sha:hash}}});
  if(path.endsWith('/git/blobs'))payload=JSON.parse(route.request().postDataJSON().content);
  if(path.endsWith('/dispatches'))return route.fulfill({status:204});
  if(['/git/blobs','/git/trees','/git/commits','/git/refs'].some(s=>path.endsWith(s)))return route.fulfill({json:{sha:hash}});
  throw Error('Unexpected GitHub path '+path);
 });
 await page.route('**/ngon-ngu/bai-thu-tieng-viet/',route=>route.fulfill({status:404}));
 await page.locator('[data-gh-token]').fill('github'+'_pat_fixture');
 await page.getByRole('button',{name:'Kết nối GitHub',exact:true}).click();
 await expect(page.locator('[data-github-state]')).toHaveText('Đã kết nối · chủ blog');
 await page.getByRole('button',{name:'Đăng bài',exact:true}).click();
 await expect(page.locator('[data-confirm-dialog]')).toBeVisible();
 await page.locator('[data-consent]').check();changed=true;await page.locator('[data-submit]').click();await expect(page.locator('[data-dialog-status]')).toContainText('Nội dung nguồn đã đổi');expect(payload).toBeUndefined();changed=false;await page.locator('[data-close]').click();await page.getByRole('button',{name:'Đăng bài',exact:true}).click();await page.locator('[data-consent]').check();await page.locator('[data-submit]').click();
 await expect(page.locator('[data-status]')).toContainText('Đã gửi commit');
 expect(payload.draft.sheetSource).toEqual(await sheetSource(2,['','Bài thử tiếng Việt','Nội dung thật <b>không thực thi</b>','Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc']));
 expect(JSON.stringify(payload)).not.toContain('fixture-google');expect(JSON.stringify(payload)).not.toContain('pat_fixture');
 await page.getByRole('button',{name:'Ngắt Google'}).click();
 await expect(page.locator('[data-rows]').getByRole('heading',{name:'Bài thử tiếng Việt'})).toHaveCount(0);
 await expect(page.locator('[data-queue-progress]').getByRole('heading',{name:'Bài thử tiếng Việt'})).toBeVisible();
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

test('legacy Sheets route links to Back Office without publisher controls',async({page})=>{await page.goto('./viet-blog-by-google-sheet/');await expect(page.getByRole('link',{name:'Mở Back Office'})).toHaveAttribute('href','https://korean-backoffice.tamsudev-com.workers.dev/admin/sheets/');await expect(page.locator('[data-sheet-blog]')).toHaveCount(0);});


test('P1.7 reviewed source fingerprint rejects changed content, row and marked source',async()=>{
 const row=['','Bài VN','Nội dung','Tri thức Hàn Quốc','Ngôn ngữ Hàn Quốc'],source=await sheetSource(2,row);
 expect(await verifyReviewedSource(source,2,row)).toEqual(source);
 await expect(verifyReviewedSource(source,2,['','Bài VN','Đổi nội dung',...row.slice(3)])).rejects.toThrow();
 await expect(verifyReviewedSource(source,3,row)).rejects.toThrow();
 await expect(verifyReviewedSource(source,2,['a'.repeat(40),...row.slice(1)])).rejects.toThrow();
});
