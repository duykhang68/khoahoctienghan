import {expect} from '@playwright/test';
import {test} from './private-office-fixture';
import {buildDocument,newBlock,prepareV2} from '../../src/lib/editor-v2/model.mjs';
import {blankDrawio,validateDrawioSource} from '../../src/lib/editor-v2/drawio-source.mjs';
test('diagram source validation rejects external entities and unrelated XML',()=>{
 expect(validateDrawioSource(blankDrawio)).toBe(blankDrawio);
 expect(()=>validateDrawioSource('<!DOCTYPE mxfile [<!ENTITY x SYSTEM "file:///etc/passwd">]><mxfile>&x;</mxfile>')).toThrow();
 expect(()=>validateDrawioSource('<svg></svg>')).toThrow();
});
test('draw.io integration uses isolated iframe, saves image and source and preserves draft after reload',async({page,office})=>{
 // Deterministic draw.io protocol fixture; does not contact the external editor.
 await page.route('https://embed.diagrams.net/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><button id="save">Save &amp; Exit</button><script>const xml='+JSON.stringify(blankDrawio)+';let loaded=false;const send=m=>parent.postMessage(JSON.stringify(m),"*");window.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.action==="load"){loaded=true;document.body.dataset.loaded="yes"}if(m.action==="export"){const c=document.createElement("canvas");c.width=120;c.height=60;const ctx=c.getContext("2d");ctx.fillStyle="#335577";ctx.fillRect(0,0,120,60);send({event:"export",format:"png",xml:m.xml,data:c.toDataURL("image/png"),message:m.message})}});document.querySelector("#save").onclick=()=>{if(loaded)send({event:"save",xml,exit:true})};send({event:"init"});</script>'}));
 await page.goto(office+'/admin/editor/');
 for(const kind of ['tech','knowledge']){
  await page.locator('[data-workspace="'+kind+'"]').click();
  await expect(page.locator('[data-drawio-host] iframe')).toHaveCount(0);
  await page.getByRole('button',{name:'Sơ đồ draw.io',exact:true}).click();
  const block=page.locator('[data-kind="diagram"]');
  await block.getByRole('button',{name:'Mở draw.io'}).click();
  const frame=page.frameLocator('[data-drawio-host] iframe');
  await expect(frame.locator('body')).toHaveAttribute('data-loaded','yes');
  // Untrusted parent message is ignored.
  await page.evaluate(()=>window.postMessage(JSON.stringify({event:'save',xml:'<mxfile></mxfile>'}),'*'));
  await expect(page.locator('[data-drawio-dialog]')).toBeVisible();
  await frame.getByRole('button',{name:'Save & Exit'}).click();
  await expect(page.locator('[data-drawio-dialog]')).toBeHidden();
  await expect(block.locator('img')).toHaveAttribute('src',/^data:image\/webp;base64,/);
  await block.getByLabel('Mô tả sơ đồ (bắt buộc)').fill('Luồng minh họa');
  await block.getByLabel('Chú thích sơ đồ (tùy chọn)').fill('Sơ đồ 1');
  await page.getByRole('button',{name:'Xem trước',exact:true}).click();
  await expect(page.locator('[data-preview-body] img')).toHaveAttribute('alt','Luồng minh họa');
  await expect(page.locator('[data-preview-body] figcaption')).toHaveText('Sơ đồ 1');
  await page.reload();
  await expect(block.getByRole('button',{name:'Chỉnh sửa sơ đồ'})).toBeVisible();
  const draft=await page.evaluate(k=>JSON.parse(localStorage.getItem('khoahoctienghan.editor-v2.draft.v2.'+k)||'null'),kind);
  const result=await buildDocument(draft.blocks);
  expect(result.body.content[0].type).toBe('articleFigure');
  expect([...result.assets.keys()].filter(k=>k.startsWith('public/media/studio/'))).toHaveLength(1);
  const source=[...result.assets.entries()].find(([k])=>k.startsWith('diagrams/editor-v2/'));
  expect(source?.[0]).toMatch(/^diagrams\/editor-v2\/[a-f0-9]{64}-[a-f0-9]{64}\.drawio$/);
  expect(Buffer.from(source![1],'base64').toString('utf8')).toEqual(blankDrawio);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 }
});
