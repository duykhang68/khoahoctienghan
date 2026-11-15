import {courseEscape} from '../course/common.mjs';

function curriculumBrowser(){
 const root=document.getElementById('curriculum-list'),status=document.getElementById('curriculum-status'),save=document.getElementById('curriculum-save'),add=document.getElementById('curriculum-add'),state=JSON.parse(document.getElementById('curriculum-state').value);
 const openAll=document.getElementById('cb-open-all'),closeAll=document.getElementById('cb-close-all'),collapsed=new Set();
 let chapters=state.chapters,version=state.version,dirty=false,busy=false,drag=null;
 const el=(tag,label)=>{const node=document.createElement(tag);if(label!==undefined)node.textContent=label;return node;};
 const report=(message,kind='info')=>{status.textContent=message;status.dataset.state=kind;};
 const changed=()=>{dirty=true;save.disabled=busy;report('Có thay đổi chưa lưu. Nhấn Lưu giáo trình.','dirty');};
 const button=(label,fn,disabled=false,cls='cb-secondary')=>{const b=el('button',label);b.type='button';b.className=cls;b.disabled=disabled;b.addEventListener('click',fn);return b;};
 function count(){document.getElementById('cb-chapter-count').textContent=String(chapters.length);document.getElementById('cb-lesson-count').textContent=String(chapters.reduce((n,c)=>n+c.lessons.length,0));document.getElementById('cb-version').textContent=version?'v'+version:'Chưa lưu';}
 function focusTitle(id){root.querySelector('[data-title-id="'+id+'"]')?.focus();}
 function reposition(kind,id,dest,before=null){
  if(busy)return;
  const source=kind==='chapter'?chapters:chapters.find(c=>c.lessons.some(l=>l.id===id))?.lessons;
  if(!source)return;
  const from=source.findIndex(n=>n.id===id);if(from<0||before===id)return;
  const node=source[from],index=before===null?dest.length:dest.findIndex(n=>n.id===before);if(index<0)return;
  const to=source===dest&&from<index?index-1:index;if(source===dest&&from===to)return;
  source.splice(from,1);dest.splice(to,0,node);
  if(kind==='lesson'){const c=chapters.find(c=>c.lessons===dest);if(c)collapsed.delete(c.id);}
  changed();render();focusTitle(id);
 }
 function move(kind,list,index,direction){const target=index+direction;if(target<0||target>=list.length)return;const before=direction<0?list[target].id:(list[target+1]?.id??null);reposition(kind,list[index].id,list,before);}
 function input(node,label){const x=el('input');x.value=node.title;x.maxLength=200;x.required=true;x.dataset.titleId=node.id;x.setAttribute('aria-label',label);x.addEventListener('input',()=>{node.title=x.value;changed();});return x;}
 function clearDrag(){root.querySelectorAll('.cb-drop-active').forEach(n=>n.classList.remove('cb-drop-active'));root.querySelectorAll('.cb-dragging').forEach(n=>n.classList.remove('cb-dragging'));drag=null;}
 function dropTarget(node,kind,dest,before=null){
  node.addEventListener('dragover',e=>{if(busy||drag?.kind!==kind||drag.id===before)return;e.preventDefault();e.stopPropagation();if(e.dataTransfer)e.dataTransfer.dropEffect='move';root.querySelectorAll('.cb-drop-active').forEach(n=>n.classList.remove('cb-drop-active'));node.classList.add('cb-drop-active');});
  node.addEventListener('dragleave',e=>{if(!node.contains(e.relatedTarget))node.classList.remove('cb-drop-active');});
  node.addEventListener('drop',e=>{if(busy||drag?.kind!==kind)return;e.preventDefault();e.stopPropagation();const id=drag.id;clearDrag();reposition(kind,id,dest,before);});
 }
 function handle(node,kind,id){
  const h=el('span','⠿');h.className='cb-handle';h.draggable=true;h.title='Kéo để sắp xếp';h.setAttribute('aria-hidden','true');
  h.addEventListener('dragstart',e=>{if(busy||!e.dataTransfer){e.preventDefault();return;}clearDrag();drag={kind,id};node.classList.add('cb-dragging');e.dataTransfer.setData('text/plain','curriculum');e.dataTransfer.effectAllowed='move';});
  h.addEventListener('dragend',clearDrag);return h;
 }
 function zone(label,kind,dest){const z=el('div',label);z.className='cb-dropzone';z.setAttribute('aria-hidden','true');dropTarget(z,kind,dest);return z;}
 function reorderButtons(kind,list,index){
  const controls=el('div');controls.className='cb-order';
  const up=button('↑',()=>move(kind,list,index,-1),index===0),down=button('↓',()=>move(kind,list,index,1),index===list.length-1);
  up.setAttribute('aria-label','Lên');up.title='Di chuyển lên';down.setAttribute('aria-label','Xuống');down.title='Di chuyển xuống';controls.append(up,down);return controls;
 }
 function tool(path,label,cls='cb-link'){const a=el('a',label);a.className=cls;a.href=path;a.addEventListener('click',e=>{if(dirty||busy){e.preventDefault();report('Lưu giáo trình trước khi mở công cụ bài học.','dirty');save.focus();}});return a;}
 function render(){
  clearDrag();root.replaceChildren();count();if(!chapters.length){const empty=el('div');empty.className='cb-empty';empty.append(el('strong','Chưa có chương'),el('p','Thêm chương đầu tiên để bắt đầu.'));root.append(empty);}
  chapters.forEach((ch,ci)=>{
   const section=el('section');section.className='cb-chapter';section.dataset.chapterId=ch.id;
   const head=el('div');head.className='cb-row cb-chapter-head';head.append(handle(head,'chapter',ch.id));
   const meta=el('div');meta.className='cb-chapter-title';const label=el('span','CHƯƠNG '+String(ci+1).padStart(2,'0')+' · '+ch.lessons.length+' bài');label.className='cb-kicker';meta.append(label,input(ch,'Tên chương '+(ci+1)));
   const toggle=button(collapsed.has(ch.id)?'Mở rộng':'Thu gọn',()=>{if(collapsed.has(ch.id))collapsed.delete(ch.id);else collapsed.add(ch.id);render();root.querySelector('[data-toggle-id="'+ch.id+'"]')?.focus();});toggle.dataset.toggleId=ch.id;toggle.setAttribute('aria-expanded',String(!collapsed.has(ch.id)));
   head.append(meta,reorderButtons('chapter',chapters,ci),toggle);dropTarget(head,'chapter',chapters,ch.id);section.append(head);
   const list=el('div');list.className='cb-lessons';list.hidden=collapsed.has(ch.id);
   ch.lessons.forEach((lesson,li)=>{
    const row=el('div');row.className='cb-row cb-lesson';row.dataset.lessonId=lesson.id;row.append(handle(row,'lesson',lesson.id));
    const body=el('div');body.className='cb-lesson-body';const number=el('span','BÀI '+(ci+1)+'.'+(li+1));number.className='cb-kicker';body.append(number,input(lesson,'Tên bài '+(ci+1)+'.'+(li+1)));
    const tools=el('div');tools.className='cb-tools';const path='/admin/courses/'+state.id+'/lessons/'+lesson.id+'/';tools.append(tool(path,'Soạn bài','cb-link cb-write'),tool(path+'media/','Video & Audio'),tool(path+'quiz/','Quiz'));body.append(tools);
    const control=el('div');control.className='cb-lesson-control';const target=el('select');target.setAttribute('aria-label','Chuyển bài sang chương');target.title='Chuyển bài sang chương khác';chapters.forEach((c,i)=>{const opt=el('option','Chương '+(i+1));opt.value=c.id;opt.selected=c.id===ch.id;target.append(opt);});target.addEventListener('change',()=>{const dest=chapters.find(c=>c.id===target.value);if(dest&&dest!==ch)reposition('lesson',lesson.id,dest.lessons);});control.append(reorderButtons('lesson',ch.lessons,li),target);
    row.append(body,control);dropTarget(row,'lesson',ch.lessons,lesson.id);list.append(row);
   });
   list.append(zone(ch.lessons.length?'Thả bài vào cuối chương':'Chương trống · thả bài vào đây','lesson',ch.lessons));
   list.append(button('+ Thêm bài học',()=>{if(chapters.reduce((n,c)=>n+c.lessons.length,0)>=500){report('Đã đạt giới hạn 500 bài.','error');return;}const id=crypto.randomUUID();ch.lessons.push({id,title:'Bài học mới'});changed();render();focusTitle(id);},false,'cb-add-lesson'));
   section.append(list);root.append(section);
  });
  if(chapters.length)root.append(zone('Thả chương vào cuối giáo trình','chapter',chapters));
 }
 add.addEventListener('click',()=>{if(chapters.length>=100){report('Đã đạt giới hạn 100 chương.','error');return;}const id=crypto.randomUUID();chapters.push({id,title:'Chương mới',lessons:[]});changed();render();focusTitle(id);});
 openAll.addEventListener('click',()=>{collapsed.clear();render();});closeAll.addEventListener('click',()=>{chapters.forEach(c=>collapsed.add(c.id));render();});
 for(const link of document.querySelectorAll('[data-cb-saved-link]'))link.addEventListener('click',e=>{if(dirty||busy){e.preventDefault();report('Lưu giáo trình trước khi mở bản xem trước.','dirty');save.focus();}});
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
   version=result.version;dirty=false;render();report('Đã lưu giáo trình · Phiên bản '+version+'.','success');
  }catch(e){report(e.name==='AbortError'?'Hết thời gian chờ. Kiểm tra giáo trình trong tab khác trước khi thử lại.':e.message||'Không lưu được giáo trình.','error');}
  finally{clearTimeout(timer);busy=false;save.textContent='Lưu giáo trình';save.disabled=!dirty;add.disabled=false;root.inert=false;}
 });
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});render();add.disabled=false;report(chapters.length?'Giáo trình đã tải. Chỉnh sửa để bật nút lưu.':'Thêm chương hoặc bài học để bật nút lưu.','info');
}
function curriculumPage(state,nonce){
 const esc=courseEscape,base='/admin/courses/'+esc(state.id)+'/';
 const styles='<style>main{max-width:1240px;padding:24px 18px 80px}*{box-sizing:border-box}.cb-shell{min-width:0;color:#17233c}.cb-nav{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:16px}.cb-nav a{font-weight:650;color:#4338ca}.cb-hero{background:linear-gradient(120deg,#eee8ff,#eaf3ff 70%,#e1f7ec);border:1px solid #d7d9eb;border-radius:22px;padding:24px}.cb-hero h1{font-size:clamp(26px,4.5vw,42px);line-height:1.15;letter-spacing:-.035em;margin:8px 0;overflow-wrap:anywhere}.cb-hero p{color:#52617b;margin:8px 0}.cb-kicker{font-size:11px;letter-spacing:.07em;font-weight:800;color:#5046a6;display:block}.cb-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0}.cb-stat{background:#eee8ff;border:1px solid #dbe1ec;border-radius:14px;padding:12px 16px;min-width:0}.cb-stat:nth-child(2){background:#e0f5e9}.cb-stat:nth-child(3){background:#e0edff}.cb-stat strong{display:block;font-size:25px;line-height:1.3;font-variant-numeric:tabular-nums}.cb-stat small{font-size:12px;color:#52617b}.cb-toolbar{position:sticky;top:0;z-index:4;background:#f8fafc;padding:12px 0;border-bottom:1px solid #dbe1ec}.cb-actions,.cb-row,.cb-order,.cb-tools,.cb-lesson-control{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.cb-actions{justify-content:space-between}.cb-actions>div{display:flex;gap:8px;flex-wrap:wrap}.cb-shell button,.cb-link{min-height:44px;font:inherit;font-size:14px;font-weight:650;border-radius:10px;line-height:1.3}.cb-shell button{padding:9px 12px}.cb-secondary,.cb-add-lesson,.cb-link{background:white;color:#3730a3;border:1px solid #c4cce4}.cb-secondary:hover,.cb-add-lesson:hover,.cb-link:hover{background:#eeedff;border-color:#4338ca}.cb-shell :is(button,a,input,select):focus-visible{outline:3px solid #2563eb;outline-offset:2px}.cb-shell button:disabled{opacity:.45;cursor:not-allowed}.cb-shell #curriculum-save{background:#4338ca;color:#fff}.cb-shell #curriculum-add{background:#e5e1ff;color:#3730a3;border:1px solid #c7bff6}.cb-link{display:inline-flex;align-items:center;justify-content:center;padding:9px 12px;text-decoration:none;text-align:center}.cb-write{background:#eee8ff}.cb-shell #curriculum-status{padding:10px 12px;border-radius:10px;background:#e7edf8;margin:10px 0 0;font-size:14px;overflow-wrap:anywhere}#curriculum-status[data-state=error]{background:#fee2e2;color:#991b1b}#curriculum-status[data-state=success]{background:#dcfce7;color:#166534}#curriculum-status[data-state=dirty]{background:#fef3c7;color:#854d0e}.cb-chapter{background:#eee8fc;border:1px solid #d6cdef;border-radius:18px;padding:14px;margin:16px 0;min-width:0}.cb-chapter-head{padding:4px;align-items:center}.cb-chapter-title,.cb-lesson-body{flex:1 1 200px;min-width:0;display:grid;gap:5px}.cb-row input{width:100%;min-width:0;max-width:100%;font:inherit;font-weight:650;padding:10px;border:1px solid #aebbd0;border-radius:9px;background:white;color:#17233c;min-height:44px}.cb-order{flex-wrap:nowrap}.cb-order button{min-width:44px;padding:8px;font-size:18px}.cb-lesson{background:#fff;border:1px solid #e0e5ef;border-radius:14px;padding:12px;margin:10px 0;align-items:flex-start}.cb-lessons{padding:4px 0 0 18px}.cb-lessons[hidden]{display:none}.cb-handle{cursor:grab;font-size:24px;line-height:44px;width:28px;text-align:center;flex:none;user-select:none;color:#6554b1}.cb-handle:active{cursor:grabbing}.cb-lesson-control{max-width:100%;align-self:center}.cb-lesson-control select{font:inherit;min-height:44px;max-width:100%;border-radius:9px;padding:8px;border:1px solid #b4bfd1;background:white;color:#17233c}.cb-tools{margin-top:5px}.cb-tools .cb-link{font-size:12px}.cb-dropzone{padding:12px;text-align:center;color:#52617b;font-size:12px;border:2px dashed #b8b0d7;border-radius:12px;margin:9px 0;background:#ffffff70}.cb-drop-active{outline:3px solid #4338ca!important;outline-offset:2px;background:#dfddff!important}.cb-dragging{opacity:.5}.cb-empty{padding:26px;margin-top:20px;border:1px dashed #b4bfd1;border-radius:16px;background:white}.cb-empty p{margin:5px 0;color:#52617b}.cb-help{font-size:13px;color:#52617b;margin:12px 0}.cb-add-lesson{width:100%}@media(max-width:700px){.cb-chapter-title,.cb-lesson-body{flex-basis:calc(100% - 38px)}.cb-chapter-head>.cb-order,.cb-lesson-control{margin-left:36px}.cb-lessons{padding-left:6px}.cb-hero{padding:18px}.cb-stat{padding:12px}.cb-toolbar{position:static}}@media(max-width:420px){main{padding:16px 12px 32px}.cb-chapter{padding:9px}.cb-lesson{padding:9px}.cb-stat strong{font-size:20px}.cb-stat{padding:9px}.cb-shell button,.cb-link{padding:9px}.cb-order button{padding:7px}.cb-actions>div{width:100%}.cb-tools{gap:5px}}</style>';
 const top=styles+'<div class="cb-shell"><nav class="cb-nav"><a href="/admin/courses/">← Course Studio</a><a href="/admin/courses/manage/">Quản lý khóa học</a></nav><section class="cb-hero"><span class="cb-kicker">P2.3 · CURRICULUM BUILDER</span><h1>'+esc(state.title)+'</h1><p>Xây dựng giáo trình trực quan · Kéo thả chương và bài học theo thứ tự mong muốn.</p><div class="cb-tools"><a class="cb-link" data-cb-saved-link href="'+base+'preview/">Xem trước khóa học</a><a class="cb-link" data-cb-saved-link href="'+base+'publishing/">Bản nháp &amp; Phát hành</a></div></section>';
 if(state.status!=='draft')return top+'<p>Chỉ bản nháp mới được chỉnh sửa giáo trình.</p></div>';
 return top+'<div class="cb-stats" aria-label="Tổng quan giáo trình"><div class="cb-stat"><small>Số chương</small><strong id="cb-chapter-count">—</strong></div><div class="cb-stat"><small>Số bài học</small><strong id="cb-lesson-count">—</strong></div><div class="cb-stat"><small>Phiên bản đã lưu</small><strong id="cb-version">—</strong></div></div><div class="cb-toolbar"><div class="cb-actions"><div><button type="button" id="curriculum-add" disabled>+ Thêm chương</button><button type="button" id="curriculum-save" disabled>Lưu giáo trình</button></div><div><button type="button" class="cb-secondary" id="cb-open-all">Mở tất cả</button><button type="button" class="cb-secondary" id="cb-close-all">Thu gọn tất cả</button></div></div><p id="curriculum-status" role="status" aria-live="polite">Đang khởi tạo trình soạn thảo. Nếu thông báo không đổi, hãy tải lại trang.</p></div><p class="cb-help">Kéo tay nắm ⠿ vào trước chương/bài hoặc vùng thả cuối chương. Trên điện thoại, dùng nút lên/xuống và danh sách chuyển chương.</p><div id="curriculum-list"></div><textarea hidden id="curriculum-state">'+esc(JSON.stringify(state))+'</textarea><script nonce="'+nonce+'">('+curriculumBrowser.toString()+')();</script></div>';
}

export {curriculumPage};
