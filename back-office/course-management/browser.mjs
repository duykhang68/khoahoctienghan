// Imperative shell: browser lifecycle, network, native dialogs, rendering and notifications.
export function mountCourseManagement(model,createRenderer){
 const by=id=>document.getElementById(id),path='/admin/courses/manage/',dialog=by('cm-drawer'),form=by('cm-form'),message=by('cm-form-status'),conflict=by('cm-conflict'),save=by('cm-save');
 let snapshot=JSON.parse(by('cm-state').value),state=model.initial(),current=null,mode=null,baseline='',busy=false,refreshing=false,opener=null,manualSlug=false,toastTimer;
 const renderer=createRenderer(document,model,{onSelect:id=>{state=model.transition(state,{selected:id});renderInspector();},onAction:(action,row,trigger)=>openDrawer(action,row,trigger)});
 const fields=()=>Object.fromEntries(new FormData(form));
 const dirty=()=>dialog.open&&JSON.stringify(fields())!==baseline;
 function toast(text,kind='info'){const n=by('cm-toast');n.textContent=text;n.dataset.kind=kind;n.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{n.hidden=true;},5000);}
 function renderInspector(){const c=snapshot?.rows?.find(x=>x.id===state.selected);by('cm-inspector').replaceChildren(renderer.inspector(c));}
 function draw(){
  const stats=model.statistics(snapshot?.stats),rows=stats?snapshot.rows:[];for(const k of ['total','drafts','ready','archived'])by('cm-'+k).textContent=stats?String(stats[k]):'—';
  by('cm-loaded').textContent=stats?'Tải lúc '+renderer.stamp(snapshot.loadedAt)+' (GMT+7)':'Chưa tải được dữ liệu';
  by('cm-limit').textContent=stats?'Đã tải '+rows.length+' / '+stats.total+' khóa học. Bộ lọc áp dụng cho tối đa 100 khóa học cập nhật gần nhất.':'Không có dữ liệu xác thực; thử cập nhật lại.';
  by('cm-create').disabled=!stats;
  by('cm-error').hidden=!!stats;
  const result=model.select(rows,state),root=by('cm-results');root.replaceChildren();
  by('cm-count').textContent=stats?result.filtered.length+' kết quả · trang '+result.page+'/'+result.pages:'Không thể tải danh sách';
  if(result.visible.length)root.append(state.view==='grid'?renderer.cards(result.visible):renderer.table(result.visible));
  else{const empty=renderer.el('div',undefined,'cm-empty');empty.append(renderer.el('strong',!stats?'Dữ liệu chưa khả dụng':rows.length?'Không có kết quả phù hợp':'Chưa có khóa học'),renderer.el('p',!stats?'Kiểm tra kết nối và thử cập nhật lại.':rows.length?'Thay đổi bộ lọc hoặc xóa tìm kiếm.':'Tạo bản nháp đầu tiên để bắt đầu.'));if(stats)empty.append(renderer.button(rows.length?'Xóa bộ lọc':'+ Tạo khóa học',()=>rows.length?reset():openDrawer('create',null,by('cm-create'))));root.append(empty);}
  by('cm-prev').disabled=result.page<=1;by('cm-next').disabled=result.page>=result.pages;
  for(const n of document.querySelectorAll('[data-status-filter]'))n.setAttribute('aria-pressed',String(n.dataset.statusFilter===state.status));
  for(const n of document.querySelectorAll('[data-view]'))n.setAttribute('aria-pressed',String(n.dataset.view===state.view));
  renderInspector();
 }
 function patch(p){state=model.transition(state,p);draw();}
 function reset(){for(const k of ['query','from','to'])by('cm-'+k).value='';by('cm-level').value='all';by('cm-sort').value='recent';patch({...model.initial(),view:state.view,selected:state.selected});}
 for(const k of ['query','level','from','to','sort'])by('cm-'+k).addEventListener(k==='query'?'input':'change',e=>patch({[k]:e.target.value}));
 for(const n of document.querySelectorAll('[data-status-filter]'))n.addEventListener('click',()=>patch({status:n.dataset.statusFilter}));
 for(const n of document.querySelectorAll('[data-view]'))n.addEventListener('click',()=>patch({view:n.dataset.view}));
 by('cm-clear').addEventListener('click',reset);by('cm-prev').addEventListener('click',()=>patch({page:model.select(snapshot.rows,state).page-1}));by('cm-next').addEventListener('click',()=>patch({page:model.select(snapshot.rows,state).page+1}));
 document.addEventListener('click',e=>{for(const d of document.querySelectorAll('.cm-menu[open]'))if(!d.contains(e.target))d.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open)for(const d of document.querySelectorAll('.cm-menu[open]')){d.open=false;d.querySelector('summary')?.focus();}});
 async function read(){const res=await fetch(path,{headers:{Accept:'application/json'},cache:'no-store',credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(15000)});if(!res.ok||!res.headers.get('Content-Type')?.includes('application/json'))throw Error('Không tải được dữ liệu. Kiểm tra phiên đăng nhập hoặc kết nối.');const data=await res.json();if(!model.snapshotOk(data))throw Error('Dữ liệu phản hồi không hợp lệ.');return data;}
 async function refresh(){
  if(refreshing)return false;refreshing=true;by('cm-refresh').disabled=true;by('cm-refresh').textContent='Đang tải…';by('cm-loading').hidden=false;by('cm-results').setAttribute('aria-busy','true');
  try{snapshot=await read();draw();return true;}catch(e){toast(e.message,'error');return false;}finally{refreshing=false;by('cm-refresh').disabled=false;by('cm-refresh').textContent='Cập nhật';by('cm-loading').hidden=true;by('cm-results').setAttribute('aria-busy','false');}
 }
 by('cm-refresh').addEventListener('click',async()=>{if(await refresh())toast('Đã cập nhật danh sách.','success');});
 const input=k=>form.elements.namedItem(k);
 function errorFields(errors={}){for(const k of ['title','slug','description','level']){const n=input(k),err=by('cm-err-'+k);n.setAttribute('aria-invalid',String(!!errors[k]));err.textContent=errors[k]||'';}}
 function fill(row){input('id').value=row?.id??'';input('version').value=row?.version??'';input('title').value=row?.title??'';input('slug').value=row?.slug??'';input('description').value=row?.description??'';input('level').value=row?.level??'beginner';input('confirm').checked=false;}
 function openDrawer(action,row,trigger){
  if(dialog.open||!model.statistics(snapshot?.stats)||action!=='create'&&!model.actions(row).includes(action))return;
  opener=trigger??document.activeElement;mode=action;current=row;form.reset();fill(row);input('action').value=action;manualSlug=action!=='create';const arch=action==='archive';
  by('cm-edit-fields').hidden=arch;by('cm-archive-fields').hidden=!arch;for(const k of ['title','slug','description','level'])input(k).disabled=arch;for(const k of ['id','version'])input(k).disabled=action==='create';input('confirm').disabled=!arch;input('confirm').required=arch;input('slug').readOnly=action==='edit';
  by('cm-drawer-title').textContent=arch?'Lưu trữ khóa học':action==='edit'?'Chỉnh sửa khóa học':'Tạo khóa học';
  by('cm-archive-name').textContent=row?.title??'';save.textContent=arch?'Lưu trữ':action==='edit'?'Lưu thay đổi':'Tạo bản nháp';save.classList.toggle('cm-danger',arch);save.classList.toggle('cm-primary',!arch);save.disabled=false;
  message.textContent='';conflict.hidden=true;by('cm-latest').textContent='';by('cm-load-latest').hidden=true;errorFields();baseline=JSON.stringify(fields());dialog.showModal();(arch?input('confirm'):input('title')).focus();
 }
 by('cm-create').addEventListener('click',e=>openDrawer('create',null,e.currentTarget));
 function close(){if(busy)return;if(dirty()&&!window.confirm('Bạn có thay đổi chưa lưu. Đóng và bỏ thay đổi?'))return;dialog.close();}
 by('cm-close').addEventListener('click',close);by('cm-cancel').addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',()=>{if(opener?.isConnected&&opener.getClientRects().length)opener.focus();else by('cm-create').focus();});
 input('title').addEventListener('input',()=>{if(!manualSlug)input('slug').value=model.slug(input('title').value);});input('slug').addEventListener('input',()=>{manualSlug=input('slug').value!=='';if(!manualSlug)input('slug').value=model.slug(input('title').value);});
 for(const k of ['title','slug','description','level'])input(k).addEventListener('input',()=>{if(input(k).getAttribute('aria-invalid')==='true'){const e=model.errors(fields());input(k).setAttribute('aria-invalid',String(!!e[k]));by('cm-err-'+k).textContent=e[k]||'';}});
 by('cm-compare').addEventListener('click',async()=>{const btn=by('cm-compare');btn.disabled=true;btn.textContent='Đang tải bản mới…';try{const latest=await read();snapshot=latest;draw();const row=latest.rows.find(c=>c.id===current?.id);by('cm-latest').textContent=row?('Phiên bản mới: v'+row.version+' · '+model.labels[row.status]+'\n'+row.title+'\n'+row.description+'\n'+model.labels[row.level]):'Khóa học không còn trong danh sách 100 mục đã tải hoặc không tìm thấy.';by('cm-load-latest').hidden=!row||row.status!=='draft'||mode==='create';}catch(e){message.textContent=e.message;}finally{btn.disabled=false;btn.textContent='Tải bản mới để đối chiếu';}});
 by('cm-load-latest').addEventListener('click',()=>{const row=snapshot.rows.find(c=>c.id===current?.id);if(!row||row.status!=='draft'||!window.confirm('Nạp bản mới sẽ thay thế nội dung đang nhập. Tiếp tục?'))return;current=row;fill(row);baseline=JSON.stringify(fields());conflict.hidden=true;message.textContent='Đã nạp phiên bản v'+row.version+'. Kiểm tra và xác nhận lại.';errorFields();save.disabled=false;});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;const data=fields();if(mode!=='archive'){const errors=model.errors(data);errorFields(errors);const first=Object.keys(errors)[0];if(first){message.textContent='Kiểm tra các trường được đánh dấu.';input(first).focus();return;}}else if(data.confirm!=='yes'){message.textContent='Cần xác nhận lưu trữ.';return;}
  busy=true;save.disabled=true;by('cm-close').disabled=true;by('cm-cancel').disabled=true;by('cm-edit-fields').inert=true;by('cm-archive-fields').inert=true;conflict.inert=true;const label=save.textContent;save.textContent='Đang lưu…';message.textContent='';
  try{const res=await fetch(path,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data),credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(20000)});
   if(res.status===409){message.textContent=mode==='create'?'Đường dẫn đã tồn tại (409). Hãy chọn slug khác.':'Dữ liệu đã thay đổi (409). Nội dung đang nhập vẫn được giữ nguyên.';if(mode!=='create'){conflict.hidden=false;by('cm-load-latest').hidden=true;save.disabled=true;}return;}
   if(!res.ok||!res.headers.get('Content-Type')?.includes('application/json')||(await res.json()).ok!==true)throw Error('Chưa xác nhận lưu thành công'+(res.ok?'.':' (HTTP '+res.status+').')+' Kiểm tra dữ liệu trước khi thử lại.');
   baseline=JSON.stringify(fields());dialog.close();toast(mode==='archive'?'Đã lưu trữ khóa học.':'Đã lưu khóa học.','success');await refresh();
  }catch(err){message.textContent=err.name==='TimeoutError'?'Hết thời gian chờ. Dữ liệu vẫn ở đây; kiểm tra trước khi thử lại.':err.message||'Không lưu được khóa học.';toast('Chưa xác nhận kết quả lưu.','error');}
  finally{busy=false;by('cm-close').disabled=false;by('cm-cancel').disabled=false;by('cm-edit-fields').inert=false;by('cm-archive-fields').inert=false;conflict.inert=false;save.textContent=label;save.disabled=!conflict.hidden;}
 });
 window.addEventListener('beforeunload',e=>{if(dirty()||busy){e.preventDefault();e.returnValue='';}});
 draw();if(location.hash==='#course-create'&&model.statistics(snapshot?.stats))openDrawer('create',null,by('cm-create'));
}
