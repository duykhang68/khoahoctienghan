const $=id=>document.getElementById(id), MENU='src/data/knowledge-menu.json',POSTS='src/data/techblog/posts.json';
const KEY='trithuchanquoc-editor-drafts-v1';
let scope='all';
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
 if(p===POSTS)return 'Tech Blog · Tất cả bài viết';
 if(p.endsWith('knowledge-visuals.json'))return 'Visual Editorial · Catalogue';
 return content?.match(/^title:\s*(.+)$/m)?.[1]?.replace(/^["']|["']$/g,'')||p.split('/').pop();
}
function renderFiles(){
 const term=$('filter').value.toLowerCase(),all=[...new Set([...Object.keys(snapshot.files),...Object.keys(drafts)])].filter(p=>p!==MENU&&(scope==='all'||(scope==='tech'?p===POSTS:p.startsWith('src/content/docs/')))).sort();
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
 if(p===POSTS){try{postList=JSON.parse(get(p));postIndex=postList.length?0:-1;renderPosts();if(postIndex>=0)$('editor').value=JSON.stringify(postList[postIndex],null,2)}catch{status('Không đọc được dữ liệu bài viết; nội dung gốc vẫn nguyên vẹn.');}}
 renderVisual();renderFiles();state();
}
function renderPosts(){
 const el=$('post-select');el.replaceChildren();if(!postList.length)el.add(new Option('Chưa có bài viết','-1'));for(let i=0;i<postList.length;i++)el.add(new Option(postList[i].title||postList[i].slug,String(i)));el.value=String(postIndex);
}
$('post-select').onchange=()=>{if(!keepCurrent()){$('post-select').value=String(postIndex);return}postIndex=Number($('post-select').value);$('editor').value=postIndex<0?JSON.stringify(postList,null,2):JSON.stringify(postList[postIndex],null,2);renderVisual()};
function saveFile(){
 if(postIndex>=0){const p=JSON.parse($('editor').value);postList[postIndex]=p;stage(POSTS,JSON.stringify(postList,null,2)+'\n');renderPosts();$('editor').value=JSON.stringify(p,null,2);}
 else{if(!active.startsWith('src/content/docs/'))throw Error('Nội dung này chưa hỗ trợ biên tập trực quan.');stage(active,$('editor').value);}
 status('Đã lưu bản nháp local: '+active);
}
$('save').onclick=()=>{try{saveFile()}catch(e){status(e.message)}};
$('save-post').onclick=$('save').onclick;
$('new-post').onclick=()=>{if(!postList||!keepCurrent())return;const slug=prompt('Slug bài Tech Blog (a-z, 0-9, dấu gạch ngang)');if(!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||postList.some(p=>p.slug===slug)){status('Slug không hợp lệ hoặc đã tồn tại');return}const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date()).replace(' ','T');postList.push({slug,title:'Tiêu đề mới',summary:'Mô tả bài viết',date:parts+'+07:00',sections:[{heading:'Giới thiệu',paragraphs:['Nội dung']}],issues:[]});postIndex=postList.length-1;renderPosts();stage(POSTS,JSON.stringify(postList,null,2)+'\n');$('editor').value=JSON.stringify(postList[postIndex],null,2);renderVisual();status('Bài mới đã được tạo dưới dạng bản nháp local')};
document.querySelectorAll('[data-scope]').forEach(b=>b.onclick=()=>{scope=b.dataset.scope;document.querySelectorAll('[data-scope]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderFiles()});
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
 const handle=el('span','⠿','handle');handle.draggable=true;handle.title='Kéo để đổi thứ tự';handle.ondragstart=e=>{drag={arr,index:i};e.dataTransfer.setData('text/plain','menu');e.dataTransfer.effectAllowed='move';box.classList.add('dragging')};handle.ondragend=()=>{drag=null;box.classList.remove('dragging');document.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'))};box.ondragover=e=>{if(drag?.arr===arr){e.preventDefault();e.stopPropagation();box.classList.add('drop-target')}};box.ondragleave=e=>{if(!box.contains(e.relatedTarget))box.classList.remove('drop-target')};box.ondrop=e=>{if(drag?.arr===arr){e.preventDefault();e.stopPropagation();move(arr,drag.index,i);drag=null}};
 row.append(handle,field(item,'label',group?'Tên nhóm':'Tên menu'));
 if(!group)row.append(field(item,'link','/duong-dan/'));
 row.append(btn('↑',()=>move(arr,i,i-1),'Di chuyển lên'),btn('↓',()=>move(arr,i,i+1),'Di chuyển xuống'),btn('Xóa',()=>{if(confirm('Xóa mục menu này?')){arr.splice(i,1);renderMenu()}},'Xóa mục'));
 box.append(row);
 if(group){const children=el('div','','children');renderItems(item.items,children);children.append(btn('+ Mục con',()=>{item.items.push({label:'Mục mới',link:'/'});renderMenu()}));box.append(children)}
 parent.append(box)}
}
function menuPreview(){const root=$('menu-preview');root.replaceChildren();function draw(items,parent){const list=el('ul','','preview-tree');items.forEach(item=>{const li=el('li',item.label||'Chưa đặt tên');list.append(li);if(item.items)draw(item.items,li)});parent.append(list)}draw(menu,root)}
function renderMenu(){$('menus').replaceChildren();renderItems(menu,$('menus'));menuPreview()}
$('add-menu').onclick=()=>{menu.push({label:'Menu mới',link:'/'});renderMenu()};$('add-group').onclick=()=>{menu.push({label:'Nhóm mới',items:[{label:'Mục mới',link:'/'}]});renderMenu()};
$('save-menu').onclick=()=>{stage(MENU,JSON.stringify(menu,null,2)+'\n');status('Đã lưu menu local')};
$('connect').onclick=()=>action(async()=>{const value=$('token').value.trim();$('token').value='';const r=await request('connect',{token:value});login=r.login;status('Đã kết nối. Nhấn Pull GitHub để tải bản online.')});
$('disconnect').onclick=()=>action(async()=>{await request('disconnect',{});login=null;status('Đã ngắt kết nối, bản nháp vẫn được giữ.')});
function unsaved(){return (active&&postIndex<0&&$('editor').value!==(get(active)||''))||(active&&postIndex>=0&&$('editor').value!==JSON.stringify(postList[postIndex],null,2))||JSON.stringify(menu,null,2)+'\n'!==get(MENU)}
$('pull').onclick=()=>action(async()=>{if(unsaved()&&!confirm('Thay đổi chưa lưu local sẽ bị bỏ. Tiếp tục Pull?'))return;const s=await request('pull',{});status('Đã tải GitHub, giữ các bản nháp không xung đột.');mergeSnapshot(s,'GitHub main')});
$('sync').onclick=()=>action(async()=>{if(unsaved()){status('Hãy lưu nội dung/menu đang chỉnh trước khi Sync.');return}const changes=Object.entries(drafts).map(([path,d])=>({path,...d}));if(!confirm('Tạo PR với '+changes.length+' tệp? Không ghi trực tiếp main.'))return;const p=await request('sync',{changes});const link=el('a','PR #'+p.number+' · '+p.sha.slice(0,12));link.href=p.url;link.target='_blank';link.rel='noopener noreferrer';$('pr').replaceChildren(link,document.createTextNode(' — Đã gửi, chờ CI/merge/production. Bản nháp giữ đến khi Pull thấy nội dung đã merge.'));$('pr').hidden=false;status('Đã tạo PR #'+p.number+'; không phải đã triển khai.')});

function visualTitle(text){return el('p',text,'eyebrow')}
const cleanText=value=>String(value??'').replace(/\u00a0/g,' ').replace(/\r?\n/g,' ');
const mdLiteral=value=>cleanText(value).replace(/[\\\x60*_{}\[\]<>#~|]/g,ch=>'\\'+ch).replace(/^([ \t]*)([-+]|[0-9]+\.)\s/,(_m,a,b)=>a+'\\'+b+' ');
function inlineMarkdown(value){
 const out=document.createDocumentFragment();
 let cursor=0;const rx=/\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\x60([^\x60\n]+)\x60|\[([^\]\n]+)\]\((https?:\/\/[^\s()]+)\)/g;
 for(const m of value.matchAll(rx)){
  const before=value.slice(cursor,m.index);if(/[\\\x60*_{}\[\]<>~|]/.test(before))return null;
  out.append(document.createTextNode(before));
  const node=el(m[1]?'strong':m[2]?'em':m[3]?'code':'a',m[1]??m[2]??m[3]??m[4]);
  if(m[5]){try{const url=new URL(m[5]);if(url.username||url.password)return null;node.dataset.href=m[5];node.className='editor-link'}catch{return null}}
  out.append(node);cursor=m.index+m[0].length;
 }
 const after=value.slice(cursor);if(/[\\\x60*_{}\[\]<>~|]/.test(after))return null;
 out.append(document.createTextNode(after));return out;
}
function markdownFrom(node){
 if(node.nodeType===Node.TEXT_NODE)return mdLiteral(node.nodeValue);
 const inner=[...node.childNodes].map(markdownFrom).join('');
 if(node.nodeName==='STRONG'||node.nodeName==='B')return inner?'**'+inner+'**':'';
 if(node.nodeName==='EM'||node.nodeName==='I')return inner?'*'+inner+'*':'';
 if(node.nodeName==='CODE')return inner?'\x60'+node.textContent.replace(/[\x60\r\n]/g,' ')+'\x60':'';
 if(node.nodeName==='A'&&/^https?:\/\/[^\s()]+$/.test(node.dataset.href||''))return '['+inner+']('+node.dataset.href+')';
 if(node.nodeName==='BR')return ' ';
 return inner;
}
function editable(tag,label,value,onChange,{markdown=false,multiline=false}={}){
 const wrap=el('div','','editor-editable'),field=el(tag,'','paper-field');
 const fragment=markdown?inlineMarkdown(value):null;if(markdown&&!fragment)return null;
 if(fragment)field.append(fragment);else field.textContent=value??'';
 field.contentEditable='true';field.setAttribute('role','textbox');field.setAttribute('aria-label',label);field.setAttribute('aria-multiline',String(multiline));field.dataset.placeholder=label;
 const update=()=>onChange(markdown?[...field.childNodes].map(markdownFrom).join(''):multiline?field.innerText.replace(/\r/g,''):cleanText(field.textContent));
 field.addEventListener('input',update);
 field.addEventListener('beforeinput',e=>{if(!multiline&&(e.inputType==='insertParagraph'||e.inputType==='insertLineBreak'))e.preventDefault()});
 field.addEventListener('paste',e=>{e.preventDefault();const selection=window.getSelection();if(!selection?.rangeCount)return;const range=selection.getRangeAt(0);if(!field.contains(range.commonAncestorContainer))return;range.deleteContents();const text=document.createTextNode(multiline?e.clipboardData.getData('text/plain'):cleanText(e.clipboardData.getData('text/plain')));range.insertNode(text);range.setStartAfter(text);range.collapse(true);selection.removeAllRanges();selection.addRange(range);update()});
 if(markdown){
  const toolbar=el('div','','format-toolbar');
  for(const [caption,tagName] of [['Đậm','strong'],['Nghiêng','em'],['Mã','code']]){
   const control=btn(caption,()=>{const sel=window.getSelection();if(!sel?.rangeCount||sel.isCollapsed)return;const range=sel.getRangeAt(0);if(!field.contains(range.commonAncestorContainer)||range.startContainer!==range.endContainer||range.startContainer.nodeType!==Node.TEXT_NODE||range.startContainer.parentNode!==field)return;const selected=range.toString();if(!selected.trim()||(tagName==='code'&&selected.includes('\x60')))return;const node=el(tagName,selected);range.deleteContents();range.insertNode(node);range.selectNodeContents(node);sel.removeAllRanges();sel.addRange(range);update()},caption+' · '+label);
   control.addEventListener('mousedown',e=>e.preventDefault());toolbar.append(control);
  }
  wrap.append(toolbar);
 }
 wrap.append(field);return wrap;
}
function visualField(label,value,onChange,{multiline=false,kind=''}={}){
 const wrap=el('label',label,'visual-field '+kind),input=el(multiline?'textarea':'input');input.value=value??'';input.oninput=()=>onChange(input.value);wrap.append(input);return wrap;
}
const svgNS='http://www.w3.org/2000/svg';
function svgNode(tag,attrs={},value){const node=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));if(value!==undefined)node.textContent=value;return node}
const hex=value=>/^#[0-9a-f]{6}$/i.test(value||'')?value:'#555555';
const colorChip=(color)=>{const s=svgNode('svg',{viewBox:'0 0 100 52',role:'img','aria-label':color});s.append(svgNode('rect',{width:100,height:52,rx:7,fill:hex(color)}));return s};
function visualBlock(v){
 const card=el('figure','','visual-block'),items=v.items||[];card.dataset.visual=v.kind;
 if(v.title)card.append(el('h3',v.title,'visual-heading'));
 if(v.kind==='swatches'||v.kind==='buttons'){
  const palette=el('div','','palette');for(const item of items){const sample=el('div','','swatch');sample.append(colorChip(item.color),el('strong',item.label||''),el('small',v.kind==='buttons'?(item.value||'')+' · '+(item.hover||''):(item.color||'')),el('small',item.detail||''));palette.append(sample)}card.append(palette);
 }else if(v.kind==='flow'&&v.variant==='cycle'&&items.length===5){
  const points=[[170,48],[268,117],[230,224],[110,224],[72,117]],colors=['#DCE8FA','#F9E2B8','#F3D8D8','#D8EBD8','#E7DDF5'],svg=svgNode('svg',{viewBox:'0 0 340 285',role:'img','aria-label':items.map(i=>i.label).join(' → ')});
  svg.append(svgNode('circle',{cx:170,cy:142,r:88,stroke:'#9ca3af','stroke-dasharray':'5 5',fill:'none'}));items.forEach((item,i)=>{const [x,y]=points[i];svg.append(svgNode('rect',{x:x-45,y:y-20,width:90,height:40,rx:6,fill:colors[i]}),svgNode('text',{x,y:y+4,'text-anchor':'middle','font-size':12,'font-weight':600},item.label))});(v.centerLabel||['Continuous','Improvement']).forEach((t,i)=>svg.append(svgNode('text',{x:170,y:138+17*i,'text-anchor':'middle','font-size':13,'font-weight':700},t)));card.append(svg);
  const list=el('ol','','visual-key');for(const item of items)list.append(el('li',item.label+' — '+(item.detail||'')));card.append(list);
 }else if(v.kind==='flow'){const flow=el('ol','','flow');for(const item of items){const li=el('li');li.append(el('strong',item.label),el('small',item.detail||''));flow.append(li)}card.append(flow)}
 else if(v.kind==='bars'){
  const total=items.reduce((sum,i)=>sum+(Number(i.value)||0),0),stats=el('div','','visual-metrics');if(v.variant==='summary')stats.append(el('div','Tổng số','metric-total'));
  if(v.variant==='summary')stats.firstChild.append(el('strong',String(total)));
  for(const item of items){const metric=el('div');metric.append(el('small',item.label),el('strong',item.value));stats.append(metric)}card.append(stats);
  if(v.variant==='summary'&&total>0){let x=0;const svg=svgNode('svg',{viewBox:'0 0 600 25',role:'img','aria-label':items.map(i=>i.label+': '+i.value).join(', ')});for(const i of items){const width=600*Number(i.value)/total;svg.append(svgNode('rect',{x,y:0,width,height:25,fill:hex(i.color)}));x+=width}card.append(svg)}
  else{const max=Math.max(1,...items.map(i=>Number(i.value)||0));for(const item of items){const row=el('div','','visual-bar');row.append(el('span',item.label));const svg=svgNode('svg',{viewBox:'0 0 200 12',role:'img','aria-label':item.value});svg.append(svgNode('rect',{width:200,height:12,rx:3,fill:'#eee'}),svgNode('rect',{width:Math.max(0,200*(Number(item.value)||0)/max),height:12,rx:3,fill:'#5378b7'}));row.append(svg,el('strong',item.value+' '+(v.unit||'')));card.append(row)}}if(v.source)card.append(el('small','Nguồn: '+v.source));
 }else if(v.kind==='table'){const table=el('table'),head=el('tr');for(const c of v.columns||[])head.append(el('th',c));table.append(head);for(const row of v.rows||[]){const tr=el('tr');for(const c of row)tr.append(el('td',c));table.append(tr)}card.append(table)}
 else if(v.kind==='code'){card.append(el('small',v.language||'Code'),el('pre',v.code||''))}
 else if(v.kind==='type'||v.kind==='spacing'){for(const item of items){const row=el('div','','visual-bar');row.append(el('small',item.label+' · '+item.size+'px'));const svg=svgNode('svg',{viewBox:'0 0 280 80',role:'img','aria-label':item.label});if(v.kind==='type')svg.append(svgNode('text',{x:4,y:64,'font-size':Math.min(68,Number(item.size)||14),'font-weight':item.weight||400},'Công nghệ'));else svg.append(svgNode('rect',{x:0,y:24,width:Math.min(280,2*Number(item.size)),height:18,rx:3,fill:'#737373'}));row.append(svg);card.append(row)}}
 else if(v.kind==='wireframe'){const wire=el('div','','wire-preview');wire.append(el('div','Editorial Blog','wire-nav'));const grid=el('div','','wire-grid');for(let i=0;i<(v.layout==='article'?1:6);i++){const block=el('div');block.append(colorChip(['#e3ecdd','#eee5f5','#f5e8d4'][i%3]),el('strong',i===0?'Tiêu đề bài viết':'Chuyên mục'));grid.append(block)}wire.append(grid);card.append(wire)}
 else card.append(el('p','Khối chưa hỗ trợ preview · dữ liệu được bảo toàn','notice'));
 card.append(el('figcaption',v.caption||'Khối minh họa'));return card;
}
function renderVisual(){
 const root=$('visual-editor');root.replaceChildren();
 if(!active){root.append(el('p','Chọn bài viết để bắt đầu.'));return}
 if(active===POSTS&&postIndex>=0){
  let post;try{post=JSON.parse($('editor').value)}catch{root.append(el('p','Không thể mở bài viết an toàn.'));return}
  if(!post||!Array.isArray(post.sections)){root.append(el('p','Cấu trúc bài viết chưa hỗ trợ.'));return}
  const update=()=>{$('editor').value=JSON.stringify(post,null,2)};
  root.append(visualTitle('Tech Blog · Soạn trực tiếp'),editable('h1','Tiêu đề',post.title,v=>{post.title=v;update()}),editable('p','Mô tả',post.summary,v=>{post.summary=v;update()}),el('small','Slug: '+post.slug+' · '+post.date));
  post.sections.forEach((s,i)=>{
   const block=el('section','','article-section'),header=el('div','','row');
   header.append(visualTitle('Khối '+(i+1)),btn('↑',()=>{if(i>0){[post.sections[i-1],post.sections[i]]=[post.sections[i],post.sections[i-1]];update();renderVisual()}},'Di chuyển khối lên'),btn('↓',()=>{if(i<post.sections.length-1){[post.sections[i+1],post.sections[i]]=[post.sections[i],post.sections[i+1]];update();renderVisual()}},'Di chuyển khối xuống'));
   block.append(header,editable('h2','Tiêu đề phần '+(i+1),s.heading,v=>{s.heading=v;update()}));
   (s.paragraphs||[]).forEach((p,j)=>{const isCode=/^(css|js|javascript|ts|typescript|bash|sh|json|python|yaml|html|sql)\n/.test(p),isList=p.split('\n').every(line=>line.startsWith('- '));if(isCode||isList){const display=el('div','','protected-block');if(isCode)display.append(el('small',p.split('\n')[0]),el('pre',p.split('\n').slice(1).join('\n')));else{const list=el('ul');p.split('\n').forEach(line=>list.append(el('li',line.slice(2))));display.append(list)}display.append(el('small','Khối định dạng nâng cao · giữ nguyên'));block.append(display)}else block.append(editable('p','Đoạn '+(j+1),p,v=>{s.paragraphs[j]=v;update()}))});
   block.append(btn('+ Đoạn văn',()=>{s.paragraphs.push('');update();renderVisual()}));
   (s.visuals||[]).forEach(v=>block.append(visualBlock(v)));
   block.append(btn('Xóa phần',()=>{if(confirm('Xóa phần này cùng các hình minh họa của phần?')){post.sections.splice(i,1);update();renderVisual()}}));root.append(block);
  });
  root.append(btn('+ Thêm phần',()=>{post.sections.push({heading:'Tiêu đề phần',paragraphs:['']});update();renderVisual()}));return;
 }
 if(!active.startsWith('src/content/docs/')){root.append(el('p','Tài nguyên hệ thống được giữ nguyên. Chưa hỗ trợ chỉnh sửa trực quan.'));return}
 const raw=$('editor').value,m=raw.match(/^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))([\s\S]*)$/);
 if(!m){root.append(el('p','Cấu trúc đặc biệt: giữ nguyên nội dung để tránh mất dữ liệu.'));return}
 let front=m[2];let body=m[4];
 const update=()=>{$('editor').value=m[1]+front+m[3]+body};
 root.append(visualTitle('Knowledge Base · Soạn trực tiếp'));
 for(const [key,label] of [['title','Tiêu đề'],['description','Mô tả']]){
  const pattern=new RegExp('^'+key+':[ \\t]*([^\\r\\n]*)','m'),line=front.match(pattern);
  if(!line||!line[1]||/^[>|&*!{[\]]/.test(line[1])){root.append(el('p',label+': metadata đặc biệt, giữ nguyên.'));continue}
  let value=line[1];if(value.startsWith('"')){try{value=JSON.parse(value)}catch{root.append(el('p',label+': giữ nguyên.'));continue}}
  else if(value.startsWith("'")&&value.endsWith("'"))value=value.slice(1,-1).replace(/''/g,"'");
  else if(value.includes(' #')){root.append(el('p',label+': có ghi chú metadata, giữ nguyên.'));continue}
  root.append(editable(key==='title'?'h1':'p',label,value,v=>{front=front.replace(pattern,()=>key+': '+JSON.stringify(v));update()}));
 }
 // Preserve complex MDX without treating its source as editable HTML.
 const allowedImport=/^\s*import KnowledgeVisual from ['"][^'"\r\n]+KnowledgeVisual\.astro['"];?\s*$/;
 const visualTag=/^\s*<KnowledgeVisual id="([a-z0-9-]+)"\s*\/>\s*$/;
 const segments=body.split(/((?:\r?\n){2,})/);
 const unsupported=segments.some((part,i)=>i%2===0&&!allowedImport.test(part)&&!visualTag.test(part)&&/(^|\n)[ \t]*(?:\x60{3,}|~{3,}|:::|import\b|export\b|<)|[{}]/m.test(part));
 if(unsupported){root.append(el('p','Bài có cấu trúc nâng cao chưa hỗ trợ an toàn. Metadata có thể sửa; nội dung gốc được giữ nguyên.','notice'));return}
 let catalogue={};try{catalogue=JSON.parse(get('src/data/knowledge-visuals.json')||'{}')}catch{}
 const syncBody=()=>{body=segments.join('');update()};
 segments.forEach((part,i)=>{
  if(i%2||!part.trim()||allowedImport.test(part))return;
  const view=part.match(visualTag);if(view){root.append(catalogue[view[1]]?visualBlock(catalogue[view[1]]):el('p','Minh họa đã được bảo toàn','notice'));return}
  const trimmed=part.trim(),h=trimmed.match(/^(#{2,3}) ([^\r\n]+)$/);
  const leading=part.match(/^\s*/)[0],trailing=part.match(/\s*$/)[0];
  if(h){const node=editable(h[1].length===2?'h2':'h3','Tiêu đề phần',h[2],v=>{segments[i]=leading+h[1]+' '+v+trailing;syncBody()},{markdown:true});if(node){root.append(node);return}}
  else if(!/[\r\n]/.test(trimmed)&&!/^\s*(?:[-+>]|[0-9]+\.)\s/.test(trimmed)){const node=editable('p','Đoạn văn',trimmed,v=>{segments[i]=leading+v+trailing;syncBody()},{markdown:true});if(node){root.append(node);return}}
  else if(trimmed.startsWith('|')&&trimmed.split('\n').every(l=>l.trim().startsWith('|'))){const rows=trimmed.split('\n').map(line=>line.trim().slice(1,-1).split('|').map(cell=>cell.trim()));if(rows.length>=3&&rows[1].every(x=>/^:?-+:?$/.test(x))){const table=el('table','','paper-table');for(const [j,row] of rows.filter((_,j)=>j!==1).entries()){const tr=el('tr');for(const cell of row)tr.append(el(j===0?'th':'td',cell));table.append(tr)}root.append(table,el('small','Bảng gốc · bảo toàn'));return}}
  else if(trimmed.split('\n').every(l=>/^- /.test(l))){const list=el('ul');for(const line of trimmed.split('\n')){const li=el('li'),fragment=inlineMarkdown(line.slice(2));li.append(fragment||document.createTextNode(line.slice(2)));list.append(li)}root.append(list,el('small','Danh sách gốc · bảo toàn'));return}
  root.append(el('p','Khối định dạng nâng cao · giữ nguyên khi lưu','notice'));
 });
 root.append(btn('+ Thêm đoạn văn',()=>{body=segments.join('').replace(/\s*$/,'')+'\n\nĐoạn văn mới.\n';update();renderVisual()}));
}
let imageVersion=0,imageUrl='';
async function optimizeImage(file){
 const version=++imageVersion,info=$('image-info'),download=$('image-download'),preview=$('image-preview');
 download.hidden=true;preview.hidden=true;if(imageUrl){URL.revokeObjectURL(imageUrl);imageUrl=''}
 if(!file)return;
 if(file.size>30*1024*1024){info.textContent='Ảnh vượt 30 MB.';return}
 info.textContent='Đang tối ưu ảnh trên máy…';
 try{
  const source=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
  const img=new Image();img.src=source;await img.decode();
  if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>64_000_000)throw Error('Kích thước ảnh không hỗ trợ');
  const role=$('image-role').value,canvas=document.createElement('canvas'),w=role==='square'?1200:1600,h=role==='cover'?900:role==='square'?1200:1600;
  const scale=Math.min(1,w/img.naturalWidth,h/img.naturalHeight),iw=Math.max(1,Math.round(img.naturalWidth*scale)),ih=Math.max(1,Math.round(img.naturalHeight*scale));
  canvas.width=role==='content'?iw:w;canvas.height=role==='content'?ih:h;
  const ctx=canvas.getContext('2d');if(role!=='content'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height)}
  ctx.drawImage(img,Math.floor((canvas.width-iw)/2),Math.floor((canvas.height-ih)/2),iw,ih);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.85));if(!blob||blob.type!=='image/webp')throw Error('Trình duyệt không hỗ trợ xuất WebP');
  if(version!==imageVersion)return;
  imageUrl=URL.createObjectURL(blob);download.href=imageUrl;
  const name=file.name.replace(/\.[^.]+$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'hinh-anh';
  download.download=name+'.webp';download.hidden=false;preview.src=canvas.toDataURL('image/webp',0.85);preview.alt=$('image-alt').value;preview.hidden=false;
  info.textContent=canvas.width+' × '+canvas.height+' px · '+Math.ceil(blob.size/1024)+' KB · WebP · Chưa tải lên GitHub';
 }catch(e){if(version===imageVersion)info.textContent='Không đọc được ảnh. HEIC cần trình duyệt hỗ trợ; thử xuất JPG/PNG trước.'}
}
let selectedImage=null;
$('image-file').onchange=e=>{selectedImage=e.target.files[0];optimizeImage(selectedImage)};
$('image-role').onchange=()=>{if(selectedImage)optimizeImage(selectedImage)};
$('image-alt').oninput=()=>{$('image-preview').alt=$('image-alt').value};
$('image-drop').ondragover=e=>{e.preventDefault();$('image-drop').classList.add('drop-target')};
$('image-drop').ondragleave=()=>{$('image-drop').classList.remove('drop-target')};
$('image-drop').ondrop=e=>{e.preventDefault();$('image-drop').classList.remove('drop-target');selectedImage=e.dataTransfer.files[0];optimizeImage(selectedImage)};

window.addEventListener('beforeunload',e=>{if(unsaved()){e.preventDefault();e.returnValue=''}});
(async()=>{try{const session=await request('session');nonce=session.nonce;login=session.login;mergeSnapshot(await request('local'),'Checkout local');if(!conflicts.length)status('Sẵn sàng soạn offline.');}catch(e){status(e.message);state()}})();
