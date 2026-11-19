import {progressFor,stages} from './progress.mjs';
import {officeQueueClient} from './queue-client.mjs';
import {isConfirmedProgress,progressGroups} from './core/progress.mjs';
import {validReceipt,makeReceipt,readReceiptRows,putReceipt} from './core/local-receipts.mjs';
const github='https://github.com/duykhang68/khoahoctienghan',site='https://duykhang68.github.io/khoahoctienghan/';
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const link=(text,url)=>{const a=make('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a};
const receiptKey='kb.sheet-blog.public-submission-receipts.v1';
export function rememberPublicReceipt(result,title){
 const r=makeReceipt(result,title);
 if(!validReceipt(r))return false;
 try{const old=JSON.parse(localStorage.getItem(receiptKey)||'[]');const rows=readReceiptRows(old);localStorage.setItem(receiptKey,JSON.stringify(putReceipt(rows,r)));return true}catch{return false}
}
export function mountQueueProgress(root,{client=officeQueueClient(),showEvidence=false}={}){
 if(!root)return {record(){},refresh(){}};
 const $=s=>root.querySelector(s),area=$('[data-progress-cards]'),stamp=$('[data-progress-status]'),button=$('[data-progress-refresh]');
 let rows=[],evidence={},busy=false,ready=false,error='',updated=null,again=false;
 const receipts=new Map(),valid=validReceipt;
 try{const x=JSON.parse(localStorage.getItem(receiptKey)||'[]');for(const r of readReceiptRows(x))receipts.set(r.id,r)}catch{}
 function persist(){try{localStorage.setItem(receiptKey,JSON.stringify([...receipts.values()].slice(-50)))}catch{}}
 const confirmed=isConfirmedProgress;
 function render(){
  const {pending,open,done}=progressGroups(rows,receipts);
  $('[data-progress-queued]').textContent=ready?String(open.length):'—';$('[data-progress-done]').textContent=ready?String(done.length):'—';$('[data-progress-sent]').textContent=String(pending.length);
  area.replaceChildren();
  function card(row,index){
   const ev=evidence[row.number]||{},p=progressFor(row,ev),el=make('article',undefined,'sb-progress-card');el.dataset.progressTone=p.tone;el.dataset.issue=String(row.number||'pending');
   const header=make('div',undefined,'sb-progress-card-head'),copy=make('div');
   copy.append(make('small',row.number?'Issue #'+row.number+(index===0?' · Đầu hàng đợi':index>0?' · Vị trí '+(index+1):''):'Đã gửi commit · Chưa nhận Issue'),make('h3',row.title||'Bài gửi chưa có tiêu đề'));
   header.append(copy,make('strong',Math.floor(p.done/stages.length*100)+'%','sb-progress-number'));el.append(header);
   const bar=make('progress',undefined,'sb-progress-bar');bar.max=stages.length;bar.value=p.done;bar.setAttribute('aria-label','Đã hoàn thành '+p.done+' trên '+stages.length+' mốc');el.append(bar);
   const track=make('ol',undefined,'sb-progress-track');
   stages.forEach((name,i)=>{const state=i<p.done?'done':i===p.done?(p.tone==='blocked'?'blocked':'active'):'pending';const li=make('li');li.dataset.state=state;const dot=make('span',state==='done'?'✓':state==='blocked'?'!':String(i+1),'sb-progress-dot');dot.setAttribute('aria-hidden','true');li.append(dot,make('span',name));if(i===p.done)li.setAttribute('aria-current','step');track.append(li)});el.append(track);
   const foot=make('div',undefined,'sb-progress-foot');foot.append(make('strong',p.status,'sb-progress-current'),make('small',p.done+'/'+stages.length+' mốc hoàn thành'));
   if(showEvidence){const details=make('details',undefined,'pipeline-evidence');details.append(make('summary','Bằng chứng SHA / CI/CD'));for(const [label,value] of [['Submission SHA',row.source],['PR HEAD',row.head],['Base SHA',row.base],['Merge SHA',row.merge],['Verified release SHA',row.verified]]){if(value){const line=make('div');line.append(make('small',label),make('code',value));details.append(line)}}if(ev.staleHead)details.append(make('p','PR hiện tại không khớp marker FIFO; không tính CI PASS.'));foot.append(details);}
   if(row.sheetSync){const labels={PENDING:'Chờ ghi content id_vn',WAITING_CONFIG:'Chờ kết nối Google để ghi content id_vn',SYNCED:'Đã ghi commit ID vào content id_vn',BLOCKED:'Chưa ghi được content id_vn · Cần kiểm tra Issue'};foot.append(make('small',labels[row.sheetSync.status]))}
   const links=make('div',undefined,'sb-progress-links');links.append(link('Commit '+row.source.slice(0,7),github+'/commit/'+row.source));if(row.number)links.append(link('Issue #'+row.number,github+'/issues/'+row.number));if(row.pr)links.append(link('PR #'+row.pr,github+'/pull/'+row.pr));
   const run=ev.ci||ev.cd;if(Number.isSafeInteger(run?.id)&&run.id>0)links.append(link('CI/CD',github+'/actions/runs/'+run.id));if(p.done===6&&row.route)links.append(link('Mở bài đã đăng',site+row.route));foot.append(links);el.append(foot);return el;
  }
  open.forEach((r,i)=>area.append(card(r,i)));pending.forEach(r=>area.append(card(r,-1)));
  if(!open.length&&!pending.length&&ready&&!error)area.append(make('p','Hiện không có bài đang chờ trong FIFO.','sb-progress-empty'));
  if(!ready&&!pending.length)area.append(make('p','Chưa có dữ liệu hàng đợi. Nhấn Cập nhật tiến độ.','sb-progress-empty'));
  if(done.length){const history=make('details',undefined,'sb-progress-history');history.append(make('summary','Đã xác minh ('+done.length+') · 10 bài gần nhất'));done.slice(0,10).forEach(r=>history.append(card(r,-1)));area.append(history)}
  const time=updated?' · '+new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Ho_Chi_Minh'}).format(updated)+' GMT+7':'';
  stamp.textContent=busy?'Đang đọc trạng thái GitHub…':error?error+(ready?' · Dữ liệu lần cập nhật trước'+time:''):ready?'Đã cập nhật'+time:'Chưa cập nhật';
 }
 async function refresh(){
  if(busy){again=true;return}busy=true;button.disabled=true;render();
  try{const next=await client.list(),ev={};const head=next.find(r=>!confirmed(r));let partial=false;
   if(head)try{ev[head.number]=await client.evidence(head)}catch{partial=true}
   const info=client.info?.();rows=next;evidence=ev;ready=true;updated=info?.updatedAt?new Date(info.updatedAt):new Date();
   error=info?.stale?'GitHub đang giới hạn API · Dùng bản chụp gần nhất':partial?'Đã tải Issue; chưa lấy được chi tiết CI/CD':info?.fromCache?'Bản chụp GitHub được lưu đệm':'';
   for(const r of next)receipts.delete(r.id);persist();
  }catch(e){error='Chưa thể cập nhật GitHub: '+String(e.message||'Lỗi mạng')}
  finally{busy=false;button.disabled=false;render();if(again){again=false;void refresh()}}
 }
 function record(result,title){const r=makeReceipt(result,title);if(valid(r)){receipts.set(r.id,r);persist();render()}void refresh()}
 button.addEventListener('click',()=>void refresh());render();void refresh();return {record,refresh};
}
