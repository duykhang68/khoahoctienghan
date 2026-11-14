const $=id=>document.getElementById(id), MENU='src/data/knowledge-menu.json',POSTS='src/data/techblog/posts.json';
const KEY='trithuchanquoc-editor-drafts-v1';
let nonce='',login=null,snapshot={files:{},sha:''},drafts={},active='',menu=[],busy=false,drag=null,postIndex=-1,postList=null,conflicts=[];
try{drafts=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
const persist=()=>localStorage.setItem(KEY,JSON.stringify(drafts));
const status=t=>{$('status').textContent=t};
async function request(path,data){
 const r=await fetch('/api/'+path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','X-Editor-Nonce':nonce},body:JSON.stringify(data)});
 const v=await r.json();if(!r.ok)throw Error(v.error||'Không thể hoàn tất');return v;
}
const get=p=>drafts[p]?.content??snapshot.files[p]?.content;
function stage(p,content){
 const base=snapshot.files[p];
 if(content===base?.content)delete drafts[p];else drafts[p]={before:drafts[p]?.before??base?.hash??null,content};
 persist();renderFiles();state();
}
function state(){
 $('auth-state').textContent=login?'Connected · '+login:'Offline';
 $('draft-count').textContent=Object.keys(drafts).length+' thay đổi local'+(conflicts.length?' · '+conflicts.length+' xung đột':'');
 $('connect').disabled=busy||!!login;$('disconnect').disabled=busy||!login;$('pull').disabled=busy||!login;$('sync').disabled=busy||!login||!Object.keys(drafts).length||!!conflicts.length;
 $('discard').disabled=!active||!drafts[active];$('save').disabled=!active;
}
async function action(fn){if(busy)return;busy=true;state();try{await fn()}catch(e){status(e.message)}finally{busy=false;state()}}
function mergeSnapshot(s,source){
 const next={...drafts};conflicts=[];
 for(const [p,d] of Object.entries(drafts)){
  if(s.files[p]?.content===d.content){delete next[p];continue;}
  if((s.files[p]?.hash??null)!==d.before)conflicts.push(p);
 }
 drafts=next;persist();snapshot=s;$('source').textContent=source+' · '+s.sha.slice(0,12);
 renderFiles();loadMenu();if(active)select(active);state();
 if(conflicts.length)status('Xung đột: '+conflicts.join(', ')+'. Bản nháp vẫn còn; hủy bản nháp hoặc sao chép nội dung rồi Pull lại.');
}
function name(p,content){
 if(p===POSTS)return 'Tech Blog · Danh sách bài viết';
 if(p.endsWith('knowledge-visuals.json'))return 'Visual Editorial · Catalogue';
 return content?.match(/^title:\s*(.+)$/m)?.[1]?.replace(/^["']|["']$/g,'')||p.split('/').pop();
}
function renderFiles(){
 const term=$('filter').value.toLowerCase(),all=[...new Set([...Object.keys(snapshot.files),...Object.keys(drafts)])].filter(p=>p!==MENU).sort();
 $('files').replaceChildren();
 for(const p of all){const title=name(p,get(p));if(!(title+' '+p).toLowerCase().includes(term))continue;const btn=document.createElement('button');btn.className='file'+(p===active?' active':'');btn.textContent=title;const small=document.createElement('small');small.textContent=p.replace('src/content/docs/','')+(drafts[p]?' · Bản nháp':'');if(drafts[p])small.className='dirty';btn.append(small);btn.onclick=()=>{if(!keepCurrent())return;select(p)};$('files').append(btn)}
}
function keepCurrent(){
 if(active&&postIndex>=0&&$('editor').value!==JSON.stringify(postList[postIndex],null,2))return confirm('Bài Tech Blog chưa lưu vào danh sách. Bỏ phần chưa lưu?');
 if(active&&postIndex<0&&$('editor').value!==(get(active)||''))return confirm('Nội dung chưa lưu local. Bỏ phần chưa lưu?');
 return true;
}
function select(p){
 active=p;postIndex=-1;postList=null;$('file-title').textContent=name(p,get(p));$('file-path').textContent=p;
 $('editor').disabled=false;$('editor').value=get(p)||'';$('preview').textContent=$('editor').value;
 $('post-tools').hidden=p!==POSTS;
 if(p===POSTS){try{postList=JSON.parse(get(p));renderPosts()}catch{status('JSON Tech Blog lỗi; sửa trực tiếp trong editor.');}}
 renderFiles();state();
}
function renderPosts(){
 const el=$('post-select');el.replaceChildren(new Option('Toàn bộ JSON','-1'));for(let i=0;i<postList.length;i++)el.add(new Option(postList[i].title||postList[i].slug,String(i)));el.value=String(postIndex);
}
$('post-select').onchange=()=>{if(!keepCurrent()){$('post-select').value=String(postIndex);return}postIndex=Number($('post-select').value);$('editor').value=postIndex<0?JSON.stringify(postList,null,2):JSON.stringify(postList[postIndex],null,2);$('preview').textContent=$('editor').value};
function saveFile(){
 if(postIndex>=0){const p=JSON.parse($('editor').value);postList[postIndex]=p;stage(POSTS,JSON.stringify(postList,null,2)+'\n');renderPosts();$('editor').value=JSON.stringify(p,null,2);}
 else{if(active.endsWith('.json'))JSON.parse($('editor').value);stage(active,$('editor').value);if(active===POSTS){postList=JSON.parse(get(active));renderPosts();}}
 status('Đã lưu bản nháp local: '+active);
}
$('save').onclick=()=>{try{saveFile()}catch(e){status(e.message)}};
$('save-post').onclick=$('save').onclick;
$('new-post').onclick=()=>{if(!postList||!keepCurrent())return;const slug=prompt('Slug bài Tech Blog (a-z, 0-9, dấu gạch ngang)');if(!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||postList.some(p=>p.slug===slug)){status('Slug không hợp lệ hoặc đã tồn tại');return}const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date()).replace(' ','T');postList.push({slug,title:'Tiêu đề mới',summary:'Mô tả bài viết',date:parts+'+07:00',sections:[{heading:'Giới thiệu',paragraphs:['Nội dung']}],issues:[]});postIndex=postList.length-1;renderPosts();$('editor').value=JSON.stringify(postList[postIndex],null,2);status('Điền nội dung rồi bấm Lưu local')};
$('editor').oninput=()=>{$('preview').textContent=$('editor').value};
$('filter').oninput=renderFiles;
$('discard').onclick=()=>{if(active&&confirm('Hủy bản nháp '+active+'?')){delete drafts[active];conflicts=conflicts.filter(p=>p!==active);persist();select(active);state()}};
$('new').onclick=()=>{if(!keepCurrent())return;const slug=prompt('Đường dẫn bài học, ví dụ ngon-ngu/tu-vung (không có phần mở rộng)');if(!slug||! /^(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){status('Đường dẫn không hợp lệ');return}const p='src/content/docs/'+slug+'.md';if(get(p)||get(p+'x')){status('Bài đã tồn tại');return}stage(p,'---\ntitle: Bài mới\ndescription: Mô tả bài mới\n---\n\nNội dung bài viết.\n');select(p)};
function tab(m){if(m&&!keepCurrent())return;$('content-panel').hidden=m;$('menu-panel').hidden=!m;$('tab-content').setAttribute('aria-pressed',String(!m));$('tab-menu').setAttribute('aria-pressed',String(m))}
$('tab-content').onclick=()=>tab(false);$('tab-menu').onclick=()=>tab(true);
function loadMenu(){try{menu=JSON.parse(get(MENU)||'[]');renderMenu()}catch{status('Không đọc được menu JSON')}}
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node};
function btn(text,fn,label=text){const n=el('button',text,'secondary');n.type='button';n.setAttribute('aria-label',label);n.onclick=fn;return n}
function move(arr,i,j){if(j<0||j>=arr.length||i===j)return;const [x]=arr.splice(i,1);arr.splice(j,0,x);renderMenu()}
function field(item,key,placeholder){const n=el('input');n.value=item[key]||'';n.placeholder=placeholder;n.setAttribute('aria-label',placeholder);n.oninput=()=>{item[key]=n.value;menuPreview()};return n}
function renderItems(arr,parent){
 for(let i=0;i<arr.length;i++){const item=arr[i],group=Array.isArray(item.items),box=el('div','','menu-item'+(group?' menu-group':'')),row=el('div','','menu-row');
 const handle=el('span','⠿','handle');handle.draggable=true;handle.title='Kéo để đổi thứ tự';handle.ondragstart=e=>{drag={arr,index:i};e.dataTransfer.setData('text/plain','menu');e.dataTransfer.effectAllowed='move';box.classList.add('dragging')};handle.ondragend=()=>{drag=null;box.classList.remove('dragging')};box.ondragover=e=>{if(drag?.arr===arr){e.preventDefault();e.stopPropagation()}};box.ondrop=e=>{if(drag?.arr===arr){e.preventDefault();e.stopPropagation();move(arr,drag.index,i);drag=null}};
 row.append(handle,field(item,'label',group?'Tên nhóm':'Tên menu'));
 if(!group)row.append(field(item,'link','/duong-dan/'));
 row.append(btn('↑',()=>move(arr,i,i-1),'Di chuyển lên'),btn('↓',()=>move(arr,i,i+1),'Di chuyển xuống'),btn('Xóa',()=>{if(confirm('Xóa mục menu này?')){arr.splice(i,1);renderMenu()}},'Xóa mục'));
 box.append(row);
 if(group){const children=el('div','','children');renderItems(item.items,children);children.append(btn('+ Mục con',()=>{item.items.push({label:'Mục mới',link:'/'});renderMenu()}));box.append(children)}
 parent.append(box)}
}
function menuPreview(){$('menu-preview').textContent=menu.map(m=>m.label+(m.items?'\n'+m.items.map(c=>'  └ '+c.label+'  '+c.link).join('\n'):'  '+m.link)).join('\n')}
function renderMenu(){$('menus').replaceChildren();renderItems(menu,$('menus'));menuPreview()}
$('add-menu').onclick=()=>{menu.push({label:'Menu mới',link:'/'});renderMenu()};$('add-group').onclick=()=>{menu.push({label:'Nhóm mới',items:[{label:'Mục mới',link:'/'}]});renderMenu()};
$('save-menu').onclick=()=>{stage(MENU,JSON.stringify(menu,null,2)+'\n');status('Đã lưu menu local')};
$('connect').onclick=()=>action(async()=>{const value=$('token').value.trim();$('token').value='';const r=await request('connect',{token:value});login=r.login;status('Đã kết nối. Nhấn Pull GitHub để tải bản online.')});
$('disconnect').onclick=()=>action(async()=>{await request('disconnect',{});login=null;status('Đã ngắt kết nối, bản nháp vẫn được giữ.')});
function unsaved(){return (active&&postIndex<0&&$('editor').value!==(get(active)||''))||(active&&postIndex>=0&&$('editor').value!==JSON.stringify(postList[postIndex],null,2))||JSON.stringify(menu,null,2)+'\n'!==get(MENU)}
$('pull').onclick=()=>action(async()=>{if(unsaved()&&!confirm('Thay đổi chưa lưu local sẽ bị bỏ. Tiếp tục Pull?'))return;const s=await request('pull',{});status('Đã tải GitHub, giữ các bản nháp không xung đột.');mergeSnapshot(s,'GitHub main')});
$('sync').onclick=()=>action(async()=>{if(unsaved()){status('Hãy lưu nội dung/menu đang chỉnh trước khi Sync.');return}const changes=Object.entries(drafts).map(([path,d])=>({path,...d}));if(!confirm('Tạo PR với '+changes.length+' tệp? Không ghi trực tiếp main.'))return;const p=await request('sync',{changes});const link=el('a','PR #'+p.number+' · '+p.sha.slice(0,12));link.href=p.url;link.target='_blank';link.rel='noopener noreferrer';$('pr').replaceChildren(link,document.createTextNode(' — Đã gửi, chờ CI/merge/production. Bản nháp giữ đến khi Pull thấy nội dung đã merge.'));$('pr').hidden=false;status('Đã tạo PR #'+p.number+'; không phải đã triển khai.')});
window.addEventListener('beforeunload',e=>{if(unsaved()){e.preventDefault();e.returnValue=''}});
(async()=>{try{const session=await request('session');nonce=session.nonce;login=session.login;mergeSnapshot(await request('local'),'Checkout local');if(!conflicts.length)status('Sẵn sàng soạn offline.');}catch(e){status(e.message);state()}})();
