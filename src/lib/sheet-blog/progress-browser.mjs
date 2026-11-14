import {queueClient,progressFor,stages} from './progress.mjs';
const github='https://github.com/duykhang68/khoahoctienghan',site='https://duykhang68.github.io/khoahoctienghan/';
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const link=(text,url)=>{const a=make('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a};
const receiptKey='kb.sheet-blog.public-submission-receipts.v1';
export function mountQueueProgress(root,{client=queueClient()}={}){
 if(!root)return {record(){},refresh(){}};
 const $=s=>root.querySelector(s),area=$('[data-progress-cards]'),stamp=$('[data-progress-status]'),button=$('[data-progress-refresh]');
 let rows=[],evidence={},busy=false,ready=false,error='',updated=null,again=false;
 const receipts=new Map(),valid=r=>r&&typeof r.title==='string'&&/^[a-f0-9]{64}$/.test(r.id||'')&&/^[a-f0-9]{40}$/.test(r.source||'');
 try{const x=JSON.parse(localStorage.getItem(receiptKey)||'[]');if(Array.isArray(x))for(const r of x)if(valid(r))receipts.set(r.id,{id:r.id,source:r.source,title:r.title.slice(0,180)})}catch{}
 function persist(){try{localStorage.setItem(receiptKey,JSON.stringify([...receipts.values()].slice(-50)))}catch{}}
 const confirmed=r=>progressFor(r).done===6;
 function render(){
  const accepted=new Set(rows.map(r=>r.id)),pending=[...receipts.values()].filter(r=>!accepted.has(r.id)),open=rows.filter(r=>!confirmed(r)),done=rows.filter(confirmed).reverse();
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
   rows=next;evidence=ev;ready=true;updated=new Date();error=partial?'Đã tải Issue; chưa lấy được chi tiết CI/CD':'';
   for(const r of next)receipts.delete(r.id);persist();
  }catch(e){error='Chưa thể cập nhật GitHub: '+String(e.message||'Lỗi mạng')}
  finally{busy=false;button.disabled=false;render();if(again){again=false;void refresh()}}
 }
 function record(result,title){const r={id:result.id,source:result.sha,title:String(title).slice(0,180)};if(valid(r)){receipts.set(r.id,r);persist();render()}void refresh()}
 button.addEventListener('click',()=>void refresh());render();void refresh();return {record,refresh};
}
