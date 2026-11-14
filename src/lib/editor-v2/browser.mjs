import {newBlock,kinds,slugify,metadata,buildDocument} from './model.mjs';
import {githubClient} from './github.mjs';
import {seriesProgress} from './series-progress.mjs';
const legacyKey='khoahoctienghan.editor-v2.draft.v1',activeKey='khoahoctienghan.editor-v2.active.v2';
const storageKey=kind=>'khoahoctienghan.editor-v2.draft.v2.'+kind;
const workspace={
 tech:{title:'Engineering Editorial',description:'Viết nghiên cứu, kiến trúc và bài kỹ thuật theo phong cách Tech Blog.',library:'Khối kỹ thuật',help:'Ưu tiên phân tích, code, bảng so sánh và ảnh minh họa.',outline:'＋ Thêm dàn ý kỹ thuật',sections:['Bối cảnh và vấn đề','Giải pháp và kiến trúc','Triển khai và kiểm thử','Kết luận'],compose:'02 · ENGINEERING ARTICLE',settings:'Thông tin bài kỹ thuật',destination:'Tech Blog',path:'/techblog/',preview:'XEM TRƯỚC · TECH BLOG',group:'Engineering',labels:'Astro, CI/CD…',placeholder:'Tiêu đề bài nghiên cứu kỹ thuật',summary:'Tóm tắt vấn đề và phát hiện chính'},
 knowledge:{title:'Knowledge Editorial',description:'Biên soạn bài học theo chuyên mục của Tri thức Hàn Quốc.',library:'Khối bài học',help:'Ưu tiên khái niệm, ví dụ, bảng đối chiếu, ghi chú và hình minh họa.',outline:'＋ Thêm dàn ý bài học',sections:['Khái niệm và bối cảnh','Nội dung chính','Ví dụ minh họa','Ghi nhớ và luyện tập'],compose:'02 · KNOWLEDGE LESSON',settings:'Thông tin bài học',destination:'Tri thức Hàn Quốc',path:'Chuyên mục đã chọn',preview:'XEM TRƯỚC · TRI THỨC HÀN QUỐC',group:'Tri thức Hàn Quốc',labels:'Hangul, TOPIK…',placeholder:'Tiêu đề bài học',summary:'Nội dung và mục tiêu bài học'}
};
const palettes=[['#e3ecdd','#b6c9b1'],['#eee5f5','#c9b7df'],['#f5e8d4','#e4bd94'],['#e2edf5','#b4ccdf'],['#f5e4e3','#e5b8b5']];
const names={paragraph:'Đoạn văn',heading:'Tiêu đề H2',subheading:'Tiêu đề H3',quote:'Trích dẫn',bullet:'Danh sách',ordered:'Danh sách số',note:'Ghi chú',code:'Mã nguồn',table:'Bảng',image:'Ảnh WebP',divider:'Đường phân cách'};
const make=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el};
const empty=(kind='tech')=>({title:'',summary:'',kind,category:'ngon-ngu',labels:'',series:{enabled:false,name:'',part:1,total_parts:1,target_date:''},blocks:[newBlock('paragraph')]});
export function mountEditor(root){
 if(!root)return;
 const $=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)],field=k=>$('[data-field="'+k+'"]'),base=root.dataset.base;
 let active='tech',client=null,busy=false,uploads=0,mode='write',timer;
 const valid=saved=>saved&&Array.isArray(saved.blocks)&&saved.blocks.every(b=>kinds.includes(b.kind));
 const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
 // Preserve the legacy draft in its original destination without deleting the recovery copy.
 const legacy=read(legacyKey);
 if(valid(legacy)&&Object.hasOwn(workspace,legacy.kind)){try{if(!localStorage.getItem(storageKey(legacy.kind)))localStorage.setItem(storageKey(legacy.kind),JSON.stringify(legacy))}catch{}}
 const requested=new URLSearchParams(location.hash.slice(1)).get('workspace'),remembered=read(activeKey);
 if(Object.hasOwn(workspace,requested))active=requested;else if(Object.hasOwn(workspace,remembered))active=remembered;else if(valid(legacy)&&Object.hasOwn(workspace,legacy.kind))active=legacy.kind;
 function load(kind){const saved=read(storageKey(kind));if(valid(saved))return {...empty(kind),...saved,kind};if(valid(legacy)&&legacy.kind===kind)return {...empty(kind),...legacy,kind};return empty(kind)}
 let draft=load(active);
 const topicIds=Array.from(field('category').options,o=>o.value);
 function writeFields(){for(const k of ['title','summary','category','labels'])field(k).value=draft[k];field('seriesEnabled').checked=!!draft.series.enabled;for(const [key,prop] of [['seriesName','name'],['part','part'],['total','total_parts'],['target','target_date']])field(key).value=draft.series[prop]??'';}
 function readFields(){draft.kind=active;for(const key of ['title','summary','category','labels'])draft[key]=field(key).value;draft.series={enabled:field('seriesEnabled').checked,name:field('seriesName').value,part:field('part').value,total_parts:field('total').value,target_date:field('target').value};}
 function store(){clearTimeout(timer);try{localStorage.setItem(storageKey(active),JSON.stringify(draft));$('[data-save-status]').textContent='Đã lưu bản nháp trên thiết bị';return true}catch{$('[data-save-status]').textContent='Bộ nhớ đầy · lưu bản sao ngay';return false}}
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
 function update(){readFields();renderSeriesProgress();$('[data-category-label]').hidden=draft.kind!=='knowledge';$('[data-auto-category]').hidden=draft.kind!=='tech';$('[data-series]').hidden=!draft.series.enabled;$('[data-route]').textContent=base+'/'+(draft.kind==='tech'?'techblog':draft.category)+'/'+(slugify(draft.title)||'ten-bai-viet')+'/';$('[data-publish]').disabled=busy||uploads>0||!client||!$('[data-confirm]').checked||!draft.title.trim();all('[data-workspace]').forEach(b=>b.disabled=busy||uploads>0);$('[data-new]').disabled=busy||uploads>0;clearTimeout(timer);timer=setTimeout(store,350);}
 function button(label,fn,aria){const b=make('button',label);b.type='button';if(aria)b.setAttribute('aria-label',aria);b.addEventListener('click',fn);return b}
 function render(){const area=$('[data-blocks]');area.replaceChildren();
  draft.blocks.forEach((b,i)=>{
   const wrapper=make('section',undefined,'ev2-block');wrapper.dataset.kind=b.kind;
   const top=make('div',undefined,'ev2-block-top'),tools=make('div',undefined,'ev2-block-tools');
   top.append(make('small',String(i+1).padStart(2,'0')+' · '+names[b.kind]),tools);
   const move=offset=>{const j=i+offset;if(j<0||j>=draft.blocks.length)return;[draft.blocks[i],draft.blocks[j]]=[draft.blocks[j],draft.blocks[i]];render();store()};
   const up=button('↑',()=>move(-1),'Di chuyển khối '+(i+1)+' lên');up.disabled=i===0;
   const down=button('↓',()=>move(1),'Di chuyển khối '+(i+1)+' xuống');down.disabled=i===draft.blocks.length-1;
   tools.append(up,down,button('×',()=>{draft.blocks.splice(i,1);if(!draft.blocks.length)draft.blocks.push(newBlock('paragraph'));render();store()},'Xóa khối '+(i+1)));
   wrapper.append(top);
   if(b.kind==='divider')wrapper.append(make('hr'));
   else if(b.kind==='image'){
    const label=make('label','Chọn ảnh từ thiết bị'),input=make('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/gif';label.append(input);wrapper.append(label);
    const altLabel=make('label','Mô tả ảnh (bắt buộc)'),alt=make('input');alt.value=b.alt||'';alt.maxLength=500;alt.addEventListener('input',()=>{b.alt=alt.value;store()});altLabel.append(alt);wrapper.append(altLabel);
    if(b.src&&/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(b.src)){const image=make('img');image.src=b.src;image.alt=b.alt||'';wrapper.append(image)}
    input.addEventListener('change',async()=>{const f=input.files?.[0];if(!f)return;uploads++;update();try{if(f.size>30_000_000)throw Error('Ảnh gốc tối đa 30 MB.');const bitmap=await createImageBitmap(f);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=make('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();let src=canvas.toDataURL('image/webp',.82);if(src.length>2_000_030)src=canvas.toDataURL('image/webp',.58);if(!src.startsWith('data:image/webp;')||src.length>2_000_030)throw Error('Không thể tối ưu WebP dưới 1,5 MB.');Object.assign(b,{src,width:canvas.width,height:canvas.height});render();store();if(mode==='preview')showPreview()}catch(e){$('[data-result]').textContent=e.message}finally{uploads--;update()}});
   }else if(b.kind==='table'){
    const table=make('div',undefined,'ev2-table');
    b.rows.forEach((row,ri)=>{const tr=make('div',undefined,'ev2-table-row');tr.style.gridTemplateColumns='repeat('+row.length+',minmax(0,1fr))';row.forEach((cell,ci)=>{const input=make('input');input.value=cell;input.maxLength=2000;input.setAttribute('aria-label','Ô bảng '+(ri+1)+', '+(ci+1));input.addEventListener('input',()=>{b.rows[ri][ci]=input.value;store()});tr.append(input)});table.append(tr)});
    wrapper.append(table,button('+ Hàng',()=>{if(b.rows.length<20)b.rows.push(Array(b.rows[0].length).fill(''));render();store()}),button('+ Cột',()=>{if(b.rows[0].length<8)b.rows.forEach(r=>r.push(''));render();store()}),button('− Hàng',()=>{if(b.rows.length>2)b.rows.pop();render();store()}),button('− Cột',()=>{if(b.rows[0].length>2)b.rows.forEach(r=>r.pop());render();store()}));
   }else{
    if(b.kind==='note'){const select=make('select');select.setAttribute('aria-label','Loại ghi chú');for(const [v,t] of [['info','Thông tin'],['tip','Mẹo'],['warning','Cảnh báo']]){const o=make('option',t);o.value=v;select.append(o)}select.value=b.tone||'info';select.addEventListener('change',()=>{b.tone=select.value;store()});wrapper.append(select)}
    const input=make('textarea');input.value=b.text||'';input.rows=b.kind==='heading'||b.kind==='subheading'?2:4;input.maxLength=50000;input.placeholder=b.kind==='bullet'||b.kind==='ordered'?'Mỗi dòng là một mục':'Nhập nội dung…';input.setAttribute('aria-label',names[b.kind]+' '+(i+1));
    input.addEventListener('input',()=>{b.text=input.value;store()});wrapper.append(input);
    if(['paragraph','quote','note','bullet','ordered'].includes(b.kind)){
     const fmt=make('div',undefined,'ev2-block-tools');
     for(const [mark,label] of [['bold','B'],['italic','I'],['underline','U'],['strike','S']]){
      const control=button(label,()=>{b.marks=b.marks.includes(mark)?b.marks.filter(x=>x!==mark):[...b.marks,mark];apply();store()},'Định dạng '+mark+' khối '+(i+1));control.dataset.mark=mark;fmt.append(control)
     }
     const apply=()=>{input.style.fontWeight=b.marks.includes('bold')?'700':'';input.style.fontStyle=b.marks.includes('italic')?'italic':'';input.style.textDecoration=[b.marks.includes('underline')?'underline':'',b.marks.includes('strike')?'line-through':''].filter(Boolean).join(' ');for(const c of fmt.children)c.setAttribute('aria-pressed',String(b.marks.includes(c.dataset.mark)))};
     wrapper.append(fmt);apply();
    }
   }
   area.append(wrapper);
  });
 }
 function showPreview(){
  $('[data-preview-title]').textContent=draft.title||'Bài viết chưa có tiêu đề';$('[data-preview-summary]').textContent=draft.summary;
  const w=workspace[active],slug=slugify(draft.title)||'ten-bai-viet',coverKey=active==='tech'?slug:draft.category+'/'+slug;const palette=palettes[Array.from(coverKey).reduce((n,c)=>n+c.charCodeAt(0),0)%palettes.length];$('[data-preview-cover]').style.background='linear-gradient(135deg,'+palette.join(',')+')';$('[data-preview-group]').textContent=w.group;$('[data-preview-topic]').textContent=active==='tech'?'Tự động phân loại sau khi xuất bản':field('category').selectedOptions[0]?.textContent||'';$('[data-preview-reading]').hidden=active!=='tech';$('[data-reading-minutes]').textContent=Math.max(1,Math.ceil(draft.blocks.map(b=>b.text||'').join(' ').trim().split(/\s+/).length/200))+' phút';$('[data-preview-summary]').hidden=active==='knowledge';
  const meta=$('[data-preview-meta]');meta.textContent=[draft.labels,draft.series.enabled?draft.series.name+' · Tập '+draft.series.part+'/'+draft.series.total_parts:''].filter(Boolean).join(' · ');meta.hidden=!meta.textContent;
  const target=$('[data-preview-body]');target.replaceChildren();
  for(const b of draft.blocks){
   const t=b.text||'';let node;
   if(b.kind==='image'){if(!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(b.src||''))continue;node=make('img');node.src=b.src;node.alt=b.alt||'';node.width=b.width;node.height=b.height}
   else if(b.kind==='table'){node=make('table');for(const [i,row] of b.rows.entries()){const tr=make('tr');row.forEach(v=>tr.append(make(i?'td':'th',v)));node.append(tr)}}
   else if(b.kind==='bullet'||b.kind==='ordered'){node=make(b.kind==='bullet'?'ul':'ol');t.split('\n').filter(s=>s.trim()).forEach(v=>node.append(make('li',v)))}
   else if(b.kind==='divider')node=make('hr');
   else{node=make(({heading:'h2',subheading:'h3',quote:'blockquote',code:'pre',note:'aside'})[b.kind]||'p',t);node.style.whiteSpace='pre-wrap'}
   if(b.marks?.includes('bold'))node.style.fontWeight='700';if(b.marks?.includes('italic'))node.style.fontStyle='italic';if(b.marks?.includes('underline')||b.marks?.includes('strike'))node.style.textDecoration=[b.marks.includes('underline')?'underline':'',b.marks.includes('strike')?'line-through':''].filter(Boolean).join(' ');target.append(node);
  }
 }
 function applyWorkspace(){
  const w=workspace[active];root.dataset.workspaceKind=active;
  for(const [selector,value] of Object.entries({'[data-workspace-title]':w.title,'[data-workspace-description]':w.description,'[data-library-title]':w.library,'[data-library-help]':w.help,'[data-outline]':w.outline,'[data-compose-kicker]':w.compose,'[data-settings-title]':w.settings,'[data-destination]':w.destination,'[data-destination-path]':w.path,'[data-preview-kicker]':w.preview}))$(selector).textContent=value;
  field('title').placeholder=w.placeholder;field('summary').placeholder=w.summary;field('labels').placeholder=w.labels;
  all('[data-workspace]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.workspace===active)));
  const tools=$('.ev2-block-buttons');const order=active==='tech'?['paragraph','heading','subheading','code','table','note','image','quote','bullet','ordered','divider']:['paragraph','heading','subheading','note','bullet','ordered','table','image','quote','code','divider'];
  for(const kind of order){const b=$('.ev2-block-buttons [data-add="'+kind+'"]');if(b)tools.append(b)}
 }
 function switchWorkspace(next){
  if(next===active||busy||uploads||!Object.hasOwn(workspace,next))return;
  readFields();if(!store()){$('[data-result]').textContent='Không thể lưu bản nháp đang mở. Lưu bản sao hoặc giải phóng bộ nhớ trước khi đổi workspace.';return}
  active=next;draft=load(active);try{localStorage.setItem(activeKey,JSON.stringify(active))}catch{}
  history.replaceState(null,'',location.pathname+location.search+'#workspace='+active);
  $('[data-confirm]').checked=false;$('[data-result]').textContent='Chưa gửi GitHub. Bản nháp tự lưu trên trình duyệt.';
  applyWorkspace();writeFields();render();setMode('write');update();
 }
 all('[data-workspace]').forEach(b=>b.addEventListener('click',()=>switchWorkspace(b.dataset.workspace)));
 $('[data-outline]').addEventListener('click',()=>{if(busy||uploads||draft.blocks.length+workspace[active].sections.length*2>250)return;for(const title of workspace[active].sections){draft.blocks.push({...newBlock('heading'),text:title},newBlock('paragraph'))}setMode('write');render();store()});
 function setMode(next){mode=next;$('[data-write]').hidden=next!=='write';$('[data-preview]').hidden=next!=='preview';all('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));if(next==='preview')showPreview()}
 all('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
 all('[data-add]').forEach(b=>b.addEventListener('click',()=>{if(draft.blocks.length>=250)return;draft.blocks.push(newBlock(b.dataset.add));setMode('write');render();store();$('[data-blocks]').lastElementChild?.scrollIntoView({block:'nearest'})}));
 all('[data-field]').forEach(el=>{const changed=()=>{update();if(mode==='preview')showPreview()};el.addEventListener('input',changed);if(el.tagName==='SELECT')el.addEventListener('change',changed)});
 $('[data-confirm]').addEventListener('change',update);
 $('[data-backup]').addEventListener('click',()=>{store();const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'})),a=make('a');a.href=url;a.download=(slugify(draft.title)||'ban-nhap')+'.editor-v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
 $('[data-new]').addEventListener('click',()=>{if(busy||uploads||!confirm('Tạo bài mới? Hãy lưu bản sao nếu cần giữ bản nháp hiện tại.'))return;draft=empty(active);writeFields();render();setMode('write');$('[data-confirm]').checked=false;update();store()});
 const dialog=$('[data-auth]'),tokenInput=$('[data-token]');
 function connection(login){$('[data-connection]').textContent=login?'Đã kết nối · '+login:'Chưa kết nối GitHub';$('[data-connect]').textContent=login?'Ngắt GitHub':'Kết nối GitHub';update()}
 $('[data-connect]').addEventListener('click',()=>{if(busy)return;if(client){client=null;connection('');return}tokenInput.value='';$('[data-auth-status]').textContent='';dialog.showModal()});
 $('[data-close-auth]').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{tokenInput.value=''});
 $('[data-auth-submit]').addEventListener('click',async()=>{const token=tokenInput.value.trim();tokenInput.value='';if(!token.startsWith('github'+'_pat_')){$('[data-auth-status]').textContent='Cần fine-grained personal access token.';return}const b=$('[data-auth-submit]');b.disabled=true;try{const candidate=githubClient(token),login=await candidate.verify();if(!dialog.open)return;client=candidate;connection(login);dialog.close()}catch(e){$('[data-auth-status]').textContent=e.message}finally{b.disabled=false}});
 $('[data-publish]').addEventListener('click',async()=>{if(!client||busy||uploads||!$('[data-confirm]').checked)return;busy=true;update();store();const result=$('[data-result]');try{const snapshot=structuredClone(draft);metadata(snapshot);await buildDocument(snapshot.blocks);const queued=await client.publish(snapshot,topicIds,message=>result.textContent=message);const link=make('a','Xem commit '+queued.sha.slice(0,7));link.href=queued.commitUrl;link.target='_blank';link.rel='noopener noreferrer';const queue=make('a','Mở hàng đợi Issue');queue.href=queued.queueUrl;queue.target='_blank';queue.rel='noopener noreferrer';result.replaceChildren(make('span','Đã gửi commit · Chờ GitHub tạo Issue và xử lý FIFO. '),link,make('span',' · '),queue);$('[data-confirm]').checked=false}catch(e){result.textContent=e.message}finally{busy=false;update()}});
 window.addEventListener('pagehide',store);window.addEventListener('focus',renderSeriesProgress);document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderSeriesProgress()});window.setInterval(()=>{if(!document.hidden)renderSeriesProgress()},60000);applyWorkspace();writeFields();render();update();
}
