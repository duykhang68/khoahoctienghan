import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const route='http://127.0.0.1:4317/';
const docs='src/content/docs/ngon-ngu/hangul.mdx',menu='src/data/knowledge-menu.json',visuals='src/data/knowledge-visuals.json',posts='src/data/techblog/posts.json';
const read=(path:string)=>readFileSync(resolve(path),'utf8');
const source=read(docs);
const entry=(content:string)=>({content,hash:createHash('sha256').update(content).digest('hex')});
const assets:Record<string,string>={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
const sample=[{slug:'visual-fixture',title:'Bài kiểm thử',summary:'Mô tả thử',date:'2026-11-14T12:00:00+07:00',issues:[],sections:[{heading:'Kiến trúc',paragraphs:['Nội dung ban đầu'],visuals:[{kind:'flow',caption:'Quy trình thử',items:[{label:'Bắt đầu'},{label:'Kết thúc'}]}]}]}];
test('local studio edits rendered documents and retains original structured visuals',async({page})=>{
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const snapshot={sha:'0123456789abcdef',files:{[docs]:entry(source),[menu]:entry(read(menu)),[visuals]:entry(read(visuals)),[posts]:entry(JSON.stringify(sample,null,2)+'\n')}};
 await page.route(route+'**',async req=>{
  const path=new URL(req.request().url()).pathname;
  if(path==='/api/session')return req.fulfill({json:{nonce:'fixture',login:null}});
  if(path==='/api/local')return req.fulfill({json:snapshot});
  const asset=assets[path];if(asset)return req.fulfill({path:resolve('local-editor/web',asset),contentType:asset.endsWith('.js')?'text/javascript':asset.endsWith('.css')?'text/css':'text/html'});
  return req.fulfill({status:404,body:'Not found'});
 });
 await page.goto(route);
 await expect(page.locator('#status')).toContainText('Sẵn sàng');
 await page.locator('#files .file').filter({hasText:'Hangul và cấu trúc âm tiết'}).click();
 await expect(page.locator('#visual-editor h1')).toHaveText('Hangul và cấu trúc âm tiết');
 await expect(page.locator('#visual-editor figure.visual-block')).toHaveCount(3);
 await expect(page.locator('#visual-editor [data-visual="bars"] svg')).toBeVisible();
 await expect(page.locator('#visual-editor [data-visual="flow"] svg')).toBeVisible();
 await expect(page.locator('#visual-editor table')).toBeVisible();
 await page.locator('.visual-editable-block').first().getByRole('button',{name:'Chỉnh sửa minh họa'}).click();
 const inspector=page.getByRole('dialog');
 await inspector.getByLabel('Giá trị 1',{exact:true}).fill('15');
 await expect(inspector.locator('.visual-live')).toContainText('15');
 await inspector.getByRole('button',{name:'Áp dụng',exact:true}).click();
 const editedCatalogue=await page.evaluate(path=>JSON.parse(localStorage.getItem('trithuchanquoc-editor-drafts-v1')||'{}')[path]?.content,visuals);
 expect(JSON.parse(editedCatalogue)['hangul-basic-letters'].items[0].value).toBe('15');
 await expect(page.locator('#visual-editor')).not.toContainText('import KnowledgeVisual');
 const first=page.locator('#visual-editor p.paper-field[aria-label="Đoạn văn"]').first();
 await expect(first.locator('strong').first()).toHaveText('ký tự');
 await first.fill('Hangul là hệ chữ viết tiếng Hàn.');
 await page.locator('#save').click();
 const draft=await page.evaluate(path=>JSON.parse(localStorage.getItem('trithuchanquoc-editor-drafts-v1')||'{}')[path]?.content,docs);
 expect(draft).toContain('Hangul là hệ chữ viết tiếng Hàn.');
 expect(draft).toContain('<KnowledgeVisual id="hangul-basic-letters" />');
 expect(draft).toContain('<KnowledgeVisual id="hangul-practice-cycle" />');
 expect(draft).toContain('| ㄱ + ㅏ | 가 |');
 await page.locator('#files .file').filter({hasText:'Tech Blog · Tất cả bài viết'}).click();
 await expect(page.locator('#visual-editor h1')).toHaveText('Bài kiểm thử');
 await page.locator('#visual-editor h1.paper-field').fill('Tiêu đề đã sửa');
 await page.locator('#save').click();
 const saved=await page.evaluate(path=>JSON.parse(localStorage.getItem('trithuchanquoc-editor-drafts-v1')||'{}')[path]?.content,posts);
 const parsed=JSON.parse(saved);expect(parsed[0].title).toBe('Tiêu đề đã sửa');expect(parsed[0].sections[0].visuals).toEqual(sample[0].sections[0].visuals);
 await expect(page.locator('#visual-editor figure.visual-block')).toHaveCount(1);
 const picker=page.getByLabel('Loại minh họa');
 for(const kind of ['swatches','buttons','type','spacing','wireframe','table','flow','bars','code']){
  await picker.selectOption(kind);
  await page.getByRole('button',{name:'+ Thêm minh họa',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Chú thích',{exact:true}).fill('Minh họa '+kind);
  if(kind==='wireframe'){await dialog.getByLabel('Bố cục',{exact:true}).selectOption('responsive');await expect(dialog.locator('.wire-devices .wire-preview')).toHaveCount(3)}
  if(kind==='buttons'){await dialog.getByLabel('Nhãn nút 1',{exact:true}).fill('Đọc thêm');await expect(dialog.locator('.visual-live svg[aria-label="Hover Đọc thêm"]')).toBeVisible()}
  if(kind==='table'){await dialog.getByRole('button',{name:'+ Dòng',exact:true}).click();await expect(dialog.locator('.visual-live tr')).toHaveCount(3)}

  await expect(dialog.locator('.visual-live figcaption')).toHaveText('Minh họa '+kind);
  await dialog.getByRole('button',{name:'Áp dụng',exact:true}).click();
 }
 await expect(page.locator('#visual-editor figure.visual-block')).toHaveCount(10);
 await page.locator('#save').click();
 const all=await page.evaluate(path=>JSON.parse(localStorage.getItem('trithuchanquoc-editor-drafts-v1')||'{}')[path]?.content,posts);
 expect(JSON.parse(all)[0].sections[0].visuals.map((v:{kind:string})=>v.kind)).toEqual(['flow','swatches','buttons','type','spacing','wireframe','table','flow','bars','code']);
 expect(errors).toEqual([]);
});
