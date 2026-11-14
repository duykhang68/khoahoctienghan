import {newBlock,kinds,slugify,metadata,buildDocument} from './model.mjs';
import {githubClient} from './github.mjs';
const storageKey='khoahoctienghan.editor-v2.draft.v1';
const names={paragraph:'Đoạn văn',heading:'Tiêu đề H2',subheading:'Tiêu đề H3',quote:'Trích dẫn',bullet:'Danh sách',ordered:'Danh sách số',note:'Ghi chú',code:'Mã nguồn',table:'Bảng',image:'Ảnh WebP',divider:'Đường phân cách'};
const make=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el};
const empty=()=>({title:'',summary:'',kind:'tech',category:'ngon-ngu',labels:'',series:{enabled:false,name:'',part:1,total_parts:1,target_date:''},blocks:[newBlock('paragraph')]});
export function mountEditor(root){
 if(!root)return;
 const $=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)],field=k=>$('[data-field="'+k+'"]'),base=root.dataset.base;
 let draft=empty(),client=null,busy=false,mode='write',timer;
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&Array.isArray(saved.blocks)&&saved.blocks.every(b=>kinds.includes(b.kind)))draft={...empty(),...saved}}catch{}
 const topicIds=Array.from(field('category').options,o=>o.value);
 function writeFields(){for(const k of ['title','summary','kind','category','labels'])field(k).value=draft[k];field('seriesEnabled').checked=!!draft.series.enabled;for(const [key,prop] of [['seriesName','name'],['part','part'],['total','total_parts'],['target','target_date']])field(key).value=draft.series[prop]??'';}
 function readFields(){for(const key of ['title','summary','kind','category','labels'])draft[key]=field(key).value;draft.series={enabled:field('seriesEnabled').checked,name:field('seriesName').value,part:field('part').value,total_parts:field('total').value,target_date:field('target').value};}
 function store(){clearTimeout(timer);try{localStorage.setItem(storageKey,JSON.stringify(draft));$('[data-save-status]').textContent='Đã lưu bản nháp trên thiết bị'}catch{$('[data-save-status]').textContent='Bộ nhớ đầy · lưu bản sao ngay'}}
 function update(){readFields();$('[data-category-label]').hidden=draft.kind!=='knowledge';$('[data-auto-category]').hidden=draft.kind!=='tech';$('[data-series]').hidden=!draft.series.enabled;$('[data-route]').textContent=base+'/'+(draft.kind==='tech'?'techblog':draft.category)+'/'+(slugify(draft.title)||'ten-bai-viet')+'/';$('[data-publish]').disabled=busy||!client||!$('[data-confirm]').checked||!draft.title.trim();clearTimeout(timer);timer=setTimeout(store,350);}
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
    input.addEventListener('change',async()=>{const f=input.files?.[0];if(!f)return;try{if(f.size>30_000_000)throw Error('Ảnh gốc tối đa 30 MB.');const bitmap=await createImageBitmap(f);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=make('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();let src=canvas.toDataURL('image/webp',.82);if(src.length>2_000_030)src=canvas.toDataURL('image/webp',.58);if(!src.startsWith('data:image/webp;')||src.length>2_000_030)throw Error('Không thể tối ưu WebP dưới 1,5 MB.');Object.assign(b,{src,width:canvas.width,height:canvas.height});render();store()}catch(e){$('[data-result]').textContent=e.message}});
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
 function setMode(next){mode=next;$('[data-write]').hidden=next!=='write';$('[data-preview]').hidden=next!=='preview';all('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));if(next==='preview')showPreview()}
 all('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
 all('[data-add]').forEach(b=>b.addEventListener('click',()=>{if(draft.blocks.length>=250)return;draft.blocks.push(newBlock(b.dataset.add));setMode('write');render();store();$('[data-blocks]').lastElementChild?.scrollIntoView({block:'nearest'})}));
 all('[data-field]').forEach(el=>{const changed=()=>{update();if(mode==='preview')showPreview()};el.addEventListener('input',changed);if(el.tagName==='SELECT')el.addEventListener('change',changed)});
 $('[data-confirm]').addEventListener('change',update);
 $('[data-backup]').addEventListener('click',()=>{store();const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'})),a=make('a');a.href=url;a.download=(slugify(draft.title)||'ban-nhap')+'.editor-v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
 $('[data-new]').addEventListener('click',()=>{if(busy||!confirm('Tạo bài mới? Hãy lưu bản sao nếu cần giữ bản nháp hiện tại.'))return;draft=empty();writeFields();render();setMode('write');$('[data-confirm]').checked=false;update();store()});
 const dialog=$('[data-auth]'),tokenInput=$('[data-token]');
 function connection(login){$('[data-connection]').textContent=login?'Đã kết nối · '+login:'Chưa kết nối GitHub';$('[data-connect]').textContent=login?'Ngắt GitHub':'Kết nối GitHub';update()}
 $('[data-connect]').addEventListener('click',()=>{if(busy)return;if(client){client=null;connection('');return}tokenInput.value='';$('[data-auth-status]').textContent='';dialog.showModal()});
 $('[data-close-auth]').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{tokenInput.value=''});
 $('[data-auth-submit]').addEventListener('click',async()=>{const token=tokenInput.value.trim();tokenInput.value='';if(!token.startsWith('github'+'_pat_')){$('[data-auth-status]').textContent='Cần fine-grained personal access token.';return}const b=$('[data-auth-submit]');b.disabled=true;try{const candidate=githubClient(token),login=await candidate.verify();if(!dialog.open)return;client=candidate;connection(login);dialog.close()}catch(e){$('[data-auth-status]').textContent=e.message}finally{b.disabled=false}});
 $('[data-publish]').addEventListener('click',async()=>{if(!client||busy||!$('[data-confirm]').checked)return;busy=true;update();store();const result=$('[data-result]');try{const snapshot=structuredClone(draft);metadata(snapshot);await buildDocument(snapshot.blocks);const queued=await client.publish(snapshot,topicIds,message=>result.textContent=message);const link=make('a','Xem commit '+queued.sha.slice(0,7));link.href=queued.commitUrl;link.target='_blank';link.rel='noopener noreferrer';const queue=make('a','Mở hàng đợi Issue');queue.href=queued.queueUrl;queue.target='_blank';queue.rel='noopener noreferrer';result.replaceChildren(make('span','Đã gửi commit · Chờ GitHub tạo Issue và xử lý FIFO. '),link,make('span',' · '),queue);$('[data-confirm]').checked=false}catch(e){result.textContent=e.message}finally{busy=false;update()}});
 window.addEventListener('pagehide',store);writeFields();render();update();
}
