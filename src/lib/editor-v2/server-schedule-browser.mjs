import {draftKey,validateCopy,listCopies,vietnamTime} from './draft-schedule.mjs';
import {slugify} from './model.mjs';
const $=id=>document.getElementById('server-schedule-'+id),prefix='/admin/api/schedules/',fmt=ms=>new Date(ms).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour12:false})+' GMT+7';
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
const target=d=>(d.kind==='tech'?'techblog':d.category)+'/'+slugify(d.title)+'/';
let snapshot=null,ready=false,busy=false;
const update=()=>{$('save').disabled=busy||!ready||!snapshot||!$('consent').checked||!$('due').value;$('load').disabled=busy;$('refresh').disabled=busy};
const note=msg=>$('result').textContent=msg;
const clear=()=>{snapshot=null;$('preview').hidden=true;$('preview').replaceChildren();$('consent').checked=false;update()};
const labels={scheduled:'Đã đặt lịch',sending:'Đang gửi',retry:'Chờ thử lại tự động',awaiting_issue:'Đã gửi GitHub · Chờ Issue',submitted:'FIFO đã tiếp nhận · Chưa xác minh production',blocked:'Bị chặn · Kiểm tra trước khi thử lại',cancelled:'Đã hủy'};
async function apiCall(body){
 const response=await fetch(prefix,{method:body?'POST':'GET',cache:'no-store',redirect:'error',credentials:'same-origin',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Không thể truy cập lịch');return data;
}
async function refresh(){
 try{
  const state=await apiCall();ready=state.ready===true;
  $('health').textContent=ready?'Cron đã chạy · '+fmt(state.lastTick)+' · xác thực GitHub khi gửi':state.configured?'Chưa nhận heartbeat Cron gần đây; chưa cho đặt lịch.':'Chưa cấu hình đầy đủ Scheduler máy chủ · lịch trên thiết bị vẫn riêng biệt.';
  $('list').replaceChildren();for(const row of state.jobs||[]){
   const a=el('article');a.dataset.state=row.state;a.append(el('h3',row.title),el('p',fmt(row.due_at)),el('p',labels[row.state]||'Không xác định'),el('small','/'+row.route+' · Lượt gửi '+row.attempts));
   if(row.error_code)a.append(el('p','Mã trạng thái: '+row.error_code));
   if(Number.isSafeInteger(row.issue_number)&&row.issue_number>0){const link=el('a','Issue #'+row.issue_number);link.href='https://github.com/duykhang68/khoahoctienghan/issues/'+row.issue_number;link.target='_blank';link.rel='noopener noreferrer';a.append(link)}
   const action=row.state==='scheduled'&&row.attempts===0?'cancel':row.state==='blocked'&&ready?'retry':null;
   if(action){const btn=el('button',action==='cancel'?'Hủy lịch chưa gửi':'Thử lại cùng snapshot');btn.type='button';btn.addEventListener('click',async()=>{if(busy||!confirm(action==='cancel'?'Hủy lịch trước khi gửi?':'Xác nhận thử lại đúng bản sao đã duyệt; kiểm tra Pipeline và xử lý nguyên nhân trước.'))return;busy=true;update();try{await apiCall({action,id:row.id,consent:true});note('Đã cập nhật lịch máy chủ.');await refresh()}catch(e){note(e.message)}finally{busy=false;update()}});a.append(btn)}
   $('list').append(a);
  }
  if(!$('list').children.length)$('list').append(el('p','Chưa có lịch máy chủ.'));
 }catch{ready=false;$('health').textContent='Không đọc được lịch máy chủ; dữ liệu trước có thể đã cũ.'}finally{update()}
}
$('workspace').addEventListener('change',clear);
$('load').addEventListener('click',()=>{clear();try{const d=validateCopy(JSON.parse(localStorage.getItem(draftKey($('workspace').value))||'null'));snapshot=d;$('preview').append(el('h3',d.title),el('p',target(d)),el('p',d.summary),el('small',d.blocks.length+' khối · Bản sao cố định, không tự cập nhật khi sửa Editor.'));$('preview').hidden=false;note('Kiểm tra nội dung trong Editor trước khi xác nhận.')}catch(e){note(e.message)}update()});
$('consent').addEventListener('change',update);$('due').addEventListener('input',update);
$('save').addEventListener('click',async()=>{if(!ready||!snapshot||busy||!$('consent').checked)return;busy=true;update();try{
 const local=await listCopies();if(local.some(row=>['scheduled','sending','retry'].includes(row.state)&&target(row.draft)===target(snapshot)))throw Error('Bài này có lịch trên thiết bị. Hãy hủy lịch đó trước khi chuyển sang máy chủ.');
 const raw=$('due').value,dueLocal=raw.length===16?raw+':00':raw;if(vietnamTime(dueLocal)<=Date.now())throw Error('Chọn thời điểm trong tương lai.');
 await apiCall({action:'create',draft:snapshot,dueLocal,consent:true});clear();note('Đã lưu lịch riêng tư trên máy chủ. Có thể đóng trình duyệt.');await refresh();
 }catch(e){note('Chưa xác nhận lưu lịch: '+e.message+' · Cập nhật danh sách trước khi thử lại.')}finally{busy=false;update()}});
$('refresh').addEventListener('click',()=>{if(!busy)void refresh()});update();void refresh();
