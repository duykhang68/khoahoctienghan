import {courseEscape} from '../course/common.mjs';

function curriculumBrowser(){
 const root=document.getElementById('curriculum-list'),status=document.getElementById('curriculum-status'),save=document.getElementById('curriculum-save'),add=document.getElementById('curriculum-add'),state=JSON.parse(document.getElementById('curriculum-state').value);
 let chapters=state.chapters,version=state.version,dirty=false,busy=false,drag=null;
 const el=(tag,label)=>{const node=document.createElement(tag);if(label!==undefined)node.textContent=label;return node;};
 const report=(message,kind='info')=>{status.textContent=message;status.dataset.state=kind;};
 const changed=()=>{dirty=true;save.disabled=busy;report('Có thay đổi chưa lưu. Nhấn Lưu giáo trình.','dirty');};
 const button=(label,fn,disabled=false)=>{const b=el('button',label);b.type='button';b.disabled=disabled;b.addEventListener('click',fn);return b;};
 const move=(list,from,to)=>{if(from===to||from<0||to<0||to>=list.length)return;list.splice(to,0,list.splice(from,1)[0]);changed();render();};
 function input(node,label){const x=el('input');x.value=node.title;x.maxLength=200;x.required=true;x.setAttribute('aria-label',label);x.addEventListener('input',()=>{node.title=x.value;changed();});return x;}
 function dnd(node,kind,list,index,parent){
  const handle=el('span','⠿');handle.className='cb-handle';handle.draggable=true;handle.title='Kéo để sắp xếp';handle.setAttribute('aria-hidden','true');
  handle.addEventListener('dragstart',e=>{drag={kind,list,index,parent};e.dataTransfer.setData('text/plain','curriculum');e.dataTransfer.effectAllowed='move';});
  handle.addEventListener('dragend',()=>{drag=null;});
  node.addEventListener('dragover',e=>{if(drag?.kind===kind){e.preventDefault();e.stopPropagation();}});
  node.addEventListener('drop',e=>{if(drag?.kind!==kind)return;e.preventDefault();e.stopPropagation();const from=drag;drag=null;if(from.list===list)move(list,from.index,index);else if(kind==='lesson'){list.splice(index,0,from.list.splice(from.index,1)[0]);changed();render();}});
  node.prepend(handle);
 }
 function render(){root.replaceChildren();if(!chapters.length)root.append(el('p','Chưa có chương. Thêm chương đầu tiên để bắt đầu.'));
  chapters.forEach((ch,ci)=>{const section=el('section');section.className='cb-chapter';const head=el('div');head.className='cb-row';head.append(el('strong','Chương '+(ci+1)),input(ch,'Tên chương '+(ci+1)),button('Lên',()=>move(chapters,ci,ci-1),ci===0),button('Xuống',()=>move(chapters,ci,ci+1),ci===chapters.length-1));dnd(head,'chapter',chapters,ci);section.append(head);
   const list=el('div');list.className='cb-lessons';ch.lessons.forEach((lesson,li)=>{const row=el('div');row.className='cb-row cb-lesson';row.append(el('span','Bài '+(li+1)),input(lesson,'Tên bài '+(ci+1)+'.'+(li+1)),button('Lên',()=>move(ch.lessons,li,li-1),li===0),button('Xuống',()=>move(ch.lessons,li,li+1),li===ch.lessons.length-1));const target=el('select');target.setAttribute('aria-label','Chuyển bài sang chương');chapters.forEach((c,i)=>{const opt=el('option','Chương '+(i+1));opt.value=c.id;opt.selected=c.id===ch.id;target.append(opt);});target.addEventListener('change',()=>{const dest=chapters.find(c=>c.id===target.value);if(dest&&dest!==ch){dest.lessons.push(ch.lessons.splice(li,1)[0]);changed();render();}});row.append(target);const editor=el('a','Soạn bài');editor.href='/admin/courses/'+state.id+'/lessons/'+lesson.id+'/';editor.addEventListener('click',e=>{if(dirty){e.preventDefault();status.textContent='Lưu giáo trình trước khi mở trình soạn bài.';}});row.append(editor);dnd(row,'lesson',ch.lessons,li,ch.id);list.append(row);});section.append(list,button('+ Thêm bài học',()=>{if(chapters.reduce((n,c)=>n+c.lessons.length,0)>=500){status.textContent='Đã đạt giới hạn 500 bài.';return;}ch.lessons.push({id:crypto.randomUUID(),title:'Bài học mới'});changed();render();}));root.append(section);});
 }
 add.addEventListener('click',()=>{if(chapters.length>=100){status.textContent='Đã đạt giới hạn 100 chương.';return;}chapters.push({id:crypto.randomUUID(),title:'Chương mới',lessons:[]});changed();render();});
 save.addEventListener('click',async()=>{
  if(busy)return;if(!dirty){report('Không còn thay đổi cần lưu.','info');return;}
  if([...root.querySelectorAll('input')].some(x=>!x.value.trim())){report('Vui lòng nhập đầy đủ tên chương và bài.','error');return;}
  busy=true;save.disabled=true;add.disabled=true;root.inert=true;save.textContent='Đang lưu…';report('Đang lưu giáo trình…','loading');
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);
  try{
   const res=await fetch(location.pathname,{method:'POST',credentials:'same-origin',redirect:'error',signal:abort.signal,headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({version,chapters})});
   if(!res.ok){const message=(await res.text()).slice(0,180);if(res.status===403)throw Error('Phiên quản trị hoặc xác thực không còn hợp lệ (403). Mở trang quản trị trong tab khác để đăng nhập lại.');throw Error('Lưu thất bại ('+res.status+'): '+message);}
   if(!res.headers.get('Content-Type')?.includes('application/json'))throw Error('Phản hồi lưu không hợp lệ. Chưa xác nhận đã lưu.');
   const result=await res.json();if(result.version!==version+1)throw Error('Không xác nhận được phiên bản đã lưu. Kiểm tra lại trong tab khác.');
   version=result.version;dirty=false;report('Đã lưu giáo trình · Phiên bản '+version+'.','success');
  }catch(e){report(e.name==='AbortError'?'Hết thời gian chờ. Kiểm tra giáo trình trong tab khác trước khi thử lại.':e.message||'Không lưu được giáo trình.','error');}
  finally{clearTimeout(timer);busy=false;save.textContent='Lưu giáo trình';save.disabled=!dirty;add.disabled=false;root.inert=false;}
 });
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});render();add.disabled=false;report(chapters.length?'Giáo trình đã tải. Chỉnh sửa để bật nút lưu.':'Thêm chương hoặc bài học để bật nút lưu.','info');
}
function curriculumPage(state,nonce){
 const esc=courseEscape;
 const top='<nav><a href="/admin/courses/manage/">Quản lý khóa học</a></nav><p>P2.3 · CURRICULUM BUILDER</p><h1>'+esc(state.title)+'</h1>';
 if(state.status!=='draft')return top+'<p>Chỉ bản nháp mới được chỉnh sửa giáo trình.</p>';
 return top+'<style>main{max-width:1100px}.cb-chapter{background:#eee8fc;border-radius:16px;padding:16px;margin:16px 0}.cb-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:8px 0}.cb-row input{flex:1 1 180px;min-width:0;max-width:100%;font:inherit;padding:10px;border:1px solid #94a3b8;border-radius:8px}.cb-row button,.cb-row select,#curriculum-add,#curriculum-save,.cb-chapter>button{min-height:44px;font:inherit}#curriculum-save:disabled,#curriculum-add:disabled{opacity:.48;cursor:not-allowed}#curriculum-status{padding:10px 12px;border-radius:8px;background:#e7edf8}#curriculum-status[data-state=error]{background:#fee2e2;color:#991b1b}#curriculum-status[data-state=success]{background:#dcfce7;color:#166534}#curriculum-status[data-state=dirty]{background:#fef3c7;color:#854d0e}.cb-lesson{background:#fff;border-radius:10px;padding:10px}.cb-lessons{padding-inline-start:12px}.cb-handle{cursor:grab;font-size:24px;user-select:none}.cb-actions{display:flex;gap:10px;flex-wrap:wrap}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #2563eb;outline-offset:2px}</style><p>Kéo tay nắm hoặc dùng nút Lên/Xuống. Chuyển bài giữa các chương bằng danh sách chọn.</p><div class="cb-actions"><button type="button" id="curriculum-add" disabled>+ Thêm chương</button><button type="button" id="curriculum-save" disabled>Lưu giáo trình</button></div><p id="curriculum-status" role="status" aria-live="polite">Đang khởi tạo trình soạn thảo. Nếu thông báo không đổi, hãy tải lại trang.</p><div id="curriculum-list"></div><textarea hidden id="curriculum-state">'+esc(JSON.stringify(state))+'</textarea><script nonce="'+nonce+'">('+curriculumBrowser.toString()+')();</script>';
}



export {curriculumPage};
