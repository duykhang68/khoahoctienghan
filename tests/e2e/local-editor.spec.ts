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
 // Inject a real PNG through the browser file picker; the editor must produce local WebP bytes and a section reference.
 await page.locator('.media summary').click();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=32;c.height=24;const g=c.getContext('2d')!;g.fillStyle='#2459a6';g.fillRect(0,0,32,24);return c.toDataURL('image/png').split(',')[1]});
 await page.locator('#image-file').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await expect(page.locator('#image-info')).toContainText('32 × 24 px');
 await page.getByLabel('Mô tả ảnh',{exact:true}).fill('Ảnh minh họa');
 await page.getByLabel('Chú thích ảnh (tùy chọn)',{exact:true}).fill('Ảnh đã chèn');
 await page.locator('#image-insert').click();
 await expect(page.locator('#visual-editor .editor-image-card img')).toBeVisible();
 const mediaDrafts=await page.evaluate(()=>JSON.parse(localStorage.getItem('trithuchanquoc-editor-drafts-v1')||'{}'));
 const asset=Object.keys(mediaDrafts).find(p=>p.startsWith('public/media/editor/'))!;
 expect(asset).toMatch(/\.webp$/);expect(Buffer.from(mediaDrafts[asset].content,'base64').toString('ascii',8,12)).toBe('WEBP');
 expect(JSON.parse(mediaDrafts[posts].content)[0].sections[0].images[0]).toMatchObject({src:asset.slice(6),alt:'Ảnh minh họa',width:32,height:24});
 await page.locator('#files .file').filter({hasText:'Hangul và cấu trúc âm tiết'}).click();
 await page.locator('#image-insert').click();
 await expect(page.locator('#visual-editor .editor-image-card img')).toBeVisible();
 const kb=await page.evaluate(()=>JSON.parse(localStorage.getItem('trithuchanquoc-editor-drafts-v1')||'{}'));
 expect(JSON.parse(kb['src/data/editor-images.json'].content)['ngon-ngu/hangul'].images[0].src).toBe(asset.slice(6));
 await page.getByLabel('Vị trí minh họa Knowledge Base').selectOption({index:1});
 await page.getByLabel('Loại minh họa').selectOption('flow');
 await page.getByRole('button',{name:'+ Thêm minh họa',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Áp dụng',exact:true}).click();
 await expect(page.locator('#visual-editor figure.visual-block')).toHaveCount(4);
 await page.locator('#image-target').selectOption('kb:1');
 await page.locator('#image-insert').click();
 await expect(page.locator('#visual-editor .editor-image-card img')).toHaveCount(2);
 const inline=await page.evaluate(path=>JSON.parse(localStorage.getItem('trithuchanquoc-editor-drafts-v1')||'{}')[path].content,docs);
 expect(inline).toContain('<KnowledgeImage id="image-');
 await page.locator('#files .file').filter({hasText:'Tech Blog · Tất cả bài viết'}).click();
 await page.locator('#visual-editor h1.paper-field').fill('Autosave thử');
 await expect(page.locator('#autosave-state')).toHaveText('Đã lưu local');
 await expect.poll(()=>page.evaluate(path=>JSON.parse(JSON.parse(localStorage.getItem('trithuchanquoc-editor-drafts-v1')||'{}')[path].content)[0].title,posts)).toBe('Autosave thử');
 await page.locator('#undo').click();
 await expect(page.locator('#visual-editor h1')).toHaveText('Tiêu đề đã sửa');
 await page.locator('#redo').click();
 await expect(page.locator('#visual-editor h1')).toHaveText('Autosave thử');
 page.once('dialog',d=>d.accept('visual-fixture-copy'));
 await page.locator('#duplicate-article').click();
 await expect(page.locator('#visual-editor h1')).toHaveText('Autosave thử (bản sao)');
 page.once('dialog',d=>d.accept());
 await page.locator('#delete-article').click();
 await expect(page.locator('#post-select option')).toHaveCount(1);
 await expect(page.locator('.publishing-dashboard')).toBeVisible();
 expect(errors).toEqual([]);
});


import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
test('actual Astro draft preview renders placed Knowledge image and existing visual without publishing',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop-chromium','one real production renderer build for both projects');
 test.setTimeout(240000);
 const probe=createServer();await new Promise<void>((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve)});
 const port=(probe.address() as import('node:net').AddressInfo).port;await new Promise<void>(resolve=>probe.close(()=>resolve()));
 const child=spawn(process.execPath,['local-editor/server.mjs'],{env:{...process.env,EDITOR_PORT:String(port),EDITOR_PREVIEW_DEBUG:'1'},stdio:['ignore','pipe','pipe']});
 let diagnostic='';child.stderr.on('data',chunk=>{diagnostic=(diagnostic+String(chunk)).slice(-8000)});
 const base='http://127.0.0.1:'+port;
 try{
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Editor not listening')),10000);child.once('error',error=>{clearTimeout(timer);reject(error)});child.stdout.once('data',()=>{clearTimeout(timer);resolve()})});
  const session=await (await fetch(base+'/api/session')).json(),snapshot=await (await fetch(base+'/api/local')).json();
  const indexPath='src/data/editor-images.json';
  const asset='public/media/editor/0adc064c3fdb59f8495ef65898e7ac5f7e9939b53a1b52205aceb73eae2c96f0.webp';
  const bytes='UklGRjwAAABXRUJQVlA4IDAAAAAQAgCdASoQAAwAAQAcJaACdLoB+AH4AAPIAP7svY/9g6m3r35MX/00UYUx9aAAAAA=';
  const id='image-12345678-1234-4234-8234-123456789abc';
  const old=snapshot.files[docs].content;
  const article=old.replace("import KnowledgeVisual from '../../../components/KnowledgeVisual.astro';","import KnowledgeImage from '../../../components/KnowledgeImage.astro';\n\nimport KnowledgeVisual from '../../../components/KnowledgeVisual.astro';").replace('## Chữ cái cơ bản','<KnowledgeImage id="'+id+'" />\n\n## Chữ cái cơ bản');
  expect(article).not.toBe(old);
  const index=JSON.parse(snapshot.files[indexPath].content),record=index['ngon-ngu/hangul']??{images:[]};
  record.images.push({id,src:asset.slice(6),width:16,height:12,alt:'Ảnh preview thực tế',caption:'Fixture chỉ tồn tại trong preview'});index['ngon-ngu/hangul']=record;
  const changes=[{path:docs,before:snapshot.files[docs].hash,content:article},{path:indexPath,before:snapshot.files[indexPath].hash,content:JSON.stringify(index,null,2)+'\n'},{path:asset,before:snapshot.files[asset]?.hash??null,content:bytes}];
  const response=await fetch(base+'/api/preview',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Editor-Nonce':session.nonce},body:JSON.stringify({base:snapshot.sha,route:'ngon-ngu/hangul/',changes}),signal:AbortSignal.timeout(180000)});
  const preview=await response.json();expect(response.status,JSON.stringify(preview)+'\n'+diagnostic).toBe(200);
  const navigation=await page.goto(preview.url);
  expect(navigation?.status(),'Preview HTML HTTP status').toBe(200);
  const image=page.getByRole('img',{name:'Ảnh preview thực tế'});
  await expect(image).toBeVisible();await expect(image).toHaveAttribute('width','16');
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveJSProperty('naturalWidth',16);
  const assetResponse=await page.request.get(new URL(asset.slice(6).replace(/^\//,'/khoahoctienghan/'),preview.url).href);
  expect(assetResponse.status(),'Preview WebP HTTP status').toBe(200);
  expect((await assetResponse.body()).toString('base64')).toBe(bytes);
  await expect(page.locator('[data-knowledge-visual="hangul-basic-letters"]')).toBeVisible();
  const order=await page.evaluate(()=>{const image=document.querySelector('[data-editor-image]'),heading=[...document.querySelectorAll('h2')].find(h=>h.textContent?.includes('Chữ cái cơ bản'));return !!image&&!!heading&&!!(image.compareDocumentPosition(heading)&Node.DOCUMENT_POSITION_FOLLOWING)});
  expect(order).toBe(true);
  const unchanged=await (await fetch(base+'/api/local')).json();expect(unchanged.files[docs].hash).toBe(snapshot.files[docs].hash);
 }finally{await new Promise<void>(resolve=>{if(child.exitCode!==null||child.signalCode!==null)return resolve();child.once('exit',()=>resolve());child.kill()})}
});
