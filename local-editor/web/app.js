const $=id=>document.getElementById(id), MENU='src/data/knowledge-menu.json',POSTS='src/data/techblog/posts.json';
const KEY='trithuchanquoc-editor-drafts-v1', MEDIA_INDEX='src/data/editor-images.json';
const assetPath=p=>/^public\/media\/editor\/[a-f0-9]{64}\.webp$/.test(p);
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
function stageMany(changes){
 const next={...drafts};
 for(const [p,content] of changes){const base=snapshot.files[p];if(content===base?.content)delete next[p];else next[p]={before:Object.hasOwn(next,p)?next[p].before:base?.hash??null,content};}
 try{localStorage.setItem(KEY,JSON.stringify(next))}catch{throw Error('Bộ nhớ nháp local đã đầy. Sync/Pull hoặc bỏ bản nháp không cần thiết trước khi chèn ảnh.')}
 drafts=next;renderFiles();state();
}
function stage(p,content){stageMany([[p,content]])}
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
 const term=$('filter').value.toLowerCase(),all=[...new Set([...Object.keys(snapshot.files),...Object.keys(drafts)])].filter(p=>p!==MENU&&p!==MEDIA_INDEX&&!assetPath(p)&&(scope==='all'||(scope==='tech'?p===POSTS:p.startsWith('src/content/docs/')))).sort();
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
$('sync').onclick=()=>action(async()=>{if(unsaved()){status('Hãy lưu nội dung/menu đang chỉnh trước khi Sync.');return}const refs=(get(POSTS)||'')+'\n'+(get(MEDIA_INDEX)||'');const changes=Object.entries(drafts).filter(([path])=>!assetPath(path)||refs.includes(path.slice('public'.length))).map(([path,d])=>({path,...d}));if(!changes.length){status('Không có thay đổi nội dung hoặc ảnh đã chèn để Sync.');return}if(!confirm('Tạo PR với '+changes.length+' tệp? Không ghi trực tiếp main.'))return;const p=await request('sync',{changes});const link=el('a','PR #'+p.number+' · '+p.sha.slice(0,12));link.href=p.url;link.target='_blank';link.rel='noopener noreferrer';$('pr').replaceChildren(link,document.createTextNode(' — Đã gửi, chờ CI/merge/production. Bản nháp giữ đến khi Pull thấy nội dung đã merge.'));$('pr').hidden=false;status('Đã tạo PR #'+p.number+'; không phải đã triển khai.')});

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
  const palette=el('div','','palette');for(const item of items){const sample=el('div','','swatch');if(v.kind==='buttons'){sample.append(el('strong',item.label||''));for(const [name,color] of [['Normal',item.color],['Hover',item.hover]]){const svg=svgNode('svg',{viewBox:'0 0 160 52',role:'img','aria-label':name+' '+(item.value||'')});svg.append(svgNode('rect',{x:2,y:2,width:156,height:48,rx:8,fill:hex(color)}),svgNode('text',{x:80,y:31,'text-anchor':'middle','font-size':12,'font-weight':600,fill:hex(item.foreground)},String(item.value||'').slice(0,22)));sample.append(el('small',name),svg)}}else sample.append(colorChip(item.color),el('strong',item.label||''),el('small',item.color||''),el('small',item.detail||''));palette.append(sample)}card.append(palette);
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
 else if(v.kind==='wireframe'){
  const device=(cols,count,label)=>{const frame=el('div','','wire-preview');frame.append(el('div','Editorial Blog','wire-nav'));const grid=el('div','','wire-grid wire-cols-'+cols);for(let i=0;i<count;i++){const block=el('div');block.append(colorChip(['#e3ecdd','#eee5f5','#f5e8d4'][i%3]),el('strong',i===0?'Tiêu đề bài viết':'Chuyên mục'));grid.append(block)}frame.append(grid);if(label)frame.append(el('small',label,'wire-device-label'));return frame};
  if(v.layout==='responsive'){const devices=el('div','','wire-devices');devices.append(device(3,6,'Desktop · 3 cột'),device(2,4,'Tablet · 2 cột'),device(1,2,'Mobile · 1 cột'));card.append(devices)}
  else if(v.layout==='article'){const frame=device(1,1,'Trang bài viết');const article=el('div','','wire-article');article.append(el('h3','Tiêu đề phần'),el('p','Nội dung bài viết · bố cục đọc'),colorChip('#e2edf5'));frame.append(article);card.append(frame)}
  else card.append(device(3,6,'Danh sách bài viết'));
 }
 else card.append(el('p','Khối chưa hỗ trợ preview · dữ liệu được bảo toàn','notice'));
 card.append(el('figcaption',v.caption||'Khối minh họa'));return card;
}

const visualKinds={swatches:'Bảng màu',buttons:'Trạng thái nút',type:'Typography',spacing:'Khoảng cách',wireframe:'Wireframe',table:'Bảng dữ liệu',flow:'Sơ đồ quy trình',bars:'Biểu đồ',code:'Khối mã minh họa'};
const cataloguePath='src/data/knowledge-visuals.json';
const copyVisual=v=>JSON.parse(JSON.stringify(v));
function defaultItem(kind){const item={label:'Mục mới'};if(kind==='swatches'||kind==='buttons')item.color='#2459A6';if(kind==='buttons')Object.assign(item,{value:'Nút mẫu',foreground:'#FFFFFF',hover:'#193C73'});if(kind==='type')Object.assign(item,{size:17,weight:400});if(kind==='spacing')item.size=16;if(kind==='bars')Object.assign(item,{value:'1',color:'#2459A6'});return item}
function defaultVisual(kind){const v={kind,caption:'Minh họa đề xuất'};if(kind==='wireframe')v.layout='listing';else if(kind==='code')Object.assign(v,{language:'text',code:'Ví dụ minh họa'});else if(kind==='table')Object.assign(v,{columns:['Cột 1','Cột 2'],rows:[['Nội dung','Nội dung']]});else{v.items=[defaultItem(kind)];if(kind==='bars')Object.assign(v,{unit:'đơn vị',source:'Ví dụ minh họa, không phải số liệu đo lường'});}return v}
function visualError(v){
 const nonempty=x=>typeof x==='string'&&x.trim().length>0,validHex=x=>/^#[0-9a-f]{6}$/i.test(x||'');
 if(!Object.hasOwn(visualKinds,v.kind)||!nonempty(v.caption))return 'Cần chú thích minh họa.';
 if(v.kind==='wireframe')return ['listing','article','responsive'].includes(v.layout)?'':'Chọn bố cục.';
 if(v.kind==='code')return nonempty(v.language)&&nonempty(v.code)?'':'Cần ngôn ngữ và nội dung mã.';
 if(v.kind==='table')return v.columns?.length&&v.columns.every(nonempty)&&v.rows?.length&&v.rows.every(r=>r.length===v.columns.length&&r.every(nonempty))?'':'Mỗi cột và ô bảng cần có nội dung.';
 if(!v.items?.length||v.items.length>50||!v.items.every(i=>nonempty(i.label)))return 'Cần 1–50 mục có tên.';
 if(v.variant==='cycle'&&(v.items.length!==5||!v.centerLabel||v.centerLabel.length!==2||v.centerLabel.some(x=>!nonempty(x)||Array.from(x).length>18)))return 'Vòng lặp cần 5 bước và 2 dòng trung tâm, tối đa 18 ký tự mỗi dòng.';
 if(v.variant==='summary'&&(v.items.length<2||v.items.length>5||v.items.reduce((sum,i)=>sum+Number(i.value),0)<=0||v.items.some(i=>!validHex(i.color))))return 'Tổng hợp cần 2–5 mục, màu hợp lệ và tổng lớn hơn 0.';
 for(const i of v.items){
  if(['swatches','buttons'].includes(v.kind)&&!validHex(i.color))return 'Màu HEX không hợp lệ.';
  if(v.kind==='buttons'&&(!validHex(i.foreground)||!validHex(i.hover)||!nonempty(i.value)))return 'Cần đủ màu nền, chữ, hover và nhãn nút.';
  if(['type','spacing'].includes(v.kind)&&(!Number.isInteger(i.size)||i.size<1||i.size>(v.kind==='type'?80:160)))return 'Kích thước không hợp lệ.';
  if(v.kind==='type'&&(!Number.isInteger(i.weight)||i.weight<100||i.weight>900))return 'Độ đậm phải từ 100 đến 900.';
  if(v.kind==='bars'&&(!nonempty(i.value)||!Number.isFinite(Number(i.value))||Number(i.value)<0))return 'Giá trị biểu đồ phải là số không âm.';
 }
 if(v.kind==='bars'&&(!nonempty(v.unit)||!nonempty(v.source)))return 'Cần đơn vị và nguồn số liệu.';
 return '';
}
function openVisualEditor(original,onApply,{shared=false}={}){
 const model=copyVisual(original),dialog=el('dialog','','visual-dialog'),head=el('div','','visual-dialog-head'),layout=el('div','','visual-dialog-grid'),preview=el('div','','visual-live'),fields=el('div','','visual-controls'),error=el('p','','visual-error');error.setAttribute('role','status');
 dialog.setAttribute('aria-label','Chỉnh sửa '+visualKinds[model.kind]);head.append(el('h2','Chỉnh sửa '+visualKinds[model.kind]),btn('Đóng',()=>dialog.close()));
 layout.append(preview,fields);const footer=el('div','','visual-dialog-footer');
 const save=btn('Áp dụng',()=>{const msg=visualError(model);if(msg){error.textContent=msg;return}try{onApply(copyVisual(model));dialog.close()}catch(e){error.textContent=e.message}});
 save.className='visual-apply';footer.append(error,btn('Hủy',()=>dialog.close()),save);dialog.append(head,layout,footer);
 const redraw=()=>{const msg=visualError(model);error.textContent=msg;save.disabled=!!msg;preview.replaceChildren(el('p','Xem trước trực tiếp','eyebrow'),visualBlock(model))};
 const field=(parent,label,obj,key,{type='text',choices,min,max,step,optional=false}={})=>{
  const wrap=el('label',label,'visual-control'),input=el(choices?'select':type==='textarea'?'textarea':'input');
  if(choices){for(const [value,name] of choices)input.add(new Option(name,value));input.value=obj[key]??''}
  else{if(type!=='textarea')input.type=type;input.value=type==='color'?hex(obj[key]):obj[key]??'';if(type==='number'){if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);if(step!==undefined)input.step=String(step)}}
  input.setAttribute('aria-label',label);const change=()=>{if(type==='number'&&key!=='value')obj[key]=input.value===''?null:Number(input.value);else if(optional&&input.value==='')delete obj[key];else obj[key]=input.value;redraw()};input.addEventListener('input',change);if(choices)input.addEventListener('change',change);wrap.append(input);parent.append(wrap);return input;
 };
 const addRow=(parent,label,fn)=>{const button=btn(label,()=>{fn();build();redraw()});parent.append(button);return button};
 function build(){
  fields.replaceChildren();if(shared)fields.append(el('p','Minh họa dùng chung: thay đổi áp dụng cho mọi bài tham chiếu khối này.','notice'));
  field(fields,'Tiêu đề minh họa',model,'title',{optional:true});field(fields,'Chú thích',model,'caption',{type:'textarea'});
  if(model.kind==='wireframe'){field(fields,'Bố cục',model,'layout',{choices:[['listing','Danh sách bài viết'],['article','Trang bài viết'],['responsive','Desktop / tablet / mobile']]});return}
  if(model.kind==='code'){field(fields,'Ngôn ngữ',model,'language');field(fields,'Nội dung mã (chỉ hiển thị, không thực thi)',model,'code',{type:'textarea'});return}
  if(model.kind==='table'){
   const cols=el('div','','visual-item');cols.append(el('strong','Tên cột'));model.columns.forEach((_,i)=>{field(cols,'Cột '+(i+1),model.columns,i);const remove=addRow(cols,'Xóa cột '+(i+1),()=>{model.columns.splice(i,1);model.rows.forEach(row=>row.splice(i,1))});remove.disabled=model.columns.length<=1});addRow(cols,'+ Cột',()=>{model.columns.push('Cột mới');model.rows.forEach(row=>row.push('Nội dung'))});fields.append(cols);
   model.rows.forEach((row,i)=>{const group=el('div','','visual-item');group.append(el('strong','Dòng '+(i+1)));row.forEach((_,j)=>field(group,'Ô '+(i+1)+'.'+(j+1),row,j));const remove=addRow(group,'Xóa dòng '+(i+1),()=>model.rows.splice(i,1));remove.disabled=model.rows.length<=1;fields.append(group)});addRow(fields,'+ Dòng',()=>model.rows.push(model.columns.map(()=> 'Nội dung')));return;
  }
  if(model.kind==='flow'||model.kind==='bars'){
   const variant=el('select');variant.setAttribute('aria-label','Kiểu hiển thị');const normal=model.kind==='flow'?'Luồng tuyến tính':'Biểu đồ thanh',special=model.kind==='flow'?'cycle':'summary';
   variant.add(new Option(normal,''));variant.add(new Option(model.kind==='flow'?'Vòng lặp 5 bước':'Tổng hợp tỷ lệ',special));variant.value=model.variant||'';
   const wrap=el('label','Kiểu hiển thị','visual-control');wrap.append(variant);fields.append(wrap);
   variant.onchange=()=>{if(variant.value){const n=special==='cycle'?5:Math.min(5,Math.max(2,model.items.length));if(model.items.length>n&&!confirm('Đổi kiểu sẽ bỏ '+(model.items.length-n)+' mục cuối trong bản đang sửa. Tiếp tục?')){variant.value=model.variant||'';return}model.items=model.items.slice(0,n);while(model.items.length<n)model.items.push(defaultItem(model.kind));model.variant=special;if(special==='cycle')model.centerLabel=model.centerLabel||['Quy trình','Lặp lại'];else model.items.forEach(i=>{if(!/^#[0-9a-f]{6}$/i.test(i.color||''))i.color='#2459A6'});}else{delete model.variant;delete model.centerLabel}build();redraw()};
  }
  if(model.variant==='cycle'){if(!model.centerLabel)model.centerLabel=['Quy trình','Lặp lại'];field(fields,'Trung tâm dòng 1',model.centerLabel,0);field(fields,'Trung tâm dòng 2',model.centerLabel,1)}
  if(model.kind==='bars'){field(fields,'Đơn vị',model,'unit');field(fields,'Nguồn dữ liệu',model,'source')}
  const fixed=model.variant==='cycle',min=model.variant==='summary'?2:fixed?5:1,max=model.variant==='summary'||fixed?5:50;
  model.items.forEach((item,i)=>{
   const group=el('div','','visual-item');group.append(el('strong','Mục '+(i+1)));field(group,'Tên mục '+(i+1),item,'label');
   if(['swatches','buttons'].includes(model.kind)||model.variant==='summary')field(group,'Màu '+(i+1),item,'color',{type:'color'});
   if(model.kind==='buttons'){field(group,'Nhãn nút '+(i+1),item,'value');field(group,'Màu chữ '+(i+1),item,'foreground',{type:'color'});field(group,'Màu hover '+(i+1),item,'hover',{type:'color'})}
   if(['swatches','type','flow'].includes(model.kind))field(group,'Mô tả '+(i+1),item,'detail',{optional:true});
   if(model.kind==='flow'&&model.variant!=='cycle')field(group,'Biểu tượng '+(i+1),item,'icon',{choices:[['','Mũi tên'],['file','Tài liệu'],['pull','Pull request'],['shield','Bảo mật'],['merge','Merge'],['cloud','Đám mây'],['check','Hoàn thành']],optional:true});
   if(['type','spacing'].includes(model.kind))field(group,'Kích thước '+(i+1),item,'size',{type:'number',min:1,max:model.kind==='type'?80:160,step:1});
   if(model.kind==='type')field(group,'Độ đậm '+(i+1),item,'weight',{type:'number',min:100,max:900,step:100});
   if(model.kind==='bars')field(group,'Giá trị '+(i+1),item,'value',{type:'number',min:0,step:'any'});
   const controls=el('div','','actions');const up=addRow(controls,'↑ Lên',()=>{[model.items[i-1],model.items[i]]=[model.items[i],model.items[i-1]]});up.disabled=i===0;const down=addRow(controls,'↓ Xuống',()=>{[model.items[i+1],model.items[i]]=[model.items[i],model.items[i+1]]});down.disabled=i===model.items.length-1;const remove=addRow(controls,'Xóa mục '+(i+1),()=>model.items.splice(i,1));remove.disabled=model.items.length<=min;group.append(controls);fields.append(group);
  });const add=addRow(fields,'+ Thêm mục',()=>model.items.push(defaultItem(model.kind)));add.disabled=model.items.length>=max;
 }
 build();redraw();dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
}
function editableVisual(v,onApply,opts={}){
 const box=el('div','','visual-editable-block');box.append(visualBlock(v));const controls=el('div','','visual-block-actions');controls.append(btn('Chỉnh sửa minh họa',()=>openVisualEditor(v,onApply,opts)));
 if(opts.remove)controls.append(btn('Xóa minh họa',()=>{if(confirm('Xóa minh họa khỏi phần này?'))opts.remove()}));
 box.append(controls);return box;
}
function knowledgeVisual(id,v){
 return editableVisual(v,updated=>{const latest=JSON.parse(get(cataloguePath)||'{}');if(!Object.hasOwn(latest,id)||JSON.stringify(latest[id])!==JSON.stringify(v))throw Error('Minh họa đã thay đổi. Mở lại để chỉnh sửa.');latest[id]=updated;stage(cataloguePath,JSON.stringify(latest,null,2)+'\n');renderVisual();status('Đã lưu minh họa local. Sync sẽ tạo PR, không ghi trực tiếp main.')},{shared:true});
}
function visualPicker(onApply){
 const row=el('div','','visual-picker'),select=el('select');select.setAttribute('aria-label','Loại minh họa');for(const [kind,name] of Object.entries(visualKinds))select.add(new Option(name,kind));row.append(select,btn('+ Thêm minh họa',()=>openVisualEditor(defaultVisual(select.value),onApply)));return row;
}

function routeForDoc(path){return path.slice('src/content/docs/'.length).replace(/\.mdx?$/,'').replace(/(^|\/)index$/,'$1').replace(/\/$/,'')}
function knowledgeMedia(){return JSON.parse(get(MEDIA_INDEX)||'{}')}
function imageCard(image,onRemove,cover=false){
 const fig=el('figure','','editor-image-card'),img=el('img');img.alt=image.alt;img.width=image.width;img.height=image.height;
 const bytes=get('public'+image.src);if(bytes)img.src='data:image/webp;base64,'+bytes;else fig.append(el('p','Ảnh chưa có trong checkout/Pull local.','notice'));
 fig.append(img,el('figcaption',image.caption||image.alt));if(cover)fig.prepend(el('small','Ảnh đại diện · 16:9'));if(onRemove)fig.append(btn('Gỡ ảnh khỏi bài',()=>{if(confirm('Gỡ ảnh khỏi bài? Tệp đã xuất bản không bị xóa tự động.'))onRemove()}));return fig;
}
function appendKnowledgeMedia(root){
 const route=routeForDoc(active),record=knowledgeMedia()[route];if(!record)return;
 if(record.cover)root.prepend(imageCard(record.cover,()=>removeKnowledgeImage('cover'),true));
 if(record.images.length){const section=el('section','','article-section');section.append(visualTitle('Ảnh cuối nội dung'));record.images.forEach((image,i)=>section.append(imageCard(image,()=>removeKnowledgeImage(i))));root.append(section)}
}
function removeKnowledgeImage(index){
 const records=knowledgeMedia(),route=routeForDoc(active),record=records[route];if(index==='cover')delete record.cover;else record.images.splice(index,1);if(!record.cover&&!record.images.length)delete records[route];stage(MEDIA_INDEX,JSON.stringify(records,null,2)+'\n');renderVisual();
}
function positionPicker(length,label='Vị trí minh họa',value=length){
 const select=el('select');select.setAttribute('aria-label',label);
 for(let i=0;i<=length;i++)select.add(new Option(i===0?'Trước đoạn đầu':i===length?'Cuối phần':'Sau đoạn '+i,String(i)));
 select.value=String(value);return select;
}
function blockPosition(value,length){return Number.isInteger(value.afterParagraph)?value.afterParagraph:length}
function renderVisual(){
 const root=$('visual-editor');root.replaceChildren();refreshImageTarget();
 if(!active){root.append(el('p','Chọn bài viết để bắt đầu.'));return}
 if(active===POSTS&&postIndex>=0){
  let post;try{post=JSON.parse($('editor').value)}catch{root.append(el('p','Không thể mở bài viết an toàn.'));return}
  if(!post||!Array.isArray(post.sections)){root.append(el('p','Cấu trúc bài viết chưa hỗ trợ.'));return}
  const update=()=>{$('editor').value=JSON.stringify(post,null,2)};
  root.append(visualTitle('Tech Blog · Soạn trực tiếp'),editable('h1','Tiêu đề',post.title,v=>{post.title=v;update()}),editable('p','Mô tả',post.summary,v=>{post.summary=v;update()}),el('small','Slug: '+post.slug+' · '+post.date));
  if(/^\/media\/editor\/[a-f0-9]{64}\.webp$/.test(post.cover||''))root.append(imageCard({src:post.cover,alt:post.coverAlt,caption:post.coverCaption,width:1600,height:900},()=>{delete post.cover;delete post.coverAlt;delete post.coverCaption;update();renderVisual()},true));
  post.sections.forEach((s,i)=>{
   const block=el('section','','article-section'),header=el('div','','row');
   header.append(visualTitle('Khối '+(i+1)),btn('↑',()=>{if(i>0){[post.sections[i-1],post.sections[i]]=[post.sections[i],post.sections[i-1]];update();renderVisual()}},'Di chuyển khối lên'),btn('↓',()=>{if(i<post.sections.length-1){[post.sections[i+1],post.sections[i]]=[post.sections[i],post.sections[i+1]];update();renderVisual()}},'Di chuyển khối xuống'));
   block.append(header,editable('h2','Tiêu đề phần '+(i+1),s.heading,v=>{s.heading=v;update()}));
   const length=s.paragraphs.length;
   const place=(position)=>{for(const [j,v] of (s.visuals||[]).entries())if(blockPosition(v,length)===position){const box=editableVisual(v,updated=>{s.visuals[j]=updated;update();renderVisual()},{remove:()=>{s.visuals.splice(j,1);update();renderVisual()}});const select=positionPicker(length,'Di chuyển minh họa '+(j+1),position);select.onchange=()=>{v.afterParagraph=Number(select.value);update();renderVisual()};box.append(select);block.append(box)}
    for(const [j,image] of (s.images||[]).entries())if(blockPosition(image,length)===position){const card=imageCard(image,()=>{s.images.splice(j,1);update();renderVisual()});const select=positionPicker(length,'Di chuyển ảnh '+(j+1),position);select.onchange=()=>{image.afterParagraph=Number(select.value);update();renderVisual()};card.append(select);block.append(card)}};
   place(0);
   (s.paragraphs||[]).forEach((p,j)=>{const isCode=/^(css|js|javascript|ts|typescript|bash|sh|json|python|yaml|html|sql)\n/.test(p),isList=p.split('\n').every(line=>line.startsWith('- '));if(isCode||isList){const display=el('div','','protected-block');if(isCode)display.append(el('small',p.split('\n')[0]),el('pre',p.split('\n').slice(1).join('\n')));else{const list=el('ul');p.split('\n').forEach(line=>list.append(el('li',line.slice(2))));display.append(list)}display.append(el('small','Khối định dạng nâng cao · giữ nguyên'));block.append(display)}else block.append(editable('p','Đoạn '+(j+1),p,v=>{s.paragraphs[j]=v;update()}));place(j+1)});
   block.append(btn('+ Đoạn văn',()=>{s.paragraphs.push('');update();renderVisual()}));
   const position=positionPicker(length,'Vị trí chèn minh họa');
   block.append(position,btn('+ Chèn ảnh vào phần này',()=>openImageLibrary(i+':'+position.value)));
   if(!/^(tài liệu|tham khảo|nguồn tham khảo|nguồn và tài liệu)/iu.test(s.heading.trim()))block.append(visualPicker(v=>{v.afterParagraph=Number(position.value);(s.visuals??=[]).push(v);update();renderVisual()}));
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
 let catalogue={};try{catalogue=JSON.parse(get(cataloguePath)||'{}')}catch{}
 if(unsupported){root.append(el('p','Bài có cấu trúc nâng cao. Nội dung gốc được giữ nguyên; vẫn có thể chỉnh sửa các minh họa đã nhận diện.','notice'));for(const part of segments){const view=part.match(visualTag);if(view&&catalogue[view[1]])root.append(knowledgeVisual(view[1],catalogue[view[1]]))}appendKnowledgeMedia(root);return}
 const syncBody=()=>{body=segments.join('');update()};
 segments.forEach((part,i)=>{
  if(i%2||!part.trim()||allowedImport.test(part))return;
  const view=part.match(visualTag);if(view){root.append(catalogue[view[1]]?knowledgeVisual(view[1],catalogue[view[1]]):el('p','Minh họa đã được bảo toàn','notice'));return}
  const trimmed=part.trim(),h=trimmed.match(/^(#{2,3}) ([^\r\n]+)$/);
  const leading=part.match(/^\s*/)[0],trailing=part.match(/\s*$/)[0];
  if(h){const node=editable(h[1].length===2?'h2':'h3','Tiêu đề phần',h[2],v=>{segments[i]=leading+h[1]+' '+v+trailing;syncBody()},{markdown:true});if(node){root.append(node);return}}
  else if(!/[\r\n]/.test(trimmed)&&!/^\s*(?:[-+>]|[0-9]+\.)\s/.test(trimmed)){const node=editable('p','Đoạn văn',trimmed,v=>{segments[i]=leading+v+trailing;syncBody()},{markdown:true});if(node){root.append(node);return}}
  else if(trimmed.startsWith('|')&&trimmed.split('\n').every(l=>l.trim().startsWith('|'))){const rows=trimmed.split('\n').map(line=>line.trim().slice(1,-1).split('|').map(cell=>cell.trim()));if(rows.length>=3&&rows[1].every(x=>/^:?-+:?$/.test(x))){const table=el('table','','paper-table');for(const [j,row] of rows.filter((_,j)=>j!==1).entries()){const tr=el('tr');for(const cell of row)tr.append(el(j===0?'th':'td',cell));table.append(tr)}root.append(table,el('small','Bảng gốc · bảo toàn'));return}}
  else if(trimmed.split('\n').every(l=>/^- /.test(l))){const list=el('ul');for(const line of trimmed.split('\n')){const li=el('li'),fragment=inlineMarkdown(line.slice(2));li.append(fragment||document.createTextNode(line.slice(2)));list.append(li)}root.append(list,el('small','Danh sách gốc · bảo toàn'));return}
  root.append(el('p','Khối định dạng nâng cao · giữ nguyên khi lưu','notice'));
 });
 if(active.endsWith('.mdx')){
  const positions=el('select');positions.setAttribute('aria-label','Vị trí minh họa Knowledge Base');positions.add(new Option('Cuối bài',String(segments.length)));
  for(let i=0;i<segments.length;i+=2){if(segments[i].trim()&&!allowedImport.test(segments[i]))positions.add(new Option('Sau khối '+(i/2+1),String(i+1)))}
  root.append(positions,visualPicker(v=>{
   const latest=JSON.parse(get(cataloguePath)||'{}'),id='visual-'+crypto.randomUUID();latest[id]=v;
   const parts=segments.slice(),at=Number(positions.value),tag='<KnowledgeVisual id="'+id+'" />';
   if(at===parts.length)body=parts.join('').replace(/\s*$/,'')+'\n\n'+tag+'\n';
   else{parts.splice(at,0,'\n\n'+tag);body=parts.join('')}
   if(!segments.some(part=>allowedImport.test(part))){const depth=active.slice('src/content/docs/'.length).split('/').length;body='import KnowledgeVisual from \''+'../'.repeat(depth+1)+'components/KnowledgeVisual.astro\';\n\n'+body.replace(/^\s*/,'')}
   update();stageMany([[active,$('editor').value],[cataloguePath,JSON.stringify(latest,null,2)+'\n']]);renderVisual();
  }));
 }
 appendKnowledgeMedia(root);
 root.append(btn('+ Chèn ảnh vào cuối bài',()=>openImageLibrary()));
 root.append(btn('+ Thêm đoạn văn',()=>{body=segments.join('').replace(/\s*$/,'')+'\n\nĐoạn văn mới.\n';update();renderVisual()}));
}
let imageVersion=0,imageUrl='',optimized=null;
function refreshImageTarget(preferred){
 const target=$('image-target'),previous=preferred??target.value;target.replaceChildren();
 const role=$('image-role').value;
 if(active===POSTS&&postIndex>=0){
  if(role==='cover')target.add(new Option('Ảnh đại diện bài Tech Blog','cover'));
  else{try{JSON.parse($('editor').value).sections.forEach((s,i)=>{const n=s.paragraphs.length;const reference=/^(tài liệu|tham khảo|nguồn tham khảo|nguồn và tài liệu)/iu.test(s.heading.trim());target.add(new Option('Cuối phần '+(i+1)+' · '+s.heading,i+':'+n));if(!reference)for(let j=0;j<n;j++)target.add(new Option('Phần '+(i+1)+' · '+(j===0?'trước đoạn đầu':'sau đoạn '+j),i+':'+j))})}catch{}}
 }else if(active.startsWith('src/content/docs/')){
  if(role==='cover'){if(routeForDoc(active))target.add(new Option('Ảnh đại diện Knowledge Base','cover'))}
  else target.add(new Option('Cuối nội dung Knowledge Base','end'));
 }
 if([...target.options].some(o=>o.value===String(previous)))target.value=String(previous);
 $('image-insert').disabled=!optimized||!target.options.length;
}
function openImageLibrary(index){$('image-role').value='content';$('image-preview').closest('details').open=true;refreshImageTarget(index);if(selectedImage)optimizeImage(selectedImage);$('image-file').focus()}
async function insertImage(){
 if(!optimized||$('image-insert').disabled)return;
 const image=optimized,role=$('image-role').value,target=$('image-target').value,alt=$('image-alt').value.trim(),caption=$('image-caption').value.trim();
 if(!alt||alt.length>500||caption.length>1000){status('Cần mô tả ảnh tối đa 500 ký tự; chú thích tối đa 1000 ký tự.');return}
 const record={src:image.src,alt,caption,width:image.width,height:image.height},changes=[[ 'public'+record.src,image.content ]]; 
 if(active===POSTS&&postIndex>=0){
  const post=JSON.parse($('editor').value);
  if(role==='cover'){if(post.cover&&!confirm('Thay thế ảnh đại diện hiện tại?'))return;post.cover=record.src;post.coverAlt=alt;post.coverCaption=caption}
  else{const [i,j]=target.split(':').map(Number),section=post.sections[i];if(!section||!Number.isInteger(j)||j<0||j>section.paragraphs.length)throw Error('Chọn vị trí chèn ảnh.');record.afterParagraph=j;(section.images??=[]).push(record)}
  const next=postList.slice();next[postIndex]=post;changes.push([POSTS,JSON.stringify(next,null,2)+'\n']);stageMany(changes);postList=next;$('editor').value=JSON.stringify(post,null,2);renderPosts();
 }else if(active.startsWith('src/content/docs/')){
  const records=knowledgeMedia(),route=routeForDoc(active),item=records[route]??{images:[]};
  if(role==='cover'){if(!route)throw Error('Trang chủ không có ảnh đại diện bài.');if(item.cover&&!confirm('Thay thế ảnh đại diện hiện tại?'))return;item.cover=record}else item.images.push(record);
  records[route]=item;changes.push([MEDIA_INDEX,JSON.stringify(records,null,2)+'\n'],[active,$('editor').value]);stageMany(changes);
 }else throw Error('Chọn bài viết trước khi chèn ảnh.');
 renderVisual();status('Đã chèn WebP và lưu bản nháp local. Sync để gửi ảnh cùng nội dung lên GitHub.');
}
$('image-insert').onclick=()=>{try{insertImage().catch(e=>status(e.message))}catch(e){status(e.message)}};

async function optimizeImage(file){
 const version=++imageVersion,info=$('image-info'),download=$('image-download'),preview=$('image-preview');
 optimized=null;refreshImageTarget();download.hidden=true;preview.hidden=true;if(imageUrl){URL.revokeObjectURL(imageUrl);imageUrl=''}
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
  if(blob.size>1_500_000)throw Error('WebP vượt 1,5 MB. Hãy chọn ảnh nhỏ hơn để lưu nháp.');
  const bytes=await blob.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
  if(version!==imageVersion)return;
  optimized={src:'/media/editor/'+hash+'.webp',content:String(url).split(',')[1],width:canvas.width,height:canvas.height};refreshImageTarget();
  imageUrl=URL.createObjectURL(blob);download.href=imageUrl;
  const name=file.name.replace(/\.[^.]+$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'hinh-anh';
  download.download=name+'.webp';download.hidden=false;preview.src=String(url);preview.alt=$('image-alt').value;preview.hidden=false;
  info.textContent=canvas.width+' × '+canvas.height+' px · '+Math.ceil(blob.size/1024)+' KB · WebP · Chưa tải lên GitHub';
 }catch(e){if(version===imageVersion)info.textContent=(e instanceof Error?e.message:'Không đọc được ảnh')+' · HEIC cần trình duyệt hỗ trợ; có thể dùng JPG/PNG.'}
}
let selectedImage=null;
$('image-file').onchange=e=>{selectedImage=e.target.files[0];optimizeImage(selectedImage)};
$('image-role').onchange=()=>{refreshImageTarget();if(selectedImage)optimizeImage(selectedImage)};
$('image-alt').oninput=()=>{$('image-preview').alt=$('image-alt').value};
$('image-drop').ondragover=e=>{e.preventDefault();$('image-drop').classList.add('drop-target')};
$('image-drop').ondragleave=()=>{$('image-drop').classList.remove('drop-target')};
$('image-drop').ondrop=e=>{e.preventDefault();$('image-drop').classList.remove('drop-target');selectedImage=e.dataTransfer.files[0];optimizeImage(selectedImage)};

document.addEventListener('paste',e=>{if(!$('image-preview').closest('details').open)return;const file=[...(e.clipboardData?.files||[])].find(f=>f.type.startsWith('image/'));if(file){e.preventDefault();selectedImage=file;optimizeImage(file)}});
window.addEventListener('beforeunload',e=>{if(unsaved()){e.preventDefault();e.returnValue=''}});
(async()=>{try{const session=await request('session');nonce=session.nonce;login=session.login;mergeSnapshot(await request('local'),'Checkout local');if(!conflicts.length)status('Sẵn sàng soạn offline.');}catch(e){status(e.message);state()}})();
