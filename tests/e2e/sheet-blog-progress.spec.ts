import {test,expect} from '@playwright/test';
import {parseQueueIssue,progressFor,queueClient} from '../../src/lib/sheet-blog/progress.mjs';
const repo='duykhang68/khoahoctienghan',source='a'.repeat(40),head='b'.repeat(40),base='c'.repeat(40),merge='d'.repeat(40);
function issue(number,phase,extra={},closed=false,detail='QUEUED — Chờ đến lượt'){return {number,title:'[Editor V2] Bài '+number,state:closed?'closed':'open',user:{login:'github-actions[bot]'},body:'<!-- editor-v2-fifo:'+JSON.stringify({id:number.toString(16).padStart(64,'0'),source,phase,...extra})+' -->\n\n**Trạng thái:** '+detail}}
test('progress never confuses merge or deploy with verified production',()=>{
 const parse=x=>parseQueueIssue(x)!;
 expect(progressFor(parse(issue(1,'QUEUED'))).done).toBe(2);
 expect(progressFor(parse(issue(1,'WAITING_CI',{head,base,pr:15})),{ci:{status:'completed',conclusion:'success'}}).done).toBe(3);
 expect(progressFor(parse(issue(1,'WAITING_CI',{},false,'BLOCKED — CI failed'))).tone).toBe('blocked');
 const m=parse(issue(1,'MERGED',{merge,pr:15,route:'ngon-ngu/bai-1/'}));
 expect(progressFor(m).done).toBe(4);
 expect(progressFor(m,{deploy:{status:'completed',conclusion:'success'}}).done).toBe(5);
 expect(progressFor(parse(issue(1,'VERIFIED',{merge,verified:merge,pr:15,route:'ngon-ngu/bai-1/'}))).done).not.toBe(6);
 expect(progressFor(parse(issue(1,'VERIFIED',{merge,verified:merge,pr:15,route:'ngon-ngu/bai-1/'},true))).done).toBe(6);
 expect(parseQueueIssue({...issue(1,'QUEUED'),user:{login:'someone'}})).toBeNull();
});
test('CI evidence rejects unrelated SHA',async()=>{
 const c=queueClient(async()=>new Response(JSON.stringify({workflow_runs:[{id:1,head_sha:'e'.repeat(40),head_repository:{full_name:repo},head_branch:'content/editor-fifo-1-'+base.slice(0,12),event:'pull_request',status:'completed',conclusion:'success'}]}),{status:200}));
 expect((await c.evidence(parseQueueIssue(issue(1,'WAITING_CI',{head,base,pr:15})))).ci).toBeUndefined();
});
test('progress dashboard orders FIFO, updates stages and preserves stale snapshot on errors',async({page})=>{
 let phase='WAITING_CI',fail=false;
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
 await page.route('https://api.github.com/**',route=>{
  const u=new URL(route.request().url());expect(route.request().method()).toBe('GET');expect(route.request().headers()['authorization']).toBeUndefined();
  if(fail)return route.fulfill({status:403,json:{}});
  if(u.pathname.endsWith('/issues'))return route.fulfill({json:[issue(12,'QUEUED'),issue(11,phase,{head,base,pr:15,merge,verified:merge,route:'ngon-ngu/bai-11/'},phase==='VERIFIED'),{...issue(10,'QUEUED'),user:{login:'other'}}]});
  if(u.pathname.endsWith('/ci.yml/runs'))return route.fulfill({json:{workflow_runs:[{id:123,head_sha:head,head_repository:{full_name:repo},head_branch:'content/editor-fifo-11-'+base.slice(0,12),event:'pull_request',status:'in_progress'}]}});
  if(u.pathname.endsWith('/release.yml/runs'))return route.fulfill({json:{workflow_runs:[{id:124,head_sha:merge,head_repository:{full_name:repo},head_branch:'main',event:'workflow_run',status:'in_progress'}]}});
  if(u.pathname.endsWith('/actions/runs/124/jobs'))return route.fulfill({json:{jobs:[{name:'deploy',status:'completed',conclusion:'success'}]}});
  throw Error('Unexpected '+u.pathname);
 });
 await page.goto('./viet-blog-by-google-sheet/');
 const section=page.locator('[data-queue-progress]'),first=section.locator('[data-issue="11"]'),refresh=section.getByRole('button',{name:'Cập nhật tiến độ'});
 await expect(section.getByRole('heading',{name:'Thanh Tiến độ'})).toBeVisible();
 await expect(first.locator('.sb-progress-current')).toHaveText('CI / Build đang chạy');
 await expect(section.locator('.sb-progress-card').first()).toHaveAttribute('data-issue','11');
 await expect(section.locator('[data-progress-queued]')).toHaveText('2');
 await expect(first.locator('progress')).toHaveJSProperty('value',2);
 phase='MERGED';await refresh.click();await expect(first.locator('progress')).toHaveJSProperty('value',5);
 phase='VERIFIED';await refresh.click();await expect(section.locator('[data-progress-done]')).toHaveText('1');
 await section.locator('summary').click();await expect(first.locator('progress')).toHaveJSProperty('value',6);
 await expect(first.getByRole('link',{name:'Mở bài đã đăng'})).toBeVisible();
 fail=true;await refresh.click();await expect(section.locator('[data-progress-status]')).toContainText('Dữ liệu lần cập nhật trước');
 await expect(section.locator('[data-progress-done]')).toHaveText('1');
 await page.setViewportSize({width:375,height:812});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});
