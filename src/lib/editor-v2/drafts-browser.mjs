import {draftKey,vietnamTime,validateCopy,dueRows,listCopies,getCopy,putCopy,deleteCopy,saveCopy,withDraftLock} from './draft-schedule.mjs';
import {githubClient} from './github.mjs';
import {buildDocument,metadata,slugify} from './model.mjs';
const by=id=>document.getElementById(id),el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};
const status=by('draft-status'),list=by('draft-list');
const topicIds=JSON.parse(by('drafts-root').dataset.topics);
const fmt=ms=>new Date(ms).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour12:false})+' GMT+7';
let client=null,selected=null,busy=false,rows=[];
function note(s){status.textContent=s;}
function btn(text,action){const b=el('button',text);b.type='button';b.disabled=busy;b.addEventListener('click',action);return b;}
async function refresh(){rows=(await listCopies()).sort((a,b)=>b.createdAt-a.createdAt);render();}
function render(){
 list.replaceChildren();if(!rows.length)list.append(el('p','Chưa có bản sao riêng tư.'));
 for(const row of rows){const card=el('article');card.className='draft-card';card.dataset.id=row.id;card.dataset.state=row.state;card.append(el('small',row.draft.kind==='tech'?'Tech Blog':'Knowledge Base'),el('h3',row.draft.title),el('p','Lưu: '+fmt(row.createdAt)));const state=({draft:'Bản nháp',scheduled:'Đã đặt lịch',sending:'Đã bắt đầu gửi · cần kiểm tra khi phiên bị gián đoạn',retry:'Gửi chưa xác nhận · cần thử lại',submitted:'Đã gửi FIFO · chưa xác minh production',cancelled:'Đã hủy lịch'})[row.state]||'Không xác định';card.append(el('p',state+(row.dueAt!=null?' · '+fmt(row.dueAt):'')));
 if(row.state==='submitted'&&/^[a-f0-9]{40}$/.test(row.receipt?.sha||'')){const link=el('a','Xem commit đã gửi');link.href='https://github.com/duykhang68/khoahoctienghan/commit/'+row.receipt.sha;link.target='_blank';link.rel='noopener noreferrer';card.append(link)}
 const actions=el('div');actions.className='draft-actions';
 actions.append(btn('Mở bản sao trong Editor',()=>restore(row.id)));
 if(['draft','cancelled'].includes(row.state)){actions.append(btn('Đặt lịch',()=>select(row.id)));actions.append(btn('Xóa bản sao trên thiết bị',()=>remove(row.id)))}
 if(row.state==='scheduled'&&!row.attempted)actions.append(btn('Hủy lịch',()=>cancel(row.id)));
 if(['sending','retry'].includes(row.state))actions.append(btn('Cho phép thử lại cùng bản sao',()=>retry(row.id)));
 if(row.state==='submitted')actions.append(btn('Xóa bản sao trên thiết bị',()=>remove(row.id)));
 card.append(actions);list.append(card);
 }
 by('draft-connect').disabled=busy;by('draft-capture').disabled=busy;by('draft-check').disabled=busy;by('draft-arm').disabled=busy||!selected;
}
async function action(fn){if(busy)return;busy=true;render();try{await withDraftLock(fn)}catch(e){note(String(e.message||e))}finally{busy=false;try{await refresh()}catch(e){note('Không đọc được kho bản nháp. '+e.message)}}}
function readCurrent(kind){const raw=localStorage.getItem(draftKey(kind));return raw?JSON.parse(raw):null;}
by('draft-capture').addEventListener('click',()=>action(async()=>{const draft=readCurrent(by('draft-workspace').value);await saveCopy(draft);note('Đã lưu bản sao riêng tư trên thiết bị. Chưa gửi GitHub.');}));
function select(id){selected=id;const row=rows.find(r=>r.id===id);by('draft-selected').textContent=row?.draft.title||'';by('draft-due').value='';by('draft-consent').checked=false;by('draft-schedule-panel').hidden=false;render();by('draft-due').focus();}
by('draft-arm').addEventListener('click',()=>action(async()=>{
 const row=await getCopy(selected);if(!row||!['draft','cancelled'].includes(row.state))throw Error('Bản sao không thể đặt lịch.');
 if(!by('draft-consent').checked)throw Error('Cần đồng ý rõ ràng cho bản sao này.');
 const raw=by('draft-due').value;const dueAt=vietnamTime(raw.length===16?raw+':00':raw);
 if(dueAt<=Date.now())throw Error('Chọn thời điểm trong tương lai.');
 const d=validateCopy(row.draft);if(!slugify(d.title)||['index','editorv2'].includes(slugify(d.title))||(d.kind==='knowledge'&&!topicIds.includes(d.category))||d.summary.length>500)throw Error('Kiểm tra metadata bài viết.');
 metadata(d);await buildDocument(d.blocks);
 // Lock the immutable snapshot; later editor changes never alter this schedule.
 await putCopy({...row,draft:d,state:'scheduled',dueAt,consentedAt:Date.now(),attempted:false,receipt:null});
 selected=null;by('draft-schedule-panel').hidden=true;by('draft-consent').checked=false;note('Đã đặt lịch riêng tư. Chưa có nội dung gửi công khai.');
}));
function cancel(id){void action(async()=>{const row=await getCopy(id);if(!row||row.state!=='scheduled'||row.attempted)throw Error('Đã bắt đầu gửi, không thể hủy an toàn.');if(!confirm('Hủy lịch gửi bản sao này?'))return;await putCopy({...row,state:'cancelled',dueAt:null,consentedAt:null});note('Đã hủy lịch; vẫn giữ bản nháp.');});}
function remove(id){void action(async()=>{const row=await getCopy(id);if(!row||!['draft','cancelled','submitted'].includes(row.state))throw Error('Không xóa lịch chưa xác nhận.');if(!confirm('Xóa bản sao lưu trên thiết bị? Không xóa bài công khai.'))return;await deleteCopy(id);note('Đã xóa bản sao trên thiết bị.');});}
function restore(id){void action(async()=>{const row=await getCopy(id);if(!row)throw Error('Không tìm thấy bản sao.');if(!confirm('Mở bản sao này? Hãy đóng các tab Editor khác. Bản đang soạn sẽ được sao lưu trước khi thay thế.'))return;
 const current=readCurrent(row.draft.kind);if(current&&current.title?.trim())await saveCopy(current);
 else if(current&&current.blocks?.some(b=>String(b.text||'').trim()||b.src))throw Error('Bài đang soạn chưa có tiêu đề; đặt tên và lưu trước.');
 localStorage.setItem(draftKey(row.draft.kind),JSON.stringify(validateCopy(row.draft)));location.assign('/admin/editor/#workspace='+row.draft.kind);
 });}
function retry(id){void action(async()=>{const row=await getCopy(id);if(!row||!['sending','retry'].includes(row.state)||!row.consentedAt)throw Error('Không có lượt gửi cần thử lại.');if(!confirm('Thử gửi lại cùng bản sao bất biến? Hệ thống giữ cùng mã nội dung FIFO, không tạo bài trùng.'))return;await putCopy({...row,state:'scheduled'});note('Đã cho phép thử lại; cần kết nối GitHub và phiên Back Office còn hiệu lực.');});}
by('draft-connect').addEventListener('click',async()=>{if(busy)return;if(client){client=null;by('draft-connect').textContent='Kết nối GitHub';note('Đã ngắt GitHub. Không tự gửi lịch.');return}const input=by('draft-token'),token=input.value.trim();input.value='';if(!token.startsWith('github'+'_pat_')){note('Cần fine-grained PAT hợp lệ.');return}busy=true;render();try{const candidate=githubClient(token);await candidate.verify();client=candidate;by('draft-connect').textContent='Ngắt GitHub';note('Đã kết nối trong tab này. Lịch đủ điều kiện có thể gửi FIFO.');}catch(e){note(e.message)}finally{busy=false;render()}});
async function check(){
 if(busy||!client||document.hidden)return;
 await action(async()=>{const due=dueRows(await listCopies());if(!due.length)return;const row=due[0];
 if(row.state!=='scheduled'){note('Lịch đầu tiên gửi chưa xác nhận; xử lý thử lại trước khi gửi lịch tiếp theo.');return}
 if(!row.consentedAt||!row.dueAt){note('Lịch thiếu xác nhận. Không gửi.');return}
 // Revalidate private session before any network publication; no login impersonation.
 const auth=await fetch('/admin/drafts/',{method:'HEAD',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!auth.ok){client=null;by('draft-connect').textContent='Kết nối GitHub';note('Phiên Back Office đã hết hạn. Đăng nhập lại trước khi gửi.');return}
 if(document.hidden||!client)return;
 await putCopy({...row,state:'sending',attempted:true});note('Đang gửi bản sao đã xác nhận vào FIFO…');
 try{const result=await client.publish(row.draft,topicIds);await putCopy({...row,state:'submitted',attempted:true,receipt:{sha:result.sha,id:result.id,route:result.route}});note('Đã gửi vào FIFO. Chưa xác minh production.');}
 catch(e){await putCopy({...row,state:'retry',attempted:true});note('Chưa xác nhận gửi FIFO. Không tự lặp lại: '+e.message);}
 });
}
by('draft-check').addEventListener('click',()=>{if(!client){note('Kết nối GitHub trước khi kiểm tra lịch.');return}void check()});
window.addEventListener('pagehide',()=>{client=null});document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check()});
setInterval(()=>{if(!document.hidden)void check()},30000);
refresh().catch(e=>note('Không mở được IndexedDB: '+e.message));
