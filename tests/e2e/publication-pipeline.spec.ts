import {expect} from '@playwright/test';
import {test} from './private-office-fixture';
import {parseQueueIssue} from '../../src/lib/sheet-blog/progress.mjs';
const repo='duykhang68/khoahoctienghan',source='a'.repeat(40),head='b'.repeat(40),base='c'.repeat(40),merge='d'.repeat(40);
const branch='content/editor-fifo-11-'+base.slice(0,12);
function issue(n,phase,closed=false){return {number:n,title:'[Editor V2] Bài '+n,state:closed?'closed':'open',user:{login:'github-actions[bot]'},body:'<!-- editor-v2-fifo:'+JSON.stringify({id:n.toString(16).padStart(64,'0'),source,phase,head,base,pr:15,merge,verified:merge,route:'ngon-ngu/bai-11/',sheetSync:{status:'PENDING'}})+' -->'};}
test('P1.8 pipeline checks exact current PR HEAD/base and only trusted closed receipt gives 100%',async({page,office})=>{
 let current='e'.repeat(40),phase='WAITING_CI',fail=false;let ciReads=0;
 await page.route(office+'/admin/api/publication-progress/',route=>{
  if(fail)return route.fulfill({status:503,json:{error:'PUBLICATION_PROGRESS_UNAVAILABLE'}});
  const rows=[issue(12,'QUEUED'),issue(11,phase,phase==='VERIFIED'),{...issue(10,'QUEUED'),user:{login:'other'}}].map(parseQueueIssue).filter(Boolean);
  const evidence={};
  if(phase==='WAITING_CI'){
   if(current!==head)evidence[11]={staleHead:true};
   else{ciReads++;evidence[11]={ci:{id:123,status:'completed',conclusion:'success'}};}
  }else if(phase==='MERGED')evidence[11]={deploy:{status:'completed',conclusion:'success'}};
  return route.fulfill({json:{rows,evidence,updatedAt:new Date().toISOString(),stale:false}});
 });
 await page.goto(office+'/admin/pipeline/');const section=page.locator('[data-queue-progress]'),first=section.locator('[data-issue="11"]'),refresh=section.getByRole('button',{name:'Cập nhật tiến độ'});
 await expect(first.locator('.sb-progress-current')).toContainText('HEAD hoặc base đã đổi');expect(ciReads).toBe(0);await expect(first.locator('progress')).toHaveJSProperty('value',2);
 current=head;await refresh.click();await expect(first.locator('progress')).toHaveJSProperty('value',3);expect(ciReads).toBe(1);
 await first.getByText('Bằng chứng SHA / CI/CD',{exact:true}).click();await expect(first.locator('code').filter({hasText:head})).toBeVisible();
 phase='MERGED';await refresh.click();await expect(first.locator('progress')).toHaveJSProperty('value',5);
 phase='VERIFIED';await refresh.click();await expect(section.locator('[data-progress-done]')).toHaveText('1');await section.locator('.sb-progress-history summary').first().click();await expect(first.locator('progress')).toHaveJSProperty('value',6);
 fail=true;await refresh.click();await expect(section.locator('[data-progress-status]')).toContainText('Dữ liệu lần cập nhật trước');await expect(section.locator('[data-progress-done]')).toHaveText('1');await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});