import {expect} from '@playwright/test';
import {test} from './private-office-fixture';
import {buildDocument,inlineRuns,toggleInline} from '../../src/lib/editor-v2/model.mjs';
test('P1.2 formats selected Vietnamese and Korean text and preserves it through preview, reload and export/import',async({page,office})=>{
 await page.goto(office+'/admin/editor/');
 const input=page.getByRole('textbox',{name:'Đoạn văn 1',exact:true});
 const value='Xin chào 한글 và tiếng Việt';await input.fill(value);
 await input.evaluate(el=>{const r=document.createRange();r.setStart(el.firstChild!,0);r.setEnd(el.firstChild!,8);const s=getSelection()!;s.removeAllRanges();s.addRange(r);});
 await page.getByRole('button',{name:'Định dạng bold Đoạn văn 1'}).click();
 await expect(input.locator('strong')).toHaveText('Xin chào');
 await page.getByRole('button',{name:'Xem trước',exact:true}).click();
 await expect(page.locator('[data-preview-body] strong')).toHaveText('Xin chào');await expect(page.locator('[data-preview-body] p')).toHaveText(value);
 await page.reload();await expect(input.locator('strong')).toHaveText('Xin chào');
 const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('khoahoctienghan.editor-v2.draft.v2.tech')!));
 expect(draft.blocks[0].text).toBe(value);const doc=await buildDocument(draft.blocks);expect(doc.body.content[0].content[0]).toEqual({type:'text',text:'Xin chào',marks:[{type:'bold'}]});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Lưu bản sao'}).click();await download;
 page.on('dialog',d=>d.accept());await page.locator('[data-restore]').setInputFiles({name:'draft.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(draft))});await expect(page.locator('[data-restore-status]')).toHaveText('Đã nhập bản nháp.');await expect(input.locator('strong')).toHaveText('Xin chào');
 await expect(page.locator('[data-publish]')).toBeDisabled();
});
test('P1.2 inline model preserves legacy marks, overlapping marks and list line breaks',async()=>{
 const legacy={kind:'paragraph',text:'abc',marks:['italic']};
 expect(inlineRuns(legacy)).toEqual([{text:'abc',marks:['italic']}]);
 const text='ab\ncd',runs=toggleInline([{text,marks:[]}],1,4,'bold');
 const doc=await buildDocument([{kind:'bullet',text,runs,marks:[]}]);expect(doc.body.content[0].content.map(x=>x.content[0].content)).toEqual([[{type:'text',text:'a'},{type:'text',text:'b',marks:[{type:'bold'}]}],[{type:'text',text:'c',marks:[{type:'bold'}]},{type:'text',text:'d'}]]);
 const mixed=toggleInline(runs,0,2,'italic');expect(mixed.map(x=>x.text).join('')).toBe(text);
 await expect(buildDocument([{kind:'paragraph',text:'safe',runs:[{text:'wrong',marks:['bold']}]}])).rejects.toThrow();
 await expect(buildDocument([{kind:'paragraph',text:'safe',runs:[{text:'safe',marks:['script']}]}])).rejects.toThrow();
});