import {sheetsClient,scope,rowDraft,recommendDestination} from './model.mjs';
import {githubClient} from '../editor-v2/github.mjs';
import {mountQueueProgress} from './progress-browser.mjs';
import {sheetSource,verifyReviewedSource} from './source.mjs';
import {slugify,buildDocument} from '../editor-v2/model.mjs';
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
export function mountSheetBlog(root){
 if(!root)return;
 const $=s=>root.querySelector(s),topics=JSON.parse(root.dataset.topics),base=root.dataset.base;
 const status=$('[data-status]'),clientInput=$('[data-client]'),login=$('[data-google-login]'),dialog=$('[data-confirm-dialog]');
 let google=null,github=null,rows=[],selected=null,selectedRow=null,selectedSource=null,loading=false,sending=false,oauthPending=false,googleEpoch=0,page=1,gisReady=false;
 const submitted=new Map();
 const queueProgress=mountQueueProgress($('[data-queue-progress]'));
 clientInput.value=root.dataset.clientId||'';
 try{if(!clientInput.value)clientInput.value=localStorage.getItem('kb.sheet-blog.public-client-id')||''}catch{}
 if(root.dataset.clientId)$('[data-client-label]').hidden=true;
 const set=s=>status.textContent=s;
 const update=()=>{
  login.disabled=!gisReady||oauthPending||loading||sending||!!google||!validClient(clientInput.value.trim());
  $('[data-google-logout]').hidden=!google;$('[data-google-logout]').disabled=loading||sending;
  $('[data-google-state]').textContent=google?'Đã kết nối · chỉ đọc':'Chưa kết nối';
  $('[data-refresh]').disabled=!google||loading||sending;$('[data-search]').disabled=!google||loading;$('[data-sheet-filter]').disabled=!google||loading;
  $('[data-gh-connect]').hidden=!!github;$('[data-gh-token]').disabled=!!github||sending;
  $('[data-gh-logout]').hidden=!github;$('[data-gh-logout]').disabled=sending;
  const kind=$('[data-kind]').value,cat=$('[data-category]').value;
  $('[data-category-label]').hidden=kind!=='knowledge';
  $('[data-route]').textContent=selected&&kind&&(kind!=='knowledge'||cat)?base+'/'+(kind==='tech'?'techblog':cat)+'/'+slugify(selected.title)+'/':'';
  $('[data-submit]').disabled=!google||!github||!selectedRow||!selectedSource||!$('[data-consent]').checked||!kind||(kind==='knowledge'&&!cat)||sending;
  $('[data-close]').disabled=sending;
  $('[data-dialog-connect]').hidden=!!github;$('[data-dialog-connect]').disabled=sending;
 };
 function validClient(value){return /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(value)}
 function render(){
  const query=$('[data-search]').value.trim().toLocaleLowerCase('vi');
  const filter=$('[data-sheet-filter]').value;
  const key=r=>JSON.stringify([r.row,r.title,r.group,r.topic]),state=r=>r.id?'marked':submitted.has(key(r))?'sent':'pending';
  const matches=rows.filter(r=>r.title.toLocaleLowerCase('vi').includes(query)&&(!filter||state(r)===filter));
  const totals={pending:0,sent:0,marked:0};for(const r of rows)totals[state(r)]++;
  for(const k of Object.keys(totals))$('[data-sheet-'+k+']').textContent=google?String(totals[k]):'—';
  const pages=Math.max(1,Math.ceil(matches.length/10));page=Math.min(page,pages);
  $('[data-count]').textContent=google?matches.length+' bài viết tiếng Việt':'Chưa tải danh sách';
  const area=$('[data-rows]');area.replaceChildren();
  for(const item of matches.slice((page-1)*10,page*10)){
   const card=make('article',undefined,'sb-row'),copy=make('div'),button=make('button','Đăng bài','sb-publish');button.type='button';button.dataset.publishRow=String(item.row);
   copy.append(make('small','VN · Dòng '+item.row+(item.topic?' · '+item.topic:'')),make('h3',item.title));
   if(item.id){
    const state=make('span','Đã có Content ID','sb-row-state');copy.append(state);button.textContent='Đã có Content ID';button.disabled=true;
   }else if(submitted.has(JSON.stringify([item.row,item.title,item.group,item.topic]))){const link=make('a','Đã gửi commit');link.href=submitted.get(JSON.stringify([item.row,item.title,item.group,item.topic])).commitUrl;link.target='_blank';link.rel='noopener noreferrer';copy.append(link);button.disabled=true;button.textContent='Đã gửi FIFO';}
   else{copy.append(make('span','Chưa đăng','sb-row-state sb-row-pending'));button.addEventListener('click',()=>choose(item))}
   card.append(copy,button);area.append(card);
  }
  if(!matches.length)area.append(make('p',google?'Không có tiêu đề phù hợp.':'Đăng nhập Google để xem danh sách bài.'));
  $('[data-pages]').hidden=pages===1;$('[data-page]').textContent='Trang '+page+' / '+pages;$('[data-prev]').disabled=page===1;$('[data-next]').disabled=page===pages;
 }
 async function refresh(){
  if(!google||loading||sending)return;const client=google,epoch=googleEpoch;loading=true;update();set('Đang đọc tiêu đề từ tab VN…');
  try{const result=await client.list();if(google!==client||epoch!==googleEpoch)return;rows=result;page=1;render();set('Đã tải danh sách. Nhấn Đăng bài bên cạnh tiêu đề để xem nội dung và gửi vào FIFO.')}
  catch(e){if(google===client){rows=[];render();set(e.message)}}finally{loading=false;update()}
 }
 async function choose(item){
  if(!google||loading||sending||item.id||submitted.has(JSON.stringify([item.row,item.title,item.group,item.topic])))return;const client=google;loading=true;update();set('Đang đọc nội dung cột C của bài đã chọn…');
  try{
   const row=await client.read(item.row);if(google!==client)return;
   if(String(row[1]??'').trim()!==item.title||String(row[0]??'').trim()!==item.id||String(row[3]??'').trim()!==item.group||String(row[4]??'').trim()!==item.topic)throw Error('Dòng nguồn đã thay đổi. Tải lại danh sách.');
   if(!String(row[2]??'').trim())throw Error('Bài chưa có blog main content.');
   const reviewed=await sheetSource(item.row,row);if(google!==client)return;
   selected=item;selectedRow=row;selectedSource=reviewed;
   $('[data-source-fingerprint]').textContent=reviewed.fingerprint;
   $('[data-source-row]').textContent='Tab VN · Dòng '+item.row+' · '+String(row[2]).length.toLocaleString('vi-VN')+' ký tự';
   const recommended=recommendDestination(item,topics);
   $('[data-preview-title]').textContent=item.title;$('[data-preview-meta]').textContent='VN · Dòng '+item.row+' · '+[item.group,item.topic].filter(Boolean).join(' / ');
   $('[data-preview]').textContent=String(row[2]);$('[data-kind]').value=recommended.kind;$('[data-category]').value=recommended.category;
   $('[data-consent]').checked=false;$('[data-dialog-status]').textContent=github?'Kiểm tra nội dung trước khi gửi.':'Chưa kết nối GitHub. Nhấn Kết nối GitHub bên dưới để tiếp tục.';
   dialog.showModal();set('Đã đọc nội dung bài đã chọn.');
  }catch(e){set(e.message)}finally{loading=false;update()}
 }
 clientInput.addEventListener('input',update);
 const gis=document.createElement('script');gis.src='https://accounts.google.com/gsi/client';gis.async=true;gis.referrerPolicy='strict-origin-when-cross-origin';
 gis.onload=()=>{gisReady=!!window.google?.accounts?.oauth2;set(gisReady?'Sẵn sàng đăng nhập Google.':'Không khởi tạo được Google OAuth.');update()};
 gis.onerror=()=>set('Không tải được Google Identity Services. Kiểm tra mạng rồi tải lại trang.');document.head.append(gis);
 login.addEventListener('click',()=>{
  const id=clientInput.value.trim();if(!validClient(id)||!gisReady||oauthPending)return;
  const epoch=++googleEpoch;oauthPending=true;update();
  const finish=()=>{oauthPending=false;update()};
  try{
   const oauth=window.google.accounts.oauth2;
   const c=oauth.initTokenClient({client_id:id,scope,prompt:'select_account',include_granted_scopes:false,
    callback:async response=>{if(epoch!==googleEpoch)return;finish();if(response.error||!response.access_token||!oauth.hasGrantedAllScopes(response,scope)){set('Chưa cấp quyền đọc Google Sheet.');return}
     try{localStorage.setItem('kb.sheet-blog.public-client-id',id)}catch{}
     google=sheetsClient(response.access_token);update();await refresh();
    },error_callback:()=>{if(epoch===googleEpoch){finish();set('Cửa sổ đăng nhập Google chưa hoàn tất.')}}});
   c.requestAccessToken();
  }catch{finish();set('Không thể mở đăng nhập Google. Kiểm tra OAuth Web Client ID.')}
 });
 function clearSelection(){selected=null;selectedRow=null;selectedSource=null;$('[data-consent]').checked=false;$('[data-source-fingerprint]').textContent='';$('[data-source-row]').textContent='';$('[data-preview]').textContent='';const details=root.querySelector('.sb-source-integrity');if(details)details.open=false;update()}
 function closePreview(){if(dialog.open)dialog.close();clearSelection()}
 function clearGoogle(){googleEpoch++;google=null;rows=[];selected=null;selectedRow=null;selectedSource=null;submitted.clear();$('[data-sheet-filter]').value='';$('[data-source-fingerprint]').textContent='';$('[data-source-row]').textContent='';$('[data-preview]').textContent='';$('[data-preview-title]').textContent='';$('[data-preview-meta]').textContent='';closePreview();$('[data-search]').value='';render();update();set('Đã ngắt Google trên trang.')}
 $('[data-google-logout]').addEventListener('click',()=>{if(!loading&&!sending)clearGoogle()});
 $('[data-sheet-filter]').addEventListener('change',()=>{page=1;render()});$('[data-refresh]').addEventListener('click',refresh);$('[data-search]').addEventListener('input',()=>{page=1;render()});
 $('[data-prev]').addEventListener('click',()=>{page--;render()});$('[data-next]').addEventListener('click',()=>{page++;render()});
 $('[data-gh-connect]').addEventListener('click',async()=>{
  const button=$('[data-gh-connect]'),input=$('[data-gh-token]'),token=input.value.trim();input.value='';
  if(!token.startsWith('github'+'_pat_')){set('Cần fine-grained GitHub token của chủ blog.');return}
  button.disabled=true;try{const candidate=githubClient(token);await candidate.verify();github=candidate;$('[data-github-state]').textContent='Đã kết nối · chủ blog';set('GitHub đã kết nối. Chọn một bài để gửi.')}catch(e){set(e.message)}finally{button.disabled=false;update()}
 });
 $('[data-gh-logout]').addEventListener('click',()=>{if(!sending){github=null;$('[data-github-state]').textContent='Chưa kết nối';update()}});
 for(const key of ['[data-kind]','[data-category]','[data-consent]'])$(key).addEventListener('change',update);
 $('[data-close]').addEventListener('click',()=>{if(!sending)closePreview()});
 $('[data-dialog-connect]').addEventListener('click',()=>{if(!sending){closePreview();$('[data-gh-token]').focus();set('Kết nối GitHub rồi nhấn Đăng bài cạnh tiêu đề để tiếp tục.')}});
 dialog.addEventListener('cancel',e=>{if(sending)e.preventDefault()});
 dialog.addEventListener('close',()=>{if(!dialog.open)clearSelection()});
 $('[data-submit]').addEventListener('click',async()=>{
  if(!google||!github||!selected||!selectedRow||!selectedSource||sending||!$('[data-consent]').checked)return;
  const msg=$('[data-dialog-status]'),item=selected;
  sending=true;update();
  try{
   const fresh=await google.read(item.row);
   if(JSON.stringify(fresh)!==JSON.stringify(selectedRow))throw Error('Nội dung nguồn đã đổi. Đóng và mở lại bài để kiểm tra trước khi gửi.');
   const draft=rowDraft(item,fresh,topics,$('[data-kind]').value,$('[data-category]').value);
   draft.sheetSource=await verifyReviewedSource(selectedSource,item.row,fresh);
   await buildDocument(draft.blocks);
   const route=base+'/'+(draft.kind==='tech'?'techblog':draft.category)+'/'+slugify(draft.title)+'/';
   const check=await fetch('/admin/article-check'+route.slice(base.length),{cache:'no-store',redirect:'error'});
   if(check.ok)throw Error('URL bài đã tồn tại. Không gửi bài trùng.');
   if(check.status!==404)throw Error('Chưa kiểm tra được URL bài. Thử lại.');
   const result=await github.publish(draft,topics.map(t=>t.id),s=>msg.textContent=s);
   submitted.set(JSON.stringify([item.row,item.title,item.group,item.topic]),result);queueProgress.record(result,item.title);closePreview();render();set('Đã gửi commit '+result.sha.slice(0,7)+' · GitHub sẽ tiếp nhận Issue FIFO; chưa xuất bản.');
  }catch(e){msg.textContent=e.message}finally{sending=false;update()}
 });
 update();render();
}
