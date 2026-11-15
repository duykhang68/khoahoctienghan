import {newBlock,kinds,slugify,metadata,buildDocument,richKinds,inlineRuns,richLines} from './model.mjs';
import {mountRich,paintRuns} from './rich-browser.mjs';
import {optimizeMedia,mediaInfo} from './media.mjs';
import {githubClient} from './github.mjs';
import {rememberPublicReceipt} from '../sheet-blog/progress-browser.mjs';
import {seriesProgress} from './series-progress.mjs';
import {mountDrawio,downloadDrawio,importDrawio} from './drawio-browser.mjs';
import {blueprintParts,instantiateBlueprint} from './blueprints.mjs';
import {validDraft,selectWorkspace,moveBlock,readingMinutes} from './core/editor-reducer.mjs';
const legacyKey='khoahoctienghan.editor-v2.draft.v1',activeKey='khoahoctienghan.editor-v2.active.v2';
const storageKey=kind=>'khoahoctienghan.editor-v2.draft.v2.'+kind;
const workspace={
 tech:{title:'Engineering Editorial',description:'Viết nghiên cứu, kiến trúc và bài kỹ thuật theo phong cách Tech Blog.',library:'Khối kỹ thuật',help:'Ưu tiên phân tích, code, bảng so sánh và ảnh minh họa.',outline:'＋ Thêm dàn ý kỹ thuật',sections:['Bối cảnh và vấn đề','Giải pháp và kiến trúc','Triển khai và kiểm thử','Kết luận'],compose:'02 · ENGINEERING ARTICLE',settings:'Thông tin bài kỹ thuật',destination:'Tech Blog',path:'/techblog/',preview:'XEM TRƯỚC · TECH BLOG',group:'Engineering',labels:'Astro, CI/CD…',placeholder:'Tiêu đề bài nghiên cứu kỹ thuật',summary:'Tóm tắt vấn đề và phát hiện chính'},
 knowledge:{title:'Knowledge Editorial',description:'Biên soạn bài học theo chuyên mục của Tri thức Hàn Quốc.',library:'Khối bài học',help:'Ưu tiên khái niệm, ví dụ, bảng đối chiếu, ghi chú và hình minh họa.',outline:'＋ Thêm dàn ý bài học',sections:['Khái niệm và bối cảnh','Nội dung chính','Ví dụ minh họa','Ghi nhớ và luyện tập'],compose:'02 · KNOWLEDGE LESSON',settings:'Thông tin bài học',destination:'Tri thức Hàn Quốc',path:'Chuyên mục đã chọn',preview:'XEM TRƯỚC · TRI THỨC HÀN QUỐC',group:'Tri thức Hàn Quốc',labels:'Hangul, TOPIK…',placeholder:'Tiêu đề bài học',summary:'Nội dung và mục tiêu bài học'}
};
const palettes=[['#e3ecdd','#b6c9b1'],['#eee5f5','#c9b7df'],['#f5e8d4','#e4bd94'],['#e2edf5','#b4ccdf'],['#f5e4e3','#e5b8b5']];
const names={paragraph:'Đoạn văn',heading:'Tiêu đề H2',subheading:'Tiêu đề H3',detailheading:'Tiêu đề H4',quote:'Trích dẫn',bullet:'Danh sách',ordered:'Danh sách số',note:'Ghi chú',code:'Mã nguồn',table:'Bảng',image:'Ảnh WebP',diagram:'Sơ đồ draw.io',divider:'Đường phân cách'};
const make=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el};
const empty=(kind='tech')=>({title:'',summary:'',kind,category:'ngon-ngu',labels:'',series:{enabled:false,name:'',part:1,total_parts:1,target_date:''},blocks:[newBlock('paragraph')]});
export function mountEditor(root,revision=null){
 if(!root)return;
 const $=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)],field=k=>$('[data-field="'+k+'"]'),base=root.dataset.base;
 let active='tech',client=null,busy=false,uploads=0,mode='write',timer;
 const valid=validDraft;
 const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
 // Preserve the legacy draft in its original destination without deleting the recovery copy.
 const legacy=read(legacyKey);
 if(valid(legacy)&&Object.hasOwn(workspace,legacy.kind)){try{if(!localStorage.getItem(storageKey(legacy.kind)))localStorage.setItem(storageKey(legacy.kind),JSON.stringify(legacy))}catch{}}
 const requested=new URLSearchParams(location.hash.slice(1)).get('workspace'),remembered=read(activeKey);
 active=selectWorkspace(requested,remembered,legacy,workspace);
 function load(kind){const saved=read(storageKey(kind));if(valid(saved))return {...empty(kind),...saved,kind};if(valid(legacy)&&legacy.kind===kind)return {...empty(kind),...legacy,kind};return empty(kind)}
 if(revision)active=revision.draft.kind;
 let draft=revision?structuredClone(revision.draft):load(active);
 const drawio=mountDrawio(root,{onSave:(block,value)=>{if(!draft.blocks.includes(block))return;Object.assign(block,value);render();store();if(mode==='preview')showPreview();$('[data-result]').textContent='Đã lưu sơ đồ và ảnh WebP vào bản nháp.'}});
 function openDrawio(block,source){if(busy||uploads||drawio.isOpen())return;try{drawio.open(block,source)}catch(e){$('[data-result]').textContent=e.message}}
 const topicIds=Array.from(field('category').options,o=>o.value);
 function writeFields(){for(const k of ['title','summary','category','labels'])field(k).value=draft[k];field('seriesEnabled').checked=!!draft.series.enabled;for(const [key,prop] of [['seriesName','name'],['part','part'],['total','total_parts'],['target','target_date']])field(key).value=draft.series[prop]??'';}
 function readFields(){draft.kind=active;for(const key of ['title','summary','category','labels'])draft[key]=field(key).value;draft.series={enabled:field('seriesEnabled').checked,name:field('seriesName').value,part:field('part').value,total_parts:field('total').value,target_date:field('target').value};}
 function store(){clearTimeout(timer);if(revision){$('[data-save-status]').textContent='Bản sửa chỉ trong phiên này';return true;}try{localStorage.setItem(storageKey(active),JSON.stringify(draft));$('[data-save-status]').textContent='Đã lưu bản nháp trên thiết bị';return true}catch{$('[data-save-status]').textContent='Bộ nhớ đầy · lưu bản sao ngay';return false}}
 function renderSeriesProgress(){
  if(!draft.series.enabled)return;
  const p=seriesProgress(draft.series),box=$('[data-series-progress]');
  const fmt=value=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(value);
  const set=(selector,value)=>{const el=$(selector);if(el.textContent!==value)el.textContent=value};
  const bar=$('[data-series-bar]');bar.hidden=!p.valid;bar.value=p.percent??0;
  set('[data-series-percent]',p.valid?fmt(p.percent)+'%':'—');
  set('[data-series-position]',p.valid?'Tập '+p.part+' / '+p.total+' · Tiến độ dự kiến':'Số tập phải từ 1 đến tổng số tập.');
  set('[data-series-remaining]',p.valid?p.remainingParts+' tập · '+fmt(p.remainingPercent)+'%':'—');
  const state=p.days===null?'unset':p.days<0?'overdue':p.days===0?'today':p.days<=3?'near':'future';
  box.dataset.deadlineState=state;
  set('[data-series-days]',p.days===null?'—':p.days<0?Math.abs(p.days)+' ngày trễ':p.days===0?'Hôm nay':p.days+' ngày');
  set('[data-series-deadline]',p.days===null?'Chọn ngày dự kiến kết thúc.':p.days<0?'Đã quá hạn theo lịch GMT+7.':p.days===0?'Hạn kết thúc là hôm nay (GMT+7).':'Hạn '+draft.series.target_date.split('-').reverse().join('/')+' · GMT+7');
 }
 function update(){readFields();renderSeriesProgress();$('[data-category-label]').hidden=draft.kind!=='knowledge';$('[data-auto-category]').hidden=draft.kind!=='tech';$('[data-series]').hidden=!draft.series.enabled;$('[data-route]').textContent=base+'/'+(draft.kind==='tech'?'techblog':draft.category)+'/'+(revision?revision.slug:slugify(draft.title)||'ten-bai-viet')+'/';$('[data-publish]').disabled=busy||uploads>0||!client||!$('[data-confirm]').checked||!draft.title.trim();all('[data-workspace]').forEach(b=>b.disabled=busy||uploads>0);$('[data-new]').disabled=busy||uploads>0;$('[data-media-upload]').disabled=busy||uploads>0;syncBlueprintButton();clearTimeout(timer);timer=setTimeout(store,350);}
 function button(label,fn,aria){const b=make('button',label);b.type='button';if(aria)b.setAttribute('aria-label',aria);b.addEventListener('click',fn);return b}
 function renderMedia(){const tray=$('[data-media-list]');tray.replaceChildren();const blocks=draft.blocks.filter(b=>['image','diagram'].includes(b.kind));let total=0,missing=0;for(const b of blocks){let info;try{info=mediaInfo(b)}catch{info={bytes:0,width:0,height:0,ready:false}}total+=info.bytes;if(!info.ready)missing++;const row=make('div',undefined,'ev2-media-row');if(info.bytes){const img=make('img');img.src=b.src;img.alt=b.alt||'Ảnh chưa có mô tả';img.width=info.width;img.height=info.height;row.append(img)}const body=make('div');body.append(make('strong',b.alt||'Chưa có mô tả'),make('small',info.bytes?info.width+' × '+info.height+' px · '+Math.ceil(info.bytes/1024)+' KiB · WebP':'Chưa có ảnh'));body.append(make('small',info.ready?'Sẵn sàng':'Cần bổ sung ảnh hoặc alt'));row.append(body);tray.append(row)}$('[data-media-summary]').textContent=blocks.length+' ảnh/sơ đồ · '+Math.ceil(total/1024)+' KiB · '+missing+' mục cần hoàn thiện';if(!blocks.length)tray.append(make('p','Chưa có ảnh trong bản nháp này.'));}
 function render(){const area=$('[data-blocks]');area.replaceChildren();
  draft.blocks.forEach((b,i)=>{
   const wrapper=make('section',undefined,'ev2-block');wrapper.dataset.kind=b.kind;
   const top=make('div',undefined,'ev2-block-top'),tools=make('div',undefined,'ev2-block-tools');
   top.append(make('small',String(i+1).padStart(2,'0')+' · '+names[b.kind]),tools);
   const move=offset=>{const next=moveBlock(draft.blocks,i,offset);if(next===draft.blocks)return;draft.blocks=next;render();store()};
   const up=button('↑',()=>move(-1),'Di chuyển khối '+(i+1)+' lên');up.disabled=i===0;
   const down=button('↓',()=>move(1),'Di chuyển khối '+(i+1)+' xuống');down.disabled=i===draft.blocks.length-1;
   tools.append(up,down,button('×',()=>{draft.blocks.splice(i,1);if(!draft.blocks.length)draft.blocks.push(newBlock('paragraph'));render();store()},'Xóa khối '+(i+1)));
   if(revision?.fixed)tools.hidden=true;
   wrapper.append(top);
   if(b.kind==='divider')wrapper.append(make('hr'));
   else if(b.kind==='diagram'){
    const actions=make('div',undefined,'ev2-diagram-actions');
    const edit=button(b.drawioXml?'Chỉnh sửa sơ đồ':'Mở draw.io',()=>openDrawio(b));actions.append(edit);
    const importLabel=make('label','Nhập file .drawio'),file=make('input');file.type='file';file.accept='.drawio,.xml';importLabel.append(file);actions.append(importLabel);
    file.addEventListener('change',async()=>{const selected=file.files?.[0];if(!selected||busy||uploads||drawio.isOpen())return;uploads++;update();try{const xml=await importDrawio(selected);if(draft.blocks.includes(b))drawio.open(b,xml)}catch(e){$('[data-result]').textContent=e.message}finally{uploads--;file.value='';update()}});
    if(b.drawioXml){actions.append(button('Tải file .drawio',()=>{try{downloadDrawio(b.drawioXml)}catch(e){$('[data-result]').textContent=e.message}}))}
    const repo=make('a','Mở repository trong github.dev');repo.href='https://github.dev/duykhang68/khoahoctienghan';repo.target='_blank';repo.rel='noopener noreferrer';actions.append(repo);wrapper.append(actions);
    for(const [key,label,max] of [['alt','Mô tả sơ đồ (bắt buộc)',500],['caption','Chú thích sơ đồ (tùy chọn)',1000]]){const l=make('label',label),input=make('input');input.value=b[key]||'';input.maxLength=max;input.addEventListener('input',()=>{b[key]=input.value;store();renderMedia()});l.append(input);wrapper.append(l)}
    if(b.src&&/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(b.src)){const image=make('img');image.src=b.src;image.alt=b.alt||'';wrapper.append(image)}
    else wrapper.append(make('p','Chưa có sơ đồ. Vẽ hoặc nhập file, rồi lưu từ draw.io.','ev2-diagram-empty'));
   }
   else if(b.kind==='image'){
    const label=make('label','Chọn ảnh từ thiết bị'),input=make('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/gif';label.append(input);wrapper.append(label);
    const altLabel=make('label','Mô tả ảnh (bắt buộc)'),alt=make('input');alt.value=b.alt||'';alt.maxLength=500;alt.addEventListener('input',()=>{b.alt=alt.value;store();renderMedia()});altLabel.append(alt);wrapper.append(altLabel);
    if(b.src&&/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(b.src)){const image=make('img');image.src=b.src;image.alt=b.alt||'';wrapper.append(image)}
    input.addEventListener('change',async()=>{const f=input.files?.[0];if(!f||busy||uploads>0)return;uploads++;update();try{const image=await optimizeMedia(f);if(!draft.blocks.includes(b))return;Object.assign(b,image);render();store();if(mode==='preview')showPreview()}catch(e){$('[data-result]').textContent=e.message}finally{input.value='';uploads--;update()}});
   }else if(b.kind==='table'){
    const table=make('div',undefined,'ev2-table');
    b.rows.forEach((row,ri)=>{const tr=make('div',undefined,'ev2-table-row');tr.style.gridTemplateColumns='repeat('+row.length+',minmax(0,1fr))';row.forEach((cell,ci)=>{const input=make('input');input.value=cell;input.maxLength=2000;input.setAttribute('aria-label','Ô bảng '+(ri+1)+', '+(ci+1));input.addEventListener('input',()=>{b.rows[ri][ci]=input.value;store()});tr.append(input)});table.append(tr)});
    wrapper.append(table,button('+ Hàng',()=>{if(b.rows.length<20)b.rows.push(Array(b.rows[0].length).fill(''));render();store()}),button('+ Cột',()=>{if(b.rows[0].length<8)b.rows.forEach(r=>r.push(''));render();store()}),button('− Hàng',()=>{if(b.rows.length>2)b.rows.pop();render();store()}),button('− Cột',()=>{if(b.rows[0].length>2)b.rows.forEach(r=>r.pop());render();store()}));
   }else{
    if(b.kind==='note'){const select=make('select');select.setAttribute('aria-label','Loại ghi chú');for(const [v,t] of [['info','Thông tin'],['tip','Mẹo'],['warning','Cảnh báo']]){const o=make('option',t);o.value=v;select.append(o)}select.value=b.tone||'info';select.addEventListener('change',()=>{b.tone=select.value;store()});wrapper.append(select)}
    if(b.guide){const guide=make('div',undefined,'ev2-template-guide');guide.append(make('strong','Gợi ý viết · không xuất bản'),make('p',b.guide));wrapper.append(guide)}
    if(richKinds.includes(b.kind)){
     const fmt=make('div',undefined,'ev2-block-tools ev2-rich-toolbar'),input=make('div',undefined,'ev2-rich');input.setAttribute('aria-label',names[b.kind]+' '+(i+1));input.dataset.placeholder='Bôi đen chữ để định dạng…';
     if(revision?.fixed)fmt.hidden=true;wrapper.append(fmt,input);mountRich(input,fmt,b,()=>{store();if(mode==='preview')showPreview()},message=>{$('[data-result]').textContent=message});
    }else{
     const input=make('textarea');input.value=b.text||'';input.rows=['heading','subheading','detailheading'].includes(b.kind)?2:4;input.maxLength=50000;input.placeholder='Nhập nội dung…';input.setAttribute('aria-label',names[b.kind]+' '+(i+1));
     input.addEventListener('input',()=>{b.text=input.value;store()});wrapper.append(input);
    }
   }
   area.append(wrapper);
  });renderMedia();
 }
 function showPreview(){
  $('[data-preview-title]').textContent=draft.title||'Bài viết chưa có tiêu đề';$('[data-preview-summary]').textContent=draft.summary;
  const w=workspace[active],slug=revision?revision.slug:slugify(draft.title)||'ten-bai-viet',coverKey=active==='tech'?slug:draft.category+'/'+slug;const palette=palettes[Array.from(coverKey).reduce((n,c)=>n+c.charCodeAt(0),0)%palettes.length];$('[data-preview-cover]').style.background='linear-gradient(135deg,'+palette.join(',')+')';$('[data-preview-group]').textContent=w.group;$('[data-preview-topic]').textContent=active==='tech'?'Tự động phân loại sau khi xuất bản':field('category').selectedOptions[0]?.textContent||'';$('[data-preview-reading]').hidden=active!=='tech';$('[data-reading-minutes]').textContent=readingMinutes(draft.blocks)+' phút';$('[data-preview-summary]').hidden=active==='knowledge';
  const meta=$('[data-preview-meta]');meta.textContent=[draft.labels,draft.series.enabled?draft.series.name+' · Tập '+draft.series.part+'/'+draft.series.total_parts:''].filter(Boolean).join(' · ');meta.hidden=!meta.textContent;
  const target=$('[data-preview-body]');target.replaceChildren();
  for(const b of draft.blocks){
   const t=b.text||'';let node;
   if(b.kind==='image'||b.kind==='diagram'){if(!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(b.src||''))continue;const image=make('img');image.src=b.src;image.alt=b.alt||'';image.width=b.width;image.height=b.height;if(b.kind==='diagram'&&b.caption){node=make('figure');node.append(image,make('figcaption',b.caption))}else node=image}
   else if(b.kind==='table'){node=make('table');for(const [i,row] of b.rows.entries()){const tr=make('tr');row.forEach(v=>tr.append(make(i?'td':'th',v)));node.append(tr)}}
   else if(b.kind==='bullet'||b.kind==='ordered'){if(!t.trim())continue;node=make(b.kind==='bullet'?'ul':'ol');richLines(inlineRuns(b)).filter(line=>line.map(p=>p.text).join('').trim()).forEach(line=>{const li=make('li');paintRuns(li,line);li.style.whiteSpace='pre-wrap';node.append(li)})}
   else if(b.kind==='divider')node=make('hr');
   else{if(!t.trim())continue;node=make(({heading:'h2',subheading:'h3',detailheading:'h4',quote:'blockquote',code:'pre',note:'aside'})[b.kind]||'p',t);node.style.whiteSpace='pre-wrap'}
   if(richKinds.includes(b.kind)&&!['bullet','ordered'].includes(b.kind))paintRuns(node,inlineRuns(b));target.append(node);
  }
 }
 function applyWorkspace(){
  const w=workspace[active];root.dataset.workspaceKind=active;
  for(const [selector,value] of Object.entries({'[data-workspace-title]':w.title,'[data-workspace-description]':w.description,'[data-library-title]':w.library,'[data-library-help]':w.help,'[data-outline]':w.outline,'[data-compose-kicker]':w.compose,'[data-settings-title]':w.settings,'[data-destination]':w.destination,'[data-destination-path]':w.path,'[data-preview-kicker]':w.preview}))$(selector).textContent=value;
  field('title').placeholder=w.placeholder;field('summary').placeholder=w.summary;field('labels').placeholder=w.labels;
  all('[data-workspace]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.workspace===active)));
  const tools=$('.ev2-block-buttons');const order=active==='tech'?['paragraph','heading','subheading','code','diagram','table','note','image','quote','bullet','ordered','divider']:['paragraph','heading','subheading','note','bullet','ordered','diagram','table','image','quote','code','divider'];
  for(const kind of order){const b=$('.ev2-block-buttons [data-add="'+kind+'"]');if(b)tools.append(b)}
 }
 function syncBlueprintButton(){const choice=$('[data-blueprint-select]');$('[data-blueprint-insert]').disabled=busy||uploads>0||!choice.value}
 function describeBlueprint(){
  const value=$('[data-blueprint-select]').value,parts=blueprintParts(value),preview=$('[data-blueprint-preview]'),list=$('[data-blueprint-headings]');
  list.replaceChildren();preview.hidden=!parts.length;
  const titles=parts.filter(p=>p.text);for(const title of titles){const li=make('li',title.text);li.dataset.level=title.kind;list.append(li)}
  $('[data-blueprint-summary]').textContent=titles.length+' đề mục · '+parts.length+' khối chỉnh sửa';
  syncBlueprintButton();
 }
 function resetBlueprint(){$('[data-blueprint-select]').value='';$('[data-blueprint-status]').textContent='Chỉ chèn thêm, không ghi đè nội dung.';describeBlueprint()}
 $('[data-blueprint-select]').addEventListener('change',describeBlueprint);
 $('[data-blueprint-insert]').addEventListener('click',()=>{
  if(busy||uploads)return;
  const id=$('[data-blueprint-select]').value,parts=instantiateBlueprint(id);if(!parts.length)return;
  if(draft.blocks.length+parts.length>250){$('[data-blueprint-status]').textContent='Không đủ chỗ: tối đa 250 khối mỗi bài. Xóa bớt khối trước khi chèn.';return}
  const start=draft.blocks.length;draft.blocks.push(...parts);setMode('write');render();store();resetBlueprint();
  $('[data-blueprint-status]').textContent='Đã chèn '+parts.length+' khối. Nội dung cũ được giữ nguyên.';
  $('[data-blocks]').children[start]?.scrollIntoView({block:'nearest'});
 });
 function switchWorkspace(next){
  if(revision||next===active||busy||uploads||!Object.hasOwn(workspace,next))return;
  readFields();if(!store()){$('[data-result]').textContent='Không thể lưu bản nháp đang mở. Lưu bản sao hoặc giải phóng bộ nhớ trước khi đổi workspace.';return}
  active=next;draft=load(active);try{localStorage.setItem(activeKey,JSON.stringify(active))}catch{}
  history.replaceState(null,'',location.pathname+location.search+'#workspace='+active);
  $('[data-confirm]').checked=false;$('[data-result]').textContent='Chưa gửi GitHub. Bản nháp tự lưu trên trình duyệt.';
  resetBlueprint();applyWorkspace();writeFields();render();setMode('write');update();
 }
 all('[data-workspace]').forEach(b=>b.addEventListener('click',()=>switchWorkspace(b.dataset.workspace)));
 $('[data-outline]').addEventListener('click',()=>{if(busy||uploads||draft.blocks.length+workspace[active].sections.length*2>250)return;for(const title of workspace[active].sections){draft.blocks.push({...newBlock('heading'),text:title},newBlock('paragraph'))}setMode('write');render();store()});
 function setMode(next){mode=next;$('[data-write]').hidden=next!=='write';$('[data-preview]').hidden=next!=='preview';all('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));if(next==='preview')showPreview()}
 all('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
 $('[data-media-upload]').addEventListener('change',async event=>{const input=event.currentTarget,files=[...input.files];if(!files.length||busy||uploads)return;if(files.length>10||draft.blocks.length+files.length>250){$('[data-result]').textContent='Tối đa 10 ảnh mỗi lượt và 250 khối mỗi bài.';input.value='';return;}uploads++;update();let added=0,failed=0;try{for(const file of files){try{const value=await optimizeMedia(file);draft.blocks.push({...newBlock('image'),...value});added++;}catch{failed++;}}setMode('write');render();const saved=store();$('[data-result]').textContent='Đã thêm '+added+' ảnh WebP; '+failed+' ảnh không hợp lệ. Bổ sung alt trước khi gửi.'+(saved?'':' Lưu bản sao ngay nếu bộ nhớ đầy.');}finally{uploads--;input.value='';update();}});
 all('[data-add]').forEach(b=>b.addEventListener('click',()=>{if(draft.blocks.length>=250)return;draft.blocks.push(newBlock(b.dataset.add));setMode('write');render();store();$('[data-blocks]').lastElementChild?.scrollIntoView({block:'nearest'})}));
 all('[data-field]').forEach(el=>{const changed=()=>{update();if(mode==='preview')showPreview()};el.addEventListener('input',changed);if(el.tagName==='SELECT')el.addEventListener('change',changed)});
 $('[data-confirm]').addEventListener('change',update);
 root.addEventListener('editor-import',e=>{if(revision||busy||uploads||drawio.isOpen()){e.preventDefault();return;}if(active!==e.detail.kind&&!store()){e.preventDefault();return;}try{localStorage.setItem(storageKey(e.detail.kind),JSON.stringify(e.detail));localStorage.setItem(activeKey,JSON.stringify(e.detail.kind));}catch{e.preventDefault();return;}clearTimeout(timer);active=e.detail.kind;draft=e.detail;resetBlueprint();applyWorkspace();writeFields();render();setMode('write');$('[data-confirm]').checked=false;history.replaceState(null,'',location.pathname+location.search+'#workspace='+active);update();store()});
 $('[data-backup]').addEventListener('click',()=>{store();const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'})),a=make('a');a.href=url;a.download=(slugify(draft.title)||'ban-nhap')+'.editor-v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
 $('[data-new]').addEventListener('click',()=>{if(revision||busy||uploads||!confirm('Tạo bài mới? Hãy lưu bản sao nếu cần giữ bản nháp hiện tại.'))return;draft=empty(active);resetBlueprint();writeFields();render();setMode('write');$('[data-confirm]').checked=false;update();store()});
 const dialog=$('[data-auth]'),tokenInput=$('[data-token]');
 function connection(login){$('[data-connection]').textContent=login?'Đã kết nối · '+login:'Chưa kết nối GitHub';$('[data-connect]').textContent=login?'Ngắt GitHub':'Kết nối GitHub';update()}
 $('[data-connect]').addEventListener('click',()=>{if(busy)return;if(client){client=null;connection('');return}tokenInput.value='';$('[data-auth-status]').textContent='';dialog.showModal()});
 $('[data-close-auth]').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{tokenInput.value=''});
 $('[data-auth-submit]').addEventListener('click',async()=>{const token=tokenInput.value.trim();tokenInput.value='';if(!token.startsWith('github'+'_pat_')){$('[data-auth-status]').textContent='Cần fine-grained personal access token.';return}const b=$('[data-auth-submit]');b.disabled=true;try{const candidate=revision?revision.connect(token):githubClient(token),login=await candidate.verify();if(!dialog.open)return;client=candidate;connection(login);dialog.close()}catch(e){$('[data-auth-status]').textContent=e.message}finally{b.disabled=false}});
 $('[data-publish]').addEventListener('click',async()=>{if(!client||busy||uploads||!$('[data-confirm]').checked)return;busy=true;update();store();const result=$('[data-result]');try{const snapshot=structuredClone(draft);if(revision){const pr=await client.revise(snapshot);const link=make('a','Mở PR nháp #'+pr.number);link.href=pr.url;link.target='_blank';link.rel='noopener noreferrer';result.replaceChildren(make('span','Đã tạo PR nháp chỉnh sửa. '),link);$('[data-confirm]').checked=false;return;}metadata(snapshot);await buildDocument(snapshot.blocks);const queued=await client.publish(snapshot,topicIds,message=>result.textContent=message);rememberPublicReceipt(queued,snapshot.title);const link=make('a','Xem commit '+queued.sha.slice(0,7));link.href=queued.commitUrl;link.target='_blank';link.rel='noopener noreferrer';const queue=make('a','Mở hàng đợi Issue');queue.href=queued.queueUrl;queue.target='_blank';queue.rel='noopener noreferrer';result.replaceChildren(make('span','Đã gửi commit · Chờ GitHub tạo Issue và xử lý FIFO. '),link,make('span',' · '),queue);$('[data-confirm]').checked=false}catch(e){result.textContent=e.message}finally{busy=false;update()}});
 window.addEventListener('pagehide',store);window.addEventListener('focus',renderSeriesProgress);document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderSeriesProgress()});window.setInterval(()=>{if(!document.hidden)renderSeriesProgress()},60000);applyWorkspace();writeFields();render();update();
 if(revision){const banner=make('p','CHỈNH SỬA BÀI ĐÃ XUẤT BẢN · '+revision.route+(revision.fixed?' · Giữ nguyên bố cục và minh họa gốc, chỉ sửa chữ.':' · Giữ nguyên URL và ngày xuất bản.'));banner.setAttribute('role','status');root.prepend(banner);$('[data-publish]').textContent='Tạo PR nháp chỉnh sửa';$('[data-result]').textContent='Chưa gửi thay đổi. Bản sửa không ghi đè bản nháp bài mới.';for(const selector of ['.ev2-workspace-nav','[data-backup]','[data-restore]','[data-new]','.ev2-queue-link'])$(selector).hidden=true;for(const key of ['category','labels','seriesEnabled','seriesName','part','total','target'])field(key).disabled=true;if(revision.fixed){for(const el of all('[data-add], [data-outline], [data-blueprints], .ev2-media-tray'))el.hidden=true;}}
}
